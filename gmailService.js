// ============================================================
// gmailService.js — Gmail API calls
// Tokens always come from Auth0 Token Vault — never stored here
// ============================================================

const axios = require("axios");

const GMAIL_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";

/**
 * Read recent emails from Gmail inbox.
 * @param {string} accessToken - Short-lived token from Token Vault
 * @param {number} count - Number of emails to fetch
 * @param {string} query - Optional Gmail search query
 */
async function readEmails(accessToken, count = 5, query = "") {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // 1. Get list of message IDs
  const listRes = await axios.get(`${GMAIL_BASE}/messages`, {
    headers,
    params: {
      maxResults: Math.min(count, 20),
      q: query || "in:inbox",
    },
  });

  const messages = listRes.data.messages || [];
  if (messages.length === 0) return { emails: [], total: 0 };

  // 2. Fetch each message's details
  const emailDetails = await Promise.all(
    messages.map(async (msg) => {
      const detailRes = await axios.get(`${GMAIL_BASE}/messages/${msg.id}`, {
        headers,
        params: { format: "metadata", metadataHeaders: ["Subject", "From", "Date"] },
      });

      const headers_list = detailRes.data.payload?.headers || [];
      const getHeader = (name) =>
        headers_list.find((h) => h.name === name)?.value || "";

      // Extract plain text snippet
      const snippet = detailRes.data.snippet || "";

      return {
        id: msg.id,
        subject: getHeader("Subject"),
        from: getHeader("From"),
        date: getHeader("Date"),
        snippet: snippet.slice(0, 200),
        threadId: detailRes.data.threadId,
      };
    })
  );

  return { emails: emailDetails, total: emailDetails.length };
}

/**
 * Send an email via Gmail.
 * ⚠️ Only called after CIBA approval from the user.
 */
async function sendEmail(accessToken, to, subject, body, cc = "") {
  const headers = { Authorization: `Bearer ${accessToken}` };

  // Build RFC 2822 email format
  const ccLine = cc ? `Cc: ${cc}\r\n` : "";
  const rawEmail = [
    `To: ${to}`,
    `Subject: ${subject}`,
    ccLine.trim(),
    "Content-Type: text/plain; charset=utf-8",
    "",
    body,
  ]
    .filter(Boolean)
    .join("\r\n");

  // Base64url encode the email
  const encodedEmail = Buffer.from(rawEmail)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  await axios.post(
    `${GMAIL_BASE}/messages/send`,
    { raw: encodedEmail },
    { headers }
  );

  return { success: true, message: `Email sent to ${to}` };
}

module.exports = { readEmails, sendEmail };
