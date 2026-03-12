# Usage Examples

## Send text to a DM

```bash
node scripts/feishu-direct-send.js --type text --text "hello" --target ou_xxx
```

## Send an image to a DM

```bash
node scripts/feishu-direct-send.js --type image --path ./desktop-screenshot.png --target ou_xxx
```

## Send a file to a group

```bash
node scripts/feishu-direct-send.js --type file --path ./report.pdf --target oc_xxx
```

## Force account and receive id type

```bash
node scripts/feishu-direct-send.js --type image --path ./demo.png --target ou_xxx --account main --receive-id-type open_id
```
