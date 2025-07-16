// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
  // Esta opción es crucial para pasar el token de autenticación
  { global: { headers: { 'Authorization': `Bearer ${process.env.SUPABASE_ANON_KEY}` } } }
);

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: 'No autorizado' };
    }

    try {
        const { stateToSave } = JSON.parse(event.body);
        if (!stateToSave) {
            return { statusCode: 400, body: 'No hay estado para guardar.' };
        }
        
        // Usamos la clave de servicio para tener permisos de administrador
        const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

        const { data, error } = await supabaseAdmin
            .from('user_data') // Nombre de tabla sugerido: user_data
            .upsert({ 
                user_id: user.sub, 
                state: stateToSave, // Guardamos todo el objeto de estado
                updated_at: new Date().toISOString() 
            }, { onConflict: 'user_id' });

        if (error) throw error;

        return { statusCode: 200, body: 'OK' };
    } catch (err) {
        console.error('Error en save-chats:', err);
        return { statusCode: 500, body: err.message };
    }
};
