// --- Netlify Function: get-ai-response.js ---
// VERSIÓN 3 - LÓGICA DE ENRUTAMIENTO REFORZADA

exports.handler = async (event) => {
    // Importación dinámica para máxima compatibilidad en Netlify
    const fetch = (await import('node-fetch')).default;
    const { OpenAI } = await import("openai");

    // 1. Validar que la solicitud sea un POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Método no permitido' }) };
    }

    console.log("--- INICIO EJECUCIÓN V3 ---");

    try {
        const body = JSON.parse(event.body);
        const { prompt, history, model, imageData, pdfText, workflow, userName } = body;
        
        // --- INICIO DE LA LÓGICA DE ENRUTAMIENTO ---
        
        // LOGS DE DEPURACIÓN CRÍTICOS:
        console.log(`Modelo recibido (raw): '${model}'`);
        console.log(`Tipo de dato del modelo: ${typeof model}`);

        // CORRECCIÓN CLAVE: Normalizar y limpiar la variable 'model' antes de la comparación.
        // Esto elimina espacios en blanco y convierte todo a minúsculas para una comparación segura.
        const cleanedModel = (model && typeof model === 'string') ? model.trim().toLowerCase() : '';
        
        console.log(`Modelo limpiado para evaluación: '${cleanedModel}'`);

        // CONDICIÓN REFORZADA: Usar la variable limpia para decidir la ruta.
        if (cleanedModel.startsWith('sonar')) {
            console.log(`Ruta seleccionada: Perplexity (modelo original: ${model})`);
            
            const PERPLEXITY_API_KEY = process.env.PERPLEXITY_API_KEY;
            if (!PERPLEXITY_API_KEY) {
                console.error("Error: Falta la variable de entorno PERPLEXITY_API_KEY.");
                throw new Error('La clave de API de Perplexity no está configurada.');
            }

            const perplexityBody = {
                model: model, // Enviar el nombre original del modelo que pide la API ('sonar' o 'sonar-pro')
                messages: [
                    { role: 'system', content: 'Eres un asistente de búsqueda preciso. Responde en español y cita tus fuentes.' },
                    ...(history || []),
                    { role: 'user', content: prompt }
                ]
            };
            
            console.log("Enviando petición a la API de Perplexity...");
            const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${PERPLEXITY_API_KEY}`, 'Accept': 'application/json' },
                body: JSON.stringify(perplexityBody),
            });
            
            if (!apiResponse.ok) {
                 const errorText = await apiResponse.text();
                 console.error('Respuesta de error de la API de Perplexity:', errorText);
                 throw new Error(`Error de Perplexity: ${apiResponse.status} - ${errorText}`);
            }
            
            const data = await apiResponse.json();
            botReply = data.choices[0].message.content;
            console.log("Respuesta recibida de Perplexity con éxito.");

        } else { 
            console.log(`Ruta seleccionada: OpenAI (modelo: ${model})`);

            const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
            if (!OPENAI_API_KEY) {
                console.error("Error: Falta la variable de entorno OPENAI_API_KEY.");
                throw new Error('La clave de API de OpenAI no está configurada.');
            }
            
            const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
            
            // (La lógica para construir los mensajes de OpenAI no cambia)
            let messages = [];
            const friendlyPrompt = `Eres GOATBOT, un asistente de IA excepcionalmente amable y servicial. Siempre que sea relevante, dirígete al usuario por su nombre, '${userName || 'amigo/a'}'. Saluda con cariño (ej. '¡Hola ${userName || 'qué tal'}! Espero que tengas un día increíble.'), y despídete de forma atenta. Tu tono debe ser siempre positivo y respetuoso.`;
            messages.push({ role: 'system', content: friendlyPrompt });
            if (workflow === 'english-teacher') { messages.push({ role: 'system', content: "You are an expert English Teacher..." }); }
            if (history) { messages.push(...history); }
            let userMessageContent = [{ type: 'text', text: pdfText ? `Analiza el siguiente PDF y responde: \n\n${pdfText}\n\nPregunta: ${prompt}` : prompt }];
            if (imageData && model === 'gpt-4o') { userMessageContent.push({ type: 'image_url', image_url: { "url": imageData } }); }
            messages.push({ role: 'user', content: userMessageContent });
            
            console.log("Enviando petición a la API de OpenAI...");
            const completion = await openai.chat.completions.create({
                model: model, 
                messages: messages,
                max_tokens: (imageData || pdfText) ? 2048 : 1000
            });

            botReply = completion.choices[0].message.content;
            console.log("Respuesta recibida de OpenAI con éxito.");
        }

        console.log("--- FIN EJECUCIÓN, ENVIANDO RESPUESTA ---");
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: botReply }),
        };

    } catch (error) {
        console.error('--- ERROR CRÍTICO CAPTURADO ---');
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Ocurrió un error en el servidor.', details: error.message }),
        };
    }
};
