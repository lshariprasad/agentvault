// ============================================================
// calendarService.js — Google Calendar API calls
// Tokens always come from Auth0 Token Vault
// ============================================================

const axios = require("axios");

const CALENDAR_BASE = "https://www.googleapis.com/calendar/v3";



/**
 * Get upcoming calendar events.
 * @param {string} accessToken - Token from Auth0 Token Vault
 * @param {number} daysAhead - How many days to look ahead
 */
async function getEvents(accessToken, daysAhead = 7) {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);

  const response = await axios.get(`${CALENDAR_BASE}/calendars/primary/events`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      timeMin: now.toISOString(),
      timeMax: future.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 20,
    },
  });

  const events = (response.data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || "(No title)",
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || "",
    description: event.description || "",
    attendees: (event.attendees || []).map((a) => a.email),
    meetLink: event.hangoutLink || "",
  }));

  return { events, count: events.length, daysAhead };
}

/**
 * Create a new calendar event.
 * @param {string} accessToken - Token from Auth0 Token Vault
 * @param {object} eventData - Event details
 */
async function createEvent(accessToken, eventData) {
  const event = {
    summary: eventData.title,
    start: { dateTime: eventData.start_time, timeZone: "UTC" },
    end: { dateTime: eventData.end_time, timeZone: "UTC" },
    description: eventData.description || "",
    attendees: (eventData.attendees || []).map((email) => ({ email })),
  };

  const response = await axios.post(
    `${CALENDAR_BASE}/calendars/primary/events`,
    event,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  return {
    success: true,
    eventId: response.data.id,
    htmlLink: response.data.htmlLink,
    message: `Event "${eventData.title}" created successfully`,
  };
}

module.exports = { getEvents, createEvent };
