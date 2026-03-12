---
name: feishu-direct-send
description: Send Feishu messages directly through Feishu Open Platform APIs when OpenClaw's wrapped message sending is failing, unreliable, or too limiting. Use for sending images, files, or text into Feishu DMs or group chats by reading local OpenClaw Feishu account config and calling the API directly.
---

# Feishu Direct Send

Use this skill when content must be delivered into Feishu and the normal OpenClaw `message` path is not working well enough.

## When to use

Trigger this skill when:

- the user asks to send an image, screenshot, file, or text to Feishu
- OpenClaw's `message` tool fails or behaves inconsistently for Feishu
- it is faster to bypass the wrapper and call Feishu Open Platform directly

## Supported sends

- `text`
- `image`
- `file`

## Preferred entrypoint

Use the bundled script:

```bash
node scripts/feishu-direct-send.js --type image --path ./demo.png --target ou_xxx
node scripts/feishu-direct-send.js --type file --path ./report.pdf --target oc_xxx
node scripts/feishu-direct-send.js --type text --text "hello" --target ou_xxx
```

Optional args:

- `--account <id>`: Feishu account name from `channels.feishu.accounts`, default `main` then `default`
- `--receive-id-type open_id|chat_id`: override auto-detection when needed

## Target rules

- DM target ids usually start with `ou_` or `on_` and map to `open_id`
- Group target ids usually start with `oc_` and map to `chat_id`
- Prefer auto-detection unless there is a known mismatch

## Workflow

1. Resolve OpenClaw config from `--config`, `OPENCLAW_CONFIG`, `OPENCLAW_CONFIG_PATH`, or the default `~/.openclaw/openclaw.json`
2. Resolve Feishu account credentials from `channels.feishu.accounts`
3. Get `app_access_token` via `POST /open-apis/auth/v3/app_access_token/internal`
4. Depending on type:
   - image: upload with `POST /open-apis/im/v1/images`
   - file: upload with `POST /open-apis/im/v1/files`
   - text: no upload step
5. Send with `POST /open-apis/im/v1/messages?receive_id_type=<type>`
6. Return and report `message_id`

## Validation

Before sending:

- confirm the local file exists for image/file sends
- confirm the Feishu account has `appId` and `appSecret`
- confirm the target id is present and its type can be inferred or is explicitly provided

## Output

On success, report the returned `message_id`.

The script prints JSON with:

- `ok`
- `type`
- `account`
- `target`
- `receive_id_type`
- `message_id`
- `image_key` or `file_key` when relevant

## Security

- Never commit `C:\Users\vip20\.openclaw\openclaw.json`
- Never expose `appSecret` in chat replies or Git commits
- Do not upload screenshots or files to third-party hosts if direct Feishu delivery is available

## Implementation note

This skill exists because a direct API route can be more reliable than the current wrapper layer for Feishu media delivery.
