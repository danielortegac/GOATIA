// netlify/functions/load-chats.js
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    if (!user) {
        return { statusCode: 401, body: 'No autorizado' };
    }

    try {
        const userId = user.sub;

        const { data, error } = await supabase
            .from('user_data') // Leer de la misma tabla
            .select('state')
            .eq('user_id', userId)
            .maybeSingle();

        if (error) throw error;
        
        // Si no hay datos, devolvemos un objeto vacío para que el frontend lo maneje
        const stateToReturn = data ? data.state : {}; 
        
        return {
            statusCode: 200,
            body: JSON.stringify(stateToReturn)
        };
    } catch (err) {
        console.error('Error en load-chats:', err);
        return { statusCode: 500, body: err.message };
    }
};
