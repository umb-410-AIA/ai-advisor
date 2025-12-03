import OpenAI from "openai";
import { insertChatMessage, fetchChatMessages } from "./chats";
import { fetchUserData, upsertUserData } from "./userdata";
import { getCoursesByMajor, UNIVERSITIES } from "./universityDB";
import { extractMermaidFromText } from "./extractMermaid";

export const onboard_prompt = `
      You are onboarding the user. Ask one missing profile question at a time.
      Use the following strict university ID mapping:
      ${UNIVERSITIES.map((u, i) => `${i + 1}: ${u}`).join("\n")}
      Never guess. Ask for clarification instead of calling the tool if invalid.
    `;
export const return_system_prompt = `You are a college advisor helping students plan their academic path.
                              Welcome the user back and remind of previous interactions in 50 words or less.`
export const default_system_prompt = `
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
const SAVED_REPROMPT = ` (Use 50 words or less)
                  The user's profile was just updated with new data. 
                  Continue the conversation from before.`
const COURSES_REPROMPT = ` (Use 200 words or less)
                  You are given a list of courses from a tool call.
                  List the most relevant based on user's current profile.
                  Then ask if they want visualization of course path.`
const VISUALIZATION_REPROMPT = ` (Use 50 words or less) the user is asking about course planning, prerequisites, sequences, 
    recommended paths, which class to take next, semester planning, or similar advising questions 
    (not a direct course lookup request), respond in plain English AND, if possible, include a Mermaid flowchart in a markdown code block.
    
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
    - Use course codes and short names for nodes (e.g. "CS101: Intro to CS").
    - Ensure all nodes and connections are accurate based on the user's profile and course data.
    - Do not include any text outside the code block. 
    Now, provide the mermaid diagram representing the course path based on the user's profile and course data.
    `;

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function llm(user_id: string,  
                          prompt: string, 
                          system_prompt: string) 
{
  const llmRes = {
    reply: null,
    tool: null,
    visualizationData: null
  }

  // get chat history
  const chats = await fetchChatMessages(user_id);
  const user_data = await fetchUserData(user_id);
  
  // get most recent chat_id or gen new one
  var chat_id;
  var messages = [];
  if (chats.length != 0) {
      chat_id = chats[0].chat_id 
      messages = chats
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role,
          content: m.message
        }));
  } else {
      chat_id = crypto.randomUUID(); 
  }

  // push current prompt to old message history
  messages.push({
    role: "system",
    content: system_prompt
  });

  messages.push({
    role: "user",
    content: prompt
  });

  // query open ai
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    tools: [
        {
        type: "function",
        function: {
          name: "getCoursesByMajor",
          description: `Retrieves a list of courses from the database
                        with matching "major" and "university_id" argument.`,
          parameters: {
            type: "object",
            properties: {
              major: { type: "string" },
              university_id: { type: "number" }
            },
            required: ["major", "university_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "updateUserProfile",
          description: `Saves userprofile information into supabase db. 
                        Output args must follow exact order: university_id, major, isstudent, year, interests`,
          parameters: {
            type: "object",
            properties: {
              university_id: { type: "integer" },
              major: { type: "string" },
              year: { type: "integer" },
              isstudent: { type: "boolean" },
              interests: { 
                type: "array",    
                items: { type: "string" }
              }
            },
          }
        }
      },
      {
        type: "function",
        function: {
          name: "visualizeCoursePath",
          description: `Visualizes a course path based on user profile information (university/major).`,
          parameters: {
            type: "object",
            properties: {
              major: { type: "string" },
              university_id: { type: "integer" },
              courses: { 
                type: "array",    
                items: { type: "string" }
              }
            },
          }
        }
      }
    ],
    tool_choice: "auto"
  });

  // get reply
  const reply = completion.choices[0]?.message;
  
  // check for tool calls
  if (reply.tool_calls?.length) {
    const toolCall = reply.tool_calls[0];

    // SAVE USER TOOL CALL
    if (toolCall.function.name === "updateUserProfile") {
      const args = JSON.parse(toolCall.function.arguments);
      await upsertUserData(user_id, args);
      // REPROMPT LLM
      messages.push({
        role: "system",
        content: SAVED_REPROMPT
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      llmRes.reply = completion.choices[0].message.content;
    } else if (toolCall.function.name === "getCoursesByMajor") {
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log("TOOLCALL MAJOR SEARCH:\n", args[0])
      const courses = await getCoursesByMajor("CS", 0); // TEMP HARDCODED

      // REPROMPT LLM
      messages.push({
        role: "system",
        content: `COURSES: ${JSON.stringify(courses)}\n${COURSES_REPROMPT}`
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      llmRes.reply = completion.choices[0].message.content;
    } else if (toolCall.function.name === "visualizeCoursePath") {
      const args = JSON.parse(toolCall.function.arguments);
      console.log("VISUALIZE ARGS:\n", args)
      
      // getCoursesByMajor(args[0], args[1]).then((courses) => {
      //   console.log("COURSES FOR VISUALIZATION:\n", courses)
      // });

      const courses = await getCoursesByMajor("CS", 0);
      console.log("COURSES FOR VISUALIZATION:\n", courses);

      // REPROMPT LLM
      messages.push({
        role: "system",
        content: `COURSES: ${JSON.stringify(courses)}\n${VISUALIZATION_REPROMPT}`
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      // extract mermaid diagram from response
      const { cleanedText, mermaid } = extractMermaidFromText(completion.choices[0].message.content);
      llmRes.visualizationData = mermaid;
      llmRes.reply = cleanedText;
    }
    llmRes.tool = toolCall.function.name // Pass name of toolcall to calling API
    console.log("TOOLCALL:\n", llmRes.tool)
  } else {
    llmRes.reply = reply.content; // if no toolcalls found use reply content
  }

  // log chat to database if user has a profile
  if (user_data) {
    //await insertChatMessage(user_id, chat_id, system_prompt, "system") //(optional)
    await insertChatMessage(user_id, chat_id, prompt, "user")
    await insertChatMessage(user_id, chat_id, llmRes.reply, "assistant")
  }

  if (!llmRes.reply) {
    throw new Error("No reply from LLM");
  }

  return {
    reply: llmRes.reply,
    tool: llmRes.tool,
    visualizationData: llmRes.visualizationData
  };
}