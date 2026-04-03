// ============================================================
// githubService.js — GitHub API calls
// Tokens always come from Auth0 Token Vault
// ============================================================

const axios = require("axios");

const GITHUB_BASE = "https://api.github.com";

/**
 * List user's GitHub repositories.
 * @param {string} accessToken - Token from Auth0 Token Vault
 * @param {number} limit - Max repos to return
 */
async function listRepos(accessToken, limit = 10) {
  const response = await axios.get(`${GITHUB_BASE}/user/repos`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
    params: {
      sort: "updated",
      per_page: Math.min(limit, 30),
    },
  });

  const repos = response.data.map((repo) => ({
    name: repo.name,
    fullName: repo.full_name,
    description: repo.description,
    private: repo.private,
    language: repo.language,
    stars: repo.stargazers_count,
    updatedAt: repo.updated_at,
    url: repo.html_url,
    defaultBranch: repo.default_branch,
  }));

  return { repos, count: repos.length };
}

/**
 * Create a Pull Request on GitHub.
 * ⚠️ Only called after CIBA approval from the user.
 * @param {string} accessToken - Token from Auth0 Token Vault
 * @param {object} prData - PR details
 */
async function createPR(accessToken, prData) {
  // First get the authenticated user's login
  const userRes = await axios.get(`${GITHUB_BASE}/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github+json",
    },
  });

  const owner = userRes.data.login;

  const response = await axios.post(
    `${GITHUB_BASE}/repos/${owner}/${prData.repo}/pulls`,
    {
      title: prData.title,
      body: prData.body,
      head: prData.head,
      base: prData.base || "main",
    },
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github+json",
      },
    }
  );

  return {
    success: true,
    prNumber: response.data.number,
    url: response.data.html_url,
    message: `Pull request #${response.data.number} created: ${response.data.html_url}`,
  };
}

module.exports = { listRepos, createPR };
