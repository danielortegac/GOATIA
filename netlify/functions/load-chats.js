const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
  if (!event.clientContext || !event.clientContext.user) {
    return { statusCode: 401, body: 'No autorizado' };
  }

  const { user } = event.clientContext;
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // maybeSingle ⇒ si no existe simplemente devuelve null
  const { data, error, status } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.sub)
    .maybeSingle();

  // log para ver exactamente qué responde Supabase
  console.log('load‑chats → status:', status, 'error:', error);

  if (error && status !== 406) {               // 406 = fila no existe
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }

  return { statusCode: 200, body: JSON.stringify(data || {}) };
};
