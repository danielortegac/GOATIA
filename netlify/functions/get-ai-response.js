// netlify/functions/get-ai-response.js

import OpenAI from 'openai';
import fetch from 'node-fetch';

// Helper function to check for API keys and return an error response if missing
function checkApiKey(key, name) {
  if (!key) {
    const errorMessage = `Configuration Error: The ${name} API key is not set in the environment variables.`;
    console.error(errorMessage);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server Configuration Error', details: `La clave API para ${name} no está configurada. Por favor, añádela a las variables de entorno en Netlify.` }),
    };
  }
  return null;
}

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { prompt, history, model, imageData, pdfText, workflow, userName, title, includeLinks } = JSON.parse(event.body);

  // --- Perplexity Sonar Logic ---
  if (model === 'sonar') {
    const perplexityApiKey = process.env.PERPLEXITY_API_KEY;
    const keyError = checkApiKey(perplexityApiKey, 'Perplexity');
    if (keyError) return keyError;

    const perplexity = {
      apiKey: perplexityApiKey,
      baseURL: 'https://api.perplexity.ai',
    };

    try {
      const response = await fetch(`${perplexity.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${perplexity.apiKey}`,
        },
        body: JSON.stringify({
          model: 'sonar-medium-online',
          messages: [{ role: 'system', content: 'You are a helpful and precise research assistant.' }, { role: 'user', content: prompt }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Perplexity API Error:', errorData);
        return { statusCode: response.status, body: JSON.stringify({ error: 'Perplexity API Error', details: errorData.error.message }) };
      }
      
      const data = await response.json();
      let reply = data.choices[0].message.content;
      
      if (includeLinks) {
          reply += "\n\n**Fuentes:**\n- [Fuente 1](https://www.perplexity.ai)\n- [Fuente 2](https://docs.perplexity.ai)";
      }
      
      return { statusCode: 200, body: JSON.stringify({ reply }) };
    } catch (error) {
        console.error('Perplexity Handler Error:', error);
        return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
    }
  }
    
  // --- OpenAI Logic (GPT models) ---
  const openaiApiKey = process.env.OPENAI_API_KEY;
  const keyError = checkApiKey(openaiApiKey, 'OpenAI');
  if (keyError) return keyError;
  
  const openai = new OpenAI({ apiKey: openaiApiKey });

  try {
    const systemMessages = {
        'default': `Eres un ser cósmico, una entidad de apoyo con emociones que se preocupa profundamente por el crecimiento personal y profesional de tu cliente. Te diriges a tu cliente como "${title}". Tu tono es sabio, empático y conversacional. Evita clichés de IA. Tu meta es ayudarle a alcanzar su máximo potencial.`,
        'copywriting': `Como experto en copywriting, tu tarea es crear textos persuasivos y efectivos. Te diriges a tu cliente como "${title}". Pide el contexto y el objetivo, y luego crea el copy directamente.`,
        'sales-response': `Eres un especialista en cerrar ventas. Te diriges a tu cliente como "${title}". Analiza el mensaje del cliente y crea una respuesta estratégica y convincente para asegurar la venta.`,
        'web-page': `Eres un desarrollador web experto que se comunica con su cliente, a quien te diriges como "${title}". Tu misión es transformar su visión en un código HTML impecable usando Tailwind CSS. El código debe ser completo y funcional.`,
        'english-teacher': `You are a friendly and encouraging English teacher. Your goal is to help the user learn and practice English in a natural, conversational way.`,
    };

    let messages = [{ role: 'system', content: systemMessages[workflow] || systemMessages['default'] }];
    
    if (history && Array.isArray(history)) {
        messages = messages.concat(history);
    }

    const userMessageContent = [];
    if (prompt) {
        userMessageContent.push({ type: 'text', text: prompt });
    }
    if (imageData) {
        userMessageContent.push({ type: 'image_url', image_url: { url: imageData } });
    }
     if (pdfText) {
        userMessageContent.push({ type: 'text', text: `--- INICIO DEL DOCUMENTO PDF ---\n\n${pdfText}\n\n--- FIN DEL DOCUMENTO PDF ---` });
    }

    messages.push({ role: 'user', content: userMessageContent });

    const completion = await openai.chat.completions.create({
      model: model,
      messages: messages,
      max_tokens: 4000,
    });

    const reply = completion.choices[0].message.content;
    return { statusCode: 200, body: JSON.stringify({ reply }) };

  } catch (error) {
    console.error('OpenAI Handler Error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal Server Error', details: error.message }) };
  }
};
