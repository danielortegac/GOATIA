// netlify/functions/update-usage.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    // 1) JWT desde la cabecera
    const auth = event.headers.authorization || '';
    const token = auth.replace('Bearer ', '');
    if (!token) return { statusCode: 401, body: 'Unauthorized' };

    // 2) Verifica el usuario con SupaBase Auth
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
    const userId = userJwt.user.id;

    // 3) Parsea delta
    const { delta } = JSON.parse(event.body || '{}');
    if (typeof delta !== 'number') {
      return { statusCode: 400, body: 'Bad request' };
    }

    // 4) Cliente admin
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY
    );

    // 5) Actualiza el saldo
    const { data, error } = await supabase
      .from('profiles')
      .update({
        credits: supabase.raw('credits + ?', [delta]),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .single();

    if (error) throw error;

    return {
      statusCode: 200,
      body: JSON.stringify({ credits: data.credits })
    };

  } catch (err) {
    console.error('update-usage error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
