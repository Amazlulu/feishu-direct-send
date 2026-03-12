#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith('--')) {
      args[key] = next;
      i += 1;
    } else {
      args[key] = true;
    }
  }
  return args;
}

function fail(message, extra) {
  const payload = { ok: false, error: message };
  if (extra !== undefined) payload.details = extra;
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

function readConfig() {
  const cfgPath = 'C:/Users/vip20/.openclaw/openclaw.json';
  if (!fs.existsSync(cfgPath)) fail('OpenClaw config not found', { cfgPath });
  return JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
}

function resolveAccount(cfg, accountName) {
  const accounts = cfg.channels?.feishu?.accounts || {};
  const resolvedName = accountName || (accounts.main ? 'main' : 'default');
  const preferred = accounts[resolvedName];
  if (!preferred?.appId || !preferred?.appSecret) {
    fail('Missing Feishu credentials in openclaw config', { account: resolvedName });
  }
  return { resolvedName, account: preferred };
}

function inferReceiveIdType(target, explicit) {
  if (explicit) return explicit;
  if (!target) fail('Missing target');
  if (target.startsWith('ou_') || target.startsWith('on_')) return 'open_id';
  if (target.startsWith('oc_')) return 'chat_id';
  fail('Could not infer receive_id_type from target', { target });
}

function guessContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.txt': 'text/plain',
    '.csv': 'text/csv',
    '.json': 'application/json',
    '.zip': 'application/zip'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

function buildMultipartBody(fieldName, filePath, contentType, extraFields) {
  const fileBuffer = fs.readFileSync(filePath);
  const boundary = '----OpenClawFormBoundary' + Math.random().toString(16).slice(2);
  const chunks = [];

  for (const [name, value] of Object.entries(extraFields)) {
    chunks.push(Buffer.from(
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`,
      'utf8'
    ));
  }

  chunks.push(Buffer.from(
    `--${boundary}\r\n` +
    `Content-Disposition: form-data; name="${fieldName}"; filename="${path.basename(filePath)}"\r\n` +
    `Content-Type: ${contentType}\r\n\r\n`,
    'utf8'
  ));
  chunks.push(fileBuffer);
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8'));

  return {
    boundary,
    body: Buffer.concat(chunks)
  };
}

async function parseJsonResponse(resp, fallbackLabel) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (err) {
    fail(`Unexpected ${fallbackLabel} response`, { status: resp.status, body: text });
  }
}

async function getTenantToken(account) {
  const resp = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ app_id: account.appId, app_secret: account.appSecret })
  });
  const json = await parseJsonResponse(resp, 'token');
  if (json.code !== 0 || !json.app_access_token) fail('Failed to get Feishu app access token', json);
  return json.app_access_token;
}

async function uploadImage(token, filePath) {
  const { boundary, body } = buildMultipartBody('image', filePath, guessContentType(filePath), { image_type: 'message' });
  const resp = await fetch('https://open.feishu.cn/open-apis/im/v1/images', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });
  const json = await parseJsonResponse(resp, 'image upload');
  if (json.code !== 0 || !json.data?.image_key) fail('Failed to upload image', json);
  return json.data.image_key;
}

async function uploadFile(token, filePath) {
  const { boundary, body } = buildMultipartBody('file', filePath, guessContentType(filePath), { file_type: 'stream' });
  const resp = await fetch('https://open.feishu.cn/open-apis/im/v1/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body
  });
  const json = await parseJsonResponse(resp, 'file upload');
  if (json.code !== 0 || !json.data?.file_key) fail('Failed to upload file', json);
  return json.data.file_key;
}

async function sendMessage(token, receiveIdType, target, msgType, content) {
  const resp = await fetch(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8'
    },
    body: JSON.stringify({
      receive_id: target,
      msg_type: msgType,
      content: JSON.stringify(content)
    })
  });
  const json = await parseJsonResponse(resp, 'message send');
  if (json.code !== 0 || !json.data?.message_id) fail('Failed to send Feishu message', json);
  return json.data;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const type = String(args.type || '').trim();
  const target = String(args.target || '').trim();
  const receiveIdType = inferReceiveIdType(target, args['receive-id-type'] ? String(args['receive-id-type']).trim() : '');

  if (!type) fail('Missing --type');
  if (!target) fail('Missing --target');

  const cfg = readConfig();
  const { resolvedName, account } = resolveAccount(cfg, args.account ? String(args.account).trim() : '');
  const token = await getTenantToken(account);

  let result;
  if (type === 'text') {
    const text = String(args.text || '').trim();
    if (!text) fail('Missing --text for text send');
    result = await sendMessage(token, receiveIdType, target, 'text', { text });
  } else if (type === 'image') {
    const imagePath = path.resolve(String(args.path || '').trim());
    if (!args.path) fail('Missing --path for image send');
    if (!fs.existsSync(imagePath)) fail('Image file not found', { imagePath });
    const imageKey = await uploadImage(token, imagePath);
    result = await sendMessage(token, receiveIdType, target, 'image', { image_key: imageKey });
    result.image_key = imageKey;
  } else if (type === 'file') {
    const filePath = path.resolve(String(args.path || '').trim());
    if (!args.path) fail('Missing --path for file send');
    if (!fs.existsSync(filePath)) fail('File not found', { filePath });
    const fileKey = await uploadFile(token, filePath);
    result = await sendMessage(token, receiveIdType, target, 'file', { file_key: fileKey });
    result.file_key = fileKey;
  } else {
    fail('Unsupported --type', { supported: ['text', 'image', 'file'] });
  }

  console.log(JSON.stringify({
    ok: true,
    type,
    account: resolvedName,
    target,
    receive_id_type: receiveIdType,
    message_id: result.message_id,
    image_key: result.image_key,
    file_key: result.file_key
  }, null, 2));
}

main().catch((err) => fail(err.message || String(err)));
