# feishu-direct-send

Direct Feishu sender for OpenClaw environments.

This skill bypasses OpenClaw's wrapped Feishu message path and talks to Feishu Open Platform APIs directly. It is useful when the normal `message` tool is failing for images or files, or when you want a predictable local script for Feishu delivery.

## Supports

- text
- image
- file

## Script

```bash
node scripts/feishu-direct-send.js --type image --path ./demo.png --target ou_xxx
node scripts/feishu-direct-send.js --type file --path ./report.pdf --target oc_xxx
node scripts/feishu-direct-send.js --type text --text "hello" --target ou_xxx
```

Optional:

```bash
--account main
--receive-id-type open_id
```

## Config source

The script reads Feishu credentials from:

`C:\Users\vip20\.openclaw\openclaw.json`

It expects:

- `channels.feishu.accounts.main.appId`
- `channels.feishu.accounts.main.appSecret`

or another named account.

## Notes

- `ou_` / `on_` targets are treated as DMs (`open_id`)
- `oc_` targets are treated as group chats (`chat_id`)
- text goes straight to send
- image/file uploads happen before send

## Security

Do not commit secrets, configs, or captured screenshots.
