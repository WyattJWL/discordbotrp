'use strict';

const crypto = require('crypto');

const DUREE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function signer(valeur) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(valeur).digest('base64url');
}

// Le pseudo est encodé en base64url : un pseudo Discord peut contenir un "." qui
// casserait le découpage du cookie (et bloquerait la connexion en boucle).
function creerSession(userId, username) {
  const exp = Date.now() + DUREE_MS;
  const nomB64 = Buffer.from(username, 'utf8').toString('base64url');
  const charge = `v2.${userId}.${nomB64}.${exp}`;
  return `${charge}.${signer(charge)}`;
}

function lireSession(cookieValeur) {
  if (!cookieValeur) return null;

  const parties = cookieValeur.split('.');
  const v2 = parties[0] === 'v2';
  if (parties.length !== (v2 ? 5 : 4)) return null;
  const [userId, usernameEnc, exp, signature] = v2 ? parties.slice(1) : parties;

  const charge = v2 ? `v2.${userId}.${usernameEnc}.${exp}` : `${userId}.${usernameEnc}.${exp}`;
  const attendu = signer(charge);
  const sigBuf = Buffer.from(signature);
  const attBuf = Buffer.from(attendu);
  if (sigBuf.length !== attBuf.length || !crypto.timingSafeEqual(sigBuf, attBuf)) return null;
  if (Date.now() > Number(exp)) return null;

  const username = v2 ? Buffer.from(usernameEnc, 'base64url').toString('utf8') : decodeURIComponent(usernameEnc);
  return { userId, username };
}

function lireCookies(req) {
  const entete = req.headers.cookie || '';
  const cookies = {};
  entete.split(';').forEach((paire) => {
    const idx = paire.indexOf('=');
    if (idx === -1) return;
    const cle = paire.slice(0, idx).trim();
    const valeur = paire.slice(idx + 1).trim();
    if (cle) cookies[cle] = decodeURIComponent(valeur);
  });
  return cookies;
}

module.exports = { creerSession, lireSession, lireCookies, DUREE_MS };
