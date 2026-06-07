# Cloudflare Worker

这个 Worker 负责保存豆包 API Key，并替前端调用豆包 OCR 接口。前端页面只需要调用 Worker 地址，不再暴露 API Key。

## 部署

```bash
npx wrangler login
cd worker
npx wrangler secret put DOUBAO_API_KEY
npx wrangler deploy
```

部署成功后复制 Worker 地址，例如：

```text
https://nnenglish-ocr.your-subdomain.workers.dev
```

第一次在前端页面开始识别时，输入这个地址即可。页面会保存在当前浏览器本地，后续不用重复输入。
