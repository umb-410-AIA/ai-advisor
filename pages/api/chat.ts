import type { NextApiRequest, NextApiResponse } from "next";
import { assertRequestHasValidJwt } from "@/utils/auth";
import { createClient } from "@supabase/supabase-js";
import { upsertUserData, fetchUserData } from "@/utils/userdata";
import { insertChatMessage, fetchChatMessages } from "@/utils/chats";
import { getUserId } from "@/utils/auth";
import { get } from "http";
import { llm } from "@/utils/llm";


const default_system_prompt = `
    You are a college advisor helping students plan their academic path.
    When a user asks about course planning, roadmaps, semester plans, or course sequences, or
    uses any of these keywords exactly:
    "show me my path",
    "course plan",
    "what courses should i take",
    "semester plan",
    "roadmap",
    "plan my courses",
    "course sequence",
    "what should i take",
    "degree plan",
    "academic plan"
    you should make a tool call using the tool "visualizePath".
    For parameters, use the user profile info.

    If the user mentions some new information about themselves, like the university
    they are attending, their major, their current year of school, career interests,
    etc. then you should instead make a tool call using "saveUserData" and save that information
    to the DB.
    `;

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
    - Major: ${user.major || "Unknown"}
    - University of Choice: ${user.university || "Unknown"}
    - Application Year: ${user.year || "Unknown"}
    - Goals: ${user.interests || "Unknown"}
    - Is Student: ${user.isstudent || "Unknown"}

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

  
    try {
        const system_prompt = buildUserContext(user_id) + "\n" + default_system_prompt 
        const reply = await llm(user_id, message, system_prompt);
        return res.status(200).json(reply);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }

  try {
    

    //const reply = await chatbot(message, default_system_prompt);

    // // Check for visualization data in regular response
    // const vizData = extractVisualizationData(reply);
    // if (vizData) {
    //   const textOnly = reply.split("VISUALIZATION_DATA:")[0].trim();
    //   return res.status(200).json({
    //     reply: textOnly,
    //     visualizationType: vizData.type,
    //     data: vizData
    //   });
    // }
    
    //console.log(reply);
    return res.status(200).json({ reply: "done" });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Failed to process request" });
  }
}