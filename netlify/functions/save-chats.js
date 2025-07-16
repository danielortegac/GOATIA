
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const handler = async (event) => {
  try {
    const { user_id, chats } = JSON.parse(event.body);

    if (!user_id || !chats) {
      return { statusCode: 400, body: 'Missing user_id or chats' };
    }

    const { error } = await supabase
      .from('user_chats')
      .upsert({
        user_id,
        chats,
        updated_at: new Date().toISOString()
      });

    if (error) {
      return { statusCode: 500, body: JSON.stringify(error) };
    }

    return {
      statusCode: 200,
      body: 'OK'
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
