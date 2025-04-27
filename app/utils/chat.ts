// Packages
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";

// Utils
import { toolImplementations, tools } from "./tools";

// Server
import { prisma } from "./db.server";

// Types
import { IDatabaseMessage } from "~/types/chat.types";

export async function createChatCompletion(
  message: string,
  conversationId?: string
) {
  const model = new ChatOpenAI({
    modelName: "gpt-4o", // You should consider switching to gpt-4o at this point
    temperature: 0,
  });

  let conversation;
  if (conversationId) {
    conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { messages: true },
    });
  } else {
    conversation = await prisma.conversation.create({
      data: {},
      include: { messages: true },
    });
  }

  if (!conversation) {
    throw new Error("Failed to create or find conversation");
  }

  const messages = conversation.messages.map((msg: IDatabaseMessage) => {
    if (msg.role === "user") {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });

  // Add the new user message
  messages.push(new HumanMessage(message));

  // Update the system message
  const systemMessage = new SystemMessage(`
    You are a helpful AI assistant embedded in a web application. You have access to the following tools:
    
    ${JSON.stringify(tools, null, 2)}
    
    🧠 KNOWLEDGE AND TOOL USAGE INSTRUCTIONS:
    
    1. If you already know the answer with high confidence, respond directly in natural language.
    
    2. If you are unsure or the answer may not be in your training data, you MUST use the "search_web" tool.
    
       ❗ DO NOT speculate, hedge, or mention the limits of your training data.
    
       ❗ DO NOT say things like:
       - "I am not sure"
       - "I am unable to provide..."
       - "As of my last update"
       - "Check the official website"
       - "I recommend searching online"
    
    3. When using a tool, respond with **only** a valid JSON object in the following format:
    
    {
      "tool": "tool_name",
      "params": {
        // required parameters here
      }
    }
    
    4. Use "search_web" as the **default fallback** tool for any question where your answer is incomplete, uncertain, or possibly outdated.
    
    💡EXAMPLES:
    - "What is the capital of Japan?" → direct answer ✅
    - "What are the 2024 color options for the Jeep Wrangler?" → use "search_web" ❗
    
    After using a tool, I will return the result so you can respond to the user.
    
    Do not include any non-JSON text when using a tool.
    `);

  // Get initial response from the model
  const response = await model.invoke([systemMessage, ...messages], {
    tools: tools, // 👈 pass tools here
    tool_choice: "auto", // 👈 and toolChoice here
  });
  let fullResponse = "";
  // Check if the response is a tool call
  try {
    if (response.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];

      const toolName = toolCall.name;
      const args = toolCall.args;

      console.log("Tool call detected:", toolName, args);

      const toolResult = await(() => {
        if (toolName === "search_web") {
          return toolImplementations.search_web(args as { query: string });
        } else if (toolName === "get_time_in_timezone") {
          return toolImplementations.get_time_in_timezone(
            args as { timezone: string }
          );
        }
        throw new Error(`Unknown tool: ${toolName}`);
      })();

      const finalResponse = await model.invoke([
        systemMessage,
        ...messages,
        new AIMessage(`Tool ${toolName} was called with result: ${toolResult}`),
      ]);

      fullResponse = finalResponse.content.toString();
    } else if (response.content) {
      // Natural language response
      fullResponse = response.content.toString();
    }
  } catch (e) {
    // If parsing fails, it's not a tool call - use the original response
    console.log("error>>>>>", e);
  }

  // Save the messages
  await prisma.message.createMany({
    data: [
      {
        content: message,
        role: "user",
        conversationId: conversation.id,
      },
      {
        content: fullResponse,
        role: "assistant",
        conversationId: conversation.id,
      },
    ],
  });

  const words = fullResponse.split(/\s+/);

  return {
    response: fullResponse,
    words,
    conversationId: conversation.id,
  };
}
