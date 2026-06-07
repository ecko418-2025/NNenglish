const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const DOC_INDEX_KEY = 'documents:index';

const OCR_PROMPT = `Handwritten OCR Task:
Recognize all English text in the image, translate to Chinese, and classify each item into one of the following tags (return the integer tag only):
1: 日常短语 (Daily Phrases)
2: 学术词汇 (Academic Words)
3: 商务用语 (Business Terms)
4: 习语表达 (Idioms)
5: 完整句子 (Complete Sentences)
6: 其他 (Other/Unclassified)
Return ONLY a JSON object in this format: {"results": [{"en": "...", "cn": "...", "tag": 1}]}`;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    if (url.pathname === '/api/documents' && request.method === 'GET') {
      return listDocuments(env);
    }

    if (url.pathname === '/api/documents' && request.method === 'POST') {
      return saveDocument(request, env);
    }

    if (url.pathname.startsWith('/files/') && (request.method === 'GET' || request.method === 'HEAD')) {
      return downloadDocument(url, env, request.method === 'HEAD');
    }

    if (request.method === 'GET') {
      return env.ASSETS.fetch(request);
    }

    if (url.pathname !== '/api/ocr') {
      return jsonResponse({ error: 'Not found' }, 404);
    }

    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Method not allowed' }, 405);
    }

    if (!env.DOUBAO_API_KEY) {
      return jsonResponse({ error: 'Missing DOUBAO_API_KEY secret' }, 500);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (error) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400);
    }

    if (!payload.image || typeof payload.image !== 'string') {
      return jsonResponse({ error: 'Missing image' }, 400);
    }

    const doubaoResponse = await fetch('https://ark.cn-beijing.volces.com/api/v3/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.DOUBAO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: env.DOUBAO_MODEL || 'doubao-seed-2-0-pro-260215',
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
      const message = await doubaoResponse.text();
      return jsonResponse({ error: 'Doubao API request failed', detail: message }, 502);
    }

    const data = await doubaoResponse.json();
    const rawContent = data?.choices?.[0]?.message?.content?.trim() || '';
    const results = parseResults(rawContent);
    return jsonResponse({ results });
  },
};

async function listDocuments(env) {
  const documents = await readDocumentIndex(env);
  return jsonResponse({ documents });
}

async function saveDocument(request, env) {
  if (!env.DOCS_KV) {
    return jsonResponse({ error: 'Missing DOCS_KV binding' }, 500);
  }

  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return jsonResponse({ error: 'Invalid form data' }, 400);
  }

  const file = form.get('file');
  const title = cleanTitle(String(form.get('title') || '英语笔记整理'));
  if (!file || typeof file.arrayBuffer !== 'function') {
    return jsonResponse({ error: 'Missing Word file' }, 400);
  }

  const bytes = await file.arrayBuffer();
  const now = new Date();
  const id = `${now.getTime()}-${crypto.randomUUID().slice(0, 8)}`;
  const fileName = `${title}_${now.getTime()}.docx`;
  const key = `documents/${id}.docx`;

  await env.DOCS_KV.put(key, bytes, {
    metadata: {
      title,
      fileName,
      size: bytes.byteLength,
      createdAt: now.toISOString(),
    },
  });

  const documents = await readDocumentIndex(env);
  const item = {
    id,
    title,
    fileName,
    key,
    size: bytes.byteLength,
    createdAt: now.toISOString(),
    url: `/files/${encodeURIComponent(id)}.docx`,
  };
  documents.unshift(item);
  await writeDocumentIndex(env, documents.slice(0, 50));

  return jsonResponse({ document: item });
}

async function downloadDocument(url, env, headOnly = false) {
  if (!env.DOCS_KV) {
    return jsonResponse({ error: 'Missing DOCS_KV binding' }, 500);
  }

  const fileId = decodeURIComponent(url.pathname.replace('/files/', '')).replace(/\.docx$/, '');
  if (!/^[0-9]+-[a-f0-9-]+$/i.test(fileId)) {
    return jsonResponse({ error: 'Invalid file id' }, 400);
  }

  const result = await env.DOCS_KV.getWithMetadata(`documents/${fileId}.docx`, 'arrayBuffer');
  if (!result.value) {
    return jsonResponse({ error: 'Document not found' }, 404);
  }

  const headers = new Headers();
  const fileName = result.metadata?.fileName || `${fileId}.docx`;
  headers.set('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  headers.set('Cache-Control', 'private, max-age=0, no-store');
  return new Response(headOnly ? null : result.value, { headers });
}

async function readDocumentIndex(env) {
  if (!env.DOCS_KV) return [];
  const text = await env.DOCS_KV.get(DOC_INDEX_KEY);
  if (!text) return [];
  try {
    const data = JSON.parse(text);
    return Array.isArray(data.documents) ? data.documents : [];
  } catch (error) {
    return [];
  }
}

async function writeDocumentIndex(env, documents) {
  await env.DOCS_KV.put(DOC_INDEX_KEY, JSON.stringify({ documents }, null, 2));
}

function cleanTitle(title) {
  return title
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40) || '英语笔记整理';
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

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      'Content-Type': 'application/json; charset=utf-8',
    },
  });
}
