'use strict';

const { creerSession, lireCookies } = require('../../lib/session');

module.exports = async (req, res) => {
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
  res.writeHead(302, { Location: retour });
  res.end();
};
