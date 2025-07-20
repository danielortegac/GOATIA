const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  try {
    const { user } = context.clientContext;

    if (!user) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_KEY // 🔒 ¡USA la service_key aquí!
    );

    const { error } = await supabase.rpc('grant_monthly_credits_by_plan', {
      user_id: user.sub
    });

    if (error) {
      console.error('❌ Error otorgando créditos:', error);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Error otorgando créditos mensuales' })
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: '✅ Créditos otorgados si correspondía' })
    };
  } catch (err) {
    console.error('❌ Error general:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Error inesperado al procesar créditos' })
    };
  }
};
