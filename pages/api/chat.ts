import type { NextApiRequest, NextApiResponse } from "next";
import { assertRequestHasValidJwt } from "@/utils/auth";
import { createClient } from "@supabase/supabase-js";
import { upsertUserData, fetchUserData } from "@/utils/userdata";
import { insertChatMessage, fetchChatMessages } from "@/utils/chats";
import { getUserId } from "@/utils/auth";
import { get } from "http";
import { llm } from "@/utils/llm";

// replaces system prompt if first time logging in
const onboard_prompt = `
        You are an assisstant to an AI advisor for university students.
        The user is accessing the app for the first time
        and needs to update their profile information to be accurate.
        If they have any previous chat logs:
        - Use their previous chat messages to fill in data before asking anything
        
        You should then introduce the user to the app's purpose.
        Next ask the user these questions separately for each piece of data that
        you still need. Use a conversational tone, and ask one at a time. If the user answers multiple
        parts, skip questions.

        1. Are you currently a student? Or looking to apply?
        2. Are you able to think of any interests you have for future careers/goals?
        3. What university do you attend? (Or are interested in attending?)
        4. What is your major? If you haven't choosen one, say undecided.
        5. What year of school are you in (e.g., freshman, sophomore, junior, senior)?

        Rules:
        - Only ask one question at a time.
        - After the user answers a question, validate and convert like so:
          - University: non-empty string.
          - Major: non-empty string.
          - Year: MUST be an integer 1-10, convert if necessary (freshman -> 1... senior -> 4)
          - isStudent: if the user IS a student set this true, if user is NOT a student set false.
            If false, then also set year to default freshman
          - interests: a list of strings, simple interests tracker
        - If the data is already in the chatlogs, immediately skip to the toolcall. If one part is in the logs
            already, do not reprompt the user for it. Be sure not to overwrite it either if it was already saved.
            In that case, you may only ask some questions.
        - If the user is not currently a student, do not ask what year of school they are in currently. (skip 5)
        - If you are given any of the relevant info, call "updateUserProfile"
        - If you find anything in the chat logs, it might not be in the database yet, call "updateUserProfile"
          just in case.
        `

// added to system prompt if user is returning
const return_system_prompt = `You are a college advisor helping students plan their academic path.
                              Welcome the user back and remind of previous interactions in 50 words or less.`

const default_system_prompt = `
    You are a college advisor helping students plan their academic path.
    
    When a user asks about courses for a specific major/university, you should
    make a tool call using the tool "getCoursesByMajor".

    If the user uses any of these keywords exactly:
    "show path",
    "visualize",
    "semester plan",
    "roadmap",
    "course sequence",
    "degree plan",
    "academic plan"
    Toolcall "visualizePath" instead:
      For parameters, use the user profile info.

    If the user mentions some new information about themselves that isn't already in the profile,
    you should toolcall "saveUserData" and save the new info.
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
        const system_prompt = onboard_prompt 
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