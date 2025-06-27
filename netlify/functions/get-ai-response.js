// --- Netlify Function: get-ai-response.js ---
// VERSIÓN FINAL DE DIAGNÓSTICO
// Esta función actúa como un backend seguro que se comunica con las APIs de IA.

const FREE_PLAN_MESSAGE_LIMIT = 15;

exports.handler = async (event, context) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        const bodyData = JSON.parse(event.body);
        
        // --- PASO DE DIAGNÓSTICO ---
        // Vamos a registrar exactamente lo que el frontend está enviando.
        console.log("Datos recibidos del frontend:", JSON.stringify(bodyData, null, 2));

        const { prompt, history, model, imageData, pdfText } = bodyData;
        const { user } = context.clientContext;
        let botReply = '';

        // 3. Verificar límite de mensajes
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
            return {
                statusCode: 403,
                body: JSON.stringify({ error: 'Límite de mensajes alcanzado', details: 'Por favor, actualiza tu plan.' }),
            };
        }

        // 4. Lógica de enrutamiento a la API correcta
        if (model === 'perplexity') {
            console.log(">>> Entrando en la lógica de PERPLEXITY...");
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity no está configurada.');

            const perplexityBody = {
                model: 'llama-3-sonar-small-32k-online',
                messages: [
                    { role: 'system', content: 'Eres un asistente de búsqueda web preciso y conciso. Responde en español.' },
                    ...(history || []),
                    { role: 'user', content: prompt }
                ]
            };

            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorData = await apiResponse.json();
                 console.error('Error desde la API de Perplexity:', errorData);
                 throw new Error(`Error de Perplexity: ${errorData.error?.message || apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;

        } else {
            console.log(`>>> Entrando en la lógica de OPENAI para el modelo: ${model}...`);
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI no está configurada.');

            let userMessageContent = [];
            let requestPrompt = pdfText 
                ? `Analiza el siguiente texto extraído de un PDF y luego responde a la pregunta del usuario.\n\n--- CONTENIDO DEL PDF ---\n${pdfText}\n--- FIN DEL PDF ---\n\nPregunta: ${prompt}`
                : prompt;
            userMessageContent.push({ type: 'text', text: requestPrompt });

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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify(openAIBody),
            });
            
            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                console.error('Error desde la API de OpenAI:', errorData);
                throw new Error(`Error de OpenAI: ${errorData.error?.message || apiResponse.statusText}`);
            }

            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;
        }

        // 5. Actualizar contador de mensajes
        let newMessageCount = null;
        if (user) {
            const currentCount = user.app_metadata.message_count || 0;
            newMessageCount = currentCount + 1;
            const adminAuthHeader = `Bearer ${context.clientContext.identity.token}`;
            const userUpdateUrl = `${context.clientContext.identity.url}/admin/users/${user.sub}`;
            
            await fetch(userUpdateUrl, {
                method: 'PUT',
                headers: { 'Authorization': adminAuthHeader },
                body: JSON.stringify({ app_metadata: { ...user.app_metadata, message_count: newMessageCount } }),
            });
        }
        
        // 6. Enviar respuesta al frontend
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
