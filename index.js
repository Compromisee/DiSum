require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const cron = require('node-cron');
const { getMorningDigest } = require('./services/digest');
const { handleEventCreation } = require('./services/eventHandler');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
});

// Track users in event creation flow
const pendingEvents = new Map();

client.once('ready', () => {
  console.log(`✅ Bot is online as ${client.user.tag}`);

  // Schedule morning digest — every day at 8:00 AM (uses server local time)
  // Change '0 8 * * *' to adjust the time. Format: 'minute hour * * *'
  cron.schedule(process.env.MORNING_CRON || '0 8 * * *', async () => {
    console.log('⏰ Sending morning digest...');
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (!channel) return console.error('Channel not found. Check DISCORD_CHANNEL_ID.');

    try {
      const embeds = await getMorningDigest();
      for (const embed of embeds) {
        await channel.send({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 800)); // slight delay between embeds
      }
    } catch (err) {
      console.error('Morning digest error:', err.message);
    }
  }, { timezone: process.env.TIMEZONE || 'America/Toronto' });

  console.log(`📅 Morning digest scheduled: ${process.env.MORNING_CRON || '0 8 * * *'} (${process.env.TIMEZONE || 'America/Toronto'})`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;

  const content = message.content.trim().toLowerCase();

  // ── Commands ──────────────────────────────────────────────

  // !digest — trigger morning digest on demand
  if (content === '!digest') {
    await message.reply('📬 Fetching your morning digest...');
    try {
      const embeds = await getMorningDigest();
      for (const embed of embeds) {
        await message.channel.send({ embeds: [embed] });
        await new Promise(r => setTimeout(r, 800));
      }
    } catch (err) {
      await message.reply(`❌ Error: ${err.message}`);
    }
    return;
  }

  // !addevent — start event creation wizard
  if (content === '!addevent') {
    pendingEvents.set(message.author.id, { step: 'name' });
    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setTitle('📅 New Calendar Event')
      .setDescription('Let\'s create a new event! What should it be called?\n\n*(Type `cancel` at any time to stop)*');
    await message.reply({ embeds: [embed] });
    return;
  }

  // !help — show available commands
  if (content === '!help') {
    const embed = new EmbedBuilder()
      .setColor('#57F287')
      .setTitle('🤖 Bot Commands')
      .addFields(
        { name: '`!digest`', value: 'Get your morning digest right now', inline: false },
        { name: '`!addevent`', value: 'Add an event to Google Calendar', inline: false },
        { name: '`!help`', value: 'Show this help message', inline: false },
      )
      .setFooter({ text: 'Daily digest is sent automatically every morning ☀️' });
    await message.reply({ embeds: [embed] });
    return;
  }

  // ── Event creation wizard ────────────────────────────────
  if (pendingEvents.has(message.author.id)) {
    await handleEventCreation(message, pendingEvents);
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
