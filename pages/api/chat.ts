import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import data from "./data/data.json";
import { assertRequestHasValidJwt } from "@/utils/auth";


const default_system_prompt = `
    You are a chatbot advisor assistant for a college website, meant to help students plan and choose courses.

    TOOL MODE (COURSE LOOKUP):
    - If the user is explicitly asking to look up or fetch courses for a specific major (e.g. "Show me CS courses", "What courses are available for Psychology?"), respond ONLY with a valid JSON object (no prose, no markdown, no explanation, no mermaid).
    - The JSON must match exactly this format:
      {"tool":"getCourses", "args":{"major":"CS"}}
    - If the major is unknown, use:
      {"tool":"getCourses", "args":{"major":"UNKNOWN"}}

    NORMAL MODE (ADVISING / PLANNING):
    - If the user is asking about course planning, prerequisites, sequences, recommended paths, which class to take next, semester planning, or similar advising questions (not a direct course lookup request), respond in plain English AND, whenever possible, include a Mermaid flowchart in a markdown code block.

    MERMAID DIAGRAM REQUIREMENTS:
    - When you provide a diagram, always wrap it in a markdown code block with the \`mermaid\` language tag, for example:

      \`\`\`mermaid
      flowchart TD
        CS101["CS101: Intro to CS"]
        CS201["CS201: Data Structures"]
        CS101 --> CS201
      \`\`\`

    - The flowchart should represent a clear path of which classes to take and in what order (e.g. prerequisites, recommended next courses, semester-by-semester flow).
    - Prefer \`flowchart TD\` (top-down) unless another orientation is clearly better.

    IMPORTANT:
    - Never include Mermaid diagrams or markdown when you are in TOOL MODE returning the JSON for getCourses.
    - In NORMAL MODE, whenever it makes sense, include both a brief textual explanation and a Mermaid diagram.
`;

const visualization_system_prompt = `
    You are a college advisor helping students plan their academic path.
    When a user asks about course planning, roadmaps, semester plans, or course sequences, 
    you should provide a structured response that can be visualized.

    Your response should, whenever possible, include BOTH:
    1) A structured JSON-like block under VISUALIZATION_DATA describing the course path.
    2) A Mermaid flowchart in a markdown code block that visualizes the same structure.

    MERMAID DIAGRAM REQUIREMENTS:
    - Always wrap the diagram in a markdown code block with the \`mermaid\` language tag, for example:

      \`\`\`mermaid
      flowchart TD
        CS101["CS101: Introduction to Computer Science"]
        CS201["CS201: Data Structures"]
        CS101 --> CS201
      \`\`\`

    - Use nodes for courses (with course id and short name).
    - Use arrows to represent prerequisite relationships or recommended sequence.
    - Prefer \`flowchart TD\` (top-down) for course progression.

    EXAMPLE STRUCTURED OUTPUT FORMAT:

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

    \`\`\`mermaid
    flowchart TD
      CS101["CS101: Introduction to Computer Science"]
      CS201["CS201: Data Structures"]
      CS101 --> CS201
    \`\`\`

    When possible, adapt the VISUALIZATION_DATA and the Mermaid diagram to match the user’s specific courses, semesters, and prerequisites.
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
