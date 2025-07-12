// Packages
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
} from "@langchain/core/messages";

// Utils
import { systemMessage } from "~/server/utils/systemMessage";
import { toolImplementations, tools } from "../server/utils/tools";
import { queryDocuments } from "../server/utils/documentService";

// Server
import { prisma } from "../server/db.server";
import { getConversation } from "~/server/utils/apiCalls/getConversation";
import { updateConversationTitle } from "~/server/utils/apiCalls/updateConversationTitle";

// Types
import { IDatabaseMessage } from "~/types/chat.types";

export async function createChatCompletion(
  message: string,
  conversationId?: string
) {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
    });

    // Get relevant document content if the query seems to be about documents
    let documentContext = "";
    if (
      message.toLowerCase().includes("document") ||
      message.toLowerCase().includes("text") ||
      message.toLowerCase().includes("content")
    ) {
      try {
        documentContext = await queryDocuments(message);
      } catch (docError) {
        console.error("Error querying documents:", docError);
        // Continue without document context
      }
    }

    const conversation = await getConversation(conversationId);

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

    // Add document context if available
    if (documentContext) {
      messages.push(
        new SystemMessage(`Relevant document content: ${documentContext}`)
      );
    }

    // Get initial response from the model
    let response;
    try {
      response = await model.invoke([systemMessage, ...messages], {
        tools: tools,
        tool_choice: "auto",
      });
    } catch (modelError) {
      console.error("Error invoking model:", modelError);
      throw new Error("Failed to get response from AI model");
    }

    let fullResponse = "";

    // Check if the response is a tool call
    try {
      if (response.tool_calls && response.tool_calls.length > 0) {
        const toolCall = response.tool_calls[0];

        const toolName = toolCall.name;
        const args = toolCall.args;

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
          new AIMessage(
            `Tool ${toolName} was called with result: ${toolResult}`
          ),
        ]);

        fullResponse = finalResponse.content.toString();
      } else if (response.content) {
        // Natural language response
        fullResponse = response.content.toString();
      } else {
        fullResponse =
          "I'm sorry, I couldn't generate a response at this time.";
      }
    } catch (e) {
      console.error("Error processing response:", e);
      fullResponse =
        "I encountered an error while processing your request. Please try again.";
    }

    // Save the messages
    try {
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
    } catch (dbError) {
      console.error("Error saving messages to database:", dbError);
      throw new Error("Failed to save conversation to database");
    }

    // Update conversation title if this is the first message
    if (conversation.messages.length === 0) {
      try {
        await updateConversationTitle(conversation.id);
      } catch (titleError) {
        console.error("Error updating conversation title:", titleError);
        // Don't throw here, as the main conversation was saved
      }
    }

    const words = fullResponse.split(/\s+/);

    return {
      response: fullResponse,
      words,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("Error in createChatCompletion:", error);
    throw error; // Re-throw the original error instead of wrapping it
  }
}
