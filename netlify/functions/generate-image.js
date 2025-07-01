// ¡YA NO SE NECESITA 'node-fetch'! fetch ahora está incluido.

// Límites de mensajes definidos en el backend para seguridad.
const FREE_PLAN_MESSAGE_LIMIT = 15;

// Handler principal de la función de Netlify.
exports.handler = async (event, context) => {
    // 1. Validar que la solicitud sea un POST.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // 2. Extraer los datos del cuerpo de la solicitud.
        const { prompt, history, model, imageData, pdfText } = JSON.parse(event.body);
        const { user } = context.clientContext;

        // 3. Verificar si el usuario del plan gratuito ha excedido el límite.
        if (user && user.app_metadata.plan === 'free' && (user.app_metadata.message_count || 0) >= FREE_PLAN_MESSAGE_LIMIT) {
            return {
                statusCode: 403, // Forbidden
                body: JSON.stringify({ error: 'Límite de mensajes alcanzado. Por favor, actualiza tu plan.' }),
            };
        }

        // 4. Preparar el payload para la API de OpenAI.
        const messages = [
            { role: 'system', content: 'Eres un asistente útil llamado GOATBOT.' },
            ...history,
            { role: 'user', content: prompt } 
        ];

        const body = {
            model: model,
            messages: messages,
        };

        // 5. Llamar a la API de OpenAI.
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
        
        if (!OPENAI_API_KEY) {
             throw new Error('La variable de entorno OPENAI_API_KEY no está configurada.');
        }

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error desde la API de OpenAI:', errorData);
            return {
                statusCode: response.status,
                body: JSON.stringify({ error: 'Error al comunicarse con el modelo de IA.' }),
            };
        }

        const data = await response.json();
        const botReply = data.choices[0].message.content;
        let newMessageCount = null;

        // 6. Si el usuario está logueado, actualizar su contador de mensajes.
        if (user) {
            const currentCount = user.app_metadata.message_count || 0;
            newMessageCount = currentCount + 1;

            const adminAuthHeader = `Bearer ${context.clientContext.identity.token}`;
            const userUpdateUrl = `${context.clientContext.identity.url}/admin/users/${user.sub}`;
            
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
        
        // 7. Enviar la respuesta y el nuevo conteo de vuelta al frontend.
        return {
            statusCode: 200,
            body: JSON.stringify({
                reply: botReply,
                new_message_count: newMessageCount,
            }),
        };

    } catch (error) {
        console.error('Error en la función de Netlify:', error.toString());
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error interno en el servidor.', details: error.toString() }),
        };
    }
};
