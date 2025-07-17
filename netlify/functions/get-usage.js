const { createClient } = require('@supabase/supabase-js');
const dayjs = require('dayjs');

exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No user context.' }) };
  }

  const userId = user.sub;

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('credits, last_credit_month')
    .eq('id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // Nuevo usuario: asignar créditos iniciales y registrar mes actual
    const currentMonth = dayjs().format('YYYY-MM');
    await supabase
      .from('profiles')
      .insert([{ id: userId, credits: 100, last_credit_month: currentMonth }]);
    return { statusCode: 200, body: JSON.stringify({ credits: 100 }) };
  }

  if (error) {
    console.error('get-usage error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
  }

  const currentMonth = dayjs().format('YYYY-MM');

  if (profile.last_credit_month !== currentMonth) {
    // Es un nuevo mes: resetear a 100
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits: 100, last_credit_month: currentMonth })
      .eq('id', userId);

    if (updateError) {
      console.error('Error updating monthly credits:', updateError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Error granting monthly credits' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ credits: 100 }) };
  }

  // Ya se otorgaron este mes
  return { statusCode: 200, body: JSON.stringify({ credits: profile.credits }) };
};
