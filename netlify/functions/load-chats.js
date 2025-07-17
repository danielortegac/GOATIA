// netlify/functions/load-chats.js (Versión Corregida y Simplificada)
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required.' }) };
    }

    try {
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY
        );

        // Ya no intentamos crear perfiles aquí. El Trigger de Supabase se encarga de eso.
        // Solo leemos los datos que existan.
        const [chatResult, profileResult] = await Promise.all([
            supabase.from('user_chats').select('chats').eq('user_id', user.sub).single(),
            supabase.from('profiles').select('credits, gamification_state').eq('id', user.sub).single()
        ]);

        // Si hay un error al buscar el perfil (que no sea "no encontrado"), lánzalo.
        if (profileResult.error && profileResult.error.code !== 'PGRST116') {
             throw profileResult.error;
        }

        const stateData = chatResult.data?.chats || {};
        // Si no hay perfil, devuelve 0 créditos. La función get-usage lo arreglará.
        const profileData = profileResult.data || { credits: 0, gamification_state: {} }; 

        const response = {
            state: stateData, // Asegúrate de que el estado del chat esté anidado
            profile: profileData
        };

        return { statusCode: 200, body: JSON.stringify(response) };
    } catch (err) {
        console.error('Error in load-chats function:', err);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to load data.', details: err.message }),
        };
    }
};
