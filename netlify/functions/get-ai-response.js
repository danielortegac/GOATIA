// --- Netlify Function: get-ai-response.js ---
// VERSIÓN CON LA CORRECCIÓN DEFINITIVA BASADA EN LA INVESTIGACIÓN DEL USUARIO.
// El problema era el formato del nombre del modelo de Perplexity.

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

        // 2. Verificar límite de mensajes
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
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
                // **CORRECCIÓN DEFINITIVA**: Usando el nombre del modelo sin el prefijo "perplexity/".
                // Este es el formato correcto según la investigación del usuario.
                model: 'sonar', 
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

        } else { // Lógica para OpenAI
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

        // 4. Actualizar contador de mensajes
        let newMessageCount = null;
        if (user) {
            const currentCount = user.app_metadata.message_count || 0;
            newMessageCount = currentCount + 1;
            
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
