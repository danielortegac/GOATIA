// netlify/functions/get-ai-response.js

// Define un único mensaje de sistema para evitar duplicados.
const SYSTEM_MESSAGE = {
  role: 'system',
  content: 'Eres un asistente de búsqueda preciso y conciso. Responde en español y cita tus fuentes.'
};

exports.handler = async (event) => {
  // Asegurarse de que el body no es nulo y parsearlo de forma segura.
  if (!event.body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Request body is missing' }) };
  }
  
  const { prompt, history = [], model = 'perplexity' } = JSON.parse(event.body);

  /* ─ 1.   Elegir modelo válido ───────────────────────────── */
  // Mapea los valores del frontend a modelos reales de la API de Perplexity.
  const MODEL_MAP = {
    perplexity:        'sonar-small-chat',      // selector del front
    sonar:             'sonar-small-chat',
    'sonar-small-chat':'sonar-small-chat',
    'sonar-medium-chat':'sonar-medium-chat'
  };
  const modelName = MODEL_MAP[model.toLowerCase()] || MODEL_MAP.perplexity;

  /* ─ 2.   Limpiar el history ─────────────────────────────── */
  // Este bucle es clave para garantizar un payload válido.
  const clean = [];
  for (const m of history) {
    if (!['user', 'assistant'].includes(m.role)) continue;      // Ignora sistemas viejos del historial.
    if (clean.length === 0 && m.role !== 'user') continue;    // El historial no puede empezar con el asistente.
    if (clean.length > 0 && clean[clean.length - 1].role === m.role) continue; // No permitir dos roles iguales seguidos.
    clean.push({ role: m.role, content: m.content });
  }

  /* ─ 3.   Construir mensajes: system + history + prompt ─── */
  // Se asegura de que la estructura siempre sea: [system, (opcional) user, assistant, ... , user]
  const messages = [
    SYSTEM_MESSAGE,
    ...clean,
    { role: 'user', content: prompt }
  ];

  console.log('📦 Payload a Perplexity', JSON.stringify({ model: modelName, messages }, null, 2));

  /* ─ 4.   Llamar a la API de Perplexity ───────────────────── */
  try {
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method : 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization' : `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body   : JSON.stringify({ model: modelName, messages })
    });

    if (!res.ok) {
      const err = await res.json().catch(()=>({}));
      console.error('Error de Perplexity:', err);
      throw new Error(`Perplexity ${res.status}: ${err.error?.message || res.statusText}`);
    }

    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ reply: data.choices[0].message.content })
    };
  } catch (error) {
    console.error('Error al llamar a la API:', error);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
    };
  }
};
