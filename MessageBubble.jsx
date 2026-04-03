// ============================================================
// components/MessageBubble.jsx
// Renders a single chat message with Markdown support.
// Shows tool badges when agent used services.
// ============================================================

import ReactMarkdown from "react-markdown";

const TOOL_LABELS = {
  read_emails: "📧 Gmail",
  send_email: "📧 Gmail Send",
  get_calendar_events: "📅 Calendar",
  create_calendar_event: "📅 Calendar Write",
  list_github_repos: "🐙 GitHub",
  create_github_pr: "🐙 GitHub PR",
  send_slack_message: "💬 Slack",
};

export default function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex items-start gap-3 message-enter ${
        isUser ? "flex-row-reverse" : ""
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0 ${
          isUser ? "bg-indigo-600" : "bg-gray-700"
        }`}
      >
        {isUser ? "👤" : "🤖"}
      </div>

      {/* Bubble */}
      <div className={`max-w-[75%] space-y-2 ${isUser ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
            isUser
              ? "bg-indigo-600 text-white rounded-tr-sm"
              : message.isError
              ? "bg-red-950/50 border border-red-800 text-red-300 rounded-tl-sm"
              : "bg-gray-800 border border-gray-700 text-gray-100 rounded-tl-sm"
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown
                components={{
                  // Style code blocks
                  code: ({ children }) => (
                    <code className="bg-gray-900 px-1.5 py-0.5 rounded text-indigo-300 text-xs font-mono">
                      {children}
                    </code>
                  ),
                  // Style links
                  a: ({ href, children }) => (
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 hover:text-indigo-300 underline"
                    >
                      {children}
                    </a>
                  ),
                  // Style strong
                  strong: ({ children }) => (
                    <strong className="text-white font-semibold">{children}</strong>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {/* Tool badges — show which services were used */}
        {!isUser && message.toolsUsed && message.toolsUsed.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {message.toolsUsed.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 bg-gray-800/80 text-gray-400 text-xs rounded-full border border-gray-700"
              >
                {TOOL_LABELS[tool] || tool}
              </span>
            ))}
            <span className="px-2 py-0.5 bg-indigo-950/50 text-indigo-400 text-xs rounded-full border border-indigo-800/50">
              🔐 Auth0 Token Vault
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
