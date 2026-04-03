// ============================================================
// pages/index.jsx — Landing Page
// Shows hero section with login button.
// Redirects logged-in users directly to /dashboard
// ============================================================

import { useUser } from "@auth0/nextjs-auth0/client";
import { useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";

export default function Home() {
  const { user, isLoading } = useUser();
  const router = useRouter();

  // Auto-redirect logged-in users to dashboard
  useEffect(() => {
    if (user) router.push("/dashboard");
  }, [user, router]);

  return (
    <>
      <Head>
        <title>AgentVault — Secure AI Chief of Staff</title>
        <meta
          name="description"
          content="AI agent that manages Gmail, Calendar, GitHub & Slack — powered by Auth0 Token Vault"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-6">
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-900 rounded-full opacity-20 blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-purple-900 rounded-full opacity-20 blur-3xl" />
        </div>

        <div className="relative z-10 max-w-3xl text-center">
          {/* Badge */}
          <span className="inline-block px-3 py-1 mb-6 text-xs font-medium bg-indigo-900/50 text-indigo-300 border border-indigo-700 rounded-full">
            🏆 Built for Auth0 Hackathon 2026
          </span>

          {/* Hero heading */}
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Your AI{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Chief of Staff
            </span>
          </h1>

          <p className="text-xl text-gray-400 mb-8 leading-relaxed">
            AgentVault manages your Gmail, Calendar, GitHub & Slack with natural
            language — powered by{" "}
            <span className="text-indigo-400 font-semibold">
              Auth0 Token Vault
            </span>
            . Zero hardcoded credentials. Total control.
          </p>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-10">
            {[
              "📧 Gmail",
              "📅 Calendar",
              "🐙 GitHub",
              "💬 Slack",
              "🔐 Auth0 Token Vault",
              "🛡️ CIBA Step-up Auth",
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 bg-gray-800 text-gray-300 rounded-full text-sm border border-gray-700"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA Button */}
          {isLoading ? (
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
          ) : (
            <a
              href="/api/auth/login"
              className="inline-block px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-lg transition-all duration-200 shadow-lg shadow-indigo-900/50 hover:shadow-indigo-800/50 hover:-translate-y-0.5"
            >
              Get Started — It's Free →
            </a>
          )}

          <p className="mt-4 text-sm text-gray-600">
            Sign in with Auth0 · No credit card required
          </p>
        </div>

        {/* Security badge at bottom */}
        <div className="relative z-10 mt-20 flex items-center gap-2 text-gray-600 text-sm">
          <span>🔐</span>
          <span>Secured by Auth0 Token Vault — zero credentials stored in our system</span>
        </div>
      </main>
    </>
  );
}
