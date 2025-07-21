// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Llamamos a nuestra función SQL unificada, enviando -1 para restar un crédito.
  const { error } = await supabase.rpc('increment_credits', {
    user_id_param: user.sub,
    increment_value: -1
  });

  if (error) {
    console.error('Error al descontar crédito:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Error en la base de datos.' }) };
  }

  // Devolvemos el nuevo total de créditos para mantener sincronizado el frontend.
  const { data } = await supabase.from('profiles').select('credits').eq('id', user.sub).single();

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};
