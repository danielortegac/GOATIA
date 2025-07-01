// netlify/functions/generate-image.js

const fetch = require('node-fetch');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { prompt } = JSON.parse(event.body);
  const openAIKey = process.env.OPENAI_API_KEY;
  
  if (!openAIKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'La clave API de OpenAI no está configurada en el servidor.' }) };
  }

  if (!prompt) {
    return { statusCode: 400, body: JSON.stringify({ error: 'El prompt es requerido.' }) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openAIKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json",
      }),
    });

    if (!response.ok) {
        const errorData = await response.json();
        console.error('OpenAI Image API Error:', errorData);
        return { statusCode: response.status, body: JSON.stringify({ error: 'Error en la API de OpenAI', details: errorData.error.message }) };
    }

    const data = await response.json();
    const imageData = `data:image/png;base64,${data.data[0].b64_json}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ imageData }),
    };

  } catch (error) {
    console.error('Image Generation Error:', error);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            error: 'Ocurrió un error interno en el servidor.',
            details: error.message 
        }) 
    };
  }
};
