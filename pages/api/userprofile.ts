import { getUserId } from "@/utils/auth";
import { fetchChatMessages } from "@/utils/chats";
import { fetchUserData } from "@/utils/userdata";
import type { NextApiRequest, NextApiResponse } from "next";

export interface UserData {
  isStudent?: boolean;
  major?: string;
  university?: string;
  year?: string;
  interests?: string[];
}

export interface UserProfile {
  user_id: string;
  chats: any[];
  data: UserData;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const user_id = await getUserId(req);
  if (!user_id) return res.status(400).json({ error: "Missing user_id" });

  try {
    const chats = await fetchChatMessages(user_id)
    const profile = await fetchUserData(user_id)
    const userProfile: UserProfile = {
      user_id: user_id,
      data: profile,
      chats: chats
    };
    return res.status(200).json(userProfile);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user profile" });
  }
}
