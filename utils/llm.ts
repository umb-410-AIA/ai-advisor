import OpenAI from "openai";
import { insertChatMessage, fetchChatMessages } from "./chats";
import { upsertUserData } from "./userdata";

// Reprompts after saving user data
const REPROMPT = `The user's profile was just updated with new data. `

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function llm(user_id: string,  
                          prompt: string, 
                          system_prompt: string) 
{
  var onboardingComplete = false

  // get chat history
  const chats = await fetchChatMessages(user_id);
  
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
                        with matching "major" argument.`,
          parameters: {
            type: "object",
            properties: {
              major: { type: "string" },
            },
            required: ["major"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "updateUserProfile",
          description: `Saves userprofile information into supabase db.
                        Output args must follow exact order: university, major, isstudent, year, interests`,
          parameters: {
            type: "object",
            properties: {
              university: { type: "string" },
              major: { type: "string" },
              year: { type: "string" },
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
      const chats = await fetchChatMessages(user_id);
      messages = chats
        .filter(m => m.role !== "system")
        .map(m => ({
          role: m.role,
          content: m.message
        }));
      messages.push({
        role: "system",
        content: REPROMPT + prompt
      });
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
      });
      reply.content = completion.choices[0].message.content;
      onboardingComplete = true;
    }
  }

  // log chat to database
  //await insertChatMessage(user_id, chat_id, system_prompt, "system")
  await insertChatMessage(user_id, chat_id, prompt, "user")
  await insertChatMessage(user_id, chat_id, reply.content, "assistant")

  return {
    reply: reply.content,
    onboardingComplete: onboardingComplete
  };
}