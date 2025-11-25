/*
Source: ChatGPT
Prompt:
Write me some sql to create a table called 'chats' to store chatbot chat logs.
Then, write me some typescript example functions to insert into and read from that table
 */
create table if not exists users (
  user_id uuid primary key,             -- Supabase Auth ID
  university_id text,
  major text,
  isstudent boolean,
    year int CHECK (year >= 1 AND year <= 5),
  interests text[], 
  created_at timestamptz default now()
);

create table if not exists chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(user_id) on delete cascade,
  chat_id uuid not null, -- unique conversation/session
  message text not null,
  role text check (role in ('user','assistant','system')) not null,
  created_at timestamptz default now()
);