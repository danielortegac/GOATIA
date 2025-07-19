const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1. Autenticación
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 2. Llamar a la función de Supabase para otorgar créditos si es necesario
  const { data: newCredits, error: rpcError } = await supabase.rpc('grant_monthly_credits_by_plan', {
    user_id_param: userId
  });

  if (rpcError) {
    console.error('Error llamando a la RPC grant_monthly_credits_by_plan:', rpcError);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  // 3. Devolver los créditos actualizados
  return {
    statusCode: 200,
    body: JSON.stringify({ credits: newCredits })
  };
};
