// --- Netlify Function: get-ai-response.js ---
// VERSIÓN CORREGIDA Y DEFINITIVA

const { OpenAI } = require("openai"); // Asegúrate de tener esta dependencia
const fetch = require('node-fetch'); // Y esta también

// Límite para el plan gratuito
const FREE_PLAN_MESSAGE_LIMIT = 15;

exports.handler = async (event, context) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const { prompt, history, model, imageData, pdfText, workflow, userName } = JSON.parse(event.body);
        const { user } = context.clientContext;
        let botReply = '';

        // 2. Guarda de seguridad para el límite de mensajes (si aplica)
        // (Esta lógica depende de cómo manejes los planes, la dejo como referencia)
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
            return { statusCode: 403, body: JSON.stringify({ error: 'Límite de mensajes alcanzado' }) };
        }

        // 3. Lógica de enrutamiento a la API correcta
        // ¡AQUÍ ESTÁ LA CORRECCIÓN! Ahora busca 'sonar'.
        if (model === 'sonar') {
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity no está configurada en Netlify.');

            const perplexityBody = {
                model: 'sonar', // Usamos el modelo correcto para la API
                messages: [
                    { role: 'system', content: 'You are a helpful AI assistant with real-time web access. Provide concise, up-to-date, and accurate answers in Spanish.' },
                    ...(history || []),
                    { role: 'user', content: prompt }
                ]
            };

            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}` },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorData = await apiResponse.json();
                 throw new Error(`Error de Perplexity: ${errorData.error?.message || apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;

        } else { // Lógica para OpenAI
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI no está configurada en Netlify.');
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

            let messages = [];

            // System Prompts for Personality & Workflows
            const friendlyPrompt = `Eres GOATBOT, un asistente de IA excepcionalmente amable y servicial. Siempre que sea relevante, dirígete al usuario por su nombre, '${userName}'. Saluda con cariño (ej. '¡Hola ${userName}! Espero que tengas un día increíble.'), y despídete de forma atenta. Tu tono debe ser siempre positivo y respetuoso.`;
            messages.push({ role: 'system', content: friendlyPrompt });

            if (workflow === 'english-teacher') {
                messages.push({ role: 'system', content: "You are an expert English Teacher. ALWAYS respond in English. If the user makes a mistake, gently correct them, explain the error, and provide the correct version before continuing. If the user asks for a translation, provide it clearly. You must always speak your full English response." });
            }

            // Add chat history
            if (history) {
                messages.push(...history);
            }

            // Format User Message (with files if present)
            let userMessageContent = [];
            const fullPrompt = pdfText 
                ? `Analiza el siguiente texto de un PDF y responde a la pregunta.\n\n--- INICIO PDF ---\n${pdfText}\n--- FIN PDF ---\n\nPregunta: ${prompt}`
                : prompt;
            userMessageContent.push({ type: 'text', text: fullPrompt });

            if (imageData) {
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

        // 4. Enviar respuesta final al frontend
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
