# Cloudflare Worker

这个 Worker 负责托管英语手写识别网页、保存豆包 API Key、调用豆包 OCR 接口，并把生成的 Word 文档保存到 Cloudflare KV。

## 线上入口

```text
https://dawnbird.ecko418.workers.dev/
```

## 接口

```text
GET  /              网页首页
POST /api/ocr       图片识别
GET  /api/documents 最近生成的 Word 文档
POST /api/documents 保存 Word 文档
GET  /files/:id     下载 Word 文档
```

## 部署

```bash
npx wrangler login
cd worker
npx wrangler kv namespace create DOCS_KV
npx wrangler secret put DOUBAO_API_KEY
npx wrangler deploy
```

`DOUBAO_API_KEY` 必须设置为 Secret。`DOCS_KV` 用来保存 Word 文件和历史索引。

当前 `DOCS_KV` 绑定已经写在 `wrangler.toml` 里，除非更换 Cloudflare 账号或重新创建 KV，否则不用重复创建。
