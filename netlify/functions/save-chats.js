const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (!event.clientContext || !event.clientContext.user) {
    return { statusCode: 401, body: 'No autorizado' };
  }

  const { user } = event.clientContext;
  const { state, gamification_state } = JSON.parse(event.body);

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.sub,                        // crea si no existe
      state,
      gamification_state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id', ignoreDuplicates: false }
  );

  console.log('save‑chats → error:', error);

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: 'Estado guardado' };
};
