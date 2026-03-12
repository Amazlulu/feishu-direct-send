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
--config /path/to/openclaw.json
```

## Config source

The script does not assume one hard-coded machine path.

It resolves OpenClaw config in this order:

1. `--config <path>`
2. `OPENCLAW_CONFIG`
3. `OPENCLAW_CONFIG_PATH`
4. default home config: `~/.openclaw/openclaw.json`

It expects Feishu credentials under:

- `channels.feishu.accounts.main.appId`
- `channels.feishu.accounts.main.appSecret`

or another named account.

## Notes

- `ou_` / `on_` targets are treated as DMs (`open_id`)
- `oc_` targets are treated as group chats (`chat_id`)
- text goes straight to send
- image/file uploads happen before send
- the script now guesses file content type from extension instead of forcing every image to png
- error output is JSON so failures are easier to automate and debug

## Validation ideas

You can verify with these commands:

```bash
node scripts/feishu-direct-send.js --type text --text "smoke test" --target ou_xxx
node scripts/feishu-direct-send.js --type file --path ./README.md --target ou_xxx
```

## Security

Do not commit secrets, configs, or captured screenshots.

## Git workflow

Recommended workflow for future automation:

```bash
git add .
git commit -m "your change"
git push
```

This repository is intended to be maintained as a standalone reusable skill.
