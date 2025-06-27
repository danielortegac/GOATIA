// Este es el código para tu función serverless de Netlify.
// Se encarga de llamar de forma SEGURA a las APIs de OpenAI y Perplexity.

// En la terminal de tu proyecto, ejecuta: npm init -y && npm install node-fetch
const fetch = require('node-fetch');

// --- CONSTANTES DE LÍMITES Y MODELOS ---
const FREE_PLAN_MESSAGE_LIMIT = 15;

/**
 * Función principal de Netlify (Handler).
 * Punto de entrada para TODAS las solicitudes de IA desde el frontend.
 */
exports.handler = async function(event, context) {
  // 1. VALIDACIÓN INICIAL
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
  }

  try {
    const { prompt, history, model, imageData, pdfText } = JSON.parse(event.body);
    const { user } = context.clientContext;

    // 2. LÓGICA DE LÍMITES Y PERMISOS
    if (user) { // Usuario está logueado
      const userPlan = user.app_metadata.plan || 'free';
      const messageCount = user.app_metadata.message_count || 0;

      if (userPlan === 'free' && messageCount >= FREE_PLAN_MESSAGE_LIMIT) {
        return { 
          statusCode: 402, // Payment Required
          body: JSON.stringify({ error: `Has alcanzado el límite de ${FREE_PLAN_MESSAGE_LIMIT} mensajes de tu plan gratuito. ¡Haz un upgrade para continuar!` }) 
        };
      }
    }

    // 3. LLAMADA A LA API DE IA CORRESPONDIENTE
    let aiResponse;
    if (model === 'perplexity') {
      aiResponse = await getPerplexityResponse(prompt, pdfText);
    } else {
      aiResponse = await getOpenAIResponse(prompt, history, model, imageData, pdfText);
    }
    
    // 4. ACTUALIZAR CONTADOR (SI ES NECESARIO)
    if (user) {
      await updateUserMessageCount(user);
    }

    // 5. RESPUESTA EXITOSA
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reply: aiResponse }),
    };

  } catch (error) {
    console.error("Error en la Netlify Function:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Error interno del servidor: ${error.message}` }),
    };
  }
};


// --- FUNCIÓN PARA LLAMAR A PERPLEXITY ---
async function getPerplexityResponse(prompt, pdfText) {
  const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
  if (!PERPLEXITY_API_KEY) throw new Error("La API key de Perplexity no está configurada en el servidor.");

  const apiUrl = "https://api.perplexity.ai/chat/completions";
  let fullPrompt = pdfText ? `Basado en el siguiente texto, responde la pregunta.\n\nDOCUMENTO:\n${pdfText}\n\nPREGUNTA:\n${prompt}` : prompt;
  
  const payload = { model: "llama-3.1-sonar-large-128k-online", messages: [ { role: "system", content: "You are a helpful and precise search assistant. Respond in Spanish." }, { role: "user", content: fullPrompt } ] };
  const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Error en la API de Perplexity: ${response.status} ${await response.text()}`);
  const result = await response.json();
  return result.choices?.[0]?.message?.content || "No se pudo obtener respuesta de Perplexity.";
}

// --- FUNCIÓN PARA LLAMAR A OPENAI ---
async function getOpenAIResponse(prompt, history, model, imageData, pdfText) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  if (!OPENAI_API_KEY) throw new Error("La API key de OpenAI no está configurada en el servidor.");

  let messages = [{ role: "system", content: "You are GOATBOT Pro. Always respond in Markdown format." }, ...history];
  const userMessageContent = [];
  
  let fullPrompt = pdfText ? `Analiza el siguiente texto y luego responde a mi solicitud.\n\nDOCUMENTO:\n${pdfText}\n\nSOLICITUD:\n${prompt}` : prompt;
  
  if (fullPrompt) userMessageContent.push({ type: "text", text: fullPrompt });
  if (imageData) userMessageContent.push({ type: "image_url", image_url: { url: imageData } });
  
  if (userMessageContent.length > 0) messages.push({ role: "user", content: userMessageContent });

  const payload = { model: model, messages, max_tokens: 4096 };
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` }, body: JSON.stringify(payload) });
  if (!response.ok) throw new Error(`Error en la API de OpenAI: ${response.status} ${await response.text()}`);
  const result = await response.json();
  return result.choices?.[0]?.message?.content || "No se pudo obtener respuesta de OpenAI.";
}

// --- FUNCIÓN PARA ACTUALIZAR METADATOS DE USUARIO ---
async function updateUserMessageCount(user) {
    const NETLIFY_API_TOKEN = process.env.NETLIFY_API_TOKEN;
    if (!NETLIFY_API_TOKEN) { console.warn("NETLIFY_API_TOKEN no está configurado."); return; }
    const currentCount = user.app_metadata.message_count || 0;
    try {
        await fetch(`https://api.netlify.com/api/v1/users/${user.sub}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${NETLIFY_API_TOKEN}` },
            body: JSON.stringify({ app_metadata: { ...user.app_metadata, message_count: currentCount + 1 } })
        });
    } catch (error) { console.error("Error al actualizar metadatos del usuario:", error); }
}
