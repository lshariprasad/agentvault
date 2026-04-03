// ============================================================
// pages/api/auth/token.js
// Internal API route: returns the user's Auth0 access token
// so client components can attach it to backend API calls.
// ============================================================

import { getAccessToken } from "@auth0/nextjs-auth0";

export default async function handler(req, res) {
  try {
    const { accessToken } = await getAccessToken(req, res, {
      scopes: ["openid", "profile", "email"],
    });
    res.json({ accessToken });
  } catch (err) {
    res.status(401).json({ error: "Not authenticated" });
  }
}
