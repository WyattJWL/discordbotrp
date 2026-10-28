'use strict';

const crypto = require('crypto');

module.exports = async (req, res) => {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const retourBrut = url.searchParams.get('retour') || '/';
  const retour = retourBrut.startsWith('/') ? retourBrut : '/';

  const csrf = crypto.randomBytes(16).toString('hex');
  const state = `${csrf}.${Buffer.from(retour).toString('base64url')}`;

  res.setHeader('Set-Cookie', `oauth_csrf=${csrf}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`);

  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: `https://${req.headers.host}/api/auth/callback`,
    response_type: 'code',
    scope: 'identify',
    state
  });

  res.writeHead(302, { Location: `https://discord.com/oauth2/authorize?${params.toString()}` });
  res.end();
};
