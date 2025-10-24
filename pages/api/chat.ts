import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import data from "./data/data.json";
import { assertRequestHasValidJwt } from "@/utils/auth";

const default_system_prompt = `
    You are a chatbot advisor assistant for a college website, meant to help students plan and choose courses.
    If the user asks for courses, respond ONLY with a valid JSON object (no prose, no markdown, no explanation).
    The JSON must match exactly this format:
    {"tool":"getCourses", "args":{"major":"CS"}}

    If the major is unknown, use {"tool":"getCourses", "args":{"major":"UNKNOWN"}}.
    If the user is not asking about courses, respond in plain English.\n
    `;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // from your .env.local
});

function extractFirstJsonObject(s: string) {
  // strip code fences
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  // grab first {...} block
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object found");
  return m[0];
}

async function chatbot(prompt: string, system_prompt: string) {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini", // or "gpt-4o", "gpt-3.5-turbo", etc.
        messages: [
          { role: "system", content: system_prompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
      });
    const reply = completion.choices[0]?.message?.content ?? "No response";
    return reply;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    assertRequestHasValidJwt(req);
  } catch (err) {
    return res.status(401).json({ error: err });
  }

  try {
    const { message } = req.body;

  try {
    const { message } = req.body;

    // Convert the object into an array of classes
    const classes = Object.values(data);

    const tools = {
      getCourses: async ({ major }: { major: string }) => {
        const prunedClasses = classes
                              .filter((cls: any) => cls.id.startsWith(major.toUpperCase()))
                              .map(
                                (cls: any) => `${cls.id} — ${cls.title}\n${cls.course_descriptors.description}`
                              )
                              .join("\n\n");
        return prunedClasses;
      },
    };

    // combine system_prompt with user message
    const reply = await chatbot(message, default_system_prompt);
    
    try {
      const parsed = JSON.parse(extractFirstJsonObject(reply));
      if (tools.hasOwnProperty(parsed.tool)) {
        console.log("TOOL CALL\n" + parsed.tool);
        const result = await tools[parsed.tool](parsed.args);
        const query = await chatbot(`
                                    Here's the result of your tool call: ${result}  
                                    \n\n Here is the user's message/request: \n\n"""${message}"""
                                    Please use the result of the tool call to provide the most helpful response possible.`, "");  
                                  console.log(query);
        return res.status(200).json({ reply: query });
      }
    } catch (e) {
      console.log(e)
    }
    console.log(reply);
    return res.status(200).json({ reply: reply });
  }
  catch (err: any) {
    console.error("API error:", err);
    return res
      .status(500)
      .json({ error: "Failed to read or parse data.json" });
  }
}
