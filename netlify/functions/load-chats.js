// netlify/functions/load-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const { user } = event.clientContext;
    if (!user) {
        return { statusCode: 401, body: 'No estás autorizado.' };
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 1. Buscamos en la tabla 'profiles' la fila que coincida con el ID del usuario
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.sub) // 'eq' significa "equals" (igual a)
        .single(); // '.single()' nos trae solo un resultado

    if (error && error.code !== 'PGRST116') { // Ignoramos el error "fila no encontrada"
        console.error("Error en Supabase (load-chats):", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    // 2. Devolvemos los datos encontrados
    return { statusCode: 200, body: JSON.stringify(data) };
};
