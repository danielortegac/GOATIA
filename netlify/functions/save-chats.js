const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext || {};
  if (!user) return { statusCode: 401, body: 'No autorizado' };

  const { state, gamification_state, currentChatId } = JSON.parse(event.body || '{}');

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { error } = await supabase
    .from('profiles')
    .upsert({
      id: user.sub,
      state,
      gamification_state,
      currentchatid: currentChatId,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

  if (error) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
  return { statusCode: 200, body: 'Estado guardado.' };
};
