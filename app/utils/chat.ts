import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  SystemMessage,
  AIMessage,
} from "@langchain/core/messages";
import { prisma } from "./db.server";

// Define the tool interface
interface Tool {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, unknown>;
    required: string[];
  };
}

// Define available tools
const tools: Tool[] = [
  {
    name: "search_web",
    description: "Search the web for additional information",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to look up",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "get_time_in_timezone",
    description: "Get the current time in a specific timezone",
    parameters: {
      type: "object",
      properties: {
        timezone: {
          type: "string",
          description:
            "The timezone to get the time for (e.g., 'America/New_York', 'Europe/London')",
        },
      },
      required: ["timezone"],
    },
  },
];

// Tool implementations
const toolImplementations = {
  search_web: async (params: { query: string }) => {
    // In a real implementation, you would call a search API here
    // For now, we'll return a mock response
    return `Search results for "${params.query}": [Mock search results]`;
  },
  get_time_in_timezone: async (params: { timezone: string }) => {
    try {
      return new Date().toLocaleString("en-US", { timeZone: params.timezone });
    } catch (error) {
      return `Error: Invalid timezone "${params.timezone}"`;
    }
  },
};

interface DatabaseMessage {
  content: string;
  role: string;
  conversationId: string;
  id: string;
  createdAt: Date;
}

export async function createChatCompletion(
  message: string,
  conversationId?: string
) {
  const model = new ChatOpenAI({
    modelName: "gpt-4-turbo-preview",
    temperature: 0.7,
  });
  console;
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

  const messages = conversation.messages.map((msg: DatabaseMessage) => {
    if (msg.role === "user") {
      return new HumanMessage(msg.content);
    } else {
      return new AIMessage(msg.content);
    }
  });

  // Add the new user message
  messages.push(new HumanMessage(message));

  // Update the system message
  const systemMessage = new SystemMessage(
    `You are a helpful AI assistant. You have access to the following tools:
    ${JSON.stringify(tools, null, 2)}
    
    If you need additional information to answer a question, you can use these tools.
    When using a tool, respond with a JSON object containing:
    {
      "tool": "tool_name",
      "params": { ... }
    }
    
    For time-related questions, always use the get_time_in_timezone tool with the appropriate timezone.
    I will then execute the tool and provide you with the results.`
  );

  // Get initial response from the model
  const response = await model.invoke([systemMessage, ...messages]);
  let fullResponse = response.content.toString();

  // Check if the response is a tool call
  try {
    const toolCall = JSON.parse(fullResponse);
    if (toolCall.tool && toolCall.params) {
      // Execute the tool
      const toolResult = await toolImplementations[
        toolCall.tool as keyof typeof toolImplementations
      ](toolCall.params);

      // Get final response with tool results
      const finalResponse = await model.invoke([
        systemMessage,
        ...messages,
        new AIMessage(fullResponse),
        new HumanMessage(`Tool result: ${toolResult}`),
      ]);

      fullResponse = finalResponse.content.toString();
    }
  } catch (e) {
    // If parsing fails, it's not a tool call - use the original response
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