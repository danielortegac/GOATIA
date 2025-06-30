// --- Netlify Function: get-ai-response.js ---
// VERSIÓN CORREGIDA SIGUIENDO LA GUÍA

// Importar las dependencias necesarias. Asegúrate de tener 'openai' y 'node-fetch' en tu package.json
const { OpenAI } = require("openai");
const fetch = require('node-fetch');

exports.handler = async (event) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const { prompt, history, model, imageData, pdfText, workflow, userName } = JSON.parse(event.body);
        let botReply = '';
        
        console.log('MODELO RECIBIDO:', model); // Log para verificar el modelo que llega

        // 2. Si el modelo es 'sonar' o 'sonar-pro', usar la API de Perplexity
        if (model && model.startsWith('sonar')) {
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) {
                throw new Error('La clave de API de Perplexity (PERPLEXITY_API_KEY) no está configurada en Netlify.');
            }

            const perplexityBody = {
                model: model, // 'sonar' o 'sonar-pro'
                messages: [
                    { role: 'system', content: 'Eres un asistente de búsqueda preciso y conciso. Responde en español y cita tus fuentes cuando sea posible.' },
                    ...(history || []),
                    { role: 'user', content: prompt }
                ]
            };

            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                    'Accept': 'application/json' // Cabecera crucial añadida
                },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorText = await apiResponse.text();
                 console.error('Perplexity API Error Response:', errorText);
                 throw new Error(`Error de Perplexity: ${apiResponse.status} - ${errorText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;

        } else { 
            // 3. Si no es 'sonar', usar la API de OpenAI
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                throw new Error('La clave de API de OpenAI (OPENAI_API_KEY) no está configurada en Netlify.');
            }
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            let messages = [];

            // System Prompt para personalidad y trato por nombre
            const friendlyPrompt = `Eres GOATBOT, un asistente de IA excepcionalmente amable y servicial. Siempre que sea relevante, dirígete al usuario por su nombre, '${userName || 'amigo/a'}'. Saluda con cariño (ej. '¡Hola ${userName || 'qué tal'}! Espero que tengas un día increíble.'), y despídete de forma atenta. Tu tono debe ser siempre positivo y respetuoso.`;
            messages.push({ role: 'system', content: friendlyPrompt });

            // System Prompt específico para el workflow de "English Teacher"
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

        // 4. Enviar la respuesta al frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: botReply }),
        };

    } catch (error) {
        // Manejo de errores mejorado
        console.error('Error CAPTURADO en la función de Netlify:', error.toString());
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
