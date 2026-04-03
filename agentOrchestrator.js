// ============================================================
// agentOrchestrator.js — Claude AI Agent with Tool Use
//
// This is the brain of AgentVault. It:
//   1. Takes the user's natural language message
//   2. Sends it to Claude claude-sonnet-4-20250514 with tool definitions
//   3. Claude decides which tools to call (Gmail, Calendar, GitHub, Slack)
//   4. We execute the tools using Auth0 Token Vault tokens
//   5. Results go back to Claude for a final natural language response
//
// High-risk tools (send_email, merge_pr) trigger CIBA
// step-up authentication before execution.
// ============================================================

const Anthropic = require("@anthropic-ai/sdk");
const { getToken, TokenVaultError } = require("./tokenVault");
const gmailService = require("./gmailService");
const calendarService = require("./calendarService");
const githubService = require("./githubService");
const slackService = require("./slackService");

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Tool Definitions ─────────────────────────────────────────
// These are sent to Claude so it knows what capabilities exist.
// Claude will autonomously decide which to call based on user input.

const AGENT_TOOLS = [
  {
    name: "read_emails",
    description:
      "Read recent emails from the user's Gmail inbox. Use this when the user asks to see, summarize, or check their emails.",
    input_schema: {
      type: "object",
      properties: {
        count: {
          type: "number",
          description: "Number of recent emails to fetch (default: 5, max: 20)",
        },
        query: {
          type: "string",
          description:
            'Optional Gmail search query. e.g. "is:unread", "from:boss@company.com"',
        },
      },
      required: [],
    },
  },
  {
    name: "send_email",
    description:
      "Send an email on behalf of the user. ⚠️ HIGH RISK — requires explicit user CIBA approval before sending.",
    input_schema: {
      type: "object",
      properties: {
        to: { type: "string", description: "Recipient email address" },
        subject: { type: "string", description: "Email subject line" },
        body: {
          type: "string",
          description: "Email body in plain text or HTML",
        },
        cc: {
          type: "string",
          description: "Optional CC email addresses (comma separated)",
        },
      },
      required: ["to", "subject", "body"],
    },
  },
  {
    name: "get_calendar_events",
    description:
      "Get upcoming calendar events from Google Calendar. Use when user asks about their schedule, meetings, or appointments.",
    input_schema: {
      type: "object",
      properties: {
        days_ahead: {
          type: "number",
          description: "How many days ahead to look (default: 7)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_calendar_event",
    description: "Create a new event in the user's Google Calendar.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Event title" },
        start_time: {
          type: "string",
          description: "Start time in ISO 8601 format",
        },
        end_time: {
          type: "string",
          description: "End time in ISO 8601 format",
        },
        description: {
          type: "string",
          description: "Optional event description",
        },
        attendees: {
          type: "array",
          items: { type: "string" },
          description: "Optional list of attendee email addresses",
        },
      },
      required: ["title", "start_time", "end_time"],
    },
  },
  {
    name: "list_github_repos",
    description:
      "List the user's GitHub repositories. Use when they ask about their projects or repos.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Max repos to return (default: 10)",
        },
      },
      required: [],
    },
  },
  {
    name: "create_github_pr",
    description:
      "Create a GitHub pull request. ⚠️ HIGH RISK — requires explicit user CIBA approval.",
    input_schema: {
      type: "object",
      properties: {
        repo: {
          type: "string",
          description: "Repository name (e.g. 'agentvault')",
        },
        title: { type: "string", description: "PR title" },
        body: { type: "string", description: "PR description" },
        head: {
          type: "string",
          description: "Source branch name",
        },
        base: {
          type: "string",
          description: "Target branch (default: 'main')",
        },
      },
      required: ["repo", "title", "body", "head"],
    },
  },
  {
    name: "send_slack_message",
    description:
      "Send a Slack message to a channel. ⚠️ HIGH RISK — requires CIBA approval.",
    input_schema: {
      type: "object",
      properties: {
        channel: {
          type: "string",
          description: "Channel name or ID (e.g. '#engineering')",
        },
        message: { type: "string", description: "Message text" },
      },
      required: ["channel", "message"],
    },
  },
];

// Tools that require CIBA (human-in-the-loop) approval
const HIGH_RISK_TOOLS = new Set([
  "send_email",
  "create_github_pr",
  "send_slack_message",
]);

// ── Main Agent Function ──────────────────────────────────────

/**
 * Run the AI agent with a user message.
 *
 * @param {string} userMessage - Natural language user input
 * @param {string} userId - Auth0 user ID for Token Vault lookups
 * @param {Array} conversationHistory - Previous messages for context
 * @returns {Promise<{response: string, toolsUsed: string[], requiresCIBA: object|null}>}
 */
async function runAgent(userMessage, userId, conversationHistory = []) {
  const messages = [
    ...conversationHistory,
    { role: "user", content: userMessage },
  ];

  let toolsUsed = [];
  let cibaRequired = null;

  // ── First Claude call: decide what tools to use ──────────
  const firstResponse = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: `You are AgentVault, a secure personal AI Chief of Staff. You help users manage their Gmail, Google Calendar, GitHub, and Slack through a secure system powered by Auth0 Token Vault.

Key behaviors:
- Be concise and action-oriented
- For HIGH RISK tools (send_email, create_github_pr, send_slack_message), always warn the user that CIBA approval will be requested
- If a user asks you to do something you can't (e.g. service not connected), explain clearly
- Never make up information — only report what you actually retrieve from tools
- Current date: ${new Date().toISOString()}`,
    tools: AGENT_TOOLS,
    messages,
  });

  // If Claude wants to use tools
  if (firstResponse.stop_reason === "tool_use") {
    const toolUseBlocks = firstResponse.content.filter(
      (block) => block.type === "tool_use"
    );

    // Check if any tool is high-risk — if so, return CIBA prompt
    for (const toolUse of toolUseBlocks) {
      if (HIGH_RISK_TOOLS.has(toolUse.name)) {
        cibaRequired = {
          toolName: toolUse.name,
          toolInput: toolUse.input,
          message: `AgentVault wants to execute "${toolUse.name}" on your behalf. Please approve this action.`,
        };
        return {
          response: `⚠️ **Action requires your approval**\n\nI want to **${toolUse.name.replace(/_/g, " ")}** with the following details:\n\n${JSON.stringify(toolUse.input, null, 2)}\n\nI've sent an approval request via Auth0. Please check your Auth0 Guardian app to approve or deny this action.`,
          toolsUsed: [toolUse.name],
          requiresCIBA: cibaRequired,
        };
      }
    }

    // Execute all non-high-risk tools
    const toolResults = [];

    for (const toolUse of toolUseBlocks) {
      toolsUsed.push(toolUse.name);
      console.log(`[Agent] 🔧 Executing tool: ${toolUse.name}`);

      try {
        const result = await executeTool(toolUse.name, toolUse.input, userId);
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        // Handle TokenVaultError gracefully
        let errorMessage = err.message;
        if (err instanceof TokenVaultError && err.code === "NOT_CONNECTED") {
          errorMessage = `The service "${err.connection}" is not connected. Please go to your dashboard and connect it first.`;
        }

        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${errorMessage}`,
          is_error: true,
        });
      }
    }

    // ── Second Claude call: synthesize tool results ──────────
    const finalResponse = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: `You are AgentVault, a secure personal AI Chief of Staff. Synthesize the tool results into a helpful, concise response for the user.`,
      tools: AGENT_TOOLS,
      messages: [
        ...messages,
        { role: "assistant", content: firstResponse.content },
        { role: "user", content: toolResults },
      ],
    });

    const textContent = finalResponse.content.find(
      (block) => block.type === "text"
    );

    return {
      response: textContent?.text || "Done!",
      toolsUsed,
      requiresCIBA: null,
    };
  }

  // Claude answered directly without tools
  const textContent = firstResponse.content.find(
    (block) => block.type === "text"
  );
  return {
    response: textContent?.text || "I couldn't process that request.",
    toolsUsed: [],
    requiresCIBA: null,
  };
}

// ── Tool Executor ────────────────────────────────────────────

/**
 * Execute a named tool using the appropriate service + Token Vault token.
 */
async function executeTool(toolName, toolInput, userId) {
  switch (toolName) {
    case "read_emails": {
      const token = await getToken("google-oauth2", userId, [
        "https://www.googleapis.com/auth/gmail.readonly",
      ]);
      return gmailService.readEmails(token, toolInput.count || 5, toolInput.query);
    }

    case "send_email": {
      // Token already validated by CIBA flow before reaching here
      const token = await getToken("google-oauth2", userId, [
        "https://www.googleapis.com/auth/gmail.send",
      ]);
      return gmailService.sendEmail(
        token,
        toolInput.to,
        toolInput.subject,
        toolInput.body,
        toolInput.cc
      );
    }

    case "get_calendar_events": {
      const token = await getToken("google-oauth2", userId, [
        "https://www.googleapis.com/auth/calendar.events.readonly",
      ]);
      return calendarService.getEvents(token, toolInput.days_ahead || 7);
    }

    case "create_calendar_event": {
      const token = await getToken("google-oauth2", userId, [
        "https://www.googleapis.com/auth/calendar.events",
      ]);
      return calendarService.createEvent(token, toolInput);
    }

    case "list_github_repos": {
      const token = await getToken("github", userId, ["repo", "read:user"]);
      return githubService.listRepos(token, toolInput.limit || 10);
    }

    case "create_github_pr": {
      const token = await getToken("github", userId, ["repo"]);
      return githubService.createPR(token, toolInput);
    }

    case "send_slack_message": {
      const token = await getToken("slack", userId, ["chat:write"]);
      return slackService.sendMessage(
        token,
        toolInput.channel,
        toolInput.message
      );
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

module.exports = { runAgent };
