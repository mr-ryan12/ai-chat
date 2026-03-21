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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="max-w-md w-full px-4 space-y-8">
        <div>
          <div className="flex justify-center">
            <ThreadMindLogo size={56} />
          </div>
          <h1 className="text-center text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            ThreadMind
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Enter a username to get started — no password required.
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6" noValidate>
          <div className="card p-6 space-y-4">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
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
                className="input-modern w-full"
                placeholder="e.g. my-username"
              />
            </div>

            {actionData?.error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 pl-3 pr-4 py-2.5 rounded-md border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30 animate-error-in"
              >
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 15 15"
                  fill="none"
                  className="shrink-0 mt-px text-amber-500 dark:text-amber-400"
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
                <p className="text-sm text-amber-800 dark:text-amber-300 leading-snug">
                  {actionData.error}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
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
