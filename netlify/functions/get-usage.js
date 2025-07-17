// netlify/functions/get-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // 1) Chequea que venga el JWT en la cabecera
    const auth = event.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return { statusCode: 401, body: 'Unauthorized' };

    // 2) Obtén info del user de Netlify Identity
    const supabaseAuth = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { data: userJwt, error: errJwt } = await supabaseAuth.auth.getUser();
    if (errJwt || !userJwt.user) {
      console.error('Invalid token', errJwt);
      return { statusCode: 401, body: 'Unauthorized' };
    }
    const userId = userJwt.user.id; // este es el uuid del usuario en profiles.id

    // 3) Crea cliente admin de SupaBase
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 4) Lee los créditos
    const { data, error } = await supabase
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('get-usage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
