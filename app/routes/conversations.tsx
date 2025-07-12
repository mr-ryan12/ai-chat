import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { getConversations } from "~/server/utils/apiCalls/getConversations";
import { logger } from "~/server/utils/logger";
import ConversationSidebar from "~/components/ConversationSidebar";
import ThemeToggle from "~/components/ThemeToggle";
import type { Conversation } from "~/types/conversation.types";

export async function loader() {
  try {
    const conversations = await getConversations();
    return json({ conversations });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: "/conversations",
      method: "GET",
    });
    return json({ conversations: [] });
  }
}

export default function ConversationsPage() {
  const { conversations } = useLoaderData<typeof loader>();

  // Ensure conversations is properly typed
  const safeConversations: Conversation[] = Array.isArray(conversations)
    ? conversations
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Link
                to="/"
                className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
              >
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
              </Link>
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
          conversations={safeConversations}
          currentConversationId=""
          onNewConversation={() => {}}
          onConversationSelect={() => {}}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-12 h-12 text-white"
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
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                Select a Conversation
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md">
                Choose a conversation from the sidebar to continue chatting, or
                start a new conversation.
              </p>
              <Link to="/" className="btn-primary inline-flex items-center">
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Start New Conversation
              </Link>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
