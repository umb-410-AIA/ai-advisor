import type { NextApiRequest, NextApiResponse } from "next";
import { assertRequestHasValidJwt } from "@/utils/auth";
import { createClient } from "@supabase/supabase-js";
import { upsertUserData, fetchUserData } from "@/utils/userdata";
import { insertChatMessage, fetchChatMessages } from "@/utils/chats";
import { getUserId } from "@/utils/auth";
import { get } from "http";
import { llm, reload_prompt, default_system_prompt } from "@/utils/llm";
import { UNIVERSITIES } from "@/utils/universityDB"; 
import { getCoursesByMajor } from "@/utils/universityDB";

function extractVisualizationData(text: string) {
  const marker = "VISUALIZATION_DATA:";
  const idx = text.indexOf(marker);
  if (idx === -1) return null;
  
  const jsonStr = text.substring(idx + marker.length).trim();
  try {
    const match = jsonStr.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
  } catch (e) {
    console.log("Failed to parse visualization data:", e);
  }
  return null;
}

async function buildUserContext(userId: string) {
  const user = await fetchUserData(userId);

  return `
    User Profile:
    - Major: ${user?.major || "Unknown"}
    - University of Choice: ${user?.university || "Unknown"}
    - Application Year: ${user?.year || "Unknown"}
    - Goals: ${user?.interests || "Unknown"}
    - Is Student: ${user?.isstudent || "Unknown"}

    When responding, adapt your answers to this user's data.
  `.trim();
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const user_id = await getUserId(req);
    const input = req.body
    const message = input.message

    if (!user_id) return res.status(400).json({ error: "Missing user_id" });

    try {
      assertRequestHasValidJwt(req);
    } catch (err) {
      return res.status(401).json({ error: err });
    }

    const userContext = await buildUserContext(user_id)
    try {
      // remind user of previous interaction
      // onboard user
      // or respond normally to message
      var reply;
      if (message === "init") {
        const system_prompt = userContext + "\n" + reload_prompt 
        reply = await llm(user_id, null, system_prompt);
      } else {
        const system_prompt = userContext + "\n" + default_system_prompt 
        reply = await llm(user_id, message, system_prompt);
      }
      res.status(200).json(reply);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
    }
  }