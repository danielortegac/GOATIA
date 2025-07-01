// netlify/functions/generate-image.js
import fetch from "node-fetch";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { 
        statusCode: 405, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({error: "Method Not Allowed"}) 
    };
  }

  const { prompt } = JSON.parse(event.body || "{}");
  const openAIKey = process.env.OPENAI_API_KEY;

  if (!openAIKey) {
    return { 
        statusCode: 500, 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "La clave API de OpenAI no está configurada en el servidor." }) 
    };
  }

  if (!prompt || prompt.length < 5) {
    return {
      statusCode: 400,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "El prompt debe tener 5 o más caracteres." })
    };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAIKey}`
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt,
        n: 1,
        size: "1024x1024",
        response_format: "b64_json"
      })
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("OpenAI error", err);
      return {
        statusCode: response.status,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: err.error.message })
      };
    }

    const data = await response.json();
    const imageData = `data:image/png;base64,${data.data[0].b64_json}`;
    
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageData })
    };
  } catch (e) {
    console.error("Internal function error:", e);
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Error interno en la función.", details: e.message })
    };
  }
};
