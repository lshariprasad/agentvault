// ============================================================
// tokenVault.js — Auth0 Token Vault Integration
//
// This is the CORE of AgentVault's security model.
// Instead of storing OAuth tokens in our database,
// we delegate ALL token management to Auth0 Token Vault.
//
// Auth0 handles:
//   - OAuth consent flows
//   - Token storage (encrypted)

//   - Token refresh
//   - Token revocation
//
// We just call getToken(connection, userId) and get a
// fresh, valid, short-lived access token. Zero credential
// storage on our end.
// ============================================================

const axios = require("axios");

/**
 * Get a valid OAuth access token for a given user + service
 * from Auth0 Token Vault.
 *
 * @param {string} connection - The Auth0 connection name
 *   e.g. "google-oauth2", "github", "slack"
 * @param {string} userId - The Auth0 user ID (sub claim)
 * @param {string[]} scopes - Required OAuth scopes
 * @returns {Promise<string>} - A valid access token
 * @throws {TokenVaultError} - If token unavailable or user hasn't connected
 */
async function getToken(connection, userId, scopes = []) {
  try {
    // Get a management API token first (machine-to-machine)
    const mgmtToken = await getManagementToken();

    // Request a Token Vault token for this user + connection
    const response = await axios.post(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/token-vault/${connection}`,
      { scopes },
      {
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data?.access_token) {
      throw new TokenVaultError(
        `No token returned for connection: ${connection}`,
        "NO_TOKEN",
        connection
      );
    }

    console.log(`[TokenVault] ✅ Got token for ${connection} (user: ${userId.slice(0, 15)}...)`);
    return response.data.access_token;
  } catch (err) {
    // If user hasn't connected this service yet
    if (err.response?.status === 404) {
      throw new TokenVaultError(
        `User hasn't connected ${connection} yet. Please connect it in your dashboard.`,
        "NOT_CONNECTED",
        connection
      );
    }

    // Re-throw our custom errors
    if (err instanceof TokenVaultError) throw err;

    // Wrap unexpected errors
    throw new TokenVaultError(
      `Token Vault error for ${connection}: ${err.message}`,
      "VAULT_ERROR",
      connection
    );
  }
}

/**
 * Check which services the user has connected in Token Vault
 *
 * @param {string} userId - Auth0 user ID
 * @returns {Promise<string[]>} - Array of connected connection names
 */
async function getConnectedServices(userId) {
  try {
    const mgmtToken = await getManagementToken();

    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}/token-vault`,
      {
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
        },
      }
    );

    // Return list of connected service names
    return (response.data || []).map((conn) => conn.connection);
  } catch (err) {
    console.error("[TokenVault] Error fetching connected services:", err.message);
    return [];
  }
}

/**
 * Get an Auth0 Management API token (machine-to-machine)
 * Cached for 23 hours to avoid rate limits.
 */
let _mgmtTokenCache = null;
let _mgmtTokenExpiry = 0;

async function getManagementToken() {
  // Return cached token if still valid
  if (_mgmtTokenCache && Date.now() < _mgmtTokenExpiry) {
    return _mgmtTokenCache;
  }

  const response = await axios.post(
    `https://${process.env.AUTH0_DOMAIN}/oauth/token`,
    {
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: "client_credentials",
    },
    { headers: { "Content-Type": "application/json" } }
  );

  _mgmtTokenCache = response.data.access_token;
  // Cache for 23 hours (tokens last 24h)
  _mgmtTokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  console.log("[TokenVault] 🔑 Management token refreshed");
  return _mgmtTokenCache;
}

/**
 * Custom error class for Token Vault failures.
 * The agent orchestrator catches these and returns
 * helpful messages to the user instead of crashing.
 */
class TokenVaultError extends Error {
  constructor(message, code, connection) {
    super(message);
    this.name = "TokenVaultError";
    this.code = code;           // "NOT_CONNECTED" | "NO_TOKEN" | "VAULT_ERROR"
    this.connection = connection; // Which service failed
  }
}

module.exports = {
  getToken,
  getConnectedServices,
  TokenVaultError,
};
