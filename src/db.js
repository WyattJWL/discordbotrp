'use strict';

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'db.json');

function loadData() {
  if (!fs.existsSync(DB_PATH)) {
    return { guilds: {} };
  }
  try {
    const raw = fs.readFileSync(DB_PATH, 'utf8');
    return raw.trim() ? JSON.parse(raw) : { guilds: {} };
  } catch (err) {
    console.error('[db] Fichier de données illisible, redémarrage avec une base vide :', err);
    return { guilds: {} };
  }
}

const data = loadData();

function save() {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf8');
}

function getGuild(guildId) {
  if (!data.guilds[guildId]) {
    data.guilds[guildId] = {
      config: { telephone: null },
      users: {},
      promoCodes: {}
    };
    save();
  }
  return data.guilds[guildId];
}

function getUser(guildId, userId) {
  const guild = getGuild(guildId);
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

function setUserProfil(guildId, userId, { revenu, statut, partenaireId }) {
  const user = getUser(guildId, userId);

  // Si on change de partenaire (ou qu'on repasse seul), on délie l'ancien partenaire confirmé.
  if (user.partenaire && user.partenaire !== partenaireId) {
    const ancien = getUser(guildId, user.partenaire);
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

  save();
  return user;
}

function confirmerCouple(guildId, inviteurId, accepteurId) {
  const inviteur = getUser(guildId, inviteurId);
  inviteur.statut = 'couple';
  inviteur.partenaire = accepteurId;
  inviteur.partenaireConfirme = true;

  const accepteur = getUser(guildId, accepteurId);
  accepteur.statut = 'couple';
  accepteur.partenaire = inviteurId;
  accepteur.partenaireConfirme = true;

  save();
}

function refuserCouple(guildId, inviteurId) {
  const inviteur = getUser(guildId, inviteurId);
  inviteur.statut = 'seul';
  inviteur.partenaire = null;
  inviteur.partenaireConfirme = false;
  save();
}

function resetUser(guildId, userId) {
  const guild = getGuild(guildId);
  delete guild.users[userId];
  save();
}

function ajusterTotal(guildId, userId, montantDelta) {
  const user = getUser(guildId, userId);
  user.totalDeclare = Math.max(0, round2(user.totalDeclare + montantDelta));
  save();
  return user;
}

function enregistrerDeclaration(guildId, userId, montant) {
  const user = getUser(guildId, userId);
  const now = Date.now();
  user.totalDeclare = round2(user.totalDeclare + montant);
  user.derniereDeclarationAt = now;
  user.historique.push({ montant: round2(montant), at: now });
  if (user.historique.length > 50) user.historique.shift();
  save();
  return user;
}

function setTelephone(guildId, telephone) {
  const guild = getGuild(guildId);
  guild.config.telephone = telephone;
  save();
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

function creerPromoCode(guildId, { pourcent, expireAt, creePar }) {
  const guild = getGuild(guildId);
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
  save();
  return code;
}

function trouverPromoCode(guildId, code) {
  const guild = getGuild(guildId);
  return guild.promoCodes[code.toUpperCase()] || null;
}

function utiliserPromoCode(guildId, code, userId) {
  const guild = getGuild(guildId);
  const entry = guild.promoCodes[code.toUpperCase()];
  if (!entry) return null;
  entry.utilisePar = userId;
  entry.utiliseAt = Date.now();
  const user = getUser(guildId, userId);
  user.reductionPourcent = entry.pourcent;
  save();
  return entry;
}

function revoquerPromoCode(guildId, code) {
  const guild = getGuild(guildId);
  const key = code.toUpperCase();
  if (!guild.promoCodes[key]) return false;
  delete guild.promoCodes[key];
  save();
  return true;
}

function listerPromoCodesActifs(guildId) {
  const guild = getGuild(guildId);
  const now = Date.now();
  return Object.entries(guild.promoCodes)
    .filter(([, c]) => !c.utilisePar && (c.expireAt === null || c.expireAt > now))
    .map(([code, c]) => ({ code, ...c }));
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

module.exports = {
  getGuild,
  getUser,
  setUserProfil,
  confirmerCouple,
  refuserCouple,
  resetUser,
  ajusterTotal,
  enregistrerDeclaration,
  setTelephone,
  creerPromoCode,
  trouverPromoCode,
  utiliserPromoCode,
  revoquerPromoCode,
  listerPromoCodesActifs,
  round2
};
