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
  const [conversationId, setConversationId] = useState<string>();
  const [streamingResponse, setStreamingResponse] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const actionData = useActionData<ActionData>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

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
          setStreamingResponse(
            (prev) => prev + actionData.words![currentIndex] + " "
          );
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

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800"
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-4">
              {streamingResponse}
            </div>
          </div>
        )}
        {isSubmitting && !streamingResponse && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-800 rounded-lg p-4">
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <Form method="post" className="flex gap-2">
        <input type="hidden" name="conversationId" value={conversationId} />
        <input
          type="text"
          name="message"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded-lg border border-gray-300 p-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isSubmitting}
        />
        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </Form>
    </div>
  );
}
