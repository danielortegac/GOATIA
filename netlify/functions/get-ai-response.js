// --- Netlify Function: get-ai-response.js ---
// Esta función actúa como un backend seguro que se comunica con las APIs de IA.
// Necesita las siguientes variables de entorno configuradas en Netlify:
// - OPENAI_API_KEY: Tu clave secreta para la API de OpenAI.
// - PERPLEXITY_API_KEY: Tu clave secreta para la API de Perplexity.

const FREE_PLAN_MESSAGE_LIMIT = 15;

// Handler principal de la función
exports.handler = async (event, context) => {
    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    try {
        // 2. Extraer datos de la solicitud y del usuario
        const { prompt, history, model, imageData, pdfText } = JSON.parse(event.body);
        const { user } = context.clientContext;
        let botReply = '';
        let apiResponse;

        // 3. Verificar límite de mensajes para usuarios del plan gratuito
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ error: 'Límite de mensajes alcanzado', details: 'Por favor, actualiza tu plan para continuar.' }),
            };
        }

        // 4. Determinar a qué API llamar basado en el modelo seleccionado
        if (model === 'perplexity' || model.includes('sonar')) {
            // --- LÓGICA PARA PERPLEXITY API ---
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) throw new Error('La clave de API de Perplexity no está configurada.');

            const body = {
                // --- FIX 3: Se actualiza a otro nombre de modelo en línea válido para asegurar compatibilidad. ---
                model: 'sonar-small-32k-online', 
                messages: [
                    { role: 'system', content: 'Eres un asistente de búsqueda web preciso y conciso. Responde en español.' },
                    ...history,
                    { role: 'user', content: prompt }
                ]
            };

            apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${PERPLEXITY_API_KEY}`,
                },
                body: JSON.stringify(body),
            });
            
            if (!apiResponse.ok) {
                 const errorData = await apiResponse.json();
                 console.error('Error desde la API de Perplexity:', errorData);
                 throw new Error(`Error de Perplexity: ${errorData.error?.message || apiResponse.statusText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;

        } else {
            // --- LÓGICA PARA OPENAI API (GPT-3.5-Turbo y GPT-4o) ---
            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) throw new Error('La clave de API de OpenAI no está configurada.');

            // Prepara el contenido del mensaje del usuario. Puede incluir texto, imagen y/o PDF.
            let userMessageContent = [];

            // Si hay texto de un PDF, lo añadimos al prompt.
            if (pdfText) {
                userMessageContent.push({
                    type: 'text',
                    text: `Analiza el siguiente texto extraído de un PDF y luego responde a la pregunta del usuario.\n\n--- CONTENIDO DEL PDF ---\n${pdfText}\n--- FIN DEL PDF ---\n\nPregunta: ${prompt}`
                });
            } else {
                 userMessageContent.push({ type: 'text', text: prompt });
            }

            // Si hay una imagen, la añadimos al mensaje (formato para GPT-4o).
            if (imageData) {
                userMessageContent.push({
                    type: 'image_url',
                    image_url: {
                        "url": imageData // El frontend ya envía la imagen en formato base64 URI
                    }
                });
            }
            
            const body = {
                model: model, // 'gpt-3.5-turbo' o 'gpt-4o'
                messages: [
                    { role: 'system', content: 'Eres GOATBOT, un asistente experto y amigable. Responde en español.' },
                    ...history,
                    { role: 'user', content: userMessageContent }
                ],
                max_tokens: (imageData || pdfText) ? 2048 : 1000 // Más tokens para análisis de archivos
            };

            apiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                },
                body: JSON.stringify(body),
            });
            
            if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                console.error('Error desde la API de OpenAI:', errorData);
                throw new Error(`Error de OpenAI: ${errorData.error?.message || apiResponse.statusText}`);
            }

            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;
        }

        // 5. Actualizar el contador de mensajes si el usuario está autenticado
        let newMessageCount = null;
        if (user) {
            const currentCount = user.app_metadata.message_count || 0;
            newMessageCount = currentCount + 1;

            const adminAuthHeader = `Bearer ${context.clientContext.identity.token}`;
            const userUpdateUrl = `${context.clientContext.identity.url}/admin/users/${user.sub}`;
            
            // Actualizamos los metadatos del usuario en Netlify Identity
            await fetch(userUpdateUrl, {
                method: 'PUT',
                headers: { 'Authorization': adminAuthHeader },
                body: JSON.stringify({
                    app_metadata: {
                        ...user.app_metadata,
                        message_count: newMessageCount,
                    },
                }),
            });
        }
        
        // 6. Enviar la respuesta y el nuevo conteo de vuelta al frontend
        return {
            statusCode: 200,
            body: JSON.stringify({
                reply: botReply,
                new_message_count: newMessageCount, // El frontend usará esto para actualizar el contador
            }),
        };

    } catch (error) {
        // 7. Manejo de errores centralizado
        console.error('Error en la función de Netlify:', error.toString());
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
