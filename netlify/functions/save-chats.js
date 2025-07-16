// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    // 1. Verificamos que el usuario esté autenticado
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: JSON.stringify({ error: 'No autorizado' }) };
    }

    try {
        const { stateToSave } = JSON.parse(event.body);
        if (!stateToSave) {
            return { statusCode: 400, body: 'No hay estado para guardar.' };
        }

        // 2. Usamos la clave de SERVICIO para tener permisos de escritura
        const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        // 3. Guardamos en la tabla 'user_data' (asegúrate de que exista en Supabase)
        const { error } = await supabaseAdmin
            .from('user_data') 
            .upsert({ 
                user_id: user.sub, 
                state: stateToSave,
                updated_at: new Date().toISOString() 
            }, { onConflict: 'user_id' });

        if (error) { throw error; }

        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Error en save-chats:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
