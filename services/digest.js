const { getWeather } = require('./weather');
const { getNews } = require('./news');
const { getSoccerScores, getSoccerStats } = require('./soccer');
const { getCalendarEvents } = require('./calendar');
const { EmbedBuilder } = require('discord.js');

/**
 * Builds an array of Discord embeds for the morning digest.
 * Each section is its own embed so it stays readable.
 */
async function getMorningDigest() {
  const embeds = [];
  const today = new Date().toLocaleDateString('en-CA', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    timeZone: process.env.TIMEZONE || 'America/Toronto',
  });

  // ── Header ─────────────────────────────────────────────────
  embeds.push(
    new EmbedBuilder()
      .setColor('#FEE75C')
      .setTitle(`☀️  Good Morning! — ${today}`)
      .setDescription('Here\'s your daily briefing. Have a great day! 🎯')
      .setTimestamp()
  );

  // ── Weather ────────────────────────────────────────────────
  try {
    const weather = await getWeather();
    const e = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle(`🌤️  Weather — ${weather.city}`)
      .setDescription(weather.summary)
      .addFields(
        { name: '🌡️ Temp', value: `${weather.temp}°C (feels ${weather.feelsLike}°C)`, inline: true },
        { name: '💧 Humidity', value: `${weather.humidity}%`, inline: true },
        { name: '💨 Wind', value: `${weather.wind} km/h`, inline: true },
        { name: '☁️ Conditions', value: weather.description, inline: true },
        { name: '🌅 Sunrise', value: weather.sunrise, inline: true },
        { name: '🌇 Sunset', value: weather.sunset, inline: true },
      );
    embeds.push(e);
  } catch (err) {
    embeds.push(errorEmbed('🌤️ Weather', err.message));
  }

  // ── Top News ───────────────────────────────────────────────
  try {
    const articles = await getNews();
    const lines = articles.slice(0, 5).map((a, i) => `**${i + 1}.** [${a.title}](${a.url})\n*${a.source}*`).join('\n\n');
    embeds.push(
      new EmbedBuilder()
        .setColor('#ED4245')
        .setTitle('📰  Top News Headlines')
        .setDescription(lines || 'No headlines found.')
    );
  } catch (err) {
    embeds.push(errorEmbed('📰 News', err.message));
  }

  // ── Soccer Scores ──────────────────────────────────────────
  try {
    const scores = await getSoccerScores();
    if (scores.length === 0) {
      embeds.push(
        new EmbedBuilder().setColor('#57F287').setTitle('⚽  Soccer Scores').setDescription('No matches in the last 24 hours.')
      );
    } else {
      const lines = scores.map(m =>
        `**${m.homeTeam}** ${m.homeScore} — ${m.awayScore} **${m.awayTeam}**\n*${m.league} · ${m.status}*`
      ).join('\n\n');
      embeds.push(
        new EmbedBuilder()
          .setColor('#57F287')
          .setTitle('⚽  Soccer Scores')
          .setDescription(lines)
      );
    }
  } catch (err) {
    embeds.push(errorEmbed('⚽ Soccer', err.message));
  }

  // ── Soccer Stats (top scorers) ─────────────────────────────
  try {
    const stats = await getSoccerStats();
    if (stats.length > 0) {
      const lines = stats.map((p, i) => `**${i + 1}.** ${p.name} *(${p.team})* — ${p.goals} goals`).join('\n');
      embeds.push(
        new EmbedBuilder()
          .setColor('#EB459E')
          .setTitle('📊  Premier League Top Scorers')
          .setDescription(lines)
      );
    }
  } catch (err) {
    embeds.push(errorEmbed('📊 Soccer Stats', err.message));
  }

  // ── Google Calendar ────────────────────────────────────────
  try {
    const events = await getCalendarEvents();
    const e = new EmbedBuilder().setColor('#FBBF24').setTitle('📅  Today\'s Calendar');
    if (events.length === 0) {
      e.setDescription('Nothing on the calendar today. Enjoy the free time! 🎉');
    } else {
      e.setDescription(events.map(ev => `⏰ **${ev.time}** — ${ev.summary}`).join('\n'));
    }
    embeds.push(e);
  } catch (err) {
    embeds.push(errorEmbed('📅 Calendar', err.message));
  }

  return embeds;
}

function errorEmbed(title, msg) {
  return new EmbedBuilder()
    .setColor('#FF0000')
    .setTitle(title)
    .setDescription(`⚠️ Could not load: \`${msg}\``);
}

module.exports = { getMorningDigest };
