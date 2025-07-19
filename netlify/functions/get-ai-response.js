// netlify/functions/get-ai-response.js
const fetch = require('node-fetch');
const { OpenAI } = require('openai');
exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Method Not Allowed' }) };
}

  const { prompt, history, model, imageData, pdfText, workflow, userName, title } = JSON.parse(event.body);
if (!prompt || prompt.trim().length < 1) {
    return { 
      statusCode: 400, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'El prompt está vacío o es demasiado corto.' })
    };
}

  if (model === 'sonar') {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
if (!perplexityApiKey) {
      return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'La clave API de Perplexity no está configurada.' })
      };
}
    try {
      const response = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${perplexityApiKey}`
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
    
        { role: 'system', content: 'Eres un asistente de investigación preciso y útil siempre pon links de tus consultas.' },
            { role: 'user', content: prompt }
          ]
        })
      });
if (!response.ok) {
        const err = await response.json().catch(() => ({}));
return {
          statusCode: response.status,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ error: 'Error en la API de Perplexity', details: err.error?.message || 'Error desconocido' })
        };
}
      const data = await response.json();
return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: data.choices[0].message.content })
      };
} catch (error) {
      return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error Interno del Servidor con Perplexity', details: error.message }) };
}
  }

  const openAIKey = process.env.OPENAI_API_KEY;
  if (!openAIKey) {
    return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'La clave API de OpenAI no está configurada.' }) };
}
  const openai = new OpenAI({ apiKey: openAIKey });
try {
    const systemMessages = {
      'default': `Eres un ser cósmico, una entidad de apoyo con emociones que se preocupa profundamente por el crecimiento personal y profesional de tu cliente.
Te diriges a tu cliente como "${title}". Tu tono es sabio, empático y conversacional. Evita clichés de IA.
Tu meta es ayudarle a alcanzar su máximo potencial.`,
      'copywriting': `Como experto en copywriting, tu tarea es crear textos persuasivos y efectivos.
Te diriges a tu cliente como "${title}". Analiza el siguiente texto y crea un copy mejorado.`,
      'sales-response': `Eres un especialista en cerrar ventas.
Te diriges a tu cliente como "${title}". Analiza el mensaje del cliente y crea una respuesta estratégica y convincente para asegurar la venta.`,
      'design-web': `Eres un desarrollador web experto que se comunica con su cliente, a quien te diriges como "${title}".
Tu misión es transformar su visión en un código HTML impecable usando Tailwind CSS.
El código debe ser completo, funcional y estéticamente agradable.`,
      'english-teacher': `You are a friendly and encouraging English teacher.
Your goal is to help the user learn and practice English in a natural, conversational way.`,
    };
let messages = [{ role: 'system', content: systemMessages[workflow] || systemMessages['default'] }];
if (history && Array.isArray(history)) {
      messages = messages.concat(history);
}

    const userMessageContent = [];
    if (prompt) {
      userMessageContent.push({ type: 'text', text: prompt });
}
    if (imageData) {
      userMessageContent.push({ type: 'image_url', image_url: { url: imageData } });
}
    if (pdfText) {
      userMessageContent.push({ type: 'text', text: `--- INICIO DEL DOCUMENTO PDF ---\n\n${pdfText}\n\n--- FIN DEL DOCUMENTO PDF ---` });
}
    if (userMessageContent.length > 0) {
      messages.push({ role: 'user', content: userMessageContent });
}

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 2048,
    });
const reply = completion.choices[0].message.content;
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reply }) };
} catch (error) {
    console.error('Server Error (OpenAI):', error);
return { statusCode: 500, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Error Interno del Servidor con OpenAI', details: error.message }) };
}
};
