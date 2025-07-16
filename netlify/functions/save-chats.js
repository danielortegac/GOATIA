// netlify/functions/save-chats.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: 'No auth' };

  try {
    const { stateToSave } = JSON.parse(event.body);
    if (!stateToSave) return { statusCode: 400, body: 'Missing state' };

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // service role key
    );

    // 👈 Usa la tabla correcta y un solo registro por usuario
    const { error } = await supabase
      .from('user_chats')              // ❱❱ cambia aquí
      .upsert(
        {
          user_id: user.sub,
          chats: stateToSave,          // ❱❱ columna JSONB "chats"
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id' }      // evita duplicados
      );

    if (error) throw error;
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: err.message };
  }
};
