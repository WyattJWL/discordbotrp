'use strict';

const { put, head } = require('@vercel/blob');

const PATHNAME = 'db.json';

async function charger() {
  try {
    const meta = await head(PATHNAME);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return { guilds: {} };
    const texte = await res.text();
    return texte.trim() ? JSON.parse(texte) : { guilds: {} };
  } catch {
    return { guilds: {} };
  }
}

async function sauvegarder(data) {
  await put(PATHNAME, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

function getGuild(data, guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = { config: { telephone: null }, users: {}, promoCodes: {} };
  }
  return data.guilds[guildId];
}

function getUser(data, guildId, userId) {
  const guild = getGuild(data, guildId);
  if (!guild.users[userId]) {
    guild.users[userId] = {
      revenu: null,
      statut: null,
      partenaire: null,
      partenaireConfirme: false,
      reductionPourcent: 0,
      totalDeclare: 0,
      derniereDeclarationAt: null,
      historique: []
    };
  }
  return guild.users[userId];
}

function setUserProfil(data, guildId, userId, { revenu, statut, partenaireId }) {
  const user = getUser(data, guildId, userId);

  if (user.partenaire && user.partenaire !== partenaireId) {
    const ancien = getUser(data, guildId, user.partenaire);
    if (ancien.partenaire === userId) {
      ancien.statut = 'seul';
      ancien.partenaire = null;
      ancien.partenaireConfirme = false;
    }
  }

  user.revenu = revenu;
  user.statut = statut;

  if (statut === 'couple') {
    const dejaConfirme = user.partenaire === partenaireId && user.partenaireConfirme;
    user.partenaire = partenaireId;
    user.partenaireConfirme = dejaConfirme;
  } else {
    user.partenaire = null;
    user.partenaireConfirme = false;
  }

  return user;
}

function confirmerCouple(data, guildId, inviteurId, accepteurId) {
  const inviteur = getUser(data, guildId, inviteurId);
  inviteur.statut = 'couple';
  inviteur.partenaire = accepteurId;
  inviteur.partenaireConfirme = true;

  const accepteur = getUser(data, guildId, accepteurId);
  accepteur.statut = 'couple';
  accepteur.partenaire = inviteurId;
  accepteur.partenaireConfirme = true;
}

function refuserCouple(data, guildId, inviteurId) {
  const inviteur = getUser(data, guildId, inviteurId);
  inviteur.statut = 'seul';
  inviteur.partenaire = null;
  inviteur.partenaireConfirme = false;
}

function resetUser(data, guildId, userId) {
  const guild = getGuild(data, guildId);
  delete guild.users[userId];
}

function ajusterTotal(data, guildId, userId, montantDelta) {
  const user = getUser(data, guildId, userId);
  user.totalDeclare = Math.max(0, round2(user.totalDeclare + montantDelta));
  return user;
}

function enregistrerDeclaration(data, guildId, userId, montant) {
  const user = getUser(data, guildId, userId);
  const now = Date.now();
  user.totalDeclare = round2(user.totalDeclare + montant);
  user.derniereDeclarationAt = now;
  user.historique.push({ montant: round2(montant), at: now });
  if (user.historique.length > 50) user.historique.shift();
  return user;
}

function setTelephone(data, guildId, telephone) {
  getGuild(data, guildId).config.telephone = telephone;
}

function setCanalCandidatures(data, guildId, canalId) {
  getGuild(data, guildId).config.canalCandidatures = canalId;
}

function genererCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'IMPOT-';
  for (let i = 0; i < 8; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
    if (i === 3) code += '-';
  }
  return code;
}

function creerPromoCode(data, guildId, { pourcent, expireAt, creePar }) {
  const guild = getGuild(data, guildId);
  let code;
  do {
    code = genererCode();
  } while (guild.promoCodes[code]);

  guild.promoCodes[code] = {
    pourcent,
    expireAt,
    creePar,
    creeAt: Date.now(),
    utilisePar: null,
    utiliseAt: null
  };
  return code;
}

function trouverPromoCode(data, guildId, code) {
  return getGuild(data, guildId).promoCodes[code.toUpperCase()] || null;
}

function utiliserPromoCode(data, guildId, code, userId) {
  const guild = getGuild(data, guildId);
  const entry = guild.promoCodes[code.toUpperCase()];
  if (!entry) return null;
  entry.utilisePar = userId;
  entry.utiliseAt = Date.now();
  getUser(data, guildId, userId).reductionPourcent = entry.pourcent;
  return entry;
}

function revoquerPromoCode(data, guildId, code) {
  const guild = getGuild(data, guildId);
  const key = code.toUpperCase();
  if (!guild.promoCodes[key]) return false;
  delete guild.promoCodes[key];
  return true;
}

function listerPromoCodesActifs(data, guildId) {
  const guild = getGuild(data, guildId);
  const now = Date.now();
  return Object.entries(guild.promoCodes)
    .filter(([, c]) => !c.utilisePar && (c.expireAt === null || c.expireAt > now))
    .map(([code, c]) => ({ code, ...c }));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  charger,
  sauvegarder,
  getGuild,
  getUser,
  setUserProfil,
  confirmerCouple,
  refuserCouple,
  resetUser,
  ajusterTotal,
  enregistrerDeclaration,
  setTelephone,
  setCanalCandidatures,
  creerPromoCode,
  trouverPromoCode,
  utiliserPromoCode,
  revoquerPromoCode,
  listerPromoCodesActifs,
  round2
};
