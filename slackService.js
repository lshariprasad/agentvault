// ============================================================
// slackService.js — Slack API calls
// Tokens always come from Auth0 Token Vault
// ============================================================

const axios = require("axios");

/**
 * Send a message to a Slack channel.
 * ⚠️ Only called after CIBA approval from the user.
 * @param {string} accessToken - Token from Auth0 Token Vault
 * @param {string} channel - Channel name or ID
 * @param {string} message - Message text
 */
async function sendMessage(accessToken, channel, message) {
  const response = await axios.post(
    "https://slack.com/api/chat.postMessage",
    {
      channel: channel.startsWith("#") ? channel : `#${channel}`,
      text: message,
      unfurl_links: false,
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.data.ok) {
    throw new Error(`Slack API error: ${response.data.error}`);
  }

  return {
    success: true,
    ts: response.data.ts,
    channel: response.data.channel,
    message: `Message sent to ${channel}`,
  };
}

/**
 * List available Slack channels.
 * @param {string} accessToken - Token from Auth0 Token Vault
 */
async function listChannels(accessToken) {
  const response = await axios.get(
    "https://slack.com/api/conversations.list",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit: 50, types: "public_channel,private_channel" },
    }
  );

  if (!response.data.ok) {
    throw new Error(`Slack API error: ${response.data.error}`);
  }

  return {
    channels: (response.data.channels || []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      memberCount: ch.num_members,
    })),
  };
}

module.exports = { sendMessage, listChannels };
