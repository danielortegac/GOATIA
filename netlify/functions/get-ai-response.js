// /netlify/functions/get-ai-response.js
const fetch = require('node-fetch');
const { OpenAI } = require('openai');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async function (event, context) {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
    }

    // 1. Autenticación del usuario
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'No estás autenticado.' }) };
    }

    const { prompt, history, model, imageData, pdfText, workflow, userName, title } = JSON.parse(event.body);
    if (!prompt || prompt.trim().length < 1) {
        return { statusCode: 400, body: JSON.stringify({ error: 'El prompt está vacío.' }) };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 2. VERIFICACIÓN Y DESCUENTO DE CRÉDITOS (LÓGICA CENTRALIZADA)
    try {
        const { data: profile, error: fetchError } = await supabase
            .from('profiles')
            .select('credits')
            .eq('id', user.sub)
            .single();

        if (fetchError || !profile || profile.credits < 1) {
            return { statusCode: 402, body: JSON.stringify({ error: 'Créditos insuficientes para realizar esta acción.' }) };
        }

        // Descontar 1 crédito de forma atómica usando una función de base de datos
        // NOTA: Debes crear la función `decrement_credits` en el SQL de Supabase (código al final)
        const { error: updateError } = await supabase.rpc('decrement_credits', { user_id: user.sub, amount: 1 });
        
        if (updateError) {
            console.error('Error al descontar créditos:', updateError);
            return { statusCode: 500, body: JSON.stringify({ error: 'No se pudieron actualizar los créditos.' }) };
        }

    } catch (dbError) {
        console.error('Error de base de datos:', dbError);
        return { statusCode: 500, body: JSON.stringify({ error: 'Error de base de datos.' }) };
    }

    // 3. LLAMADA A LA API DE IA (Solo si el descuento de créditos fue exitoso)
    // El resto de tu lógica para OpenAI y Perplexity va aquí...
    // ... (el código para llamar a OpenAI/Perplexity que ya tienes)
    
    // 4. DEVOLVER LA RESPUESTA Y EL NUEVO SALDO DE CRÉDITOS
    // Vuelve a consultar los créditos para devolver el valor más actualizado
    const { data: finalProfile } = await supabase.from('profiles').select('credits').eq('id', user.sub).single();

    // Aquí iría tu lógica de respuesta de la IA, por simplicidad, la omito.
    // Asumimos que `aiReplyText` contiene la respuesta de la IA.
    const aiReplyText = "Aquí va la respuesta de la IA..."; // Reemplaza con tu lógica real.

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            reply: aiReplyText, // Tu respuesta de la IA
            newCreditBalance: finalProfile.credits // El nuevo saldo REAL de créditos
        })
    };
};
