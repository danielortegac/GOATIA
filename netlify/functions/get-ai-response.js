// netlify/functions/get-ai-response.js
const SYSTEM_MESSAGE = {
  role : 'system',
  content : 'Eres un asistente de búsqueda preciso y conciso. Responde en español y cita tus fuentes.'
};

exports.handler = async (event) => {
  const { prompt, history = [], model = 'perplexity' } = JSON.parse(event.body);

  /* ─ 1.   Elegir modelo válido ───────────────────────────── */
  const MODEL_MAP = {
    perplexity:        'sonar-small-chat',      // selector del front
    sonar:             'sonar-small-chat',
    'sonar-small-chat':'sonar-small-chat',
    'sonar-medium-chat':'sonar-medium-chat'
  };
  const modelName = MODEL_MAP[model] || MODEL_MAP.perplexity;

  /* ─ 2.   Limpiar el history ─────────────────────────────── */
  const clean = [];

  for (const m of history) {
    if (!['user','assistant'].includes(m.role)) continue;      // ignora sistemas viejos
    if (clean.length === 0 && m.role !== 'user') continue;    // no empieces con assistant
    if (clean.length && clean.at(-1).role === m.role) continue; // no 2 iguales seguidos
    clean.push({ role: m.role, content: m.content });
  }

  /* ─ 3.   Construir mensajes: system + history + prompt ─── */
  const messages = [
    SYSTEM_MESSAGE,
    ...clean,
    { role: 'user', content: prompt }
  ];

  console.log('📦 Payload a Perplexity', JSON.stringify(messages, null, 2));

  /* ─ 4.   Llamar a la API ────────────────────────────────── */
  const res = await fetch('https://api.perplexity.ai/chat/completions', {
    method : 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization : `Bearer ${process.env.PERPLEXITY_API_KEY}`
    },
    body   : JSON.stringify({ model: modelName, messages })
  });

  if (!res.ok) {
    const err = await res.json().catch(()=>({}));
    throw new Error(`Perplexity ${res.status}: ${err.error?.message || res.statusText}`);
  }

  const data = await res.json();
  return {
    statusCode: 200,
    body: JSON.stringify({ reply: data.choices[0].message.content })
  };
};
