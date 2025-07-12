// netlify/functions/paypal-webhook.js
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event) => {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    try {
        const paypalEvent = JSON.parse(event.body);

        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const resource = paypalEvent.resource;
            const userId = resource.custom_id;
            const planId = resource.plan_id;
            const subscriptionId = resource.id;

            const { error } = await supabase
                .from('subscriptions')
                .upsert({ 
                    user_id: userId, 
                    plan_id: planId === process.env.PAYPAL_PLAN_ID_BOOST ? 'boost' : 'pro',
                    paypal_subscription_id: subscriptionId,
                    status: 'active',
                    updated_at: new Date().toISOString()
                }, { onConflict: 'paypal_subscription_id' });

            if (error) throw error;
        }

        // Aquí puedes manejar otros eventos como BILLING.SUBSCRIPTION.CANCELLED

        return { statusCode: 200, body: 'Webhook procesado' };

    } catch (error) {
        console.error('Error procesando webhook:', error);
        return { statusCode: 400, body: `Webhook Error: ${error.message}` };
    }
};
