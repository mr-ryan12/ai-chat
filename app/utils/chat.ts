// Packages
import { ChatOpenAI } from "@langchain/openai";
import {
  HumanMessage,
  AIMessage,
  SystemMessage,
  ToolMessage,
} from "@langchain/core/messages";

// Utils
import { systemMessage } from "~/server/utils/systemMessage";
import { queryDocuments } from "../server/utils/documentService";
import { wantsDocumentContext } from "~/server/utils/documentIntent";
import { toolImplementations, tools } from "../server/utils/tools";
import { logger } from "~/server/utils/logger";

// Server
import { prisma } from "../server/db.server";
import { getConversation, createNewConversation, ensureConversation } from "~/server/utils/apiCalls/getConversation";
import { updateConversationTitle } from "~/server/utils/apiCalls/updateConversationTitle";

// Types
import { IDatabaseMessage } from "~/types/chat.types";

// Dispatch a single tool call to its implementation. Returns the tool's string
// output so it can be wrapped in a ToolMessage for the follow-up model call.
async function runTool(name: string, args: unknown): Promise<string> {
  if (name === "search_web") {
    return toolImplementations.search_web(args as { query: string });
  }
  if (name === "get_time_in_timezone") {
    return toolImplementations.get_time_in_timezone(
      args as { timezone: string }
    );
  }
  throw new Error(`Unknown tool: ${name}`);
}

export async function createChatCompletion(
  message: string,
  conversationId: string | undefined,
  userId: string
): Promise<{ response: string; words: string[]; conversationId: string }> {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0,
    });

    // Pull document context when the message refers to documents. Retrieval is
    // scoped to the current conversation's uploads first, then the user's most
    // recent upload, then a corpus-wide semantic search (see queryDocuments).
    let documentContext = "";
    if (wantsDocumentContext(message)) {
      try {
        documentContext = await queryDocuments(message, userId, conversationId);
      } catch (docError) {
        logger.logError(docError);
        // Continue without document context
      }
    }

    let conversation = conversationId ? await getConversation(conversationId, userId) : null;

    const messages = conversation ? conversation.messages.map((msg: IDatabaseMessage) => {
      if (msg.role === "user") {
        return new HumanMessage(msg.content);
      } else {
        return new AIMessage(msg.content);
      }
    }) : [];

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
      logger.logError(modelError);
      throw new Error("Failed to get response from AI model");
    }

    let fullResponse = "";

    // Check if the response is a tool call
    try {
      if (response.tool_calls && response.tool_calls.length > 0) {
        // Run every requested tool and feed each result back as a ToolMessage
        // linked to its tool_call id. This is the shape the model expects: the
        // assistant message that requested the calls, followed by one tool
        // response per call. The previous code passed a single stringified result
        // as an AIMessage ("Tool X was called with result: ..."), which the model
        // treated as low-authority and often ignored in favor of its training
        // prior (e.g. answering an outdated "current president").
        const toolMessages = await Promise.all(
          response.tool_calls.map(async (toolCall) => {
            const result = await runTool(toolCall.name, toolCall.args);
            return new ToolMessage({
              content: result,
              tool_call_id: toolCall.id ?? "",
            });
          })
        );

        const finalResponse = await model.invoke([
          systemMessage,
          ...messages,
          response,
          ...toolMessages,
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
      logger.logError(e);
      fullResponse =
        "I encountered an error while processing your request. Please try again.";
    }

    // Only create the conversation after a successful AI response. When the client
    // supplied an id (an upload may already have created the row under it), reuse it
    // via ensureConversation; otherwise fall back to a server-generated conversation.
    if (!conversation) {
      conversation = conversationId
        ? await ensureConversation(conversationId, userId)
        : await createNewConversation(userId);
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
      logger.logError(dbError);
      throw new Error("Failed to save conversation to database");
    }

    // Update conversation title if this is the first message
    if (conversation.messages.length === 0) {
      try {
        await updateConversationTitle(conversation.id, userId);
      } catch (titleError) {
        logger.logError(titleError);
        // Don't throw here, as the main conversation was saved
      }
    }

    const words = fullResponse.split(" ");

    return {
      response: fullResponse,
      words,
      conversationId: conversation.id,
    };
  } catch (error) {
    logger.logError(error);
    throw error; // Re-throw the original error instead of wrapping it
  }
}
