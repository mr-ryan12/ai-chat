// Components
import Chat from "~/components/Chat";

// Utils
import { createChatCompletion } from "~/utils/chat";

// Types
import type {  ActionFunctionArgs } from "@remix-run/node";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  if (!message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const { response } = await createChatCompletion(message);
    return Response.json({ message, response });
  } catch (error) {
    console.error("Chat error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return Response.json({ error: "Failed to process message" }, { status: 500 });
  }
}

export default function Index() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-6 px-4">
          <h1 className="text-3xl font-bold text-gray-900">AI Chatbot</h1>
        </div>
      </header>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Chat />
      </main>
    </div>
  );
}
