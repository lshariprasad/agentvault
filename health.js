// routes/health.js — Simple health check for deployment monitoring
const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({
    status: "ok",
    service: "AgentVault API",
    timestamp: new Date().toISOString(),
    auth0: process.env.AUTH0_DOMAIN ? "configured" : "missing",
    anthropic: process.env.ANTHROPIC_API_KEY ? "configured" : "missing",
  });
});

module.exports = router;
