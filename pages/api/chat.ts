import type { NextApiRequest, NextApiResponse } from "next";
import * as ollama from "ollama"
import fs from "fs";
import path from "path";

async function chatbot(prompt: string) {
      const completion = await fetch("http://127.0.0.1:11434/v1/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama3:latest",
        prompt: prompt,
        max_tokens: 1000,
      }),
    });
    const response = await completion.json();
    const reply = response.choices[0].text; // or whatever your server returns
    return reply;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end();

  try {
    const { message } = req.body;

    const default_prompt = `
    You are a chatbot advisor assistant for a college website, meant to help students plan and choose courses.
    If the user asks for courses, respond ONLY with a valid JSON object (no prose, no markdown, no explanation).
    The JSON must match exactly this format:
    {"tool":"getCourses", "args":{"major":"CS"}}

    If the major is unknown, use {"tool":"getCourses", "args":{"major":"UNKNOWN"}}.
    If the user is not asking about courses, respond in plain English.

    User: ${message}
    `;

    // Read the JSON file
    const dbPath = path.join(process.cwd(), "./pages/api/data/data.json");
    const raw = fs.readFileSync(dbPath, "utf8");
    const data = JSON.parse(raw);

    // Convert the object into an array of classes
    const classes = Object.values(data);

    const tools = {
      getCourses: async (major: string) => {
        const prunedClasses = classes
                              .filter((cls: any) => cls.id.startsWith(major.toUpperCase()))
                              .map(
                                (cls: any) => `${cls.id} — ${cls.title}\n${cls.course_descriptors.description}`
                              )
                              .join("\n\n");
        return prunedClasses;
      },
    };

    const reply = await chatbot(default_prompt);
    
    try {
      const parsed = JSON.parse(reply);
      if (parsed.tool == tools.getCourses.name) {
        const result = await tools.getCourses(parsed.args.major);
        const query = await chatbot("Here's a list of courses: " + result +  "\n\nList them all by ID, in increasing order, exactly as they appear, followed by the name CS105 - intro to computing, CS109 - computing for engineers");  
        console.log (result);
        return res.status(200).json({ reply: query });
      }
    } catch (e) {
      
    }
    return res.status(200).json({ reply: reply });
  }
  catch (err: any) {
    console.error("API error:", err);
    return res
      .status(500)
      .json({ error: "Failed to read or parse classes.json" });
  }
}
