// ============================================================
// routes/auth.js — Auth0 callback and user info routes
// ============================================================

const express = require("express");
const router = express.Router();
const { expressjwt: jwt } = require("express-jwt");
const jwksRsa = require("jwks-rsa");

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

// GET /api/auth/me — returns current user info from JWT
router.get("/me", checkJwt, (req, res) => {
  res.json({
    userId: req.auth.sub,
    email: req.auth.email,
    name: req.auth.name,
  });
});

module.exports = router;
