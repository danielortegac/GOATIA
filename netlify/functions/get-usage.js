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

  // 1. Obtenemos perfil del usuario
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('credits, last_credit_month')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error al obtener perfil:', profileError);
    if (profileError.code === 'PGRST116') {
      // Usuario nuevo, sin perfil aún, devolvemos 100 (visual)
      return {
        statusCode: 200,
        body: JSON.stringify({ credits: 100 })
      };
    }
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error' })
    };
  }

  // 2. Revisamos el mes actual
  const currentMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

  // 3. Si no se han dado créditos este mes, llamamos al RPC
  if (profile.last_credit_month !== currentMonth) {
    const { error: rpcError } = await supabase.rpc('grant_monthly_credits_by_plan', {
      user_id: userId
    });

    if (rpcError) {
      console.error('Error al otorgar créditos mensuales:', rpcError);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'RPC error' })
      };
    }
  }

  // 4. Volvemos a consultar créditos actualizados
  const { data: updatedProfile, error: finalError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (finalError) {
    return {
