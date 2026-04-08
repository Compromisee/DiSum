const { EmbedBuilder } = require('discord.js');
const { createCalendarEvent } = require('./calendar');

/**
 * Multi-step event creation wizard.
 * State is stored in the pendingEvents Map keyed by userId.
 *
 * Steps: name → date → time → duration → reminder → confirm
 */
async function handleEventCreation(message, pendingEvents) {
  const userId  = message.author.id;
  const state   = pendingEvents.get(userId);
  const content = message.content.trim();

  if (content.toLowerCase() === 'cancel') {
    pendingEvents.delete(userId);
    await message.reply('❌ Event creation cancelled.');
    return;
  }

  switch (state.step) {

    // ── Step 1: Event name ──────────────────────────────────
    case 'name': {
      state.name = content;
      state.step = 'date';
      await message.reply(
        embed('📅 Date', `Got it: **${content}**\n\nWhat date? *(e.g. \`2025-07-20\` or \`July 20\`)*`)
      );
      break;
    }

    // ── Step 2: Date ────────────────────────────────────────
    case 'date': {
      const date = parseDate(content);
      if (!date) {
        await message.reply('⚠️ Couldn\'t read that date. Try `2025-07-20` or `July 20 2025`.');
        return;
      }
      state.date = date;
      state.step = 'time';
      await message.reply(
        embed('⏰ Start Time', `Date set to **${date.toDateString()}**\n\nWhat time does it start? *(e.g. \`9:00 AM\` or \`14:30\`)*`)
      );
      break;
    }

    // ── Step 3: Time ────────────────────────────────────────
    case 'time': {
      const time = parseTime(content);
      if (!time) {
        await message.reply('⚠️ Couldn\'t read that time. Try `9:00 AM`, `2:30 PM`, or `14:30`.');
        return;
      }
      state.date.setHours(time.hours, time.minutes, 0, 0);
      state.startTime = new Date(state.date);
      state.step = 'duration';
      await message.reply(
        embed('⏱️ Duration', `Start time: **${formatTime(state.startTime)}**\n\nHow long is the event? *(e.g. \`1 hour\`, \`90 minutes\`, \`2 hours 30 min\`)*\nOr type \`skip\` for 1 hour default.`)
      );
      break;
    }

    // ── Step 4: Duration ────────────────────────────────────
    case 'duration': {
      let minutes = 60;
      if (content.toLowerCase() !== 'skip') {
        minutes = parseDuration(content);
        if (!minutes) {
          await message.reply('⚠️ Couldn\'t read duration. Try `1 hour`, `90 minutes`, or `skip`.');
          return;
        }
      }
      state.endTime = new Date(state.startTime.getTime() + minutes * 60 * 1000);
      state.step = 'reminder';
      await message.reply(
        embed('🔔 Reminder', `Duration: **${minutes} min**\n\nHow many minutes before should I remind you?\n*(e.g. \`15\`, \`30\`, \`60\`)* — or \`skip\` for 30 min default.`)
      );
      break;
    }

    // ── Step 5: Reminder ────────────────────────────────────
    case 'reminder': {
      let mins = 30;
      if (content.toLowerCase() !== 'skip') {
        mins = parseInt(content.replace(/[^0-9]/g, ''), 10);
        if (isNaN(mins) || mins < 0) {
          await message.reply('⚠️ Enter a number like `30`, or `skip`.');
          return;
        }
      }
      state.reminderMinutes = mins;
      state.step = 'confirm';

      await message.reply({
        embeds: [
          new EmbedBuilder()
            .setColor('#FBBF24')
            .setTitle('✅ Confirm Event')
            .setDescription('Does this look right?')
            .addFields(
              { name: '📌 Event', value: state.name, inline: false },
              { name: '📅 Date', value: state.startTime.toDateString(), inline: true },
              { name: '⏰ Time', value: formatTime(state.startTime), inline: true },
              { name: '⏱️ End', value: formatTime(state.endTime), inline: true },
              { name: '🔔 Reminder', value: `${state.reminderMinutes} min before`, inline: true },
            )
            .setFooter({ text: 'Type "yes" to save, or "no" to cancel.' })
        ]
      });
      break;
    }

    // ── Step 6: Confirm ─────────────────────────────────────
    case 'confirm': {
      if (content.toLowerCase().startsWith('y')) {
        try {
          await createCalendarEvent({
            summary: state.name,
            startTime: state.startTime,
            endTime: state.endTime,
            reminderMinutes: state.reminderMinutes,
          });
          pendingEvents.delete(userId);
          await message.reply({
            embeds: [
              new EmbedBuilder()
                .setColor('#57F287')
                .setTitle('🎉 Event Created!')
                .setDescription(`**${state.name}** has been added to your Google Calendar.\nYou'll be reminded ${state.reminderMinutes} minutes before.`)
            ]
          });
        } catch (err) {
          await message.reply(`❌ Failed to create event: \`${err.message}\``);
          pendingEvents.delete(userId);
        }
      } else {
        pendingEvents.delete(userId);
        await message.reply('❌ Event cancelled. Type `!addevent` to start over.');
      }
      break;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────

function embed(title, desc) {
  return {
    embeds: [
      new EmbedBuilder().setColor('#5865F2').setTitle(title).setDescription(desc)
    ]
  };
}

function parseDate(str) {
  const d = new Date(str);
  if (!isNaN(d)) return d;

  // Handle "July 20", "Jul 20 2025" etc.
  const monthNames = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const lower = str.toLowerCase();
  for (let i = 0; i < monthNames.length; i++) {
    if (lower.includes(monthNames[i])) {
      const nums = str.match(/\d+/g) || [];
      const day  = parseInt(nums[0]);
      const year = nums[1] ? parseInt(nums[1]) : new Date().getFullYear();
      if (day) return new Date(year, i, day);
    }
  }
  return null;
}

function parseTime(str) {
  // 14:30, 2:30 PM, 9am, 9:00am
  const m = str.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hours = parseInt(m[1]);
  const minutes = parseInt(m[2] || '0');
  const ampm = (m[3] || '').toLowerCase();
  if (ampm === 'pm' && hours < 12) hours += 12;
  if (ampm === 'am' && hours === 12) hours = 0;
  if (hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function parseDuration(str) {
  let total = 0;
  const hourMatch = str.match(/(\d+)\s*h/i);
  const minMatch  = str.match(/(\d+)\s*m/i);
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch)  total += parseInt(minMatch[1]);
  // plain number = minutes
  if (!hourMatch && !minMatch) {
    const n = parseInt(str);
    if (!isNaN(n)) total = n;
  }
  return total > 0 ? total : null;
}

function formatTime(date) {
  return date.toLocaleTimeString('en-CA', {
    hour: '2-digit', minute: '2-digit',
    timeZone: process.env.TIMEZONE || 'America/Toronto',
  });
}

module.exports = { handleEventCreation };
