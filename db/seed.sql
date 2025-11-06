/*
Source: ChatGPT
Prompt:
Write me some sql to create a table called 'chats' to store chatbot chat logs.
Then, write me some typescript example functions to insert into and read from that table
 */
create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  chat_id uuid not null, -- represents a unique chat session or conversation
  message text not null,
  role text check (role in ('user', 'assistant', 'system')) not null,
  created_at timestamptz default now()
);
