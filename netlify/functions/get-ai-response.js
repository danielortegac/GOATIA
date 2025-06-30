// netlify/functions/get-ai-response.js

// Usamos el 'fetch' global de Node.js 18 (nativo).
const { OpenAI } = require('openai');

/**
 * Helper function to build the message structure for the Perplexity API.
 * @param {string} prompt The user's prompt.
 * @returns {Array<Object>} The messages array for the API request.
 */
function buildPerplexityMessages(prompt, history) {
  // Limpia el historial para asegurar una secuencia válida
  const cleanHistory = [];
  for (const msg of history) {
      if (!['user', 'assistant'].includes(msg.role)) continue;
      if (cleanHistory.length === 0 && msg.role !== 'user') continue;
      if (cleanHistory.length > 0 && cleanHistory[cleanHistory.length - 1].role === msg.role) continue;
      cleanHistory.push({ role: msg.role, content: msg.content });
  }

  // Estructura final: [system, ...cleanHistory, user_prompt]
  return [
    {
      role: 'system',
      content: 'Eres un asistente de búsqueda en español. Responde breve y cita fuentes al final.',
    },
    ...cleanHistory,
    { role: 'user', content: prompt },
  ];
}


exports.handler = async (event) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    console.log("--- INICIO EJECUCIÓN VERSIÓN FINAL ---");

    try {
        const body = JSON.parse(event.body);
        const { prompt, history = [], model, imageData, pdfText, workflow, userName } = body;
        
        const cleanedModel = (model && typeof model === 'string') ? model.trim().toLowerCase() : '';
        console.log(`Modelo recibido: '${model}', Modelo limpiado: '${cleanedModel}'`);

        // --- LÓGICA DE ENRUTAMIENTO RESTAURADA ---
        // Acepta 'sonar' o 'perplexity' para máxima compatibilidad con el frontend.
        if (cleanedModel.startsWith('sonar') || cleanedModel === 'perplexity') {
            console.log(`Ruta seleccionada: Perplexity`);
            
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity no está configurada.');
            if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') throw new Error("El prompt del usuario está vacío o es inválido.");
            
            // --- CORRECCIÓN FINAL VERIFICADA ---
            // Se usa el modelo online principal de Perplexity: sonar-pro
            const modelName = 'sonar-pro';

            const perplexityBody = {
               model: modelName, 
               messages: buildPerplexityMessages(prompt, history),
            };
            
            console.log("Enviando a Perplexity:", JSON.stringify(perplexityBody, null, 2));
            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Accept': 'application/json' },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorText = await apiResponse.text();
                 throw new Error(`Error de Perplexity: ${apiResponse.status} - ${errorText}`);
            }
            
            const data = await apiResponse.json();
            return { statusCode: 200, body: JSON.stringify({ reply: data.choices[0].message.content }) };

        } else { 
            // --- LÓGICA DE OPENAI RESTAURADA ---
            console.log(`Ruta seleccionada: OpenAI (modelo: ${model})`);

            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI no está configurada.');
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            
            let messages = [];
            messages.push({ role: 'system', content: `Eres GOATBOT, un asistente de IA amable. Dirígete al usuario por su nombre, '${userName || 'amigo/a'}'.` });
            
            // Se sanea el historial para que OpenAI lo acepte
            if (history) {
                const sanitizedHistory = history.map(msg => ({
                    role: msg.role,
                    content: msg.content || "" 
                }));
                messages.push(...sanitizedHistory);
            }
            
            let userMessageContent = [{ type: 'text', text: pdfText ? `Analiza el PDF y responde: \n\n${pdfText}\n\nPregunta: ${prompt}` : prompt || "" }];
            if (imageData && model === 'gpt-4o') {
                userMessageContent.push({ type: 'image_url', image_url: { "url": imageData } });
            }
            messages.push({ role: 'user', content: userMessageContent });
            
            const completion = await openai.chat.completions.create({
                model: model, 
                messages: messages,
                max_tokens: (imageData || pdfText) ? 2048 : 1000
            });

            const botReply = completion.choices[0].message.content;
            return { statusCode: 200, body: JSON.stringify({ reply: botReply }) };
        }

    } catch (error) {
        console.error('--- ERROR CRÍTICO CAPTURADO ---', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
