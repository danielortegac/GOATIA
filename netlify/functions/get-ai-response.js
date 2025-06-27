// GOATBOT – v2 (100 % server-side, no expone claves)
const FREE_PLAN_MESSAGE_LIMIT = 15;
const json = (code, obj) => ({ statusCode: code, headers:{'Content-Type':'application/json'}, body:JSON.stringify(obj) });

exports.handler = async (event, context) => {
  if (event.httpMethod !== 'POST') { return json(405,{error:'Method Not Allowed'}); }

  try {
    const { prompt, history = [], model = 'gpt-3.5-turbo' } = JSON.parse(event.body || '{}');
    const user = context.clientContext?.user || null;

    if (!user && history.length >= FREE_PLAN_MESSAGE_LIMIT) {
      return json(429,{error:'Límite alcanzado. Regístrate gratis 🚀'});
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY no configurada');

    const messages = [
      { role:'system', content:'Eres GOATBOT, asistente experto de Goatify.' },
      ...history, { role:'user', content: prompt }
    ];

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method:'POST',
      headers:{'Content-Type':'application/json', Authorization:`Bearer ${apiKey}`},
      body:JSON.stringify({ model, messages })
    });
    if (!r.ok) throw new Error(await r.text());
    const { choices } = await r.json();
    return json(200,{ reply: choices[0].message.content });

  } catch (err) {
    console.error('GOATBOT error:', err);
    return json(500,{error:err.message});
  }
};
