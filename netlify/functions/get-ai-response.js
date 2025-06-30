// --- Netlify Function: get-ai-response.js ---
// VERSIÓN 9 - CORRECCIÓN FINAL BASADA EN EL EJEMPLO FUNCIONAL

// Usamos el 'fetch' global de Node.js 18 (nativo).
const { OpenAI } = require('openai');

/**
 * Helper function to build the message structure for the Perplexity API.
 * @param {string} prompt The user's prompt.
 * @returns {Array<Object>} The messages array for the API request.
 */
function buildPerplexityMessages(prompt) {
  /* Siempre: 1 system + 1 user   */
  return [
    {
      role: 'system',
      content:
        'Eres un asistente de búsqueda en español. Responde breve y cita fuentes al final.',
    },
    { role: 'user', content: prompt },
  ];
}

exports.handler = async (event) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    console.log("--- INICIO EJECUCIÓN V9 ---");

    try {
        const body = JSON.parse(event.body);
        const { prompt, history, model, imageData, pdfText, workflow, userName } = body;
        
        const cleanedModel = (model && typeof model === 'string') ? model.trim().toLowerCase() : '';
        console.log(`Modelo recibido: '${model}', Modelo limpiado: '${cleanedModel}'`);

        // --- CORRECCIÓN CLAVE ---
        // Se ajusta la condición para que coincida con el valor enviado por el frontend ('perplexity')
        if (cleanedModel === 'perplexity') {
            console.log(`Ruta seleccionada: Perplexity (modelo: ${model})`);
            
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) {
                throw new Error('La clave de API de Perplexity no está configurada.');
            }

            if (!prompt || typeof prompt !== 'string' || prompt.trim() === '') {
                throw new Error("El prompt del usuario está vacío o es inválido.");
            }

            // Usamos un modelo específico de Perplexity compatible, como 'llama-3-sonar-large-32k-online'
            // ya que 'perplexity' no es un nombre de modelo válido para la API.
            const perplexityBody = {
               model: 'llama-3-sonar-large-32k-online', 
               messages: buildPerplexityMessages(prompt),
            };
            
            console.log("Enviando petición a la API de Perplexity...");
            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Accept': 'application/json' },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorText = await apiResponse.text();
                 console.error("Perplexity raw error:", errorText);
                 throw new Error(`Error de Perplexity: ${apiResponse.status} - ${errorText}`);
            }
            
            const data = await apiResponse.json();
            const botReply = data.choices[0].message.content;
            console.log("Respuesta OK de Perplexity 200");
            return { statusCode: 200, body: JSON.stringify({ reply: botReply }) };

        } else { 
            console.log(`Ruta seleccionada: OpenAI (modelo: ${model})`);

            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('La clave de API de OpenAI no está configurada.');
            }
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            
            let messages = [];
            const friendlyPrompt = `Eres GOATBOT, un asistente de IA amable. Dirígete al usuario por su nombre, '${userName || 'amigo/a'}'.`;
            messages.push({ role: 'system', content: friendlyPrompt });
            if (history) { messages.push(...history); }
            let userMessageContent = [{ type: 'text', text: pdfText ? `Analiza el PDF y responde: \n\n${pdfText}\n\nPregunta: ${prompt}` : prompt }];
            if (imageData && model === 'gpt-4o') { userMessageContent.push({ type: 'image_url', image_url: { "url": imageData } }); }
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
