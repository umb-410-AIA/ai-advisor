import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
import data from "./data/data.json"
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
    
    After your explanation, add a JSON block with detailed course information including:
    - Course ID, name, credits, difficulty
    - Prerequisites
    - Course description
    - Available sessions with schedule, instructor, location, dates, and capacity
    
    Format:
    
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
          "prerequisites": [],
          "description": "Introduction to programming and computer science fundamentals",
          "sessions": [
            {
              "section": "01",
              "schedule": "MWF 10:00-11:00 AM",
              "instructor": "Dr. Smith",
              "location": "Room 101",
              "classDate": "09/01/2025 - 12/15/2025",
              "capacity": "30",
              "enrolled": "25",
              "status": "Open"
            }
          ]
        }
      ]
    }
`;

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);
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
    "academic plan",
    "show courses",
    "show me courses",
    "visualize",
    "courses",
    "classes"
  ];
  
  const lowerMessage = message.toLowerCase();
  return visualizationKeywords.some(keyword => lowerMessage.includes(keyword));
}

function isCourseRequest(message: string): boolean {
  return /\bcourse|class|classes\b/i.test(message);
}

function extractMajorFromMessage(message: string): string | null {
  // Look for a short alpha code before 'course(s)' or 'class(es)'
  const majorMatch = message.match(/\b([a-z]{2,5})\s*(?=courses?|classes?)/i);
  if (majorMatch) return majorMatch[1].toUpperCase();
  // Fallback: grab first 2-4 letter code that looks like a department
  const fallbackMatch = message.match(/\b([a-z]{2,4})\d{0,3}\b/i);
  if (fallbackMatch) return fallbackMatch[1].toUpperCase();
  return null;
}

function isDegreePlanRequest(message: string): boolean {
  const degreeKeywords = [
    "degree plan",
    "four year plan",
    "four-year plan",
    "roadmap",
    "map to complete",
    "plan to complete",
    "degree roadmap",
    "bs in computer science",
    "cs degree plan",
    "cs roadmap",
    "complete cs degree",
  ];
  const lowerMessage = message.toLowerCase();
  return degreeKeywords.some((keyword) => lowerMessage.includes(keyword));
}

const csDegreePlanTemplate = [
  {
    term: "Freshman Fall",
    totalCredits: 15,
    courses: [
      { id: "CS 110", title: "Introduction to Computer Science", credits: 4 },
      { id: "MATH 140", title: "Calculus I", credits: 4 },
      { id: "FIRST YEAR SEMINAR", title: "First Year Seminar", credits: 4, kind: "gened" },
      { id: "ENGL 101", title: "English Composition I", credits: 3, kind: "gened" },
    ],
  },
  {
    term: "Freshman Spring",
    totalCredits: 14,
    courses: [
      { id: "CS 210", title: "Intermediate Computing with Data Structures", credits: 4 },
      { id: "CS 240", title: "Programming in C", credits: 3 },
      { id: "MATH 141", title: "Calculus II", credits: 4 },
      { id: "ENGL 102", title: "English Composition II", credits: 3, kind: "gened" },
    ],
  },
  {
    term: "Sophomore Fall",
    totalCredits: 15,
    courses: [
      { id: "MATH 260", title: "Linear Algebra", credits: 3 },
      { id: "CS 220", title: "Applied Discrete Mathematics", credits: 3 },
      { id: "CS 285L", title: "Social Issues & Ethics in Computing", credits: 3 },
      { id: "GENERAL EDUCATION", title: "General Education", credits: 3, kind: "gened" },
      { id: "ELECTIVE", title: "Elective", credits: 3, kind: "gened" },
    ],
  },
  {
    term: "Sophomore Spring",
    totalCredits: 16,
    courses: [
      { id: "CS 310", title: "Advanced Data Structures and Algorithms", credits: 3 },
      { id: "CS 341", title: "Computer Architecture", credits: 3 },
      { id: "GENERAL EDUCATION", title: "General Education", credits: 3, kind: "gened" },
      { id: "INTERMEDIATE SEMINAR", title: "Intermediate Seminar", credits: 3, kind: "gened" },
      { id: "ELECTIVE", title: "Elective", credits: 4, kind: "gened" },
    ],
  },
  {
    term: "Junior Fall",
    totalCredits: 15,
    courses: [
      { id: "CS 420", title: "Introduction to Software Engineering", credits: 3 },
      { id: "CS 444", title: "Operating Systems", credits: 3 },
      { id: "CS 446", title: "Networks", credits: 3 },
      { id: "PHYS 113", title: "Physics I", credits: 3, kind: "physics" },
      { id: "PHYS 181", title: "Physics I Lab", credits: 3, kind: "physics" },
    ],
  },
  {
    term: "Junior Spring",
    totalCredits: 15,
    courses: [
      { id: "CS 451", title: "Programming Languages", credits: 3 },
      { id: "CS 449", title: "Compilers / Advanced Systems", credits: 3 },
      { id: "PHYS 114", title: "Physics II", credits: 3, kind: "physics" },
      { id: "PHYS 182", title: "Physics II Lab", credits: 3, kind: "physics" },
      { id: "MATH 345", title: "Probability and Statistics", credits: 3 },
    ],
  },
  {
    term: "Senior Fall",
    totalCredits: 15,
    courses: [
      { id: "CS ELECTIVE", title: "CS Elective (300+)", credits: 3, kind: "cs_elective" },
      { id: "CS ELECTIVE 2", title: "CS Elective (300+)", credits: 3, kind: "cs_elective" },
      { id: "GENERAL EDUCATION", title: "General Education", credits: 3, kind: "gened" },
      { id: "GENERAL EDUCATION 2", title: "General Education", credits: 3, kind: "gened" },
      { id: "ELECTIVE", title: "Elective", credits: 3, kind: "gened" },
    ],
  },
  {
    term: "Senior Spring",
    totalCredits: 15,
    courses: [
      { id: "CS 410", title: "Senior CS Capstone", credits: 3 },
      { id: "CS ELECTIVE 3", title: "CS Elective (300+)", credits: 3, kind: "cs_elective" },
      { id: "GENERAL EDUCATION", title: "General Education", credits: 3, kind: "gened" },
      { id: "GENERAL EDUCATION 2", title: "General Education", credits: 3, kind: "gened" },
      { id: "ELECTIVE", title: "Elective", credits: 3, kind: "gened" },
    ],
  },
];

function normalizeCourseId(courseId: string) {
  return courseId.replace(/\s+/g, "").toUpperCase();
}

function extractCatalogPrereqs(course: any): string[] {
  let prerequisites: string[] = [];
  const prereqSource =
    course.course_descriptors?.["pre requisites"] ??
    course.course_descriptors?.prerequisites ??
    course["course-prerequsities"] ??
    course["course-prerequisites"] ??
    course["prerequisites"] ??
    course.prerequisite ??
    course["pre-req"] ??
    course["pre_req"];
  if (Array.isArray(prereqSource)) {
    prerequisites = prereqSource.map(String);
  } else if (prereqSource) {
    const prereqText = String(prereqSource);
    // Try to extract course codes from the text
    const matches = prereqText.match(/[A-Z]{2,4}\s?\d{3}/g);
    if (matches) {
      prerequisites = matches;
    } else if (
      prereqText.trim() &&
      !prereqText.toLowerCase().includes("none") &&
      prereqText.length < 200
    ) {
      prerequisites = [prereqText.trim()];
    }
  }
  return prerequisites;
}

function findCatalogCourse(classes: any[], courseId: string) {
  const target = normalizeCourseId(courseId);
  return classes.find((cls: any) => {
    const id = normalizeCourseId((cls.id ?? cls.courseid ?? "").toString());
    return id === target;
  });
}

function enrichDegreePlan(classes: any[]) {
  const requiredCsSet = new Set([
    "CS110",
    "CS210",
    "CS240",
    "CS220",
    "CS285L",
    "CS310",
    "CS341",
    "CS420",
    "CS444",
    "CS446",
    "CS451",
    "CS449",
    "CS410",
  ]);

  const csElectivesPool = classes.filter((cls: any) => {
    const id = normalizeCourseId((cls.id ?? cls.courseid ?? "").toString());
    if (!id.startsWith("CS")) return false;
    const num = parseInt(id.replace(/\D/g, ""), 10);
    if (Number.isNaN(num) || num >= 600) return false;
    if (requiredCsSet.has(id)) return false;
    return true;
  });

  const genEdPool = classes.filter((cls: any) => {
    const id = normalizeCourseId((cls.id ?? cls.courseid ?? "").toString());
    if (!id) return false;
    if (id.startsWith("CS") || id.startsWith("MATH") || id.startsWith("PHYS")) return false;
    const num = parseInt(id.replace(/\D/g, ""), 10);
    return !Number.isNaN(num) && num >= 100 && num < 300; // entry-level
  });

  let csElectiveIdx = 0;
  let genEdIdx = 0;

  const pickFromPool = (pool: any[], idxRef: { value: number }) => {
    if (!pool.length) return null;
    const item = pool[idxRef.value % pool.length];
    idxRef.value += 1;
    return item;
  };

  const csIdxRef = { value: 0 };
  const genEdIdxRef = { value: 0 };

  return csDegreePlanTemplate.map((semester) => {
    const enrichedCourses = semester.courses.map((course) => {
      let catalog: any = null;
      // Special handling for placeholder kinds
      if (course.kind === "cs_elective") {
        catalog = pickFromPool(csElectivesPool, csIdxRef);
      } else if (course.kind === "gened") {
        catalog = pickFromPool(genEdPool, genEdIdxRef);
      } else if (course.kind === "physics") {
        catalog = findCatalogCourse(classes, course.id);
      } else {
        catalog = findCatalogCourse(classes, course.id);
      }

      const description =
        catalog?.course_descriptors?.description ??
        catalog?.coursedescription ??
        course.title ??
        "";
      const sessions = Array.isArray(catalog?.sessions) ? catalog.sessions : [];
      const prerequisites = catalog ? extractCatalogPrereqs(catalog) : [];
      const name = catalog?.title ?? catalog?.coursename ?? course.title;
      const id = catalog?.id ?? catalog?.courseid ?? course.id;
      const credits =
        course.credits ??
        (catalog?.sessions?.[0]?.credits
          ? parseInt(String(catalog.sessions[0].credits).split("/")[0], 10)
          : null) ??
        3;

      return {
        id,
        name,
        credits: credits || 3,
        prerequisites,
        description,
        sessions: sessions.slice(0, 3).map((session: any) => ({
          section: session.section || "N/A",
          schedule: session["schedule/time"] || "TBA",
          instructor: session.instructor || "TBA",
          location: session.location || "TBA",
          classDate: session["class dates"] || "TBA",
          capacity: session.capacity || "0",
          enrolled: session.enrolled || "0",
          status: session.status || "Unknown",
        })),
      };
    });

    const totalCredits =
      semester.totalCredits ||
      enrichedCourses.reduce((sum, c) => sum + (c.credits || 0), 0);

    return {
      term: semester.term,
      totalCredits,
      courses: enrichedCourses,
    };
  });
}
// Helper to convert course data to visualization format
function convertCoursesToVisualization(courses: any[], semester: string = "Fall 2025") {
  return courses.map((course: any) => {
    const id = course.id ?? course.courseid ?? "Unknown ID";
    const title = course.title ?? course.coursename ?? "Untitled course";
    // Parse credits from the first session
    let credits = 3; // default
    if (Array.isArray(course.sessions) && course.sessions[0]?.credits) {
      const creditStr = String(course.sessions[0].credits).split('/')[0];
      credits = parseInt(creditStr, 10) || 3;
    }

    // Parse prerequisites
    const prerequisites = extractCatalogPrereqs(course);

    return {
      id,
      name: title,
      semester: semester,
      credits: credits,
      difficulty: "medium", // You can add logic to determine difficulty
      prerequisites: prerequisites,
      description: course.course_descriptors?.description ?? course.coursedescription ?? "",
      sessions: (Array.isArray(course.sessions) ? course.sessions.slice(0, 3) : []).map((session: any) => ({
        section: session.section || "N/A",
        schedule: session["schedule/time"] || "TBA",
        instructor: session.instructor || "TBA",
        location: session.location || "TBA",
        classDate: session["class dates"] || "TBA",
        capacity: session.capacity || "0",
        enrolled: session.enrolled || "0",
        status: session.status || "Unknown"
      }))
    };
  });
}

async function chatbot(prompt: string, system_prompt: string) {
  if (!hasOpenAIKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: system_prompt },
      { role: "user", content: prompt },
    ],
    max_tokens: 2000,
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
    const isCourseQuery = isCourseRequest(message);
    const wantsDegreePlan = isDegreePlanRequest(message);

    const tools = {
      getCourses: async ({ major }: { major: string }) => {
        const majorCode = major.toUpperCase();
        const filteredClasses = classes.filter((cls: any) => {
          const id = (cls.id ?? cls.courseid ?? "").toString().toUpperCase();
          return id.startsWith(majorCode);
        });
        
        // Return both text summary and structured data
        const prunedClasses = filteredClasses
          .map((cls: any) => {
            const id = cls.id ?? cls.courseid ?? "Unknown ID";
            const title = cls.title ?? cls.coursename ?? "Untitled course";
            const desc = cls.course_descriptors?.description ?? cls.coursedescription ?? "";
            return `${id} — ${title}\n${desc}`;
          })
          .join("\n\n");
        
        return {
          text: prunedClasses,
          structured: filteredClasses
        };
      },
    };

    // Check if we should provide visualization
    const needsVisualization = shouldProvideVisualization(message);

    // Degree plan shortcut for CS at UMass Boston
    if (wantsDegreePlan) {
      const plan = enrichDegreePlan(classes);
      const response = `Here’s the mapped four-year CS degree plan for UMass Boston, with prerequisites and credits per term.`;
      const vizData = {
        type: "degree_plan",
        semesters: plan,
        notes: [
          "Complete the Writing Proficiency Requirement (WPR) between 60–75 credits.",
          "Residency: Take at least four upper-level (300/400) CS/Math courses at UMass Boston.",
          "Meet with an advisor each semester to validate electives and pacing.",
        ],
      };
      return res.status(200).json({
        reply: response,
        visualizationType: vizData.type,
        data: vizData,
      });
    }

    // Shortcut: if user clearly asked for courses/classes, handle internally to avoid raw tool JSON
    if (isCourseQuery) {
      const major = extractMajorFromMessage(message) ?? "UNKNOWN";
      const result = await tools.getCourses({ major });

      // If there's no OpenAI key, degrade gracefully by returning plain data
      if (!hasOpenAIKey) {
        const fallbackReply = result.text || "I found these courses.";
        const vizData = needsVisualization && result.structured
          ? { type: "course_path", courses: convertCoursesToVisualization(result.structured.slice(0, 6)) }
          : null;

        if (vizData) {
          return res.status(200).json({
            reply: fallbackReply,
            visualizationType: vizData.type,
            data: vizData
          });
        }

        return res.status(200).json({ reply: fallbackReply });
      }

      const enhancedSystemPrompt = needsVisualization 
        ? `You are a helpful college advisor. Provide a friendly response about the courses. ${visualization_system_prompt}`
        : "You are a helpful college advisor. Provide a friendly response about the courses. Do not return JSON tool calls.";

      const finalResponse = await chatbot(
        `The user asked: "${message}" (major detected: ${major}).\n\nHere are the courses:\n${result.text}\n\nProvide a helpful, friendly response to the user about these courses.${needsVisualization ? ' Include VISUALIZATION_DATA with detailed course information.' : ''}`,
        enhancedSystemPrompt
      );

      let vizData = extractVisualizationData(finalResponse);
        if (needsVisualization && !vizData && result.structured) {
          console.log("Creating visualization from structured data (shortcut path)");
          vizData = {
            type: "course_path",
            courses: convertCoursesToVisualization(result.structured)
          };
        }

      if (vizData) {
        const textOnly = finalResponse.split("VISUALIZATION_DATA:")[0].trim();
        return res.status(200).json({
          reply: textOnly || "Here are the courses you requested:",
          visualizationType: vizData.type,
          data: vizData
        });
      }

      return res.status(200).json({ reply: finalResponse });
    }

    // If LLM isn't configured and this isn't a course shortcut, return a graceful message
    if (!hasOpenAIKey) {
      return res.status(200).json({ reply: "The AI responder is not configured. Please set OPENAI_API_KEY to enable full responses." });
    }

    const systemPrompt = needsVisualization ? visualization_system_prompt : default_system_prompt;

    const reply = await chatbot(message, systemPrompt);
    console.log("Initial bot reply:", reply);
    
    // Try to parse as tool call
    let isToolCall = false;
    try {
      const jsonStr = extractFirstJsonObject(reply);
      const parsed = JSON.parse(jsonStr);
      
      if (parsed.tool && tools.hasOwnProperty(parsed.tool)) {
        isToolCall = true;
        console.log("TOOL CALL:", parsed.tool, "with args:", parsed.args);
        
        const result = await tools[parsed.tool](parsed.args);
        
        // Now ask the bot to respond properly with the data
        const enhancedSystemPrompt = needsVisualization 
          ? `You are a helpful college advisor. Provide a friendly response about the courses. ${visualization_system_prompt}`
          : "You are a helpful college advisor. Provide a friendly response about the courses.";
        
        const finalResponse = await chatbot(
          `The user asked: "${message}"\n\nHere are the courses:\n${result.text}\n\nProvide a helpful, friendly response to the user about these courses.${needsVisualization ? ' Include VISUALIZATION_DATA with detailed course information.' : ''}`,
          enhancedSystemPrompt
        );
        
        console.log("Final response:", finalResponse);
        
        // Check for visualization data
        let vizData = extractVisualizationData(finalResponse);
        
        // If visualization needed but not in response, create it
        if (needsVisualization && !vizData && result.structured) {
          console.log("Creating visualization from structured data");
          vizData = {
            type: "course_path",
            courses: convertCoursesToVisualization(result.structured)
          };
        }
        
        if (vizData) {
          const textOnly = finalResponse.split("VISUALIZATION_DATA:")[0].trim();
          return res.status(200).json({
            reply: textOnly || "Here are the courses you requested:",
            visualizationType: vizData.type,
            data: vizData
          });
        }
        
        return res.status(200).json({ reply: finalResponse });
      }
    } catch (e) {
      // Not a tool call or parse error
      console.log("Not a tool call, treating as regular message");
    }
    
    // If not a tool call, check for visualization in regular response
    if (!isToolCall) {
      const vizData = extractVisualizationData(reply);
      if (vizData) {
        const textOnly = reply.split("VISUALIZATION_DATA:")[0].trim();
        return res.status(200).json({
          reply: textOnly,
          visualizationType: vizData.type,
          data: vizData
        });
      }
      
      return res.status(200).json({ reply: reply });
    }
    
    // Fallback
    return res.status(200).json({ reply: reply });
    
  } catch (err: any) {
    console.error("API error:", err);
    if (String(err?.message || err).includes("Missing OPENAI_API_KEY")) {
      return res.status(503).json({ error: "LLM is not configured. Set OPENAI_API_KEY or provide a different model." });
    }
    return res.status(500).json({ error: "Failed to process request" });
  }
}
