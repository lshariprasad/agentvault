// ============================================================
// AgentVault — Express Server Entry Point
// Secure AI Chief of Staff powered by Auth0 Token Vault
// ============================================================

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

// Route imports
const agentRoutes = require("./routes/agent");
const authRoutes = require("./routes/auth");
const healthRoutes = require("./routes/health");

const app = express();
const PORT = process.env.PORT || 4000;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Rate limiting — prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // max 100 requests per window
  message: { error: "Too many requests. Please try again later." },
});
app.use("/api/", limiter);

// Body parsing
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ───────────────────────────────────────────────────
app.use("/health", healthRoutes);       // GET /health
app.use("/api/auth", authRoutes);       // POST /api/auth/callback, etc.
app.use("/api/agent", agentRoutes);     // POST /api/agent/chat

// ── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("[ERROR]", err.message);

  // Auth errors
  if (err.name === "UnauthorizedError") {
    return res.status(401).json({ error: "Invalid or missing token." });
  }

  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
  });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀 AgentVault backend running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔐 Auth0 Domain: ${process.env.AUTH0_DOMAIN}`);
  console.log(`🤖 Anthropic key: ${process.env.ANTHROPIC_API_KEY ? "✅ Set" : "❌ Missing"}\n`);
});

module.exports = app;
