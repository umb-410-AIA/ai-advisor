/*
Source: ChatGPT
Prompt:
Write me some supabase boilerplate to plug into a typescript file that will export
some initialized database object to use throughout my backend
*/

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// It's good practice to load these from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY as string;

// Create a single supabase client for your entire backend
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false, // optional: avoids storing sessions in server memory
  }
});

export default supabase;
