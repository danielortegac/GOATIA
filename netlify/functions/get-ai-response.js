// netlify/functions/get-ai-response.js
import fetch from 'node-fetch';

export async function handler(event, context) {
  try {
    // 1. Parsear entrada
    const { prompt, history = [], model = 'sonar' } = JSON.parse(event.body);

    // 2. Elegir modelo válido
    const MODEL_MAP = {
      sonar:             'sonar-small-chat',
      'sonar-small-chat':'sonar-small-chat',
      'sonar-medium-chat':'sonar-medium-chat'
    };
    const perplexityModel = MODEL_MAP[model] || MODEL_MAP.sonar;

    // 3. Sanitizar history: solo user/assistant, alternando roles y sin leading assistant
    const clean = [];
    for (const m of history) {
      if (!['user','assistant'].includes(m.role)) continue;
      // no empieces con assistant
      if (clean.length === 0 && m.role === 'assistant') continue;
      // no repitas rol
      if (clean.length && clean[clean.length-1].role === m.role) continue;
      clean.push(m);
    }

    // 4. Armar array de mensajes: system → [clean history] → user(prompt)
    const messages = [
      {
        role:    'system',
        content: 'Eres un asistente de búsqueda preciso y conciso. Responde en español y cita tus fuentes cuando sea posible.'
      },
      ...clean,
      { role: 'user', content: prompt }
    ];

    // 5. Petición a Perplexity
    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        Authorization:   `Bearer ${process.env.PERPLEXITY_API_KEY}`
      },
      body: JSON.stringify({
        model:    perplexityModel,
        messages
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(`Perplexity ${res.status}: ${err.error?.message || res.statusText}`);
    }

    const { choices } = await res.json();
    const answer = choices?.[0]?.message?.content || 'Sin respuesta';

    return {
      statusCode: 200,
      body:       JSON.stringify({ answer })
    };

  } catch (error) {
    console.error('💥 ERROR CRÍTICO:', error);
    return {
      statusCode: 500,
      body:       JSON.stringify({ error: error.message })
    };
  }
}
