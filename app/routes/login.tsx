import { data } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, redirect, useActionData, useNavigation } from "@remix-run/react";

import {
  findOrCreateUser,
  createUserSession,
  requireAuth,
} from "~/utils/auth.server";
import { logger } from "~/server/utils/logger";
import ThreadMindLogo from "~/components/ThreadMindLogo";
import FractalFlowBackground from "~/components/FractalFlowBackground";

export async function loader({ request }: LoaderFunctionArgs) {
  try {
    await requireAuth(request);
    return redirect("/");
  } catch {
    return null;
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const username = (formData.get("username") as string | null)?.trim() ?? "";

  if (!username) {
    return data({ error: "Username is required" }, { status: 400 });
  }

  try {
    const user = await findOrCreateUser(username);
    return createUserSession(user.id);
  } catch (error) {
    logger.logError(error);
    return data(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div
      className="relative min-h-screen flex items-center justify-center overflow-hidden"
      style={{ background: "#060a14" }}
    >
      <FractalFlowBackground />

      {/* Content layer */}
      <div className="relative z-10 max-w-md w-full px-4 space-y-8">
        <div>
          <div className="flex justify-center">
            <ThreadMindLogo size={56} />
          </div>
          <h1
            className="text-center text-3xl font-extrabold tracking-tight text-white"
            style={{ textShadow: "0 0 40px rgba(6, 182, 212, 0.2)" }}
          >
            ThreadMind
          </h1>
          <p className="mt-2 text-center text-sm text-gray-400">
            Enter a username to get started — no password required.
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6" noValidate>
          <div
            className="rounded-xl p-6 space-y-4 border border-white/[0.06]"
            style={{
              background: "rgba(6, 10, 20, 0.7)",
              backdropFilter: "blur(20px) saturate(1.3)",
              WebkitBackdropFilter: "blur(20px) saturate(1.3)",
              boxShadow:
                "0 0 0 1px rgba(6, 182, 212, 0.04), 0 8px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
            }}
          >
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                disabled={isSubmitting}
                className="w-full rounded-lg px-4 py-2.5 text-base text-white placeholder-gray-500 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-transparent transition-all duration-200"
                style={{ background: "rgba(255, 255, 255, 0.04)" }}
                placeholder="e.g. my-username"
              />
            </div>

            {actionData?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 pl-3 pr-4 py-2.5 rounded-md border-l-2 border-amber-400 animate-error-in"
                style={{ background: "rgba(245, 158, 11, 0.08)" }}
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0 mt-px text-amber-400"
                  aria-hidden="true"
                >
                  <path
                    d="M7.5 1L14 13H1L7.5 1Z"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M7.5 6V8.5"
                    stroke="currentColor"
                    strokeWidth="1.25"
                    strokeLinecap="round"
                  />
                  <circle cx="7.5" cy="10.5" r="0.75" fill="currentColor" />
                </svg>
                <p className="text-sm text-amber-300 leading-snug">
                  {actionData.error}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full font-medium px-4 py-2.5 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.97] touch-manipulation"
            style={{
              background:
                "linear-gradient(135deg, rgba(6, 182, 212, 0.75), rgba(59, 130, 246, 0.65))",
              color: "#fff",
              boxShadow:
                "0 0 24px rgba(6, 182, 212, 0.12), 0 4px 12px rgba(0, 0, 0, 0.3)",
            }}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Getting started…
              </span>
            ) : (
              "Get started"
            )}
          </button>
        </Form>
      </div>
    </div>
  );
}
