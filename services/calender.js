const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '..', 'google-credentials.json');
const TOKEN_PATH = path.join(__dirname, '..', 'google-token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

function getOAuth2Client() {
  if (!fs.existsSync(CREDENTIALS_PATH)) {
    throw new Error('google-credentials.json not found. See README for setup.');
  }
  const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
  const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
  return new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
}

function getAuthorizedClient() {
  const oAuth2Client = getOAuth2Client();
  if (!fs.existsSync(TOKEN_PATH)) {
    throw new Error('Google not authorized yet. Run `node setup-google.js` first.');
  }
  const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8'));
  oAuth2Client.setCredentials(token);
  return oAuth2Client;
}

/**
 * Returns today's calendar events as an array of { time, summary } objects.
 */
async function getCalendarEvents() {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const tz = process.env.TIMEZONE || 'America/Toronto';

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map(ev => {
    const start = ev.start.dateTime || ev.start.date;
    let time = 'All day';
    if (ev.start.dateTime) {
      time = new Date(start).toLocaleTimeString('en-CA', {
        hour: '2-digit', minute: '2-digit', timeZone: tz,
      });
    }
    return { time, summary: ev.summary || '(No title)' };
  });
}

/**
 * Creates a new event on the user's primary calendar.
 * @param {Object} params
 * @param {string} params.summary    - Event name
 * @param {Date}   params.startTime  - Start datetime
 * @param {Date}   params.endTime    - End datetime (defaults to 1hr after start)
 * @param {number} params.reminderMinutes - Minutes before to notify
 */
async function createCalendarEvent({ summary, startTime, endTime, reminderMinutes = 30 }) {
  const auth = getAuthorizedClient();
  const calendar = google.calendar({ version: 'v3', auth });

  if (!endTime) {
    endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour default
  }

  const event = {
    summary,
    start: { dateTime: startTime.toISOString(), timeZone: process.env.TIMEZONE || 'America/Toronto' },
    end: { dateTime: endTime.toISOString(), timeZone: process.env.TIMEZONE || 'America/Toronto' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMinutes },
        { method: 'email', minutes: reminderMinutes },
      ],
    },
  };

  const res = await calendar.events.insert({ calendarId: 'primary', resource: event });
  return res.data;
}

module.exports = { getCalendarEvents, createCalendarEvent };
