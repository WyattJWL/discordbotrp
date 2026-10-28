'use strict';

const API = 'https://discord.com/api/v10';

function headers() {
  return {
    Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
    'Content-Type': 'application/json'
  };
}

async function envoyerDM(userId, payload) {
  const canalRes = await fetch(`${API}/users/@me/channels`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ recipient_id: userId })
  });
  if (!canalRes.ok) throw new Error(`Impossible d'ouvrir le DM (${canalRes.status})`);
  const canal = await canalRes.json();
  return envoyerMessageSalon(canal.id, payload);
}

async function envoyerMessageSalon(channelId, payload) {
  const res = await fetch(`${API}/channels/${channelId}/messages`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error(`Impossible d'envoyer le message (${res.status})`);
  return res.json();
}

async function obtenirMembre(guildId, userId) {
  const res = await fetch(`${API}/guilds/${guildId}/members/${userId}`, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

async function obtenirUtilisateur(userId) {
  const res = await fetch(`${API}/users/${userId}`, { headers: headers() });
  if (!res.ok) return null;
  return res.json();
}

async function ajouterRole(guildId, userId, roleId) {
  const res = await fetch(`${API}/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: 'PUT',
    headers: headers()
  });
  if (!res.ok && res.status !== 204) {
    throw new Error(`Impossible d'ajouter le rôle (${res.status})`);
  }
}

module.exports = { envoyerDM, envoyerMessageSalon, obtenirMembre, obtenirUtilisateur, ajouterRole };
