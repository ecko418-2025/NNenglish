const cloudbase = require('@cloudbase/node-sdk');
const fetch = require('node-fetch');

const app = cloudbase.init({
  env: cloudbase.SYMBOL_CURRENT_ENV
});
const db = app.database();

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, X-Doc-Title, X-Doc-Filename',
};

const OCR_PROMPT = `Handwritten OCR Task:
Recognize all English text in the image, translate to Chinese, and classify each item into one of the following tags (return the integer tag only):
1: 日常短语 (Daily Phrases)
2: 学术词汇 (Academic Words)
3: 商务用语 (Business Terms)
4: 习语表达 (Idioms)
5: 完整句子 (Complete Sentences)
6: 其他 (Other/Unclassified)
Return ONLY a JSON object in this format: {"results": [{"en": "...", "cn": "...", "tag": 1}]}`;

exports.main = async (event, context) => {
  const path = event.path || '';
  const method = event.httpMethod || 'GET';

  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS_HEADERS,
      body: ''
    };
  }

  try {
    if (path.endsWith('/api/ocr') && method === 'POST') {
      return await handleOCR(event);
    } else if (path.endsWith('/api/documents')) {
      if (method === 'GET') {
        return await handleListDocuments();
      } else if (method === 'POST') {
        return await handleSaveDocument(event);
      }
    } else if (path.includes('/files/')) {
      return await handleDownloadDocument(path);
    }

    return sendResponse(404, { error: 'Not found: ' + path });
  } catch (error) {
    console.error(error);
    return sendResponse(500, { error: error.message });
  }
};

function sendResponse(statusCode, body, contentType = 'application/json') {
  return {
    statusCode,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': contentType,
    },
    body: typeof body === 'string' ? body : JSON.stringify(body)
  };
}

async function handleOCR(event) {
  const DOUBAO_API_KEY = process.env.DOUBAO_API_KEY;
  const DOUBAO_MODEL = process.env.DOUBAO_MODEL || 'doubao-seed-2-0-pro-260215';

  if (!DOUBAO_API_KEY) {
    return sendResponse(500, { error: 'Missing DOUBAO_API_KEY env variable' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body);
  } catch (e) {
    return sendResponse(400, { error: 'Invalid JSON body' });
  }

  if (!payload.image) {
    return sendResponse(400, { error: 'Missing image parameter' });
  }

  const doubaoResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${DOUBAO_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: DOUBAO_MODEL,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: payload.image } },
          { type: 'text', text: OCR_PROMPT },
        ],
      }],
    }),
  });

  if (!doubaoResponse.ok) {
    const text = await doubaoResponse.text();
    return sendResponse(502, { error: 'Doubao API request failed', detail: text });
  }

  const data = await doubaoResponse.json();
  const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
  const results = parseResults(rawContent);

  return sendResponse(200, { results });
}

function parseResults(rawContent) {
  const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
  const jsonStr = jsonMatch ? jsonMatch[0] : rawContent;
  const parsed = JSON.parse(jsonStr);
  const results = parsed.results || (Array.isArray(parsed) ? parsed : []);
  return results.map((item) => ({
    en: String(item.en || ''),
    cn: String(item.cn || ''),
    tag: Number(item.tag) || 6,
  }));
}

async function handleListDocuments() {
  const res = await db.collection('documents')
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();
  
  return sendResponse(200, { documents: res.data });
}

async function handleSaveDocument(event) {
  // Title and file details from headers
  const title = decodeURIComponent(event.headers['x-doc-title'] || event.headers['X-Doc-Title'] || '英语笔记整理');
  const fileName = decodeURIComponent(event.headers['x-doc-filename'] || event.headers['X-Doc-Filename'] || 'notes.docx');

  if (!event.body) {
    return sendResponse(400, { error: 'Empty request body' });
  }

  const buffer = event.isBase64Encoded 
    ? Buffer.from(event.body, 'base64') 
    : Buffer.from(event.body, 'utf-8');

  const now = new Date();
  const id = `${now.getTime()}-${Math.random().toString(36).slice(2, 10)}`;
  const key = `documents/${id}.docx`;

  // 1. Upload to storage
  const uploadRes = await app.uploadFile({
    cloudPath: key,
    fileContent: buffer
  });
  console.log("uploadRes:", JSON.stringify(uploadRes));

  const item = {
    id,
    title,
    fileName,
    key,
    fileID: uploadRes.fileID,
    size: buffer.length,
    createdAt: now.toISOString(),
    url: `/files/${id}.docx`
  };

  // 2. Add to database
  await db.collection('documents').add(item);

  return sendResponse(200, { document: item });
}

async function handleDownloadDocument(path) {
  const match = path.match(/files\/([^/]+)/);
  if (!match) {
    return sendResponse(404, { error: 'Invalid file ID' });
  }
  
  const fileId = decodeURIComponent(match[1]).replace(/\.docx$/, '');

  // Query database for the document to get the exact fileID
  const dbRes = await db.collection('documents').where({ id: fileId }).get();
  if (!dbRes.data || dbRes.data.length === 0) {
    return sendResponse(404, { error: 'Document not found in database' });
  }

  const doc = dbRes.data[0];
  const fileID = doc.fileID || `cloud://cshj001-d7g5f1k0tc94d4181.6373-cshj001-d7g5f1k0tc94d4181-1428383052/documents/${fileId}.docx`;

  const urlRes = await app.getTempFileURL({
    fileList: [
      {
        fileID: fileID,
        maxAge: 3600 // 1 hour
      }
    ]
  });

  console.log("urlRes:", JSON.stringify(urlRes));

  if (!urlRes.fileList || !urlRes.fileList[0] || !urlRes.fileList[0].tempFileURL) {
    return sendResponse(404, { error: 'Document download link generation failed' });
  }

  const tempUrl = urlRes.fileList[0].tempFileURL;

  return {
    statusCode: 302,
    headers: {
      ...CORS_HEADERS,
      'Location': tempUrl
    },
    body: ''
  };
}
