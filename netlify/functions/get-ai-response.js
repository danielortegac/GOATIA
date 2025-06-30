export async function handler(event, context) {
  try {
    const { prompt, history } = JSON.parse(event.body);

    /* ...  AQUÍ todo el bloque que te pasé   ... */

    const res = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify(perplexityBody),
    });

    const data = await res.json();
    return {
      statusCode: 200,
      body: JSON.stringify({ answer: data.choices[0].message.content }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
}
