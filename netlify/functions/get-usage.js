// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // 1. Get token from header
  const { user } = context.clientContext;
  if (!user) {
    return { statusCode: 401, body: JSON.stringify({ error: 'Unauthorized: No user context.' }) };
  }
  const userId = user.sub; // Get user ID from the verified context

  // 2. Create Supabase admin client to read credits
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  // 3. Fetch credits from the 'profiles' table
  const { data, error } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error) {
    // This can happen if the profile isn't created yet for a new user.
    if (error.code === 'PGRST116') {
        // Return 0 credits if no profile is found, as it might be a new signup.
        return { statusCode: 200, body: JSON.stringify({ credits: 0 }) };
    }
    console.error('get-usage error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Database error' })
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ credits: data.credits })
  };
};
