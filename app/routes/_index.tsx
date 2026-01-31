// Packages
import { data, type ActionFunctionArgs } from "@remix-run/node";
import { useState, useEffect } from "react";
import { useLoaderData, useNavigate } from "@remix-run/react";

// Components
import Chat from "~/components/Chat";
import ConversationSidebar from "~/components/ConversationSidebar";
import Header from "~/components/Header";

// Utils
import { createChatCompletion } from "~/utils/chat";
import { getConversations } from "~/server/utils/apiCalls/getConversations";

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

// TODOS:
// - separate sea of divs into components
// - change deprecated 'json' to 'data'

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const message = formData.get("message") as string;
  const conversationId = formData.get("conversationId") as string | undefined;

  if (!message) {
    return data({ error: "Message is required" }, { status: 400 });
  }

  try {
    const {
      response,
      words,
      conversationId: newConversationId,
    } = await createChatCompletion(message, conversationId);

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
    return data({ error: "Failed to process message" }, { status: 500 });
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
      <Header />
      <div className="flex h-[calc(100vh-85px)]">
        {/* Sidebar */}
        <ConversationSidebar
          conversations={sidebarConversations}
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
