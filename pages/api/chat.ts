import type { NextApiRequest, NextApiResponse } from "next";
import OpenAI from "openai";
// import data from "./data/data.json"
import data from "./data/newData.json"
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

// Implemented by Vraj Soni - Dec 8
// CHANGE 1: VISUALIZATION DETECTION & KEYWORD MATCHING (Lines 85-140)
// Determines when to trigger visualization UI based on user message content
// Keywords: roadmap, course plan, degree plan, curriculum, course sequence, etc.
// Returns boolean to enable/disable visualization rendering
function shouldProvideVisualization(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // Core keywords that should trigger visualization
  const coreKeywords = [
    "roadmap", "road map", "road-map",
    "course plan", "courseplan",
    "degree plan", "degreeplan",
    "academic plan", "academicplan",
    "study plan", "studyplan",
    "curriculum",
    "course sequence", "coursesequence",
    "semester plan", "semesterplan",
    "academic roadmap", "academicroadmap",
    "course roadmap", "courseroadmap",
    "degree roadmap", "degreeroadmap"
  ];

  // Action phrases that combined with keywords should trigger visualization
  const actionPhrases = [
    "show", "display", "view", "see", "get", "give", "provide", "present",
    "my", "me", "the", "a", "an"
  ];

  // Check for direct keyword matches
  const hasKeyword = coreKeywords.some(keyword => lowerMessage.includes(keyword));

  // Check for action + keyword combinations (e.g., "show roadmap", "display my course plan")
  const hasActionAndKeyword = actionPhrases.some(action =>
    coreKeywords.some(keyword => {
      // Check for patterns like "show roadmap", "show me roadmap", "show the roadmap"
      const patterns = [
        `${action}\\s+me\\s+${keyword}`,
        `${action}\\s+the\\s+${keyword}`,
        `${action}\\s+my\\s+${keyword}`,
        `${action}\\s+${keyword}`,
        `${keyword}\\s+please`,
        `please\\s+${action}\\s+${keyword}`
      ];
      return patterns.some(pattern => new RegExp(pattern, 'i').test(lowerMessage));
    })
  );

  // Check for common course-related phrases
  const coursePhrases = [
    "what courses should i take",
    "what should i take",
    "show courses",
    "show me courses",
    "display courses",
    "view courses",
    "my courses",
    "course schedule",
    "class schedule",
    "plan my courses",
    "plan courses"
  ];

  const hasCoursePhrase = coursePhrases.some(phrase => lowerMessage.includes(phrase));

  // Check for visualization-related words
  const visualizationWords = ["visualize", "visualization", "graph", "chart", "tree", "diagram"];
  const hasVisualizationWord = visualizationWords.some(word => lowerMessage.includes(word));

  return hasKeyword || hasActionAndKeyword || hasCoursePhrase || hasVisualizationWord;
}

// Implemented by Vraj Soni - Dec 8
// CHANGE 2: COURSE REQUEST DETECTION & MAJOR EXTRACTION (Lines 160-174)
// isCourseRequest: Regex pattern to detect if message mentions courses/classes
// extractMajorFromMessage: Extracts department code (e.g., "CS", "MATH") from message
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

/**
 * Parses degree plan data from newData.json structure
 * Transforms the year → terms → subjects hierarchy into semester format
 * @param degreeData - The imported newData.json object
 * @returns Array of semester objects with courses
 */
// Implemented by Vraj Soni - Dec 8
// CHANGE 3: DEGREE PLAN PARSING & STRUCTURE TRANSFORMATION (Lines 180-227)
// Extracts Computer Science degree from newData.json, organizes by year and term
// Returns: Array of semesters with courses, credits, prerequisites for visualization
function parseDegreeFromNewData(degreeData: any) {
  // Extract the Computer Science degree (first degree in the array)
  const csDegree = degreeData.degrees?.find((d: any) => d.name === "Computer Science") || degreeData.degrees?.[0];

  if (!csDegree || !csDegree.degree_subjects) {
    console.warn("No degree data found in newData.json");
    return [];
  }

  const semesters: any[] = [];

  // Iterate through each year (Freshman, Sophomore, Junior, Senior)
  csDegree.degree_subjects.forEach((yearData: any) => {
    const year = yearData.year; // e.g., "Freshman", "Sophomore"

    // Iterate through each term in the year (Fall, Spring, Summer)
    (yearData.terms || []).forEach((termData: any) => {
      const term = termData.term; // e.g., "Fall", "Spring"
      const subjects = termData.subjects || [];

      // Calculate total credits for the semester
      const totalCredits = subjects.reduce((sum: number, subject: any) =>
        sum + (subject.credits || 0), 0
      );

      // Transform subjects to course format
      const courses = subjects.map((subject: any) => ({
        id: subject.code || subject.id || "",
        title: subject.name || "",
        credits: subject.credits || 3,
        prerequisites: subject.prerequisites || [],
        description: subject.description || "",
        sections: subject.sections || [],
      }));

      // Create semester object
      semesters.push({
        term: `${year} ${term}`, // e.g., "Freshman Fall"
        totalCredits,
        courses,
      });
    });
  });

  return semesters;
}

function isDegreePlanRequest(message: string): boolean {
  // CHANGE 4: DEGREE PLAN REQUEST DETECTION (Lines 235-250)
  // Detects keywords like "degree plan", "roadmap", "four year plan"
  // Returns boolean to trigger degree_plan visualization type
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

/**
 * Detects if user is asking for course recommendations
 * e.g., "show me database courses", "best courses for machine learning", "security courses"
 */
// CHANGE 5: COURSE RECOMMENDATION REQUEST DETECTION (Lines 253-293)
// Matches recommendation keywords and topic-based queries (database, AI, security, etc.)
// Returns boolean to trigger course_recommendation visualization type
function isCourseRecommendationRequest(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // Keywords that indicate course recommendation
  const recommendationKeywords = [
    "best course", "best courses",
    "recommend course", "recommend courses",
    "show me course", "show me courses",
    "show course", "show courses",
    "find course", "find courses",
    "search course", "search courses",
    "courses for", "course for",
    "what courses", "which courses",
    "good course", "good courses",
    "course about", "courses about",
    "course on", "courses on",
    "subject for", "subjects for",
    "class for", "classes for",
    "teach", "teaches", "teaching"
  ];

  // Check for direct matches  
  const hasRecommendationKeyword = recommendationKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );

  // Check for topic-based queries (e.g., "database courses", "AI courses")
  const topicPattern = /(database|machine\s*learning|AI|security|cryptography|networking|web|mobile|cloud|data\s*science|algorithm|programming|software)\s*(course|courses|class|classes|subject|subjects)/i;
  const hasTopicPattern = topicPattern.test(lowerMessage);

  return hasRecommendationKeyword || hasTopicPattern;
}

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

function enrichDegreePlan(classes: any[], degreePlan: any[]) {
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

  return degreePlan.map((semester) => {
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
        course.description ??
        course.title ??
        "";
      const rawSessions = Array.isArray(catalog?.sections)
        ? catalog.sections
        : (Array.isArray(catalog?.sessions)
          ? catalog.sessions
          : (Array.isArray(course.sections) ? course.sections : []));

      const prerequisites = catalog
        ? extractCatalogPrereqs(catalog)
        : (course.prerequisites || []);
      const name = catalog?.title ?? catalog?.coursename ?? course.title;
      const id = catalog?.id ?? catalog?.courseid ?? course.id;

      // improved credit extraction logic
      let credits = course.credits;
      if (!credits && rawSessions.length > 0 && rawSessions[0].credits) {
        credits = parseInt(String(rawSessions[0].credits).split("/")[0], 10);
      }
      if (!credits) credits = 3;

      return {
        id,
        name,
        credits: credits,
        prerequisites,
        description,
        sessions: rawSessions.slice(0, 3).map((session: any) => {
          // Parse capacity string "enrolled/total" if needed
          let enrolled = session.enrolled || "0";
          let capacity = session.capacity || "0";

          if (typeof session.capacity === 'string' && session.capacity.includes('/')) {
            const parts = session.capacity.split('/');
            enrolled = parts[0];
            capacity = parts[1];
          }

          return {
            section: session.section || "N/A",
            // Map newData.json 'time' -> 'schedule'
            schedule: session.time || session["schedule/time"] || "TBA",
            instructor: session.instructor || "TBA",
            location: session.location || "TBA",
            // Map newData.json 'dates' -> 'classDate'
            classDate: session.dates || session["class dates"] || "TBA",
            capacity: capacity,
            enrolled: enrolled,
            status: session.status || "Unknown",
          };
        }),
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
// CHANGE 6: COURSE DATA VISUALIZATION CONVERSION (Lines 468-513)
// Transforms raw course data into standardized visualization format
// Includes: ID, name, semester, credits, difficulty, prerequisites, session details
function convertCoursesToVisualization(courses: any[], semester: string = "Fall 2025") {
  return courses.map((course: any) => {
    const id = course.id ?? course.courseid ?? "Unknown ID";
    const title = course.title ?? course.coursename ?? "Untitled course";

    // Handle both 'sections' and 'sessions'
    const rawSessions = Array.isArray(course.sections)
      ? course.sections
      : (Array.isArray(course.sessions) ? course.sessions : []);

    // Parse credits from the first session
    let credits = 3; // default
    if (rawSessions[0]?.credits) {
      const creditStr = String(rawSessions[0].credits).split('/')[0];
      credits = parseInt(creditStr, 10) || 3;
    } else if (course.credits) {
      credits = course.credits;
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
      description: course.course_descriptors?.description ?? course.coursedescription ?? course.description ?? "",
      sessions: rawSessions.slice(0, 3).map((session: any) => {
        // Parse capacity string "enrolled/total" if needed
        let enrolled = session.enrolled || "0";
        let capacity = session.capacity || "0";

        if (typeof session.capacity === 'string' && session.capacity.includes('/')) {
          const parts = session.capacity.split('/');
          enrolled = parts[0];
          capacity = parts[1];
        }

        return {
          section: session.section || "N/A",
          schedule: session.time || session["schedule/time"] || "TBA",
          instructor: session.instructor || "TBA",
          location: session.location || "TBA",
          classDate: session.dates || session["class dates"] || "TBA",
          capacity: capacity,
          enrolled: enrolled,
          status: session.status || "Unknown"
        };
      })
    };
  });
}

// Implemented by Vraj Soni - Dec 8
// CHANGE 7: CHATBOT API INTEGRATION (Lines 528-541)
// Calls OpenAI GPT-4o-mini model with system prompt and user message
// Parameters: prompt (user input), system_prompt (instructions for behavior)
// Returns: AI-generated response (up to 2000 tokens)
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

// Implemented by Vraj Soni - Dec 8
// CHANGE 8: MAIN API HANDLER - Orchestrates entire chat flow (Lines 549-774)
// Request flow: Auth validation → Message parsing → Intent detection → Tool selection →
//               API response generation → Visualization data extraction/generation
// Returns: JSON with reply text and optional visualization (degree_plan, course_path, course_recommendation)
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
      // Parse the base degree plan structure from newData.json
      const basePlan = parseDegreeFromNewData(data);
      // Enrich with catalog data (descriptions, sessions, etc.)
      const plan = enrichDegreePlan(classes, basePlan);
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
      // console.log("vizData >>>", vizData)
      return res.status(200).json({
        reply: response,
        visualizationType: vizData.type,
        data: vizData,
      });
    }

    // Course recommendation handling
    if (isCourseRecommendationRequest(message)) {
      console.log("Course recommendation request detected");

      // Return visualization without calling OpenAI
      // The CourseRecommendation component will handle the actual search
      return res.status(200).json({
        reply: "I'll help you find the best courses! Here are personalized recommendations based on your query:",
        visualizationType: "course_recommendation",
        data: {
          query: message
        }
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
