// netlify/functions/load-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const { user } = event.clientContext;
    if (!user || !user.sub) return { statusCode: 401, body: 'No autorizado' };

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.sub)
        .single();

    if (error && error.code !== 'PGRST116') {
        console.error("Error en Supabase (load-chats):", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: JSON.stringify(data) };
};
