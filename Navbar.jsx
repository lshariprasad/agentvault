// ============================================================
// components/Navbar.jsx
// Top navigation bar with user avatar and logout button
// ============================================================

import { useUser } from "@auth0/nextjs-auth0/client";
import Image from "next/image";

export default function Navbar() {
  const { user } = useUser();

  return (
    <nav className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <span className="text-white font-bold text-lg">AgentVault</span>
          <span className="hidden sm:inline-block px-2 py-0.5 text-xs bg-indigo-900/50 text-indigo-300 border border-indigo-700 rounded-full">
            Powered by Auth0 Token Vault
          </span>
        </div>

        {/* User menu */}
        {user && (
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-gray-400">
              {user.email}
            </span>

            {user.picture && (
              <Image
                src={user.picture}
                alt={user.name || "User"}
                width={32}
                height={32}
                className="rounded-full border border-gray-700"
              />
            )}

            <a
              href="/api/auth/logout"
              className="px-3 py-1.5 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors"
            >
              Logout
            </a>
          </div>
        )}
      </div>
    </nav>
  );
}
