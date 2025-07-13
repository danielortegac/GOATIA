// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    // 1. Obtenemos la información del usuario de forma segura desde Netlify
    const { user } = event.clientContext;
    if (!user) {
        return { statusCode: 401, body: 'No estás autorizado.' };
    }

    // 2. Extraemos los datos que envía la aplicación
    const { state, gamification_state } = JSON.parse(event.body);

    // 3. Conectamos a Supabase con la llave secreta y poderosa
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    // 4. Usamos 'upsert' para guardar o actualizar los datos del usuario
    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: user.sub, // 'sub' es el ID de usuario único de Netlify
            state: state,
            gamification_state: gamification_state,
            updated_at: new Date().toISOString()
        }, { onConflict: 'id' }); // Le decimos que si el usuario ya existe, lo actualice

    if (error) {
        console.error("Error en Supabase (save-chats):", error);
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }

    return { statusCode: 200, body: '¡Estado guardado en la nube!' };
};
