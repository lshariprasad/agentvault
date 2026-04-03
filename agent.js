// ============================================================
// routes/agent.js — Main Chat + Agent Endpoint
// POST /api/agent/chat
// POST /api/agent/connections
// ============================================================

const express = require("express");
const router = express.Router();
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");
const { runAgent } = require("../services/agentOrchestrator");
const { getConnectedServices } = require("../services/tokenVault");

// ── JWT Auth Middleware ──────────────────────────────────────
// Validates the Auth0 access token on every agent request
const checkJwt = jwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  }),
  audience: process.env.AUTH0_AUDIENCE,
  issuer: `https://${process.env.AUTH0_DOMAIN}/`,
  algorithms: ["RS256"],
});

// ── POST /api/agent/chat ─────────────────────────────────────
// Main agent endpoint — takes user message, returns AI response
router.post("/chat", checkJwt, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validate input
    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (message.length > 2000) {
      return res.status(400).json({ error: "Message too long (max 2000 chars)." });
    }

    // Get Auth0 user ID from JWT (set by checkJwt middleware)
    const userId = req.auth.sub;
    console.log(`[Agent] 💬 New message from user: ${userId.slice(0, 20)}...`);

    // Run the AI agent
    const result = await runAgent(
      message.trim(),
      userId,
      conversationHistory.slice(-10) // Keep last 10 messages for context
    );

    res.json({
      response: result.response,
      toolsUsed: result.toolsUsed,
      requiresCIBA: result.requiresCIBA,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Agent] Error:", err.message);
    res.status(500).json({
      error: "Agent error. Please try again.",
      details:
        process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
});

// ── GET /api/agent/connections ───────────────────────────────
// Returns which services the user has connected via Token Vault
router.get("/connections", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.sub;
    const connected = await getConnectedServices(userId);

    // Map to friendly display names
    const serviceMap = {
      "google-oauth2": { name: "Gmail & Google Calendar", icon: "google" },
      github: { name: "GitHub", icon: "github" },
      slack: { name: "Slack", icon: "slack" },
    };

    const connections = Object.entries(serviceMap).map(([key, info]) => ({
      id: key,
      ...info,
      connected: connected.includes(key),
    }));

    res.json({ connections });
  } catch (err) {
    console.error("[Connections] Error:", err.message);
    res.status(500).json({ error: "Could not fetch connections." });
  }
});

module.exports = router;
