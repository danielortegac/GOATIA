// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  let delta;
  try {
    const body = JSON.parse(event.body);
    delta = body.delta; // Esperamos un número, ej: -1 para descontar
    if (typeof delta !== 'number') {
      throw new Error('Delta must be a number.');
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request: Invalid delta.' }) };
  }

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // Llamamos a nuestra función SQL segura
  const { error: rpcError } = await supabase.rpc('increment_credits', {
    user_id_param: userId,
    increment_value: delta
  });

  if (rpcError) {
    console.error('update-usage RPC error:', rpcError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error while updating credits.' }) };
  }

  // Devolvemos el nuevo total de créditos al frontend
  const { data: profileData, error: selectError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (selectError) {
    console.error('Error fetching new credit total:', selectError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Could not retrieve updated credits.' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: profileData.credits })
  };
};
