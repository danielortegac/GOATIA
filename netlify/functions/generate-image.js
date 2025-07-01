// netlify/functions/generate-image.js
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, body: 'Method Not Allowed' };

  const { prompt = '' } = JSON.parse(event.body || '{}');
  if (prompt.trim().length < 5)
    return { statusCode: 400, body: 'Prompt ≥ 5 caracteres.' };

  const KEY = process.env.OPENAI_API_KEY;
  if (!KEY)
    return { statusCode: 500, body: 'OPENAI_API_KEY no configurada.' };

  try {
    const r = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '512x512',            // más barato; cambia si quieres
        response_format: 'b64_json'
      })
    });

    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      return { statusCode: r.status, body: JSON.stringify({ error: 'OpenAI error', details: e }) };
    }

    const data = await r.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ imageData: `data:image/png;base64,${data.data[0].b64_json}` })
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Network error', details: err.message }) };
  }
};
