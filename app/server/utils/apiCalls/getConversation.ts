// Server
import { prisma } from "../../db.server";
import { logger } from "../logger";

export async function getConversation(id?: string) {
  try {
    if (id) {
      const conversation = await prisma.conversation.findUnique({
        where: { id },
        include: { messages: true },
      });
      return conversation;
    }
    const newConversation = await prisma.conversation.create({
      data: {},
      include: { messages: true },
    });
    return newConversation;
  } catch (error) {
    logger.logError({ err: error });
    return undefined;
  }
}
