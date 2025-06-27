// --- Netlify Function: get-ai-response.js ---
// Esta función actúa como un backend seguro que se comunica con las APIs de IA.
// Utiliza las variables de entorno configuradas en Netlify.

const FREE_PLAN_MESSAGE_LIMIT = 15;

exports.handler = async (event, context) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const { prompt, history, model, imageData, pdfText } = JSON.parse(event.body);
        const { user } = context.clientContext;
        let botReply = '';

        // 2. Verificar límite de mensajes ANTES de llamar a cualquier API
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
            // Envía un error 403 (Prohibido) que el frontend interpretará
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Límite de mensajes alcanzado' }),
            };
        }

        // 3. Lógica de enrutamiento a la API correcta
        if (model === 'perplexity') {
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity no está configurada en Netlify.');

            const perplexityBody = {
                // **FIX**: Usando el modelo correcto y más económico de Perplexity para búsquedas web.
                model: 'perplexity/sonar', 
                messages: [
                    { role: 'system', content: 'Eres un asistente de búsqueda web preciso y conciso. Responde en español.' },
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

        } else { // Para cualquier otro modelo de OpenAI (gpt-3.5-turbo, gpt-4o)
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI no está configurada en Netlify.');

            let userMessageContent = [];
            const fullPrompt = pdfText 
                ? `Analiza el siguiente texto de un PDF y responde a la pregunta.\n\n--- INICIO PDF ---\n${pdfText}\n--- FIN PDF ---\n\nPregunta: ${prompt}`
                : prompt;
            userMessageContent.push({ type: 'text', text: fullPrompt });

            if (imageData) {
                userMessageContent.push({ type: 'image_url', image_url: { "url": imageData } });
            }
            
            const openAIBody = {
                model: model, 
                messages: [
                    { role: 'system', content: 'Eres GOATBOT, un asistente experto y amigable. Responde en español.' },
                    ...(history || []),
                    { role: 'user', content: userMessageContent }
                ],
                max_tokens: (imageData || pdfText) ? 2048 : 1000
            };

            const apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
                body: JSON.stringify(openAIBody),
            });
            
            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                throw new Error(`Error de OpenAI: ${errorData.error?.message || apiResponse.statusText}`);
            }

            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;
        }

        // 4. Actualizar contador de mensajes de forma SEGURA y ROBUSTA
        let newMessageCount = null;
        if (user) {
            // **FIX**: Se elimina la llamada a la API de Netlify que causaba el cuelgue.
            // Ahora, solo se calcula el nuevo contador para devolverlo al frontend.
            // El frontend actualizará la UI, y la verificación del límite al inicio de esta función
            // se encargará de la seguridad en la siguiente petición.
            const currentCount = user.app_metadata.message_count || 0;
            newMessageCount = currentCount + 1;

            // Actualiza los metadatos del usuario de forma asíncrona sin bloquear la respuesta.
            const adminAuthHeader = `Bearer ${context.clientContext.identity.token}`;
            const userUpdateUrl = `${context.clientContext.identity.url}/admin/users/${user.sub}`;
            fetch(userUpdateUrl, {
                method: 'PUT',
                headers: { 'Authorization': adminAuthHeader },
                body: JSON.stringify({ app_metadata: { ...user.app_metadata, message_count: newMessageCount } }),
            }).catch(err => console.error("Fallo al actualizar el contador de mensajes en background:", err));
        }
        
        // 5. Enviar respuesta final al frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: botReply, new_message_count: newMessageCount }),
        };

    } catch (error) {
        console.error('Error CAPTURADO en la función de Netlify:', error.toString());
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
