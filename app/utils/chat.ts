import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

interface DatabaseMessage {
  content: string;
  role: string;
}

export async function createChatCompletion(
  message: string,
  conversationId?: string
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not set");
    }

    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.7,
      openAIApiKey: process.env.OPENAI_API_KEY,
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

    const messages = [
      new SystemMessage(
        "You are a helpful AI assistant. Provide clear, concise, and accurate responses."
      ),
      ...(conversation.messages?.map((msg: DatabaseMessage) =>
        msg.role === "user"
          ? new HumanMessage(msg.content)
          : new SystemMessage(msg.content)
      ) || []),
      new HumanMessage(message),
    ];

    // Save user message
    await prisma.message.create({
      data: {
        content: message,
        role: "user",
        conversationId: conversation.id,
      },
    });

    const response = await model.invoke(messages);
    const fullResponse = response.content.toString();

    // Save assistant message
    await prisma.message.create({
      data: {
        content: fullResponse,
        role: "assistant",
        conversationId: conversation.id,
      },
    });

    // Split response into words
    const words = fullResponse.split(/\s+/);

    return {
      response: fullResponse,
      words,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("Detailed error in createChatCompletion:", error);
    throw error;
  }
}
