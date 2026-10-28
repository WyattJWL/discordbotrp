'use strict';

const { listerCandidatures } = require('../lib/candidatures');
const { exigerStaff } = require('../lib/proteger');

function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  const session = await exigerStaff(req, res);
  if (!session) return;

  const candidatures = await listerCandidatures();

  const lignes = candidatures.length
    ? candidatures.map((c) => {
        const date = new Date(c.creeAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        return `<a class="ligne" href="/candidature/${c.id}">
          <div>
            <div class="nom">${echapperHtml(c.reponses.nomPersonnage || '?')}</div>
            <div class="sub">${echapperHtml(c.reponses.discord || '?')} · ${date}</div>
          </div>
          <span class="fleche">→</span>
        </a>`;
      }).join('\n')
    : '<p class="vide">Aucune candidature reçue pour le moment.</p>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tableau de bord — Sangre Negra</title>
<style>
  body { margin:0; background:#0b0909; color:#ece6e6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px 16px 60px; }
  .conteneur { max-width:640px; margin:0 auto; }
  .nav { display:flex; justify-content:space-between; align-items:center; font-size:12.5px; color:#a89a9a; margin-bottom:24px; }
  .nav a { color:#e8304f; text-decoration:none; }
  .logo { font-size:12px; letter-spacing:3px; color:#e8304f; text-transform:uppercase; margin-bottom:4px; }
  h1 { font-size:24px; margin:0 0 24px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:2px; color:#a89a9a; margin:0 0 12px; }
  .ligne {
    display:flex; align-items:center; justify-content:space-between;
    background:#151010; border:1px solid #2a1a1a; border-radius:10px;
    padding:14px 16px; margin-bottom:10px; text-decoration:none; color:inherit;
  }
  .nom { font-weight:600; font-size:14.5px; }
  .sub { font-size:12.5px; color:#a89a9a; margin-top:2px; }
  .fleche { color:#e8304f; }
  .vide { color:#a89a9a; font-size:14px; }
</style>
</head>
<body>
<div class="conteneur">
  <div class="nav"><span></span><span>Connecté : ${echapperHtml(session.username)} · <a href="/api/auth/logout">déconnexion</a></span></div>
  <div class="logo">Sangre Negra</div>
  <h1>Tableau de bord</h1>
  <h2>Candidatures (${candidatures.length})</h2>
  ${lignes}
</div>
</body>
</html>`);
};
