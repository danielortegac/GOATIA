// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required.' }) };
  }

  try {
    const { stateToSave } = JSON.parse(event.body);
    if (!stateToSave) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Missing stateToSave in request body.' }) };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    const { error } = await supabase
      .from('user_chats')
      .upsert(
        {
          user_id: user.sub,
          chats: stateToSave, // 'chats' es la columna jsonb
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' } // Actualiza si ya existe un registro para el usuario
      );

    if (error) {
      // Registra el error específico de Supabase para depuración
      console.error('Supabase Error en save-chats:', error);
      throw error;
    }

    return { statusCode: 200, body: JSON.stringify({ message: 'State saved successfully.' }) };
  } catch (err) {
    // Captura cualquier error y lo devuelve en la respuesta
    console.error('Error en la función save-chats:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Failed to save chats.',
        details: err.message,
      }),
    };
  }
};
