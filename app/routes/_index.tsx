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
import { logger } from "~/server/utils/logger";
import { hasStatus } from "~/server/utils/loggerHelpers";

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
    logger.logError(error, {
      method: request.method,
      path: request.url,
      duration: 0,
      status: hasStatus(error) ? error.status : 500,
    });
    return data({ error: "Failed to process message" }, { status: 500 });
  }
}

export default function Index() {
  const { conversations } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const [sidebarConversations, setSidebarConversations] =
    useState(conversations);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Update conversations when they change
  useEffect(() => {
    setSidebarConversations(conversations);
  }, [conversations]);

  const handleNewConversation = () => {
    setIsMobileSidebarOpen(false);
    navigate(".", { replace: true });
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
            onNewConversation={handleNewConversation}
            onConversationSelect={handleConversationSelect}
            isMobile={true}
          />
        </div>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col min-w-0">
          <div className="flex-1 p-3 md:p-6">
            <div className="card h-full">
              <Chat />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
