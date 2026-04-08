# ☀️ Discord Morning Bot

A Discord bot that sends a daily morning digest with **weather, top news, soccer scores & stats, and your Google Calendar events** — plus a command to add calendar events on-the-fly.

---

## 📦 Features

| Feature | Command / Trigger |
|---|---|
| ☀️ Morning digest (auto) | Sent every morning at 8 AM |
| 📬 Trigger digest manually | `!digest` |
| 📅 Add a Google Calendar event | `!addevent` |
| ❓ Help | `!help` |

### What's in the morning digest
- 🌤️ **Weather** — temperature, feels like, humidity, wind, sunrise/sunset
- 📰 **Top Headlines** — 5 news articles with links
- ⚽ **Soccer Scores** — yesterday's & today's results across your leagues
- 📊 **Top Scorers** — current Premier League (or your league) goal leaders
- 📅 **Google Calendar** — all of today's events

---

## 🚀 Setup

### 1. Prerequisites
- [Node.js](https://nodejs.org/) 18+
- A Discord account

### 2. Clone & Install
```bash
git clone <your-repo>
cd discord-morning-bot
npm install
```

### 3. Create a Discord Bot
1. Go to [discord.com/developers/applications](https://discord.com/developers/applications)
2. **New Application** → give it a name
3. Go to **Bot** → click **Reset Token** → copy the token
4. Under **Privileged Gateway Intents**, enable:
   - ✅ Message Content Intent
5. Go to **OAuth2 → URL Generator**:
   - Scopes: `bot`
   - Bot Permissions: `Send Messages`, `Read Messages/View Channels`, `Embed Links`
6. Copy the generated URL → open it → add the bot to your server
7. Enable **Developer Mode** in Discord settings → right-click your channel → **Copy ID**

### 4. Get API Keys

| Service | Free Tier | Link |
|---|---|---|
| Discord | Free | [discord.com/developers](https://discord.com/developers/applications) |
| OpenWeatherMap | 1000 calls/day | [openweathermap.org/api](https://openweathermap.org/api) |
| NewsAPI | 500 calls/day | [newsapi.org/register](https://newsapi.org/register) |
| API-Football | 100 calls/day | [rapidapi.com](https://rapidapi.com/api-sports/api/api-football) |

### 5. Configure Environment
```bash
cp .env.example .env
# Edit .env with your keys
```

### 6. Set Up Google Calendar (one-time)
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable the **Google Calendar API**
4. Go to **Credentials → Create Credentials → OAuth 2.0 Client ID**
   - Application type: **Desktop app**
5. Download the JSON file → save it as `google-credentials.json` in the project root
6. Run the authorization script:
   ```bash
   npm run setup-google
   ```
   Follow the prompts — a `google-token.json` will be saved (keep this private!)

### 7. Run the Bot
```bash
npm start
```

---

## ⚙️ Customization

### Change the morning time
In `.env`:
```
MORNING_CRON=0 7 * * *   # 7:00 AM
MORNING_CRON=30 8 * * *  # 8:30 AM
```
Cron format: `minute hour * * *`

### Change leagues
```
SOCCER_LEAGUE_IDS=39,140,2,78
```
Common IDs: 39=EPL, 140=La Liga, 2=UCL, 78=Bundesliga, 135=Serie A, 61=Ligue 1

### Change news country/category
```
NEWS_COUNTRY=us       # us, ca, gb, au, etc.
NEWS_CATEGORY=sports  # general, sports, technology, business
```

---

## 🔁 Running 24/7
Use [PM2](https://pm2.keymetrics.io/) to keep the bot running:
```bash
npm install -g pm2
pm2 start index.js --name morning-bot
pm2 save
pm2 startup
```
Or deploy to a free cloud service like [Railway](https://railway.app) or [Render](https://render.com).

---

## 🗂️ Project Structure
```
discord-morning-bot/
├── index.js              # Bot entry point & command handler
├── setup-google.js       # One-time Google OAuth setup
├── .env                  # Your secrets (never commit!)
├── .env.example          # Template
├── google-credentials.json  # Google OAuth credentials (never commit!)
├── google-token.json     # Google access token (auto-generated)
└── services/
    ├── digest.js         # Assembles all embeds for the morning digest
    ├── weather.js        # OpenWeatherMap API
    ├── news.js           # NewsAPI
    ├── soccer.js         # API-Football scores & stats
    ├── calendar.js       # Google Calendar read + create
    └── eventHandler.js   # !addevent wizard logic
```

---

## 🔒 Security
- **Never commit** `.env`, `google-credentials.json`, or `google-token.json`
- Add them to `.gitignore`
