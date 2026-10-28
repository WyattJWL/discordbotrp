'use strict';

const crypto = require('crypto');

const DUREE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

function signer(valeur) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET).update(valeur).digest('base64url');
}

function creerSession(userId, username) {
  const exp = Date.now() + DUREE_MS;
  const charge = `${userId}.${encodeURIComponent(username)}.${exp}`;
  return `${charge}.${signer(charge)}`;
}

function lireSession(cookieValeur) {
  if (!cookieValeur) return null;

  const parties = cookieValeur.split('.');
  if (parties.length !== 4) return null;
  const [userId, usernameEnc, exp, signature] = parties;

  const charge = `${userId}.${usernameEnc}.${exp}`;
  const attendu = signer(charge);
  const sigBuf = Buffer.from(signature);
  const attBuf = Buffer.from(attendu);
  if (sigBuf.length !== attBuf.length || !crypto.timingSafeEqual(sigBuf, attBuf)) return null;
  if (Date.now() > Number(exp)) return null;

  return { userId, username: decodeURIComponent(usernameEnc) };
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
