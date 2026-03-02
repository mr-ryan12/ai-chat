// Packages
import { useState, useEffect } from "react";
import { data, useLoaderData, useNavigate } from "@remix-run/react";
import { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";

// Utils
import { logger } from "~/server/utils/logger";
import { requireAuth } from "~/utils/auth.server";
import { createChatCompletion } from "~/utils/chat";
import { getConversation } from "~/server/utils/apiCalls/getConversation";
import { getConversations } from "~/server/utils/apiCalls/getConversations";

// Components
import Chat from "~/components/Chat";
import ConversationSidebar from "~/components/ConversationSidebar";
import Header from "~/components/Header";

// Types
import type { Conversation } from "~/types/conversation.types";

// Type guard function to ensure conversations array is properly typed
function isValidConversationsArray(
  conversations: unknown,
): conversations is Conversation[] {
  return (
    Array.isArray(conversations) &&
    conversations.every(
      (conv): conv is Conversation =>
        conv !== null &&
        typeof conv === "object" &&
        "id" in conv &&
        "title" in conv,
    )
  );
}

export async function loader({ request, params }: LoaderFunctionArgs) {
  const userId = await requireAuth(request);
  const conversationId = params.id;

  try {
    // Call functions directly instead of making fetch requests
    const conversation = conversationId
      ? await getConversation(conversationId, userId)
      : null;

    const conversations = await getConversations(userId);

    return data({
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
    return data({
      conversation: null,
      conversations: [],
      conversationId: null,
    });
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const userId = await requireAuth(request);
  const formData = await request.formData();
  const message = formData.get("message") as string;
  const conversationId = formData.get("conversationId") as string | undefined;

  if (!message) {
    return data(
      { error: "Message is required", response: "", words: [] },
      { status: 400 },
    );
  }

  try {
    const {
      response,
      words,
      conversationId: newConversationId,
    } = await createChatCompletion(message, conversationId, userId);

    // If the conversation ID changed (meaning a new conversation was created),
    // redirect to the new conversation URL
    if (conversationId && conversationId !== newConversationId) {
      return data({
        message,
        response,
        words,
        conversationId: newConversationId,
        redirect: `/conversation/${newConversationId}`,
      });
    }

    return data({
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
    return data(
      { error: "Failed to process message", response: "", words: [] },
      { status: 500 },
    );
  }
}

export default function ConversationPage() {
  const { conversations, conversationId } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Ensure conversations is properly typed and handle potential null values
  const safeConversations: Conversation[] | null = isValidConversationsArray(
    conversations,
  )
    ? conversations
    : null;

  const [sidebarConversations, setSidebarConversations] = useState<
    Conversation[] | null
  >(safeConversations);

  // Update conversations when they change
  useEffect(() => {
    const newSafeConversations: Conversation[] | null =
      isValidConversationsArray(conversations) ? conversations : null;
    setSidebarConversations(newSafeConversations);
  }, [conversations]);

  const handleNewConversation = () => {
    setIsMobileSidebarOpen(false);
    navigate("/");
  };

  const handleConversationSelect = (id: string) => {
    setIsMobileSidebarOpen(false);
    navigate(`/conversation/${id}`);
  };

  const toggleMobileSidebar = () => {
    setIsMobileSidebarOpen(!isMobileSidebarOpen);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header onMenuClick={toggleMobileSidebar} />
      <div className="flex h-[calc(100vh-64px)] md:h-[calc(100vh-85px)] relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
        )}
        
        {/* Sidebar */}
        <div className={`
          fixed md:relative inset-y-0 left-0 z-50 md:z-auto
          transform transition-transform duration-300 ease-in-out md:transform-none
          ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <ConversationSidebar
            conversations={sidebarConversations}
            currentConversationId={conversationId || ""}
            onNewConversation={handleNewConversation}
            onConversationSelect={handleConversationSelect}
            isMobile={true}
          />
        </div>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-3 md:p-6">
            <div className="card h-full">
              <Chat conversationId={conversationId || ""} />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
