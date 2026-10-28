'use strict';

const { lireCookies, lireSession } = require('./session');
const { estStaff, estMembreGang } = require('./autorisation');

function pageMessage(titre, message, lien) {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titre} — Sangre Negra</title>
<style>
  body { margin:0; background:#0b0909; color:#ece6e6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
         min-height:100vh; display:flex; align-items:center; justify-content:center; text-align:center; padding:20px; }
  h1 { color:#e8304f; font-size:22px; margin-bottom:10px; }
  p { color:#a89a9a; font-size:14px; }
  a { color:#e8304f; }
</style>
</head>
<body><div><h1>${titre}</h1><p>${message}</p>${lien || ''}</div></body>
</html>`;
}

function rediriger(res, req) {
  const retour = encodeURIComponent(req.url);
  res.writeHead(302, { Location: `/api/auth/login?retour=${retour}` });
  res.end();
}

/** Juste connecté (n'importe quel compte Discord). Renvoie la session ou null (réponse déjà envoyée). */
async function exigerConnexion(req, res) {
  const cookies = lireCookies(req);
  const session = lireSession(cookies.session);
  if (!session) {
    rediriger(res, req);
    return null;
  }
  return session;
}

/** Connecté + au moins Recrue dans le gang. */
async function exigerMembre(req, res) {
  const session = await exigerConnexion(req, res);
  if (!session) return null;

  if (!(await estMembreGang(session.userId))) {
    res.status(403).send(pageMessage(
      'Pas encore membre',
      "Cet espace est réservé aux membres de Sangre Negra. Si tu as postulé, attends une réponse du staff.",
      '<p><a href="/candidature">Postuler</a> · <a href="/api/auth/logout">déconnexion</a></p>'
    ));
    return null;
  }
  return session;
}

/** Connecté + Lieutenant ou plus. */
async function exigerStaff(req, res) {
  const session = await exigerConnexion(req, res);
  if (!session) return null;

  if (!(await estStaff(session.userId))) {
    res.status(403).send(pageMessage(
      'Accès refusé',
      'Cette page est réservée au staff de Sangre Negra.',
      '<p><a href="/espace">Mon espace</a> · <a href="/api/auth/logout">déconnexion</a></p>'
    ));
    return null;
  }
  return session;
}

module.exports = { exigerConnexion, exigerMembre, exigerStaff };
