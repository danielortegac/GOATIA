// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const { user } = event.clientContext;
    if (!user || !user.sub) return { statusCode: 401, body: 'No autorizado' };

    const { state, gamification_state } = JSON.parse(event.body);
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { error } = await supabase
        .from('profiles')
        .upsert({ 
            id: user.sub, // 'sub' es el ID de usuario único de Netlify
            state: state,
            gamification_state: gamification_state,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

    if (error) {
        console.error("Error en Supabase (save-chats):", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: 'Estado guardado.' };
};
