// ============================================================
// components/ConnectedApps.jsx
// Shows which services are connected via Auth0 Token Vault.
// Users click "Connect" to initiate the OAuth flow through
// Auth0 Token Vault — we never handle the OAuth ourselves.
// ============================================================

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import axios from "axios";

const SERVICE_ICONS = {
  "google-oauth2": "🔴",
  github: "🐙",
  slack: "💬",
};

export default function ConnectedApps() {
  const { user } = useUser();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchConnections();
  }, [user]);

  async function fetchConnections() {
    try {
      // Get Auth0 access token for API call
      const tokenRes = await fetch("/api/auth/token");
      const { accessToken } = await tokenRes.json();

      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/agent/connections`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      setConnections(res.data.connections || []);
    } catch (err) {
      console.error("Failed to fetch connections:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 h-fit">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
        🔐 Connected Apps
      </h2>

      <p className="text-xs text-gray-500 mb-4 leading-relaxed">
        Tokens stored securely in Auth0 Token Vault — never in our database.
      </p>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {connections.map((conn) => (
            <div
              key={conn.id}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-xl border border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{SERVICE_ICONS[conn.id] || "🔗"}</span>
                <div>
                  <p className="text-sm text-white font-medium">{conn.name}</p>
                  <p className="text-xs text-gray-500">
                    {conn.connected ? "Connected" : "Not connected"}
                  </p>
                </div>
              </div>

              {conn.connected ? (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  Active
                </span>
              ) : (
                // Clicking Connect initiates Auth0 Token Vault OAuth flow
                <a
                  href={`/api/auth/login?connection=${conn.id}&returnTo=/dashboard`}
                  className="px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
                >
                  Connect
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Security note */}
      <div className="mt-4 p-3 bg-indigo-950/50 border border-indigo-800/50 rounded-xl">
        <p className="text-xs text-indigo-300 leading-relaxed">
          🛡️ Auth0 Token Vault manages all OAuth tokens. AgentVault never stores
          your credentials.
        </p>
      </div>
    </div>
  );
}
