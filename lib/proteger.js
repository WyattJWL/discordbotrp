'use strict';

const { lireCookies, lireSession } = require('./session');
const { estAutorise } = require('./autorisation');

function pageRefus() {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Accès refusé</title>
<style>
  body { margin:0; background:#0b0909; color:#ece6e6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; }
  h1 { color:#e8304f; font-size:22px; margin-bottom:10px; }
  p { color:#a89a9a; font-size:14px; }
  a { color:#e8304f; }
</style>
</head>
<body><div><h1>Accès refusé</h1><p>Cette page est réservée au staff de Sangre Negra.</p><p><a href="/api/auth/logout">Se déconnecter</a></p></div></body>
</html>`;
}

/**
 * Vérifie que la personne est connectée et autorisée (rôle staff).
 * Gère elle-même la réponse (redirection ou 403) si ce n'est pas le cas.
 * Renvoie l'id et le pseudo si tout est bon, sinon null.
 */
async function exigerStaff(req, res) {
  const cookies = lireCookies(req);
  const session = lireSession(cookies.session);

  if (!session) {
    const retour = encodeURIComponent(req.url);
    res.writeHead(302, { Location: `/api/auth/login?retour=${retour}` });
    res.end();
    return null;
  }

  const autorise = await estAutorise(session.userId);
  if (!autorise) {
    res.status(403).send(pageRefus());
    return null;
  }

  return session;
}

module.exports = { exigerStaff };
