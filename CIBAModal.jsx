// ============================================================
// components/CIBAModal.jsx
// Client-Initiated Backchannel Authentication (CIBA) modal.
//
// When the agent wants to do a HIGH RISK action (send email,
// create PR, send Slack message), it pauses and shows this
// modal to ask the user for explicit approval.
//
// This is a core Auth0 security feature — the agent CANNOT
// proceed without this approval signal.
// ============================================================

export default function CIBAModal({ data, onClose }) {
  const ACTION_LABELS = {
    send_email: {
      icon: "📧",
      label: "Send Email",
      color: "text-yellow-400",
      bg: "bg-yellow-950/50 border-yellow-800/50",
    },
    create_github_pr: {
      icon: "🐙",
      label: "Create GitHub PR",
      color: "text-purple-400",
      bg: "bg-purple-950/50 border-purple-800/50",
    },
    send_slack_message: {
      icon: "💬",
      label: "Send Slack Message",
      color: "text-green-400",
      bg: "bg-green-950/50 border-green-800/50",
    },
  };

  const info = ACTION_LABELS[data.toolName] || {
    icon: "⚠️",
    label: data.toolName,
    color: "text-orange-400",
    bg: "bg-orange-950/50 border-orange-800/50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">{info.icon}</span>
          <div>
            <h2 className="text-white font-bold text-lg">Action Requires Approval</h2>
            <p className={`text-sm font-medium ${info.color}`}>{info.label}</p>
          </div>
        </div>

        {/* CIBA explanation */}
        <div className={`p-4 rounded-xl border mb-4 ${info.bg}`}>
          <p className="text-sm text-gray-300 leading-relaxed">
            <strong className="text-white">Auth0 CIBA</strong> has been triggered.
            AgentVault has sent an approval request via{" "}
            <strong className="text-white">Auth0 Guardian</strong>. Check your
            authenticator app to approve or deny this action.
          </p>
        </div>

        {/* Action details */}
        <div className="bg-gray-800 rounded-xl p-4 mb-5">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-medium">
            Action Details
          </p>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed overflow-auto max-h-32">
            {JSON.stringify(data.toolInput, null, 2)}
          </pre>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-2 mb-5">
          <span className="text-lg mt-0.5">🛡️</span>
          <p className="text-xs text-gray-500 leading-relaxed">
            This is Auth0's Client-Initiated Backchannel Authentication. The agent
            is paused and <strong className="text-gray-400">cannot proceed</strong>{" "}
            without your explicit approval. This prevents unauthorized actions.
          </p>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 border border-gray-700 rounded-xl transition-colors font-medium"
          >
            Dismiss
          </button>
          <a
            href="https://auth0.com/guardian"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 px-4 py-2.5 text-sm bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-colors font-medium text-center"
          >
            Open Auth0 Guardian →
          </a>
        </div>
      </div>
    </div>
  );
}
