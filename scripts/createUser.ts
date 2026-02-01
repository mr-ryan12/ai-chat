import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function createUser() {
  let exitCode = 0;

  const username = process.argv[2];
  const password = process.argv[3];
  const firstName = process.argv[4];
  const lastName = process.argv[5];

  if (!username || !password || !firstName || !lastName) {
    console.log(
      "Usage: node scripts/createUser.js <username> <password> <firstName> <lastName>",
    );
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        firstName,
        lastName,
      },
    });

    console.log(`User created: ${user.username} (ID: ${user.id})`);
  } catch (error) {
    console.error("Error creating user:", error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

createUser();
