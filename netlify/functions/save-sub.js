const { createClient } = require('@supabase/supabase-js');
exports.handler = async (event, context) => {
  const { user } = context.clientContext;
  if (!user) return { statusCode: 401, body: 'No auth' };

  const { subscription } = JSON.parse(event.body || '{}');
  if (!subscription) return { statusCode: 400, body: 'No sub' };

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  await supabase
    .from('profiles')
    .update({ push_subscription: subscription })
    .eq('id', user.sub);

  return { statusCode: 200, body: 'OK' };
};
