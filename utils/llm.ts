import OpenAI from "openai";
import { insertChatMessage, fetchChatMessages, getChatID } from "./chats";
import { fetchUserData, upsertUserData } from "./userdata";
import { LLMResponse } from "./chats";
import { getCoursesByMajor, getMajorByUniversity, UNIVERSITIES } from "./universityDB";
import { extractMermaidFromText } from "./extractMermaid";
import { MessageBox } from "@/pages";

const MESSAGE_LIMIT = 10 // limit open ai API to 10 message history
const MODEL_ID =  "gpt-5-nano";

const UNIVERSITY_MAP = UNIVERSITIES.map((u, i) => `${i}: ${u}`).join("\n") // map university name to int (UMB is 0)

const APP_DESCRIPTION = `You are an AI-powered college advisor designed to help students plan their academic journeys.
      Your primary functions include:
      1. Visualizing course paths and prerequisites using Mermaid diagrams, represented with markdown code blocks.
      2. Assisting students in selecting courses based on their major and university.
      3. Providing personalized advice based on user profiles, including major, university, year, and interests.
      4. Providing job market insights related to different majors and career paths.
      `

export const reload_prompt = `
      The user has just loaded the page.
      If MESSAGE_COUNT > 1, remind them of what has been discussed. If you see unsaved data,
      immediately call the toolcall updateUserProfile.
      If MESSAGE_COUNT <= 1: 
        Give them a friendly introduction using the description: 
        [${APP_DESCRIPTION}] 
        Then onboard them. Ask one missing profile question at a time.
        Never guess. Ask for clarification instead of calling the tool if invalid.
        Use a medium amount of words.
    `;

export const tool_prompt = `You've just made a toolcall to do something. 
                            Try to find the next toolcall you should make 
                            or return to the previous context.`
// Source: CHATGPT
// Prompt: Rewrite this LLM system prompt to be more reliable and follow a clear step by step process
// so my model does not hallucinate
export const default_system_prompt = `

    UNIVERSITY_MAP = ${UNIVERSITY_MAP}

    MESSAGE_COUNT = number of user messages since page load (provided at runtime).

    APP_DESCRIPTION:
    ${APP_DESCRIPTION}

    ACADEMIC DATA REQUIREMENTS:
    If a user provides major/university information and visualization or saving is
    required, the full set of needed tools is:

    1. getMajorByUniversity
    2. getCoursesByMajor
    3. visualizeCoursePath (if generating a plan)
    4. saveUserData (if updating profile)

    TOOLCALL RULES:
    You may only use one tool call at a time.
    Split multiple toolcalls across messages

    ====================================================================
    PRIORITY STACK (Follow these steps in strict order)
    ====================================================================

    0. **Create a Mermaid Diagram**
      As soon as possible in the conversation, include a mermaid diagram in the response within a markdown block (headed by "\`\`\`mermaid"), 
      which should represent a particular course path that the student might take given their major, university, and other relevant information.

    1. **Ambiguity Check**
      If the user provides ambiguous, unclear, or conflicting information:
        → Ask a clarification question.
        → Do NOT call any tool yet.

    2. **University Normalization**
      Any time the user mentions a university (even vaguely):
        → Use the university ID instead of its name. If you are unsure of the university ID, use its index from the UNIVERSITY_MAP above.
      Using raw university strings for toolcalls is invalid.

    3. **Unknown-Field Completion**
      If the user provides information that fills a profile field currently marked as UNKNOWN:
        → Immediately call updateUserProfile with that new data.

    4. **Major Validation**
      Before ANY course-recommendation or visualization step:
        → Call getMajorByUniversity(university_id) to retrieve valid majors.
        → The university_id MUST come from the UNIVERSITY_MAP or previous toolcalls.
        → The user major MUST match one of the returned majors exactly.
      Using a raw major string not in that list is invalid.

    5. **Autonomous Multi-Step Toolcalling**
      If the user request requires multiple steps (e.g., fetch majors → fetch courses → visualize):
        → Perform all needed toolcalls in order.
        → Do NOT wait for extra user input if the intent is clear.

    6. **Page Reload Behavior**
      If MESSAGE_COUNT <= 1:
        → Give a friendly intro summarizing APP_DESCRIPTION.
        → Begin onboarding by asking ONE missing profile question at a time.
      If MESSAGE_COUNT > 1:
        → Briefly remind them of context.
        → If any profile field is UNSAVED or UNKNOWN but user data exists, call updateUserProfile immediately.

    7. **History Awareness**
      Always reference the last MESSAGE_COUNT messages for context, prior answers, or missing fields.

    ====================================================================
    STRICT RULES
    ====================================================================

    - As soon as possible, include a mermaid diagram in a markdown code block in your response and expect to iterate on it in 
      subsequent chat turns.
    - Never make up a university, major, or course.
    - Never ask user for a university_id, must derive from UNIVERSITY_MAP or previous toolcalls.
    - Never assume a major is valid without calling getMajorByUniversity first.
    - Never use raw strings for university_id in toolcalls.
    - Never guess qualifications; ask instead.
    - Never provide fictitious course codes or structures.
    - Always verify through tools before responding.
    - Maintain a helpful, concise, friendly tone.
    - Never end with statements like “hold on,” “wait,” “let me think,” etc.
    - Do not assume data exists unless returned by a tool.

    MANDATORY TOOLCALL ORDER:
    1. You MUST call getMajorByUniversity(university_id) BEFORE any other academic tool.
    2. You MUST then call getCoursesByMajor(major, university_id) to retrieve all official courses for that major.
    3. You may NOT call visualizeCoursePath or saveUserData until both steps above have successfully completed.
    4. If a user enters a major in any freeform text (e.g., “CS”, “Computer Science”, “CompSci”), you MUST normalize it by calling getMajorByUniversity first.

    VISUALIZATION RULE:
    Never call visualizeCoursePath without validated course data obtained from getMajorByUniversity → getCoursesByMajor.

    ====================================================================
    TOOL RETURN FORMATS (STRICT)
    Do NOT invent fields. Do NOT infer. Do NOT rename fields.
    ====================================================================

    getMajorByUniversity(university_id: number)
      → { majors: string[] }

    updateUserProfile(profile: object)
      → { success: boolean }

    getUserProfile()
      → { profile: object }

    visualizeCoursePath(university_id: number, major: string)
      → { visualization_data: VISUALIZATION_DATA }

    ====================================================================
    BEHAVIORAL GUIDELINES
    ====================================================================

    - Prefer shorter, clear explanations.
    - Use multiple toolcalls only when required to complete user intent.
    - Remain proactive: if the user implicitly needs a tool, use it.
    - Use Mermaid diagrams only through visualizeCoursePath.
    - When onboarding, never ask more than one profile question at a time.
    - Always surface contradictions politely and ask for clarification.

    ====================================================================
    END OF SYSTEM PROMPT
    ====================================================================
    `

const SAVED_REPROMPT = ` (Use 50 words or less)
                  Tell the user their profile was just updated with new data. 
                  Then continue the conversation from before.`

const VISUALIZATION_REPROMPT = ` 
    Respond in plain English AND, if possible, include a Mermaid flowchart in a markdown code block.
    
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

// summarizes chat history to keep token usage low
async function summarizeChatHistory(messages: any[]) {
  const summaryPrompt = `
    Summarize the following conversation between a user and an AI assistant in 500 words or less.
    Focus on the main topics discussed, user preferences, and any important context that would help continue the conversation.
    Provide the summary in plain text without any additional commentary. You must capture all context from the whole conversation`

  const summaryMessages = [
    {
      role: "system",
      content: summaryPrompt
    },
    ...messages
  ];

  const summaryCompletion = await openai.chat.completions.create({
    model: MODEL_ID,
    messages: summaryMessages
  });

  return [
    {
      role: "system",
      content: summaryCompletion.choices[0].message.content
    }
  ];
}

// add message count metadata to read history

const tagMessages = (messages) => {
  const tagged_messages = [...messages]
  tagged_messages.push({
    role: "system",
    content: `MESSAGE_COUNT: ${messages.length}`
  })
  return tagged_messages;
}

export async function llm(user_id: string,  
                          prompt: string, 
                          system_prompt: string) 
{
  // get chat history
  let chat_id = await getChatID(user_id);
  let messages = [];
  if (chat_id) {
    const chats = await fetchChatMessages(user_id, chat_id);

    messages = chats.map(m => ({
      role: m.role,
      content: m.content,
      tool_call_id: m.tool_call_id,
      tool_calls: JSON.parse(m.tool_calls) 
    }));
  } else {
    chat_id = crypto.randomUUID(); 
  }

  // Create base message object
  const llmRes: MessageBox = {
    user: prompt,
    bot: null,
    visualization: null,
    mermaid: null,
    tool_id: null,
    tool_calls: null,
  }

  // push current prompt to old message history
  if (system_prompt) {
    messages.push({
      role: "system",
      content: system_prompt
    });
  }

  if (prompt) {
    messages.push({
      role: "user",
      content: prompt
    });
    await insertChatMessage({user_id: user_id, 
                            chat_id: chat_id, 
                            content: prompt,
                            role: "user"})
  }

  // // prune messages from getting too long
  // if (messages.length > MESSAGE_LIMIT) {
  //   messages = await summarizeChatHistory(messages);
  //   console.log("LLM MESSAGES HISTORY AFTER SUMMARIZATION:\n", messages);
  //   chat_id = crypto.randomUUID(); // new chat id after summarization
  // }

  // query open ai
  const completion = await openai.chat.completions.create({
    model: MODEL_ID,
    messages: tagMessages(messages),
    tools: [
        {
        type: "function",
        function: {
          name: "getCoursesByMajor",
          description: `
                        May only be invoked AFTER getMajorByUniversity.
                        Retrieves the official course list for that university + major.
                      `,
          parameters: {
            type: "object",
            additionalProperties: false,
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
          description: `
                        Updates user profile fields. 
                        Only include the fields that should be updated.
                        Omit fields that should remain unchanged.
                        Must be called AFTER the user's major has been validated and AFTER course data is fetched.
                      `,
          parameters: {
            type: "object",
            additionalProperties: false,
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
            required: []
          }
        }
      },
      {
        type: "function",
        function: {
          name: "visualizeCoursePath",
          description: `Generates a visualization request for a course path.
                        NEVER call before course data exists.
                        Requires validated major AND confirmed course list.
                        `,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              major: { type: "string" },
              university_id: { type: "integer" },
            },
            required: ["major", "university_id"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "getMajorByUniversity",
          description: `Use this tool to normalize ANY major string provided by the user.
                        This MUST be called whenever a user references a major.
                        Output is the canonical major name for that university.
                        `,
          parameters: {
            type: "object",
            additionalProperties: false,
            properties: {
              university_id: { type: "number" }
            },
            required: ["university_id"]
          }
        }
      },
    ],
    tool_choice: "auto"
  });

  // get reply
  let reply = completion.choices[0]?.message;
  console.log("LLM REPLY: ", reply)
  const assistantContent = reply.content ?? "Thinking...";
  await insertChatMessage({
    user_id,
    chat_id,
    role: "assistant",
    content: assistantContent,
    tool_calls: JSON.stringify(reply.tool_calls),
    tool_call_id: null
  });

  // Source ChatGPT:
  // Prompt: Rewrite this code to handle multiple tool calls in a loop until no tool calls are left.
  // Current code only handles one tool call.
  // *-- begin llm tool call loop --*
  // check for tool calls
  if (reply.tool_calls?.length > 0) {
      for (const toolCall of reply.tool_calls) {
        console.log("TOOL CALL\n", (toolCall as any).function.name);
        const args = JSON.parse((toolCall as any).function.arguments);
          
        let result: any;
        // Parse tool call
        const functionName = (toolCall as any).function.name
        if (functionName == "getMajorByUniversity") {
          console.log(args.university_id)
            result = {
            MAJOR_LIST: await getMajorByUniversity(args.university_id)
          };
        }

        else if (functionName == "getCoursesByMajor") {
          try { 
            result = {
            COURSE_LIST: await getCoursesByMajor(args.major, args.university_id)
          };
        } catch (e) {
          result = {
            COURSE_LIST: `Error fetching courses for major ${args.major} at university ID ${args.university_id}: ${e.message}`
          };
        } 
      }

        else if (functionName == "updateUserProfile") {
          await upsertUserData(user_id, args);
          result = {
            success: true,
            reprompt: SAVED_REPROMPT
          };
        }

        else if (functionName == "visualizeCoursePath") {
          result = {
            COURSE_LIST: await getCoursesByMajor(args.major, args.university_id),
            reprompt: VISUALIZATION_REPROMPT
          };
        }

        // REPROMPT AFTER TOOL CALL
        const msg: LLMResponse = {
          user_id: user_id,
          chat_id : chat_id,
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(result)
        }
        await insertChatMessage(msg);

        llmRes.tool_id = functionName
    }
  }
  // *-- end llm tool call loop --*

  // process mermaid if present
  const { cleanedText, mermaid } = extractMermaidFromText(assistantContent);

  // update llmRes
  llmRes.tool_calls = reply.tool_calls
  llmRes.bot = cleanedText;
  llmRes.mermaid = mermaid;
  console.log(llmRes)
  if (!llmRes.bot) {
    throw new Error("No reply from LLM");
  }

  return llmRes;
}
