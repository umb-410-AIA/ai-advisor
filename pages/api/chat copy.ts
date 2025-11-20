import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import data from "../../data/UMASS_BOSTON_coursecatalogstructured.json"
import { assertRequestHasValidJwt } from "@/utils/auth";

const default_system_prompt = `
    You are a chatbot advisor assistant for a college website, meant to help students plan and choose courses.
    If the user asks for courses, respond ONLY with a valid JSON object (no prose, no markdown, no explanation).
    The JSON must match exactly this format:
    {"tool":"getCourses", "args":{"major":"CS"}}

    If the major is unknown, use {"tool":"getCourses", "args":{"major":"UNKNOWN"}}.
    If the user is not asking about courses, respond in plain English.\n
    `;

const visualization_system_prompt = `
    You are a college advisor helping students plan their academic path.
    When a user asks about course planning, roadmaps, semester plans, or course sequences, 
    you should provide a structured response that can be visualized.
    
    After your explanation, add a JSON block with this exact format:
    
    VISUALIZATION_DATA:
    {
      "type": "course_path",
      "courses": [
        {
          "id": "CS101",
          "name": "Introduction to Computer Science",
          "semester": "Fall 2025",
          "credits": 3,
          "difficulty": "easy",
          "prerequisites": []
        },
        {
          "id": "CS201",
          "name": "Data Structures",
          "semester": "Spring 2026",
          "credits": 4,
          "difficulty": "medium",
          "prerequisites": ["CS101"]
        }
      ]
    }
`;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractFirstJsonObject(s: string) {
  s = s.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
  const m = s.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("No JSON object found");
  return m[0];
}

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

function shouldProvideVisualization(message: string): boolean {
  const visualizationKeywords = [
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
  ];
  
  const lowerMessage = message.toLowerCase();
  return visualizationKeywords.some(keyword => lowerMessage.includes(keyword));
}

async function chatbot(prompt: string, system_prompt: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system_prompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 1500,
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

    const classes = Object.values(data);

    const tools = {
      getCourses: async ({ major }: { major: string }) => {
        const prunedClasses = classes
          .filter((cls: any) => cls.id.startsWith(major.toUpperCase()))
          .map((cls: any) => `${cls.id} — ${cls.title}\n${cls.course_descriptors.description}`)
          .join("\n\n");
        return prunedClasses;
      },
    };

    // Check if we should provide visualization
    const needsVisualization = shouldProvideVisualization(message);
    const systemPrompt = needsVisualization ? visualization_system_prompt : default_system_prompt;

    const reply = await chatbot(message, systemPrompt);
    
    // Try to parse as tool call first
    try {
      const parsed = JSON.parse(extractFirstJsonObject(reply));
      if (tools.hasOwnProperty(parsed.tool)) {
        console.log("TOOL CALL\n" + parsed.tool);
        const result = await tools[parsed.tool](parsed.args);
        
        const enhancedSystemPrompt = needsVisualization 
          ? `${visualization_system_prompt}\n\nProvide a helpful response and include visualization data if appropriate.`
          : "";
        
        const query = await chatbot(
          `Here's the result of your tool call: ${result}\n\nHere is the user's message/request:\n\n"""${message}"""\nPlease use the result of the tool call to provide the most helpful response possible.`,
          enhancedSystemPrompt
        );
        
        console.log(query);
        
        // Check for visualization data in the response
        const vizData = extractVisualizationData(query);
        if (vizData) {
          const textOnly = query.split("VISUALIZATION_DATA:")[0].trim();
          return res.status(200).json({
            reply: textOnly,
            visualizationType: vizData.type,
            data: vizData
          });
        }
        
        return res.status(200).json({ reply: query });
      }
    } catch (e) {
      console.log(e);
    }
    
    // Check for visualization data in regular response
    const vizData = extractVisualizationData(reply);
    if (vizData) {
      const textOnly = reply.split("VISUALIZATION_DATA:")[0].trim();
      return res.status(200).json({
        reply: textOnly,
        visualizationType: vizData.type,
        data: vizData
      });
    }
    
    console.log(reply);
    return res.status(200).json({ reply: reply });
  } catch (err: any) {
    console.error("API error:", err);
    return res.status(500).json({ error: "Failed to process request" });
  }
}