/*
Source: ChatGPT
Prompt:
Write me some sql to create a table called 'chats' to store chatbot chat logs.
Then, write me some typescript example functions to insert into and read from that table
 */
import supabase from './supabaseClient';

// Inserts a new message for a chat session
export async function insertChatMessage(
  user_id: string,
  chat_id: string,
  message: string,
  role: 'user' | 'assistant' | 'system' | 'tool'
) {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ user_id: user_id, 
               chat_id: chat_id,
               message: message, 
               role: role }])
    .select();

  if (error) {
    console.error('Error inserting chat message:', error);
    throw error;
  }

  return data;
}

// returns the ID of the latest chat in the database
export async function getChatID(user_id: string) {
    const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }

    const lastChat = data[0] ?? null;

    return lastChat ? lastChat.chat_id : null;
}

export async function fetchChatMessages(user_id: string, chat_id: string) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('user_id', user_id)
    .eq('chat_id', chat_id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }

  return data;
}

// fetch most recent chat messages
export async function fetchRecentChatMessages(user_id: string) {
  const chat_id = await getChatID(user_id);
  let data = null;
  if (chat_id) { data = await fetchChatMessages(user_id, chat_id); }
  return data;
}
