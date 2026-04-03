# AgentVault — Complete Technical Documentation

> **Hackathon:** Authorized to Act: Auth0 for AI Agents (Devpost 2026)  
> **Author:** lshariprasad  
> **GitHub:** https://github.com/lshariprasad/agentvault

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Auth0 Token Vault — The Core](#3-auth0-token-vault--the-core)
4. [CIBA Step-Up Authentication](#4-ciba-step-up-authentication)
5. [File Structure Reference](#5-file-structure-reference)
6. [Setup Guide — Step by Step](#6-setup-guide--step-by-step)
7. [API Reference](#7-api-reference)
8. [Security Model](#8-security-model)
9. [How the AI Agent Works](#9-how-the-ai-agent-works)
10. [Deployment Guide](#10-deployment-guide)
11. [Git Commands — Push to GitHub](#11-git-commands--push-to-github)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Overview

AgentVault is a **secure personal AI Chief of Staff**. Users interact with it via natural language chat, and it takes actions across Gmail, Google Calendar, GitHub, and Slack — all authenticated through **Auth0 Token Vault**.

### What Makes It Different

Most AI agents store OAuth tokens in a `.env` file or database. This is fundamentally insecure — if the server is compromised, every user's access to every connected service is exposed.

AgentVault uses **Auth0 Token Vault** as the credential broker:

| Traditional Approach | AgentVault Approach |
|---|---|
| Store OAuth tokens in database | Zero tokens stored — all in Token Vault |
| Long-lived static tokens | Short-lived, scoped tokens per request |
| No human oversight of agent actions | CIBA approval for all high-risk actions |
| Agent has unlimited access once authorized | Minimum required scopes per service |

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────┐
│                     USER                            │
│           (Browser — Next.js Frontend)              │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS + Auth0 JWT
                    ▼
┌─────────────────────────────────────────────────────┐
│              AgentVault Backend                     │
│            (Node.js / Express)                      │
│                                                     │
│   ┌─────────────────────────────────────────────┐   │
│   │         Agent Orchestrator                  │   │
│   │    (Claude claude-sonnet-4-20250514 + Tools)         │   │
│   └──────────────┬──────────────────────────────┘   │
│                  │ Tool calls                        │
│   ┌──────────────▼──────────────────────────────┐   │
│   │         Token Vault Service                 │   │
│   │   getToken(connection, userId, scopes)       │   │
│   └──────────────┬──────────────────────────────┘   │
└──────────────────┼──────────────────────────────────┘
                   │ Auth0 Management API
                   ▼
┌─────────────────────────────────────────────────────┐
│              AUTH0 TOKEN VAULT                      │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│   │  Google  │ │  GitHub  │ │  Slack   │  ...       │
│   │  OAuth   │ │  OAuth   │ │  OAuth   │            │
│   └────┬─────┘ └────┬─────┘ └────┬─────┘           │
└────────┼────────────┼────────────┼─────────────────┘
         │            │            │
         ▼            ▼            ▼
    Gmail API    GitHub API   Slack API
```

---

## 3. Auth0 Token Vault — The Core

### What Token Vault Does

Token Vault is Auth0's secure credential broker for AI agents. Instead of your app holding OAuth tokens, Auth0 holds them. When your agent needs a token, it requests one from Vault, which returns a short-lived, scoped access token.

### How We Use It

In `backend/services/tokenVault.js`:

```javascript
// Get a fresh Gmail token for user X — no token stored on our server
const token = await getToken("google-oauth2", userId, [
  "https://www.googleapis.com/auth/gmail.readonly",
]);
```

Under the hood:
1. We call Auth0 Management API: `POST /api/v2/users/{userId}/token-vault/{connection}`
2. Auth0 checks if the user has authorized that connection
3. Auth0 returns a fresh, short-lived access token
4. We use it immediately for the API call — never persist it

### Connected Services in Token Vault

| Connection Name | Services | Required Scopes |
|---|---|---|
| `google-oauth2` | Gmail + Google Calendar | `gmail.readonly`, `gmail.send`, `calendar.events` |
| `github` | GitHub | `repo`, `read:user` |
| `slack` | Slack | `chat:write`, `channels:read` |

### Setting Up Token Vault in Auth0 Dashboard

1. Log in to [manage.auth0.com](https://manage.auth0.com)
2. Go to **AI Agents** → **Token Vault**
3. Click **Add Connection**
4. Select **Google** → check scopes: `gmail.readonly`, `gmail.send`, `https://www.googleapis.com/auth/calendar.events`
5. Click Save
6. Repeat for **GitHub** (scopes: `repo`, `read:user`) and **Slack** (scope: `chat:write`)

---

## 4. CIBA Step-Up Authentication

### What Is CIBA?

Client-Initiated Backchannel Authentication (CIBA) is an OAuth 2.0 extension that allows your application to request user approval for a specific action **without a browser redirect**. The user gets a push notification on their Auth0 Guardian app and can approve or deny.

### Why We Use It

For high-risk agent actions (sending emails, creating PRs, sending Slack messages), the agent pauses and cannot proceed until the user explicitly approves via Auth0 Guardian. This means:

- Even a successfully injected prompt cannot send emails without user approval
- Users maintain oversight of all irreversible actions
- There's an audit trail of every approved action

### High-Risk Tools (Require CIBA)

```javascript
// In agentOrchestrator.js
const HIGH_RISK_TOOLS = new Set([
  "send_email",        // Irreversible communication
  "create_github_pr",  // Code changes
  "send_slack_message" // Team communication
]);
```

### CIBA Flow

```
1. Agent decides to send_email
2. AgentOrchestrator detects tool is HIGH_RISK
3. Backend returns { requiresCIBA: { toolName, toolInput, message } }
4. Frontend shows CIBAModal.jsx with action details
5. Auth0 sends push notification to user's Guardian app
6. User approves → action executes
7. User denies → action cancelled
```

---

## 5. File Structure Reference

```
agentvault/
│
├── README.md                          ← GitHub landing page
├── DOCUMENTATION.md                   ← This file
├── LICENSE                            ← MIT License
├── .gitignore                         ← Never commit .env files!
│
├── backend/                           ← Node.js/Express API
│   ├── server.js                      ← Entry point, Express setup
│   ├── package.json                   ← Backend dependencies
│   ├── .env.example                   ← Copy to .env, fill in values
│   │
│   ├── routes/
│   │   ├── agent.js                   ← POST /api/agent/chat (main endpoint)
│   │   ├── auth.js                    ← GET /api/auth/me
│   │   └── health.js                  ← GET /health
│   │
│   └── services/
│       ├── tokenVault.js              ← ⭐ Auth0 Token Vault integration
│       ├── agentOrchestrator.js       ← ⭐ Claude AI + tool orchestration
│       ├── gmailService.js            ← Gmail API calls
│       ├── calendarService.js         ← Google Calendar API calls
│       ├── githubService.js           ← GitHub API calls
│       └── slackService.js            ← Slack API calls
│
└── frontend/                          ← Next.js 14
    ├── package.json                   ← Frontend dependencies
    ├── next.config.js                 ← Next.js config
    ├── tailwind.config.js             ← Tailwind config
    ├── .env.example                   ← Copy to .env.local, fill in values
    │
    └── src/
        ├── pages/
        │   ├── _app.js                ← Auth0 UserProvider wrapper
        │   ├── index.jsx              ← Landing page
        │   ├── dashboard.jsx          ← Main app (protected route)
        │   └── api/auth/
        │       ├── [...auth0].js      ← Auth0 SDK handler (login/logout/callback)
        │       └── token.js           ← Returns access token to client
        │
        ├── components/
        │   ├── ChatInterface.jsx      ← ⭐ Main chat UI
        │   ├── MessageBubble.jsx      ← Individual message rendering
        │   ├── ConnectedApps.jsx      ← Token Vault connections sidebar
        │   ├── CIBAModal.jsx          ← ⭐ CIBA approval dialog
        │   └── Navbar.jsx             ← Top navigation
        │
        └── styles/
            └── globals.css            ← Tailwind + animations
```

---

## 6. Setup Guide — Step by Step

### Step 1: Auth0 Account Setup

1. Go to [auth0.com](https://auth0.com) → Sign up free
2. Create a new **Application**:
   - Name: `AgentVault`
   - Type: **Regular Web Application**
3. In **Settings**, set:
   - **Allowed Callback URLs:** `http://localhost:3000/api/auth/callback`
   - **Allowed Logout URLs:** `http://localhost:3000`
   - **Allowed Web Origins:** `http://localhost:3000`
4. Copy your: **Domain**, **Client ID**, **Client Secret**

### Step 2: Enable Auth0 for AI Agents

1. In Auth0 Dashboard → go to **AI Agents**
2. Click **Enable Auth0 for AI Agents**
3. Go to **Token Vault** → Add connections:
   - Google (Gmail + Calendar)
   - GitHub
   - Slack
4. Note your **Tenant Name** (shown at top of dashboard — e.g. `dev-abc123`)

### Step 3: Create Auth0 API

1. Auth0 Dashboard → **APIs** → **Create API**
2. Name: `AgentVault API`
3. Identifier: `https://your-tenant.auth0.com/api/v2/`
4. Copy the **API Audience** value

### Step 4: Clone and Configure

```bash
git clone https://github.com/lshariprasad/agentvault.git
cd agentvault
```

**Backend config:**
```bash
cd backend
cp .env.example .env
# Edit .env with your values
```

**Frontend config:**
```bash
cd ../frontend
cp .env.example .env.local
# Edit .env.local with your values

# Generate AUTH0_SECRET:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 5: Install Dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### Step 6: Run Locally

```bash
# Terminal 1 — Backend
cd backend
npm run dev
# ✅ Running on http://localhost:4000

# Terminal 2 — Frontend
cd frontend
npm run dev
# ✅ Running on http://localhost:3000
```

Open http://localhost:3000 — click **Get Started** → Auth0 login → Connect Gmail → Start chatting!

---

## 7. API Reference

### `POST /api/agent/chat`

The main agent endpoint. Requires a valid Auth0 JWT in the Authorization header.

**Request:**
```json
{
  "message": "Summarize my last 5 emails",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response (normal):**
```json
{
  "response": "Here are your last 5 emails:\n\n1. **Meeting Tomorrow** from boss@company.com...",
  "toolsUsed": ["read_emails"],
  "requiresCIBA": null,
  "timestamp": "2026-04-03T10:00:00.000Z"
}
```

**Response (CIBA required):**
```json
{
  "response": "⚠️ Action requires your approval...",
  "toolsUsed": ["send_email"],
  "requiresCIBA": {
    "toolName": "send_email",
    "toolInput": { "to": "john@example.com", "subject": "...", "body": "..." },
    "message": "AgentVault wants to send an email on your behalf."
  }
}
```

### `GET /api/agent/connections`

Returns which services the user has connected in Token Vault.

**Response:**
```json
{
  "connections": [
    { "id": "google-oauth2", "name": "Gmail & Google Calendar", "connected": true },
    { "id": "github", "name": "GitHub", "connected": false },
    { "id": "slack", "name": "Slack", "connected": true }
  ]
}
```

### `GET /health`

Health check — no auth required.

```json
{
  "status": "ok",
  "service": "AgentVault API",
  "timestamp": "2026-04-03T10:00:00.000Z"
}
```

---

## 8. Security Model

### Principle of Least Privilege

Each connected app is registered in Token Vault with the minimum scopes needed:

| App | Scopes | Why |
|---|---|---|
| Gmail (read) | `gmail.readonly` | Read only — no delete or modify |
| Gmail (send) | `gmail.send` | Send only — CIBA required |
| Calendar (read) | `calendar.events.readonly` | View events only |
| Calendar (write) | `calendar.events` | Create events — limited scope |
| GitHub | `repo`, `read:user` | Repo access only — no org/admin |
| Slack | `chat:write` | Send messages only — no read |

### Zero Credential Storage

AgentVault stores **zero OAuth tokens** in its own database:
- All tokens live in Auth0 Token Vault
- Tokens returned per-request are short-lived
- Token refresh is handled automatically by Auth0
- Token revocation happens in Auth0 dashboard — no code change needed

### JWT Verification

Every backend request validates the Auth0 JWT:
```javascript
// Uses Auth0's public JWKS endpoint for signature verification
// No shared secret — RS256 asymmetric signing
jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
```

### CIBA for Irreversible Actions

Any action the agent cannot undo requires explicit human approval:
- `send_email` → cannot unsend
- `create_github_pr` → creates permanent record
- `send_slack_message` → team notification

---

## 9. How the AI Agent Works

### Tool-Use Loop

```
User message
    │
    ▼
Claude claude-sonnet-4-20250514 (first call)
    │ stop_reason = "tool_use"
    ▼
Check: is any tool HIGH_RISK?
    ├─ YES → Return CIBA prompt, pause agent
    └─ NO  → Execute tools
              │
              ▼
         For each tool:
           getToken(connection, userId)  ← Auth0 Token Vault
           Call external API with token
           Return results
              │
              ▼
Claude claude-sonnet-4-20250514 (second call)
    Synthesizes tool results into natural language
    │
    ▼
Response to user
```

### Example: "Summarize my emails"

```
1. User: "Summarize my last 5 emails"
2. Claude decides to call read_emails({ count: 5 })
3. tokenVault.getToken("google-oauth2", userId, [...scopes])
4. Auth0 returns fresh access token
5. gmailService.readEmails(token, 5)
6. Gmail API returns email data
7. Claude synthesizes: "Here are your 5 most recent emails:..."
8. Token used once, not stored anywhere
```

---

## 10. Deployment Guide

### Deploy Backend to Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select `agentvault` repo → set **Root Directory** to `backend`
3. Add all environment variables from `backend/.env`
4. Railway auto-deploys on push to main
5. Copy the Railway URL (e.g. `https://agentvault-backend.railway.app`)

### Deploy Frontend to Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select `agentvault` repo → set **Root Directory** to `frontend`
3. Add environment variables from `frontend/.env.local`
   - Set `NEXT_PUBLIC_API_URL` to your Railway backend URL
   - Set `AUTH0_BASE_URL` to your Vercel URL
4. Update Auth0 allowed URLs with your production domains:
   - Callback: `https://your-app.vercel.app/api/auth/callback`
   - Logout: `https://your-app.vercel.app`
5. Click Deploy

---

## 11. Git Commands — Push to GitHub

Run these commands **in order** from your project root:

```bash
# Step 1: Navigate to your project
cd agentvault

# Step 2: Initialize git (if not already done)
git init

# Step 3: Add all files
git add .

# Step 4: First commit
git commit -m "feat: initial AgentVault implementation

- Auth0 Token Vault integration for zero-credential OAuth
- Claude claude-sonnet-4-20250514 agent with Gmail, Calendar, GitHub, Slack tools
- CIBA step-up auth for high-risk actions (send_email, create_pr, slack_message)
- Next.js frontend with Auth0 Universal Login
- Express backend with JWT verification
- Built for Auth0 Hackathon 2026"

# Step 5: Add remote (your repo)
git remote add origin https://github.com/lshariprasad/agentvault.git

# Step 6: Push to GitHub
git push -u origin main
```

**For subsequent updates:**
```bash
git add .
git commit -m "feat: describe what you changed"
git push
```

---

## 12. Troubleshooting

### "Invalid token" from backend
- Check `AUTH0_DOMAIN` and `AUTH0_AUDIENCE` match exactly
- Make sure you created an Auth0 API and copied its audience URL

### "Not connected" error in agent
- User hasn't connected that service via Token Vault yet
- Go to dashboard → click "Connect" on the service

### Frontend can't reach backend
- Check `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- Make sure backend is running on port 4000
- Check CORS: `FRONTEND_URL` in backend `.env`

### Auth0 callback error
- Check Allowed Callback URLs in Auth0 Dashboard includes `http://localhost:3000/api/auth/callback`

### Gmail API quota
- Token Vault issues tokens per request — if you see 429 errors, you've hit Gmail's rate limit
- Reduce request frequency or use Gmail batch API

---

*AgentVault — Built with ❤️ for the Auth0 Hackathon 2026*
