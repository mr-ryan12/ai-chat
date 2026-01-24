interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isThinking?: boolean;
}

const Avatar = ({ role }: { role: "user" | "assistant" }) => (
  <div className={`w-8 h-8 bg-gradient-to-r ${
    role === "assistant" 
      ? "from-blue-500 to-purple-600" 
      : "from-gray-500 to-gray-600"
  } rounded-full flex items-center justify-center flex-shrink-0`}>
    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d={role === "assistant" 
          ? "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          : "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        }
      />
    </svg>
  </div>
);

export default function MessageBubble({ role, content, isStreaming, isThinking }: MessageBubbleProps) {
  return (
    <div className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] p-4 ${
        role === "user" ? "message-user" : "message-assistant"
      } shadow-sm`}>
        <div className="flex items-start space-x-3">
          {role === "assistant" && <Avatar role={role} />}
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
              {role === "user" ? "You" : "AI Assistant"}
            </div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {isThinking ? (
                <span className="text-gray-600 dark:text-gray-400">Thinking...</span>
              ) : (
                <>
                  {content}
                  {isStreaming && (
                    <span className="inline-block w-2 h-4 bg-blue-500 dark:bg-blue-400 ml-1 animate-pulse"></span>
                  )}
                </>
              )}
            </div>
          </div>
          {role === "user" && <Avatar role={role} />}
        </div>
      </div>
    </div>
  );
}