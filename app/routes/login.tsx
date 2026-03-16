import { data } from "@remix-run/node";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { Form, redirect, useActionData, useNavigation } from "@remix-run/react";

import {
  findOrCreateUser,
  createUserSession,
  requireAuth,
} from "~/utils/auth.server";
import { logger } from "~/server/utils/logger";

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
    logger.logError(error, { path: "/login", method: "POST", duration: 0 });
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
          <h1 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
            ThreadMind
          </h1>
          <p className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
            Enter a username to get started — no password required.
            <br />
            Use the same username on any device to pick up where you left off.
          </p>
        </div>

        <Form method="post" className="mt-8 space-y-6">
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
              <p className="text-sm text-red-600 dark:text-red-400">
                {actionData.error}
              </p>
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
