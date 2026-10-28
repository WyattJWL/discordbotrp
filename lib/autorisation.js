'use strict';

// Chef Suprême, Sous-Chef, Lieutenant
const ROLES_STAFF = new Set([
  '1564749117585104969',
  '1564749119749361754',
  '1564749121611497672'
]);

// Chef Suprême, Sous-Chef, Lieutenant, Soldat, Recrue
const ROLES_GANG = new Set([
  '1564749117585104969',
  '1564749119749361754',
  '1564749121611497672',
  '1564749123410731198',
  '1564749126980341790'
]);

async function obtenirRolesMembre(userId) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
  });
  if (!res.ok) return null;
  const membre = await res.json();
  return membre.roles || [];
}

async function estStaff(userId) {
  const roles = await obtenirRolesMembre(userId);
  if (!roles) return false;
  return roles.some((r) => ROLES_STAFF.has(r));
}

async function estMembreGang(userId) {
  const roles = await obtenirRolesMembre(userId);
  if (!roles) return false;
  return roles.some((r) => ROLES_GANG.has(r));
}

module.exports = { estStaff, estMembreGang, obtenirRolesMembre, ROLES_STAFF, ROLES_GANG };
