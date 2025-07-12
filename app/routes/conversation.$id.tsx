import {
  json,
  type LoaderFunctionArgs,
  type ActionFunctionArgs,
} from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { getConversation } from "~/server/utils/apiCalls/getConversation";
import { getConversations } from "~/server/utils/apiCalls/getConversations";
import { logger } from "~/server/utils/logger";
import Chat from "~/components/Chat";
import ConversationSidebar from "~/components/ConversationSidebar";
import ThemeToggle from "~/components/ThemeToggle";
import { useState, useEffect } from "react";
import { createChatCompletion } from "~/utils/chat";
import type { Conversation } from "~/types/conversation.types";

// Type guard function to ensure conversations array is properly typed
function isValidConversationsArray(conversations: unknown): conversations is Conversation[] {
  return Array.isArray(conversations) && 
    conversations.every((conv): conv is Conversation => 
      conv !== null && 
      typeof conv === 'object' && 
      'id' in conv && 
      'title' in conv
    );
}

export async function loader({ params }: LoaderFunctionArgs) {
  const conversationId = params.id;

  try {
    // Call functions directly instead of making fetch requests
    const conversation = conversationId
      ? await getConversation(conversationId)
      : null;
    const conversations = await getConversations();

    return json({
      conversation,
      conversations,
      conversationId,
    });
  } catch (error) {
    logger.logError(error, {
      duration: 0,
      path: `/conversation/${conversationId}`,
      method: "GET",
    });
    return json({
      conversation: null,
      conversations: [],
      conversationId: null,
    });
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

    // If the conversation ID changed (meaning a new conversation was created),
    // redirect to the new conversation URL
    if (conversationId && conversationId !== newConversationId) {
      return json({
        message,
        response,
        words,
        conversationId: newConversationId,
        redirect: `/conversation/${newConversationId}`,
      });
    }

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

export default function ConversationPage() {
  const { conversations, conversationId } =
    useLoaderData<typeof loader>();
  const navigate = useNavigate();

  // Ensure conversations is properly typed and handle potential null values
  const safeConversations: Conversation[] | null = isValidConversationsArray(conversations)
    ? conversations
    : null;

  const [sidebarConversations, setSidebarConversations] = useState<
    Conversation[] | null
  >(safeConversations);

  // Update conversations when they change
  useEffect(() => {
    const newSafeConversations: Conversation[] | null = isValidConversationsArray(conversations)
      ? conversations
      : null;
    setSidebarConversations(newSafeConversations);
  }, [conversations]);

  const handleNewConversation = () => {
    navigate("/");
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
          currentConversationId={conversationId || ""}
          onNewConversation={handleNewConversation}
          onConversationSelect={handleConversationSelect}
        />

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col">
          <div className="flex-1 p-6">
            <div className="card h-full">
              <Chat conversationId={conversationId || ""} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
