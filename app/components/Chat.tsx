import { useState, useEffect, useRef } from "react";
import { Form, useActionData, useNavigation } from "@remix-run/react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ActionData {
  message?: string;
  response?: string;
  words?: string[];
  error?: string;
  conversationId?: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string>("");
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  useEffect(() => {
    if (actionData?.message) {
      const newMessage: Message = {
        role: "user",
        content: actionData.message,
      };
      setMessages((prev) => [...prev, newMessage]);
      if (actionData.conversationId) {
        setConversationId(actionData.conversationId);
      }
      setInput("");
    }
  }, [actionData]);

  useEffect(() => {
    if (actionData?.words && actionData.words.length > 0) {
      setStreamingResponse("");
      let currentIndex = 0;
      const interval = setInterval(() => {
        if (currentIndex < actionData.words!.length) {
          let word = actionData.words![currentIndex];
          if (currentIndex === 0) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
          }
          setStreamingResponse((prev) => prev + word + " ");
          currentIndex++;
        } else {
          clearInterval(interval);
          const newMessage: Message = {
            role: "assistant",
            content: actionData.response || "",
          };
          setMessages((prev) => [...prev, newMessage]);
          setStreamingResponse("");
        }
      }, 50); // 50ms delay between words

      return () => clearInterval(interval);
    }
  }, [actionData?.words, actionData?.response]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingResponse]);

  const handleFileIconClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/upload-file", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        setUploadMessage("File uploaded and ingested successfully!");
      } else {
        setUploadMessage("Upload failed");
      }
    } catch (err) {
      console.error(err);
      setUploadMessage("Upload failed");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] max-w-4xl mx-auto">
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto mb-6 space-y-6 px-4">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-white"
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to AI Chatbot
            </h3>
            <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              Start a conversation by typing a message below. I can help you
              with questions, analysis, and more.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] p-4 ${
                message.role === "user" ? "message-user" : "message-assistant"
              } shadow-sm`}
            >
              <div className="flex items-start space-x-3">
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {message.role === "user" ? "You" : "AI Assistant"}
                  </div>
                  <div className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </div>
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {streamingResponse && (
          <div className="flex justify-start">
            <div className="message-assistant p-4 shadow-sm max-w-[80%]">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    AI Assistant
                  </div>
                  <div className="text-sm leading-relaxed">
                    {streamingResponse}
                    <span className="inline-block w-2 h-4 bg-blue-500 dark:bg-blue-400 ml-1 animate-pulse"></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {isSubmitting && !streamingResponse && (
          <div className="flex justify-start">
            <div className="message-assistant p-4 shadow-sm max-w-[80%]">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-4 h-4 text-white animate-spin"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    AI Assistant
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Thinking...
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 rounded-b-xl">
        <Form method="post" className="flex gap-3 items-end">
          <input type="hidden" name="conversationId" value={conversationId} />

          {/* File Upload Button */}
          <button
            type="button"
            className="relative group btn-secondary p-3 rounded-xl hover:scale-105 transition-transform duration-200"
            onClick={handleFileIconClick}
            aria-label="Upload file"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m-2.25 0h12a2.25 2.25 0 012.25 2.25v6A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25v-6A2.25 2.25 0 016 10.5zm3 3v2.25a.75.75 0 001.5 0V13.5a.75.75 0 00-1.5 0z"
              />
            </svg>
            <span className="absolute left-1/2 -translate-x-1/2 -top-10 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
              Upload file
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Message Input */}
          <div className="flex-1 relative">
            <input
              type="text"
              name="message"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="input-modern w-full pr-12 resize-none"
              disabled={isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (input.trim() && !isSubmitting) {
                    e.currentTarget.form?.requestSubmit();
                  }
                }
              }}
            />
            <button
              type="submit"
              disabled={isSubmitting || !input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 btn-primary p-2 rounded-lg"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </div>
        </Form>

        {/* Upload Status */}
        {uploading && (
          <div className="mt-3 flex items-center space-x-2 text-blue-600 dark:text-blue-400">
            <svg
              className="w-4 h-4 animate-spin"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-sm">Uploading...</span>
          </div>
        )}

        {uploadMessage && (
          <div
            className={`mt-3 text-sm ${
              uploadMessage.includes("successfully")
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {uploadMessage}
          </div>
        )}
      </div>
    </div>
  );
}
