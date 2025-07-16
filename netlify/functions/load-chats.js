// netlify/functions/load-chats.js
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

    const { data, error } = await supabase
      .from('user_chats')
      .select('chats')
      .eq('user_id', user.sub)
      .single();

    // Maneja errores específicos de Supabase, pero no el caso de "no encontrado" (PGRST116)
    if (error && error.code !== 'PGRST116') {
      console.error('Supabase Error en load-chats:', error);
      throw error;
    }

    // Si se encuentra data, data.chats contendrá el objeto de estado.
    // Si no se encuentra data, devuelve un objeto vacío.
    return { statusCode: 200, body: JSON.stringify(data?.chats || {}) };

  } catch (err) {
    console.error('Error en la función load-chats:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to load chats.',
        details: err.message,
      }),
    };
  }
};
