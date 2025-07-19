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

  const userId = user.sub;

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits, last_credit_month')
    .eq('id', userId)
    .single();

  if (error) {
    console.error(error);
    return { statusCode: 500, body: JSON.stringify({ error: 'DB Error' }) };
  }

  // Chequear si ya recibió créditos este mes
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (profile.last_credit_month !== thisMonth) {
    const { error: creditError } = await supabase.rpc('grant_monthly_credits_by_plan', {
      user_id_param: userId
    });
    if (creditError) {
      console.error('Error RPC:', creditError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Credit grant failed' }) };
    }
  }

  // Consultar de nuevo
  const { data: updated, error: finalError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (finalError) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Post-RPC fetch failed' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: updated.credits })
  };
};
