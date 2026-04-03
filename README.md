# 🤖 AgentVault — Secure AI Chief of Staff

> **Built for the [Authorized to Act: Auth0 for AI Agents Hackathon](https://authorizedtoact.devpost.com/)**  
> Zero-credential AI agent powered by Auth0 Token Vault

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Auth0 Token Vault](https://img.shields.io/badge/Auth0-Token%20Vault-EB5424?logo=auth0)](https://auth0.com/ai/docs/intro/token-vault)
[![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)](https://nextjs.org)
[![Hackathon](https://img.shields.io/badge/Hackathon-Devpost-003E54)](https://authorizedtoact.devpost.com/)

---

## 🎯 What is AgentVault?

AgentVault is a personal AI Chief of Staff that securely manages your **Gmail**, **Google Calendar**, **GitHub**, and **Slack** — all through **Auth0 Token Vault** — without ever holding a raw API key or OAuth token.

Just say:
- *"Summarize my unread emails and draft replies to anything urgent"*
- *"Reschedule my 3pm meeting with John to tomorrow"*
- *"Open a pull request on my latest branch with a summary"*
- *"Send a Slack update to #engineering with today's deployment notes"*

The agent handles everything. Auth0 handles the security. You stay in control.

---

## 🔐 Security Architecture

```
User → Chat UI (Next.js)
     → AgentVault API (Node.js/Express)
          → LLM Orchestrator (Claude claude-sonnet-4-20250514)
               → Tool Calls (Gmail, Calendar, GitHub, Slack)
                    → Auth0 Token Vault (OAuth token broker)
                         → External APIs
```

**Key security principles:**
- ✅ Zero hardcoded credentials — Token Vault manages all OAuth tokens
- ✅ Short-lived, user-scoped access tokens per service
- ✅ CIBA (Client-Initiated Backchannel Authentication) for dangerous actions
- ✅ Minimum required scopes per connected app
- ✅ Auth0 Universal Login — no custom auth code

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- An [Auth0 account](https://auth0.com) (free)
- Auth0 for AI Agents enabled (Token Vault)
- Anthropic API key
- Git

### 1. Clone the repo

```bash
git clone https://github.com/lshariprasad/agentvault.git
cd agentvault
```

### 2. Set up Auth0

1. Go to [auth0.com](https://auth0.com) → Create a free account
2. Create a new **Regular Web Application**
3. Enable **Auth0 for AI Agents** in your dashboard
4. In Token Vault, add connections:
   - **Google** (Gmail + Calendar) — scopes: `gmail.readonly`, `gmail.send`, `calendar.events`
   - **GitHub** — scopes: `repo`, `read:user`
   - **Slack** — scopes: `chat:write`, `channels:read`
5. Note your: **Domain**, **Client ID**, **Client Secret**, **Tenant Name**

### 3. Configure environment

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend  
cp frontend/.env.example frontend/.env.local
```

Fill in your values (see `.env.example` files for all keys).

### 4. Install and run

```bash
# Backend
cd backend
npm install
npm run dev

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 📁 Project Structure

```
agentvault/
├── backend/                    # Node.js/Express API server
│   ├── routes/
│   │   ├── agent.js            # Main agent endpoint
│   │   ├── auth.js             # Auth0 callback handlers
│   │   └── health.js           # Health check
│   ├── services/
│   │   ├── tokenVault.js       # Auth0 Token Vault integration
│   │   ├── agentOrchestrator.js# LLM + tool orchestration
│   │   ├── gmailService.js     # Gmail API calls
│   │   ├── calendarService.js  # Google Calendar API calls
│   │   ├── githubService.js    # GitHub API calls
│   │   └── slackService.js     # Slack API calls
│   ├── middleware/
│   │   ├── auth.js             # JWT verification middleware
│   │   └── ciba.js             # CIBA step-up auth middleware
│   ├── server.js               # Express app entry point
│   ├── package.json
│   └── .env.example
│
├── frontend/                   # Next.js 14 frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ChatInterface.jsx    # Main chat UI
│   │   │   ├── MessageBubble.jsx    # Chat message component
│   │   │   ├── ConnectedApps.jsx    # Token Vault app connections
│   │   │   ├── CIBAModal.jsx        # Approval request modal
│   │   │   └── Navbar.jsx           # Navigation with auth state
│   │   ├── pages/
│   │   │   ├── index.jsx            # Landing page
│   │   │   ├── dashboard.jsx        # Main app dashboard
│   │   │   └── api/
│   │   │       └── auth/[...auth0].js # Auth0 SDK route handler
│   │   ├── hooks/
│   │   │   ├── useAgent.js          # Agent API hook
│   │   │   └── useConnections.js    # Token Vault connections hook
│   │   └── lib/
│   │       └── api.js               # API client
│   ├── package.json
│   └── .env.example
│
├── DOCUMENTATION.md            # Full technical documentation
├── README.md                   # This file
└── LICENSE
```

---

## 🔑 Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|---|---|
| `AUTH0_DOMAIN` | Your Auth0 domain (e.g. `dev-xxx.auth0.com`) |
| `AUTH0_CLIENT_ID` | Auth0 application Client ID |
| `AUTH0_CLIENT_SECRET` | Auth0 application Client Secret |
| `AUTH0_AUDIENCE` | Auth0 API audience |
| `ANTHROPIC_API_KEY` | Your Anthropic API key |
| `REDIS_URL` | Redis URL for session management |
| `PORT` | Server port (default: 4000) |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|---|---|
| `AUTH0_SECRET` | Random 32+ char secret for session encryption |
| `AUTH0_BASE_URL` | Your app URL (e.g. `http://localhost:3000`) |
| `AUTH0_ISSUER_BASE_URL` | `https://YOUR_DOMAIN.auth0.com` |
| `AUTH0_CLIENT_ID` | Same as backend |
| `AUTH0_CLIENT_SECRET` | Same as backend |
| `NEXT_PUBLIC_API_URL` | Backend API URL (e.g. `http://localhost:4000`) |

---

## 🎬 Video Demo

[Watch the 3-minute demo on YouTube](#) *(link will be added)*

---

## 🏆 Hackathon

Built for the **Authorized to Act: Auth0 for AI Agents Hackathon** (Devpost, 2026).

- **Prize pool:** $10,000 in cash
- **Requirement:** Must use Auth0 Token Vault
- **Deadline:** April 7, 2026

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file.

---

## 👤 Author

**lshariprasad** — [github.com/lshariprasad](https://github.com/lshariprasad)
