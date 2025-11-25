import type { NextApiRequest, NextApiResponse } from "next";
import { assertRequestHasValidJwt } from "@/utils/auth";
import { createClient } from "@supabase/supabase-js";
import { upsertUserData, fetchUserData } from "@/utils/userdata";
import { insertChatMessage, fetchChatMessages } from "@/utils/chats";
import { getUserId } from "@/utils/auth";
import { get } from "http";
import { llm } from "@/utils/llm";
import { UNIVERSITIES } from "@/utils/universityDB"; 

// replaces system prompt if first time logging in
const onboard_prompt = `
      You are onboarding the user. Ask one missing profile question at a time.
      Use the following strict university ID mapping:
      ${UNIVERSITIES.map((u, i) => `${i + 1}: ${u}`).join("\n")}
      Never guess. Ask for clarification instead of calling the tool if invalid.
    `

// added to system prompt if user is returning
const return_system_prompt = `You are a college advisor helping students plan their academic path.
                              Welcome the user back and remind of previous interactions in 50 words or less.`

const default_system_prompt = `
    You are a college advisor helping students plan their academic path.
    
    When a user asks generally about courses for a, you should
    make a tool call using the tool "getCoursesByMajor".
    If the user has just said a major of interest or specific university, use that.
    Otherwise, use the major and university in their user profile.

    If the user uses any of these keywords exactly:
      "show path",
      "visualize",
      "semester plan",
      "roadmap",
      "course sequence",
      "degree plan",
      "academic plan"
    or otherwise asks for a visual path of what to take:
      Toolcall "visualizePath" instead:
        For parameters, use the user profile info.

    If the user mentions some new information about themselves that isn't already in the profile,
    you should toolcall "saveUserData" and save the new info. 
    When passing university_id: Use list index as ID. If the university isn't in the list, ask the user
    to try a different UNIVERSITY, and tell them what choices they can make from this list:
              UNIVERSITIES[] = ${UNIVERSITIES}; 
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
      if (message === "remind") {
        // remind user of previous interaction
        const system_prompt = userContext + "\n" + return_system_prompt
        reply = await llm(user_id, "", system_prompt);
      } else if (message === "onboard") {
        const system_prompt = userContext + "\n" + onboard_prompt 
        reply = await llm(user_id, "", system_prompt);
      } else {
        const system_prompt = userContext + "\n" + default_system_prompt 
        reply = await llm(user_id, message, system_prompt);
      }
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