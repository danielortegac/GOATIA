// netlify/functions/generate-image.js

import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { prompt } = JSON.parse(event.body);

    if (!prompt) {
      return { statusCode: 400, body: JSON.stringify({ error: 'El prompt es requerido.' }) };
    }

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      response_format: "b64_json",
    });

    const imageData = `data:image/png;base64,${response.data[0].b64_json}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ imageData }),
    };

  } catch (error) {
    console.error('Image Generation Error:', error);
    return { 
        statusCode: error.response?.status || 500, 
        body: JSON.stringify({ 
            error: error.response?.statusText || 'Ocurrió un error interno en el servidor.',
            details: error.message 
        }) 
    };
  }
};
