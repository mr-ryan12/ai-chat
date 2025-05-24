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
      <Form method="post" className="flex gap-2 items-center relative">
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
          type="button"
          className="relative group bg-gray-200 rounded-full p-2 hover:bg-gray-300 focus:outline-none"
          onClick={handleFileIconClick}
          aria-label="Upload file"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6 text-gray-600"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m-2.25 0h12a2.25 2.25 0 012.25 2.25v6A2.25 2.25 0 0118 21H6a2.25 2.25 0 01-2.25-2.25v-6A2.25 2.25 0 016 10.5zm3 3v2.25a.75.75 0 001.5 0V13.5a.75.75 0 00-1.5 0z"
            />
          </svg>
          <span className="absolute left-1/2 -translate-x-1/2 -top-8 bg-black text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition pointer-events-none whitespace-nowrap z-10">
            Upload file
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileChange}
        />
        <button
          type="submit"
          disabled={isSubmitting || !input.trim()}
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Send
        </button>
      </Form>
      {uploading && <div className="text-blue-500 mt-2">Uploading...</div>}
      {uploadMessage && (
        <div className="mt-2 text-sm text-gray-700">{uploadMessage}</div>
      )}
    </div>
  );
}
