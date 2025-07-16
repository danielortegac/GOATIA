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

        // 3. Apuntamos a la tabla 'chats' y la columna 'chats', que es lo que tu app usa.
        const { error } = await supabaseAdmin
            .from('chats') 
            .upsert({ 
                user_id: user.sub, 
                chats: stateToSave, // Guardamos el estado en la columna 'chats'
                updated_at: new Date().toISOString() 
            }, { onConflict: 'user_id' });

        if (error) {
            console.error('Error de Supabase en save-chats:', error);
            throw error; // Esto lanzará un error 500 si Supabase falla
        }

        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Crash en la función save-chats:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
