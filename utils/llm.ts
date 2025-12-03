import OpenAI from "openai";
import { insertChatMessage, fetchChatMessages, getChatID } from "./chats";
import { fetchUserData, upsertUserData } from "./userdata";
import { getCoursesByMajor, getMajorByUniversity, UNIVERSITIES } from "./universityDB";
import { extractMermaidFromText } from "./extractMermaid";
import { MessageBox } from "@/pages";

const MESSAGE_LIMIT = 10 // limit open ai API to 10 message history

const UNIVERSITY_MAP = UNIVERSITIES.map((u, i) => `${i}: ${u}`).join("\n") // map university name to int (UMB is 0)

const APP_DESCRIPTION = `You are an AI-powered college advisor designed to help students plan their academic journeys.
      Your primary functions include:
      1. Assisting students in selecting courses based on their major and university.
      2. Visualizing course paths and prerequisites using Mermaid diagrams.
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
export const default_system_prompt = `
    ${APP_DESCRIPTION}
    UNIVERSITY_MAP = ${UNIVERSITY_MAP}

    Check the last MESSAGE_COUNT messages for relevant information.
    
    Anytime the user provides a university name (even vaguely), you MUST normalize University name first.
    You are not allowed to call any university-related tool until you have a valid normalized university_id,
    according to UNIVERSITY_MAP. Then you can continue with the original request.
    
    If the user provides a piece of data marked as "UNKNOWN" in the profile, immediately save user profile 
    with the updateUserProfile tool. If you see "UNKNOWN" info in the last MESSAGE_COUNT messages, you must save
    this info as well. 

    When a user asks for course recommendations, paths, or visualizations, use the visualizeCoursePath tool.
    Always refer to the VALID_MAJORS list for the user's selected or saved university.
    To get the valid majors list for a university, use the getMajorByUniversity tool.
    Use that list to guide your next tool calls and responses.

    If you ever call a tool that requires university_id using a raw string instead of an ID returned from the map, that is considered an invalid action.
    If you ever call a tool that requires major using a raw major string instead of a major string matching one in MAJOR_LIST, returned from getMajorByUniversity, 
      that is considered an invalid action.

    IMPORTANT RULES: 
      When passing major anywhere for any tool call
      - Use exact major names from the valid majors list for that university.
          If you do not know what majors the university has, make a toolcall to getMajorByUniversity
          If the major the user mentioned isn't in the valid majors list, ask the user
          to try a different major, and tell them what choices they can make from the valid majors list.
      - Never make up a major or university.
      - Never make up course names or course codes.
      - Never provide incorrect information or harmful advice.
      - Always verify information before providing it.
      - Always respond in a friendly and helpful tone.
      - Do not end early; make sure user request is fulfilled using as many tool calls as necessary
      `;

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
    Summarize the following conversation between a user and an AI assistant in 100 words or less.
    Focus on the main topics discussed, user preferences, and any important context that would help continue the conversation.
    Provide the summary in plain text without any additional commentary.`

  const summaryMessages = [
    {
      role: "system",
      content: summaryPrompt
    },
    ...messages
  ];

  const summaryCompletion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
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
  const llmRes: MessageBox = {
      user: prompt,
      bot: null,
      visualization: null,
      mermaid: null,
      tool: null
  };

  // get user data
  

  // get chat history
  let chat_id = await getChatID(user_id);
  let messages = [];
  if (chat_id) {
    const chats = await fetchChatMessages(user_id, chat_id)
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
    await insertChatMessage(user_id, chat_id, prompt, "user")
  }

  // // prune messages from getting too long
  // if (messages.length > MESSAGE_LIMIT) {
  //   messages = await summarizeChatHistory(messages);
  //   console.log("LLM MESSAGES HISTORY AFTER SUMMARIZATION:\n", messages);
  //   chat_id = crypto.randomUUID(); // new chat id after summarization
  // }

  // query open ai
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: tagMessages(messages),
    tools: [
        {
        type: "function",
        function: {
          name: "getCoursesByMajor",
          description: `
                        Retrieves a list of courses from the database
                        with matching "major" and "university_id" argument.
                        Requires a validated university_id from normalizeUniversity. 
                        Major must match MAJOR_LIST from previous tool call.`,
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
                        Must run everytime user enters info not
                        present in USER_PROFILE
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
                        Both major and university_id MUST be validated:
                        - normalized university_id from normalizeUniversity UNIVERSITY_ID
                        - major from getMajorByUniversity MAJOR_LIST`,
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
          description: `Retrieves a list of valid majors for a given university ID.
                        Requires a validated university_id value. 
                        ID must match UNIVERSITY_ID from previous tool call.
                        Never use raw or unverified user inputs.`,
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
  
  // push initial message
  messages.push(reply);

  // Save to DB if not a toolcall
  if (reply.content && !reply.tool_calls) {
    console.log("SAVE\n")
    await insertChatMessage(user_id, chat_id, reply.content, "assistant");
  } 

  console.log("MESSAGES:\n", messages)

  // Source ChatGPT:
  // Prompt: Rewrite this code to handle multiple tool calls in a loop until no tool calls are left.
  // Current code only handles one tool call.
  // *-- begin llm tool call loop --*
  while (true) { // loop until no tool calls left
    if (!reply) break;
    
    // check for tool calls
    if (reply.tool_calls?.length > 0) {
      const toolCall = reply.tool_calls[0];
      console.log("TOOL CALL\n", toolCall.function.name);
      const args = JSON.parse(toolCall.function.arguments);
      
      let result = {
        data: null,
        control: {}
      };

      // Parse tool call
      const functionName = toolCall.function.name
      if (functionName == "getMajorByUniversity") {
        console.log(args.university_id)
        result.data = {
          MAJOR_LIST: await getMajorByUniversity(args.university_id)
        };
        console.log(result.data.MAJOR_LIST)
      }

      else if (functionName == "getCoursesByMajor") {
        result.data = {
          COURSE_LIST: await getCoursesByMajor(args.major, args.university_id)
        };
      } 

      else if (functionName == "updateUserProfile") {
        await upsertUserData(user_id, args);
        result.control = {
          success: true,
          reprompt: SAVED_REPROMPT
        };
      }

      else if (functionName == "visualizeCoursePath") {
        result.data = {
          COURSE_LIST: await getCoursesByMajor(args.major, args.university_id)
        };
        result.control = {
          reprompt: VISUALIZATION_REPROMPT
        };
      }


      // Push toolcall response to DB if necessary
      const toolRes = JSON.stringify(result.data)
      if (toolRes) {
        await insertChatMessage(user_id, chat_id, toolRes, "system")
      }

      // REPROMPT AFTER TOOL CALL
      const msg = {
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(result)
      }
      messages.push(msg);

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: tagMessages(messages)
      });
      reply = completion.choices[0]?.message;

      // process mermaid if present
      const { cleanedText, mermaid } = extractMermaidFromText(reply.content);

      // update llmRes
      llmRes.bot = cleanedText;
      llmRes.tool = toolCall.function.name;
      llmRes.mermaid = mermaid;
      continue;
    } else {
      llmRes.bot = reply.content; // if no toolcalls found use reply content
      await insertChatMessage(user_id, chat_id, llmRes.bot, "assistant")
      break;
    }
  }
  // *-- end llm tool call loop --*

  if (!llmRes.bot) {
    throw new Error("No reply from LLM");
  }

  return llmRes;
}