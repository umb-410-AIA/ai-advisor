// userdata.ts
import { v4 as uuidv4 } from 'uuid';
import supabase from "./supabaseClient";

export async function fetchUserData(userId: string) {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", userId)

  if (error) {
    console.error("Supabase Upsert Error:", error);
    throw error;
  }

    return data && data.length > 0 ? data[0] : null;
}

export async function upsertUserData(userId: string, partial: any) {
  const { data, error } = await supabase
    .from("users")
    .upsert({ user_id: userId, ...partial });

  console.log("USER DATA:", { user_id: userId, ...partial });
  if (error) {
    console.error("Supabase Upsert Error:", error);
    throw error;
  }
}
