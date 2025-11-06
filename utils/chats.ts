/*
Source: ChatGPT
Prompt:
Write me some sql to create a table called 'chats' to store chatbot chat logs.
Then, write me some typescript example functions to insert into and read from that table
 */

import { v4 as uuidv4 } from 'uuid';
import supabase from './supabaseClient';

// Inserts a new message for a chat session
export async function insertChatMessage(
  chatId: string,
  message: string,
  role: 'user' | 'assistant' | 'system'
) {
  const { data, error } = await supabase
    .from('chats')
    .insert([{ chat_id: chatId, message, role }])
    .select();

  if (error) {
    console.error('Error inserting chat message:', error);
    throw error;
  }

  return data;
}

// Helper to start a new chat session (returns a new UUID)
export function createNewChatSession(): string {
  return uuidv4();
}

export async function fetchChatMessages(chatId: string) {
  const { data, error } = await supabase
    .from('chats')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching chat messages:', error);
    throw error;
  }

  return data;
}
