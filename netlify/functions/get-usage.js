const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 1. Revisamos si ya se le dieron créditos este mes
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits, last_credit_month')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error al obtener perfil:', profileError);
    if (profileError.code === 'PGRST116') {
      // Usuario nuevo, devolver 100 por UI, aunque el trigger lo cree luego
      return { statusCode: 200, body: JSON.stringify({ credits: 100 }) };
    }
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // '2025-07'

  // 2. Si no es el mismo mes, llamamos al RPC para otorgar créditos
  if (profile.last_credit_month !== currentMonth) {
    const { error: rpcError } = await supabase.rpc('grant_monthly_credits_by_plan', {
      user_id_param: userId
    });

    if (rpcError) {
      console.error('Error al otorgar créditos mensuales:', rpcError);
      return { statusCode: 500, body: JSON.stringify({ error: 'RPC error' }) };
    }
  }

  // 3. Volvemos a consultar los créditos actualizados
  const { data: updatedProfile, error: finalError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (finalError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Error al obtener créditos actualizados' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: updatedProfile.credits })
  };
};
