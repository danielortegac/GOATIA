export async function handler(event) {
  try {
    const { prompt, model = 'sonar' } = JSON.parse(event.body);
    // el model correcto:
    const MODEL_MAP = {
      sonar: 'sonar-small-chat',
      'sonar-small-chat': 'sonar-small-chat',
      'sonar-medium-chat': 'sonar-medium-chat'
    };
    const perplexityModel = MODEL_MAP[model] || MODEL_MAP.sonar;

    // DEBUG: payload mínimo
    const messages = [
      {
        role: 'system',
        content: 'Eres un asistente de búsqueda preciso y conciso. Responde en español y cita tus fuentes.'
      },
      { role: 'user', content: prompt }
    ];
    console.log('📦 Payload a Perplexity:', JSON.stringify({ model: perplexityModel, messages }, null, 2));

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {/*…*/},
      body: JSON.stringify({ model: perplexityModel, messages })
    });
    if (!res.ok) throw new Error(`Perplexity ${res.status}`);
    const { choices } = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ answer: choices[0].message.content })
    };
  } catch (e) {
    console.error('💥 ERROR CRÍTICO:', e.message);
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
}
