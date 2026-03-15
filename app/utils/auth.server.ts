import { createCookieSessionStorage, redirect } from "@remix-run/node";
import { prisma } from "~/server/db.server";
import { logger } from "~/server/utils/logger";
import type { User } from "@prisma/client";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET!],
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  },
});

export async function requireAuth(request: Request): Promise<string> {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }
  return userId;
}

export async function findOrCreateUser(username: string): Promise<User> {
  try {
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: { username },
    });
    return user;
  } catch (error) {
    logger.logError(error, { path: "/login", method: "POST", duration: 0 });
    throw error;
  }
}

export async function createUserSession(
  userId: string,
  redirectTo: string = "/",
): Promise<Response> {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request): Promise<Response> {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );

  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
