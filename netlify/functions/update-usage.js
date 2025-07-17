// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1. Authentication
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized' }) };
  }
  const userId = user.sub;

  // 2. Get the amount to change credits by
  let delta;
  try {
    delta = JSON.parse(event.body).delta;
    if (typeof delta !== 'number') {
      throw new Error('Delta must be a number.');
    }
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Bad request: Invalid delta.' }) };
  }

  // 3. Create Supabase admin client
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 4. Atomically update the credits using an RPC call (Remote Procedure Call)
  // This is safer than a direct update as it ensures the operation is atomic.
  const { data, error } = await supabase.rpc('increment_credits', {
    user_id_param: userId,
    increment_value: delta
  });

  if (error) {
    console.error('update-usage error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Database error while updating credits.' }) };
  }
  
  // 5. Get the new credit total to return to the frontend
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (profileError) {
      console.error('Error fetching new credit total:', profileError);
      return { statusCode: 500, body: JSON.stringify({ error: 'Could not retrieve updated credits.' }) };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: profileData.credits })
  };
};
