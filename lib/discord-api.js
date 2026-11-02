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

async function listerMembresGuilde(guildId) {
  const res = await fetch(`${API}/guilds/${guildId}/members?limit=1000`, { headers: headers() });
  if (!res.ok) {
    const corps = await res.text().catch(() => '');
    throw new Error(`Impossible de lister les membres de la guilde (${res.status})${corps ? ` : ${corps}` : ''}`);
  }
  return res.json();
}

function enSlug(texte) {
  return String(texte || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Cherche le salon texte dont le nom contient le nom RP (ex: "Llamar Tadhino" ->
 * "lieutenant-llamar-tadhino"). Renvoie null si rien (ou si le nom est vide).
 */
async function trouverSalonParNomRp(guildId, nomRp) {
  const slug = enSlug(nomRp);
  if (!slug) return null;
  const res = await fetch(`${API}/guilds/${guildId}/channels`, { headers: headers() });
  if (!res.ok) return null;
  const salons = await res.json();
  return salons.find((c) => c.type === 0 && enSlug(c.name).includes(slug)) || null;
}

module.exports = { trouverSalonParNomRp, envoyerDM, envoyerMessageSalon, obtenirMembre, obtenirUtilisateur, ajouterRole, listerMembresGuilde };
