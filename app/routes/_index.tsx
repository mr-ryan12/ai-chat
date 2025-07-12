// Components
import Chat from "~/components/Chat";
import ThemeToggle from "~/components/ThemeToggle";
import ConversationSidebar from "~/components/ConversationSidebar";

// Utils
import { createChatCompletion } from "~/utils/chat";
import { getConversations } from "~/server/utils/apiCalls/getConversations";

// Types
import {
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useState, useEffect } from "react";
import { json } from "@remix-run/node";

export async function loader() {
  try {
    // Call the function directly instead of making a fetch request
    const conversations = await getConversations();
    return { conversations };
  } catch (error) {
    console.error("Error loading conversations:", error);
    return { conversations: [] };
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  const conversationId = formData.get("conversationId") as string | undefined;

  if (!message) {
    return json({ error: "Message is required" }, { status: 400 });
  }

  try {
    const {
      response,
      words,
      conversationId: newConversationId,
    } = await createChatCompletion(message, conversationId);

    return json({
      message,
      response,
      words,
      conversationId: newConversationId,
    });
  } catch (error) {
    console.error("Chat error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      error,
    });
    return json({ error: "Failed to process message" }, { status: 500 });
  }
}

export default function Index() {
  const { conversations } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [sidebarConversations, setSidebarConversations] =
    useState(conversations);

  // Update conversations when they change
  useEffect(() => {
    setSidebarConversations(conversations);
  }, [conversations]);

  const handleNewConversation = () => {
    // Refresh the page to start a new conversation
    navigate(".", { replace: true });
  };

  const handleConversationSelect = (id: string) => {
    navigate(`/conversation/${id}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  AI Chatbot
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Powered by OpenAI
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <span className="w-2 h-2 bg-green-400 rounded-full mr-1.5"></span>
                  Online
                </span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={sidebarConversations}
          currentConversationId=""
          onNewConversation={handleNewConversation}
          onConversationSelect={handleConversationSelect}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <div className="card h-full">
              <Chat />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
