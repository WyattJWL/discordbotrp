'use strict';

// Chef Suprême, Sous-Chef, Lieutenant
const ROLES_AUTORISES = new Set([
  '1564749117585104969',
  '1564749119749361754',
  '1564749121611497672'
]);

async function estAutorise(userId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
  });
  if (!res.ok) return false;

  const membre = await res.json();
  return (membre.roles || []).some((r) => ROLES_AUTORISES.has(r));
}

module.exports = { estAutorise, ROLES_AUTORISES };
