const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext || {};
  if (!user) return { statusCode: 401, body: 'No autorizado' };

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  /* Trae solo las columnas que necesitas */
  const { data, error } = await supabase
    .from('profiles')
    .select('state, gamification_state, currentchatid')
    .eq('id', user.sub)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify(data || {}) };
};
