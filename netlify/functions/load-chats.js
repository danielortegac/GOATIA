import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
)

export const handler = async (event, context) => {
  const user = context.clientContext?.user
  if (!user) return { statusCode: 401, body: 'No auth' }

  const { data, error } = await supabase
    .from('user_chats')
    .select('chats')
    .eq('user_id', user.sub)
    .single()

  if (error && error.code !== 'PGRST116') {
    return { statusCode: 500, body: error.message }
  }

  return { statusCode: 200, body: JSON.stringify(data?.chats || []) }
}
