
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

export const handler = async (event) => {
  try {
    const userId = event.queryStringParameters?.user_id;
    if (!userId) {
      return { statusCode: 400, body: 'Missing user_id' };
    }

    const { data, error } = await supabase
      .from('user_chats')
      .select('chats')
      .eq('user_id', userId)
      .single();

    if (error) {
      return { statusCode: 500, body: JSON.stringify(error) };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(data?.chats || [])
    };
  } catch (e) {
    return { statusCode: 500, body: e.message };
  }
};
