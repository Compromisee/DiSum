/**
 * Run this ONCE to authorize your Google account:
 *   node setup-google.js
 *
 * It will print an authorization URL. Open it in your browser,
 * approve access, then paste the code back here.
 * A google-token.json file will be saved for future use.
 */

require('dotenv').config();
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const CREDENTIALS_PATH = path.join(__dirname, 'google-credentials.json');
const TOKEN_PATH = path.join(__dirname, 'google-token.json');
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

if (!fs.existsSync(CREDENTIALS_PATH)) {
  console.error('❌  google-credentials.json not found!');
  console.error('   Download it from https://console.cloud.google.com → Credentials → OAuth 2.0 Client IDs');
  process.exit(1);
}

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH, 'utf8'));
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const authUrl = oAuth2Client.generateAuthUrl({ access_type: 'offline', scope: SCOPES });

console.log('\n🔗 Open this URL in your browser:\n');
console.log(authUrl);
console.log('');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('📋 Paste the authorization code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oAuth2Client.getToken(code.trim());
    oAuth2Client.setCredentials(tokens);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('\n✅  google-token.json saved! Google Calendar is now authorized.');
    console.log('   You can now run the bot with: node index.js\n');
  } catch (err) {
    console.error('❌  Error getting token:', err.message);
  }
});
