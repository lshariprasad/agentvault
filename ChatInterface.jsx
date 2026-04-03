// ============================================================
// components/ChatInterface.jsx
// Main chat UI — sends messages to the agent backend and
// displays responses. Handles CIBA modal for high-risk actions.
// ============================================================

import { useState, useRef, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import axios from "axios";
import MessageBubble from "./MessageBubble";
import CIBAModal from "./CIBAModal";

// Suggested prompts shown when chat is empty
const EXAMPLE_PROMPTS = [
  "📧 Summarize my last 5 unread emails",
  "📅 What meetings do I have this week?",
  "🐙 List my GitHub repositories",
  "💬 What channels am I in on Slack?",
  "📧 Draft a reply to my most recent email",
];

export default function ChatInterface() {
  const { user } = useUser();

  // Message history: { role: "user"|"assistant", content: string, toolsUsed?: string[] }
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content:
        "👋 Hi! I'm AgentVault, your secure AI Chief of Staff.\n\nI can manage your **Gmail**, **Google Calendar**, **GitHub**, and **Slack** — all secured through **Auth0 Token Vault** so you stay in control.\n\nWhat would you like me to do?",
      toolsUsed: [],
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cibaData, setCibaData] = useState(null); // non-null = show CIBA modal
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  /**
   * Send a message to the agent backend.
   * @param {string} messageText - The text to send
   */
  async function sendMessage(messageText) {
    const text = messageText.trim();
    if (!text || isLoading) return;

    // Add user message to chat
    const userMessage = { role: "user", content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);

    try {
      // Get current Auth0 access token
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      // Send to agent backend
      const res = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agent/chat`,
        {
          message: text,
          // Send last 10 messages as context (exclude welcome message)
          conversationHistory: newMessages
            .slice(-10)
            .map(({ role, content }) => ({ role, content })),
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const { response, toolsUsed, requiresCIBA } = res.data;

      // If CIBA required, show approval modal
      if (requiresCIBA) {
        setCibaData(requiresCIBA);
      }

      // Add agent response to chat
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: response,
          toolsUsed: toolsUsed || [],
        },
      ]);
    } catch (err) {
      console.error("Agent error:", err);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "❌ Something went wrong. Please check your connection and try again.",
          toolsUsed: [],
          isError: true,
        },
      ]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  function handlePromptClick(prompt) {
    // Strip the emoji prefix
    const text = prompt.replace(/^[^\s]+ /, "");
    sendMessage(text);
  }

  return (
    <>
      <div className="flex flex-col h-full bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        {/* Chat header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center gap-3">
          <div className="w-2.5 h-2.5 bg-green-400 rounded-full animate-pulse" />
          <span className="text-white font-semibold">AgentVault</span>
          <span className="text-xs text-gray-500">Secured by Auth0 Token Vault</span>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto chat-scroll p-5 space-y-4 min-h-0">
          {messages.map((msg, idx) => (
            <MessageBubble key={idx} message={msg} />
          ))}

          {/* Typing indicator */}
          {isLoading && (
            <div className="flex items-center gap-3 message-enter">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-sm shrink-0">
                🤖
              </div>
              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-1.5">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Example prompts — shown only when chat is at welcome state */}
        {messages.length === 1 && (
          <div className="px-5 py-3 border-t border-gray-800/50 flex flex-wrap gap-2">
            {EXAMPLE_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                onClick={() => handlePromptClick(prompt)}
                className="px-3 py-1.5 text-xs text-gray-300 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-full transition-colors whitespace-nowrap"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input area */}
        <div className="px-4 py-4 border-t border-gray-800">
          <div className="flex items-end gap-3 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-indigo-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything — 'Summarize my emails', 'Create a calendar event'..."
              rows={1}
              className="flex-1 bg-transparent text-white placeholder-gray-500 resize-none outline-none text-sm leading-relaxed max-h-32 overflow-y-auto"
              style={{ height: "auto" }}
              onInput={(e) => {
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + "px";
              }}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className="shrink-0 w-9 h-9 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center"
              aria-label="Send message"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg
                  className="w-4 h-4 rotate-90"
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
              )}
            </button>
          </div>
          <p className="text-xs text-gray-600 mt-2 text-center">
            Enter to send · Shift+Enter for new line · All actions secured by Auth0
          </p>
        </div>
      </div>

      {/* CIBA Approval Modal */}
      {cibaData && (
        <CIBAModal data={cibaData} onClose={() => setCibaData(null)} />
      )}
    </>
  );
}
