// ============================================================
// pages/api/auth/[...auth0].js
// Auth0 SDK dynamic route — handles login, logout, callback
// This single file gives you:
//   /api/auth/login    → redirects to Auth0 Universal Login
//   /api/auth/logout   → logs user out
//   /api/auth/callback → Auth0 redirects here after login
//   /api/auth/me       → returns current user profile
// ============================================================

import { handleAuth } from "@auth0/nextjs-auth0";

export default handleAuth();
