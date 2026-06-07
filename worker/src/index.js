const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
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
