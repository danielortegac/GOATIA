// netlify/functions/paypal-webhook.js

// Using node-fetch for making HTTP requests in a Node.js environment.
const fetch = require('node-fetch');
// Using the Supabase client library to interact with your database.
const { createClient } = require('@supabase/supabase-js');

/**
 * Asynchronously retrieves an administrative access token from the Netlify API.
 * This token is required to make administrative changes to user data, such as updating metadata.
 * The critical fix is applied here: sending the request with the 'application/x-www-form-urlencoded'
 * Content-Type, which is required by Netlify's OAuth2 token endpoint.
 * @returns {Promise<string>} A promise that resolves to the Netlify admin access token.
 * @throws {Error} Throws an error if the token cannot be obtained, including details from the API.
 */
async function getNetlifyAdminToken() {
    console.log("--- Attempting to get Netlify admin token (Strategy: Final v5) ---");
    
    // The body of the request must be URL-encoded, not JSON.
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
    params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);

    const response = await fetch('https://api.netlify.com/oauth/token', {
        method: 'POST',
        // This header is the crucial correction. It tells the Netlify server
        // how the body is formatted, resolving the 'unsupported_grant_type' error.
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: params.toString()
    });

    const jsonResponse = await response.json();

    if (!response.ok) {
        // Log the detailed error from Netlify for easier debugging.
        console.error('CRITICAL ERROR getting Netlify token:', jsonResponse);
        throw new Error(`Could not get Netlify token: ${jsonResponse.error_description || 'Unknown error response.'}`);
    }

    console.log("--- Successfully obtained Netlify admin token. ---");
    return jsonResponse.access_token;
}

/**
 * The main Netlify serverless function handler.
 * This function listens for incoming POST requests from PayPal's webhook system.
 * It processes the 'BILLING.SUBSCRIPTION.ACTIVATED' event to upgrade a user's plan.
 */
exports.handler = async (event) => {
    // Only allow POST requests, as specified by webhook standards.
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    try {
        // Parse the incoming event payload from PayPal.
        const paypalEvent = JSON.parse(event.body);

        // We are only interested in the event that confirms a subscription is active.
        if (paypalEvent.event_type === 'BILLING.SUBSCRIPTION.ACTIVATED') {
            const { resource } = paypalEvent;
            const userId = resource.custom_id; // The user's Netlify ID, passed during subscription creation.
            const paypalPlanId = resource.plan_id; // The PayPal-specific ID for the subscription plan.

            // The userId is essential for linking the payment to a user account.
            if (!userId) {
                throw new Error('Missing custom_id (userId) in PayPal webhook payload.');
            }

            // Map the PayPal plan ID back to your internal plan name ('boost' or 'pro').
            let planName;
            if (paypalPlanId === process.env.PAYPAL_BOOST_PLAN_ID) {
                planName = 'boost';
            } else if (paypalPlanId === process.env.PAYPAL_PRO_PLAN_ID) {
                planName = 'pro';
            } else {
                // If the plan ID doesn't match, log an error and stop.
                throw new Error(`Unknown PayPal Plan ID received: ${paypalPlanId}`);
            }
            
            console.log(`Processing subscription activation for User ID: ${userId}, Plan: ${planName}`);

            // --- Step 1: Update Netlify Identity User Metadata ---
            const adminToken = await getNetlifyAdminToken();
            const netlifyResponse = await fetch(`https://api.netlify.com/api/v1/sites/${process.env.SITE_ID}/identity/${userId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${adminToken}`, 
                    'Content-Type': 'application/json' 
                },
                body: JSON.stringify({
                    app_metadata: { plan: planName } // Set the new plan in the user's metadata.
                })
            });

            if (!netlifyResponse.ok) {
                const errorBody = await netlifyResponse.text();
                console.error('Error updating Netlify Identity:', errorBody);
                throw new Error('Failed to update user metadata in Netlify.');
            }
            console.log('User metadata in Netlify updated successfully.');

            // --- Step 2: Update Supabase Database ---
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
            
            // Call the 'upgrade_user_plan' SQL function in Supabase.
            // This function handles updating the 'plan' and adding the correct number of credits.
            const { error: rpcError } = await supabase.rpc('upgrade_user_plan', {
                user_id_input: userId,
                new_plan: planName
            });

            if (rpcError) {
                console.error('Error calling Supabase RPC function "upgrade_user_plan":', rpcError);
                throw rpcError;
            }
            console.log('Profiles table updated in Supabase with new plan and credits.');

            // Insert or update the subscription record in the 'subscriptions' table for tracking.
            const { error: upsertError } = await supabase.from('subscriptions').upsert({
                user_id: userId,
                plan_id: paypalPlanId,
                paypal_subscription_id: resource.id, // The unique ID for this specific subscription from PayPal.
                status: 'active'
            }, { onConflict: 'user_id' }); // If a subscription for this user already exists, update it.

            if (upsertError) {
                console.error('Error upserting into subscriptions table:', upsertError);
                throw upsertError;
            }
            console.log('Subscriptions table updated in Supabase successfully.');
        }
        
        // Return a 200 OK response to PayPal to acknowledge receipt of the webhook.
        return { statusCode: 200, body: 'Webhook processed successfully.' };

    } catch (e) {
        // If any step in the process fails, log the error and return a server error status.
        // This helps PayPal know that the webhook delivery failed and it should retry.
        console.error('Fatal error in paypal-webhook function:', e);
        return { statusCode: 500, body: `Internal Server Error: ${e.message}` };
    }
};
