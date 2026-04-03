// ============================================================
// pages/dashboard.jsx — Main Application Page
// Protected: redirects to login if not authenticated
// Shows chat interface + connected apps sidebar
// ============================================================

import { withPageAuthRequired } from "@auth0/nextjs-auth0/client";
import Head from "next/head";
import Navbar from "../components/Navbar";
import ChatInterface from "../components/ChatInterface";
import ConnectedApps from "../components/ConnectedApps";

function Dashboard() {
  return (
    <>
      <Head>
        <title>AgentVault — Dashboard</title>
      </Head>

      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navbar />

        <div className="flex flex-1 overflow-hidden max-w-7xl mx-auto w-full px-4 py-6 gap-6">
          {/* Left sidebar — connected apps */}
          <aside className="hidden lg:flex flex-col w-72 shrink-0">
            <ConnectedApps />
          </aside>

          {/* Main chat area */}
          <main className="flex-1 min-w-0">
            <ChatInterface />
          </main>
        </div>
      </div>
    </>
  );
}

// withPageAuthRequired: redirects to /api/auth/login if not logged in
export default withPageAuthRequired(Dashboard);
