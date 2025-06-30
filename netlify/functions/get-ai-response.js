// --- Netlify Function: get-ai-response.js ---
// VERSIÓN FINAL Y CORREGIDA SIGUIENDO LA GUÍA

const { OpenAI } = require("openai");
const fetch = require('node-fetch');

// HELPER PARA CONSTRUIR EL MENSAJE DE PERPLEXITY
function buildPerplexityMessages(prompt) {
  /* Siempre: 1 system + 1 user */
  return [
    {
      role: 'system',
      content: 'Eres un asistente de búsqueda en español. Responde breve y cita tus fuentes al final.',
    },
    { role: 'user', content: prompt },
  ];
}

exports.handler = async (event) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const { prompt, history, model, imageData, pdfText, workflow, userName } = JSON.parse(event.body);
        let botReply = '';

        console.log('MODELO RECIBIDO:', model); // Log para verificar

        // Si el modelo es de Perplexity, usa la API de Perplexity
        if (model && model.startsWith('sonar')) {
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity (PERPLEXITY_API_KEY) no está configurada en Netlify.');

            // --- BLOQUE CORREGIDO ---
            const perplexityBody = {
                model: model, // 'sonar' o 'sonar-pro'
                max_tokens: 1024,
                temperature: 0.7,
                messages: buildPerplexityMessages(prompt), // Usando el helper
            };

            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Accept': 'application/json'
                },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorText = await apiResponse.text();
                 console.error('Perplexity raw error:', errorText);
                 throw new Error(`Perplexity ${apiResponse.status}: ${errorText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;

        } else { 
            // Lógica para OpenAI (sin cambios)
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI (OPENAI_API_KEY) no está configurada en Netlify.');
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            let messages = [];

            const friendlyPrompt = `Eres GOATBOT, un asistente de IA excepcionalmente amable y servicial. Siempre que sea relevante, dirígete al usuario por su nombre, '${userName || 'amigo/a'}'. Saluda con cariño (ej. '¡Hola ${userName || 'qué tal'}! Espero que tengas un día increíble.'), y despídete de forma atenta. Tu tono debe ser siempre positivo y respetuoso.`;
            messages.push({ role: 'system', content: friendlyPrompt });

            if (workflow === 'english-teacher') {
                messages.push({ role: 'system', content: "You are an expert English Teacher and translator. Your primary language for conversation is English. ALWAYS respond in English. If the user makes a mistake, gently correct them, explain the error briefly, and then provide the correct version before continuing the conversation. If the user asks for a translation, provide it clearly. You must always speak your full English response." });
            }

            if (history) {
                messages.push(...history);
            }

            let userMessageContent = [];
            const fullPrompt = pdfText 
                ? `Analiza el siguiente texto de un PDF y responde a la pregunta.\n\n--- INICIO PDF ---\n${pdfText}\n--- FIN PDF ---\n\nPregunta: ${prompt}`
                : prompt;
            userMessageContent.push({ type: 'text', text: fullPrompt });

            if (imageData && model === 'gpt-4o') {
                userMessageContent.push({ type: 'image_url', image_url: { "url": imageData } });
            }
            
            messages.push({ role: 'user', content: userMessageContent });
            
            const completion = await openai.chat.completions.create({
                model: model, 
                messages: messages,
                max_tokens: (imageData || pdfText) ? 2048 : 1000
            });

            botReply = completion.choices[0].message.content;
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: botReply }),
        };

    } catch (error) {
        console.error('Error CAPTURADO en la función de Netlify:', error.toString());
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
