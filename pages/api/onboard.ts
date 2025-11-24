// Source ChatGPT: 
// Prompt: Write me a simple API to onboard users

import { llm } from "@/utils/llm";
import type { NextApiRequest, NextApiResponse } from "next";
import { getUserId } from "@/utils/auth";
import { assertRequestHasValidJwt } from "@/utils/auth";

const onboard_prompt = `
        You are an assisstant to an AI advisor for university students.
        The user will begin by saying nothing. 
        You are onboarding a new user. 
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
        - After the user answers each question, validate very lightly:
          - University: non-empty string.
          - Major: non-empty string.
          - Year: convert 1-4 to freshman, sophomore, junior, senior, must be string
          - isStudent: if they say yes, set true, if not set false and also set year to default freshman
          - interests: a list of strings, simple interests tracker
        - If the data is already in the chatlogs, immediately skip to the toolcall. If one part is in the logs
            already, do not reprompt the user for it. Be sure not to overwrite it either if it was already saved.
            In that case, you may only ask some questions.
        - If the user is not currently a student, do not ask what year of school they are in currently. (skip 5)
        - Once you have info for all 5, stop asking questions, and save the collected fields to the database
             using the given toolcall "updateUserProfile"
    `

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
        const reply = await llm(user_id, message, onboard_prompt);
        return res.status(200).json(reply);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
}