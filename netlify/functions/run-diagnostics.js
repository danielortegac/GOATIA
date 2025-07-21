// netlify/functions/run-diagnostics.js
const fetch = require('node-fetch');
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
    const { user } = context.clientContext;
    if (!user) return { statusCode: 401, body: JSON.stringify({ error: 'Authentication required.' }) };

    const results = {
        netlifyAuth: { status: 'FAILURE', details: 'Not attempted.', recommendation: '' },
        supabaseConnection: { status: 'FAILURE', details: 'Not attempted.', recommendation: '' }
    };

    // Prueba 1: Autenticación con Netlify
    try {
        const params = new URLSearchParams();
        params.append('grant_type', 'client_credentials');
        params.append('client_id', process.env.NETLIFY_OAUTH_CLIENT_ID);
        params.append('client_secret', process.env.NETLIFY_OAUTH_CLIENT_SECRET);
        
        if (!process.env.NETLIFY_OAUTH_CLIENT_ID || !process.env.NETLIFY_OAUTH_CLIENT_SECRET) {
            throw new Error('Las variables NETLIFY_OAUTH_CLIENT_ID o NETLIFY_OAUTH_CLIENT_SECRET no están definidas.');
        }

        const res = await fetch('https://api.netlify.com/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        });
        const json = await res.json();
        if (!res.ok) throw new Error(`Error ${res.status}: ${json.error_description || 'Respuesta inválida.'}`);
        
        results.netlifyAuth.status = 'SUCCESS';
        results.netlifyAuth.details = 'Token de Netlify obtenido exitosamente.';
        results.netlifyAuth.recommendation = 'Las credenciales OAuth de Netlify son CORRECTAS.';
    } catch (e) {
        results.netlifyAuth.details = `Falló la obtención del token de Netlify. Error: ${e.message}`;
        results.netlifyAuth.recommendation = 'VERIFICA URGENTEMENTE las variables de entorno NETLIFY_OAUTH_CLIENT_ID y NETLIFY_OAUTH_CLIENT_SECRET en tu panel de Netlify. Deben existir y ser correctas.';
    }

    // Prueba 2: Conexión con Supabase
    try {
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
            throw new Error('Las variables de Supabase (URL o SERVICE_KEY) no están definidas.');
        }
        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
        const { error } = await supabase.from('profiles').select('id').limit(1);
        if (error) throw error;
        results.supabaseConnection.status = 'SUCCESS';
        results.supabaseConnection.details = 'Conexión y lectura de prueba en Supabase exitosa.';
        results.supabaseConnection.recommendation = 'Las credenciales de Supabase son CORRECTAS.';
    } catch (e) {
        results.supabaseConnection.details = `Falló la conexión o consulta a Supabase. Error: ${e.message}`;
        results.supabaseConnection.recommendation = 'Verifica las variables SUPABASE_URL y SUPABASE_SERVICE_KEY.';
    }

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(results, null, 2)
    };
};
