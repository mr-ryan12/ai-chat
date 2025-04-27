// Server
import { prisma } from "../../db.server";

export async function getConversation(id?: string) {
  try {
    if (id) {
      return await prisma.conversation.findUnique({
        where: { id },
        include: { messages: true },
      });
    }
    return await prisma.conversation.create({
      data: {},
      include: { messages: true },
    });
  } catch (error) {
    // TODO: Pino logger
    console.log("Error: ", error);
  }
}
