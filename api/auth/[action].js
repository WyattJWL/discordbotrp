'use strict';

const crypto = require('crypto');
const { creerSession, lireCookies } = require('../../lib/session');
const { estMembreGang } = require('../../lib/autorisation');

const API = 'https://discord.com/api/v10';
// Marqueur de retour : indique que cette connexion sert à la vérification des rôles liés.
const RETOUR_ROLES = '/__roles';

const METADONNEES_ROLES = [
  { type: 7, key: 'est_membre', name: 'Membre M13', description: 'Fait partie du gang M13 (rôle sur le serveur)' }
];

/** Déclare à Discord la condition proposée dans les « Liens » d'un rôle (idempotent). */
async function declarerMetadonneesRoles() {
  try {
    const res = await fetch(`${API}/applications/${process.env.DISCORD_CLIENT_ID}/role-connections/metadata`, {
      method: 'PUT',
      headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(METADONNEES_ROLES)
    });
    if (!res.ok) console.error('Rôles liés : déclaration refusée', res.status, await res.text().catch(() => ''));
  } catch (err) {
    console.error('Rôles liés : déclaration impossible', err);
  }
}

async function mettreAJourRoleLie(accessToken, user) {
  const membre = await estMembreGang(user.id);
  const res = await fetch(`${API}/users/@me/applications/${process.env.DISCORD_CLIENT_ID}/role-connection`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform_name: 'M13', platform_username: user.username, metadata: { est_membre: membre ? 1 : 0 } })
  });
  if (!res.ok) throw new Error(`role-connection ${res.status}`);
  return membre;
}

function pageResultat(res, statut, titre, message) {
  res.status(statut).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre} — M13</title><link rel="stylesheet" href="/style.css"></head><body>
<div class="page-centree"><div class="carte-accent" style="text-align:center"><h1 class="titre">${titre}</h1>
<p class="texte-intro">${message}</p><a class="btn btn-ghost" href="/" style="margin-top:12px">Aller sur le site</a></div></div></body></html>`);
}

async function login(req, res, { roles = false } = {}) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const retourBrut = roles ? RETOUR_ROLES : (url.searchParams.get('retour') || '/');
  const retour = retourBrut.startsWith('/') ? retourBrut : '/';

  const csrf = crypto.randomBytes(16).toString('hex');
  const state = `${csrf}.${Buffer.from(retour).toString('base64url')}`;

  res.setHeader('Set-Cookie', `oauth_csrf=${csrf}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);
  if (roles) await declarerMetadonneesRoles();

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `https://${req.headers.host}/api/auth/callback`,
    response_type: 'code',
    scope: roles ? 'identify role_connections.write' : 'identify',
    state
  });

  res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params.toString()}` });
  res.end();
}

async function callback(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state') || '';
  const erreurOAuth = url.searchParams.get('error');

  if (erreurOAuth) {
    res.status(400).send('Connexion annulée.');
    return;
  }

  const [csrfRecu, retourB64] = state.split('.');
  const cookies = lireCookies(req);

  if (!code || !csrfRecu || csrfRecu !== cookies.oauth_csrf) {
    res.status(400).send('Requête invalide ou expirée, réessaie depuis /candidature.');
    return;
  }

  let retour = '/';
  try {
    const decode = Buffer.from(retourB64, 'base64url').toString('utf8');
    if (decode.startsWith('/')) retour = decode;
  } catch {
    retour = '/';
  }

  const redirectUri = `https://${req.headers.host}/api/auth/callback`;

  let token;
  try {
    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      })
    });
    if (!tokenRes.ok) throw new Error('token');
    token = await tokenRes.json();
  } catch {
    res.status(401).send('Échec de la connexion Discord, réessaie.');
    return;
  }

  let user;
  try {
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${token.access_token}` }
    });
    if (!userRes.ok) throw new Error('user');
    user = await userRes.json();
  } catch {
    res.status(401).send('Impossible de récupérer ton profil Discord.');
    return;
  }

  const session = creerSession(user.id, user.username);

  res.setHeader('Set-Cookie', [
    `session=${session}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800`,
    'oauth_csrf=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0'
  ]);
  if (retour === RETOUR_ROLES) {
    try {
      const membre = await mettreAJourRoleLie(token.access_token, user);
      pageResultat(res, 200, membre ? 'Compte vérifié ✅' : 'Compte lié', membre
        ? 'Tu es reconnu comme membre de M13. Retourne sur Discord : ton rôle se met à jour.'
        : 'Ton compte est lié, mais tu n\'es pas encore membre de M13. Retourne sur Discord une fois ton arrivée finalisée.');
    } catch (err) {
      console.error('Rôles liés : mise à jour échouée', err);
      pageResultat(res, 500, 'Échec de la vérification', 'Impossible de mettre à jour ton compte pour le moment. Réessaie dans un instant.');
    }
    return;
  }

  res.writeHead(302, { Location: retour });
  res.end();
}

async function logout(req, res) {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.writeHead(302, { Location: '/' });
  res.end();
}

module.exports = async (req, res) => {
  const action = req.query?.action || new URL(req.url, 'http://x').pathname.split('/').pop();

  if (action === 'login') return login(req, res);
  if (action === 'verifier') return login(req, res, { roles: true });
  if (action === 'callback') return callback(req, res);
  if (action === 'logout') return logout(req, res);

  res.status(404).send('Action inconnue.');
};
