import OpenAI from "openai";
import { insertChatMessage, fetchChatMessages } from "./chats";
import { fetchUserData, upsertUserData } from "./userdata";
import { getCoursesByMajor } from "./universityDB";

// Reprompts after saving user data
const SAVED_REPROMPT = ` (Use 50 words or less)
                  The user's profile was just updated with new data. 
                  Continue the conversation from before.`
const COURSES_REPROMPT = ` (Use 200 words or less)
                  You are given a list of courses from a tool call.
                  List the most relevant based on user's current profile.
                  Then ask if they want visualization of course path.`


const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function llm(user_id: string,  
                          prompt: string, 
                          system_prompt: string) 
{
  var passtoolcall = null

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
      }
    ],
    tool_choice: "auto"
  });
  const reply = completion.choices[0]?.message;
  
  if (reply.tool_calls?.length) {
    const toolCall = reply.tool_calls[0];

    // SAVE USER TOOL CALL
    if (toolCall.function.name === "updateUserProfile") {
      const args = JSON.parse(toolCall.function.arguments);
      await upsertUserData(user_id, args);
      // REPROMPT LLM
      messages.push({
        role: "system",
        content: SAVED_REPROMPT + prompt
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      reply.content = completion.choices[0].message.content;
    } else if (toolCall.function.name === "getCoursesByMajor") {
      const args = JSON.parse(toolCall.function.arguments);
      
      console.log("TOOLCALL MAJOR SEARCH:\n", args[0])
      const courses = getCoursesByMajor(args);
      
      if (!courses) {

      }

      // REPROMPT LLM
      messages.push({
        role: "system",
        content: COURSES_REPROMPT + prompt
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      reply.content = completion.choices[0].message.content;
    }
    passtoolcall = toolCall.function.name // Pass name of toolcall to calling API
    console.log("TOOLCALL:\n", passtoolcall)
  }

  // log chat to database if user has a profile
  if (user_data) {
    //await insertChatMessage(user_id, chat_id, system_prompt, "system")
    await insertChatMessage(user_id, chat_id, prompt, "user")
    await insertChatMessage(user_id, chat_id, reply.content, "assistant")
  }

  return {
    reply: reply.content,
    tool: passtoolcall
  };
}