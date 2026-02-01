import { createCookieSessionStorage, redirect } from "@remix-run/node";
import bcrypt from "bcryptjs";
import { prisma } from "~/server/db.server";

const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: "__session",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    secrets: [process.env.SESSION_SECRET!],
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  },
});

export async function requireAuth(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );
  const userId = session.get("userId");

  if (!userId) {
    throw redirect("/login");
  }
  return userId;
}

export async function login(username: string, password: string) {
  console.log("Login attempt:", { username, password });
  
  const user = await prisma.user.findUnique({ where: { username } });
  console.log("User found:", !!user);
  
  if (!user) {
    console.log("No user found");
    return null;
  }
  
  console.log("Stored hash:", user.password);
  const isValid = await bcrypt.compare(password, user.password);
  console.log("Password valid:", isValid);
  
  if (!isValid) {
    return null;
  }

  return user;
}

export async function createUserSession(
  userId: string,
  redirectTo: string = "/",
) {
  const session = await sessionStorage.getSession();
  session.set("userId", userId);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await sessionStorage.commitSession(session),
    },
  });
}

export async function logout(request: Request) {
  const session = await sessionStorage.getSession(
    request.headers.get("Cookie"),
  );

  return redirect("/login", {
    headers: {
      "Set-Cookie": await sessionStorage.destroySession(session),
    },
  });
}
