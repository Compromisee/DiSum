const axios = require('axios');

const BASE = 'https://v3.football.api-sports.io';

function headers() {
  return {
    'x-rapidapi-host': 'v3.football.api-sports.io',
    'x-rapidapi-key': process.env.API_FOOTBALL_KEY,
  };
}

/**
 * Get yesterday's + today's soccer fixtures for configured leagues.
 * Default leagues: Premier League (39), La Liga (140), Champions League (2)
 */
async function getSoccerScores() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY not set');

  const leagueIds = (process.env.SOCCER_LEAGUE_IDS || '39,140,2').split(',').map(s => s.trim());
  const season    = process.env.SOCCER_SEASON || new Date().getFullYear().toString();

  // Get yesterday & today
  const dates = [getDateStr(-1), getDateStr(0)];
  const results = [];

  for (const date of dates) {
    for (const leagueId of leagueIds) {
      try {
        const { data } = await axios.get(`${BASE}/fixtures`, {
          headers: headers(),
          params: { league: leagueId, season, date },
        });
        for (const f of data.response || []) {
          const status = f.fixture.status.short;
          const isFinished = ['FT', 'AET', 'PEN'].includes(status);
          const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'].includes(status);
          results.push({
            homeTeam: f.teams.home.name,
            awayTeam: f.teams.away.name,
            homeScore: f.goals.home ?? '-',
            awayScore: f.goals.away ?? '-',
            league: f.league.name,
            status: isFinished ? 'Full Time' : isLive ? '🔴 LIVE' : f.fixture.status.long,
            date,
          });
        }
      } catch (e) {
        console.error(`Soccer scores error for league ${leagueId}:`, e.message);
      }
    }
  }

  return results;
}

/**
 * Get current top scorers for the Premier League (or configured league).
 */
async function getSoccerStats() {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) throw new Error('API_FOOTBALL_KEY not set');

  const leagueId = process.env.SOCCER_STATS_LEAGUE || '39'; // Premier League
  const season   = process.env.SOCCER_SEASON || new Date().getFullYear().toString();

  const { data } = await axios.get(`${BASE}/players/topscorers`, {
    headers: headers(),
    params: { league: leagueId, season },
  });

  return (data.response || []).slice(0, 5).map(p => ({
    name: p.player.name,
    team: p.statistics[0]?.team?.name || '?',
    goals: p.statistics[0]?.goals?.total ?? 0,
  }));
}

function getDateStr(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

module.exports = { getSoccerScores, getSoccerStats };
