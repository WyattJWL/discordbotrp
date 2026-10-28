'use strict';

const { obtenirCandidature } = require('../lib/candidatures');
const { exigerStaff } = require('../lib/proteger');

const LIBELLES = {
  discord: 'Pseudo Discord',
  majeur: '18 ans ou plus',
  experience: 'Expérience en roleplay',
  heures: 'Disponibilité',
  autreFaction: 'Autre faction / gang',
  nomPersonnage: 'Nom du personnage',
  histoire: 'Histoire du personnage',
  motivation: 'Pourquoi Sangre Negra',
  apport: 'Ce qu’il/elle apporte',
  miseEnSituation: 'Mise en situation',
  origine: 'Comment il/elle nous a connus',
  reglement: 'Règlement accepté'
};

const ORDRE = [
  'discord', 'majeur', 'experience', 'heures', 'autreFaction',
  'nomPersonnage', 'histoire', 'motivation', 'apport',
  'miseEnSituation', 'origine', 'reglement'
];

function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function page(corps) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Candidature — Sangre Negra</title>
<style>
  body { margin:0; background:#0b0909; color:#ece6e6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px 16px 60px; }
  .conteneur { max-width:640px; margin:0 auto; }
  h1 { font-size:22px; margin:0 0 20px; }
  .carte { background:#151010; border:1px solid #2a1a1a; border-radius:12px; padding:18px 20px; margin-bottom:14px; }
  .label { font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#e8304f; margin-bottom:6px; }
  .valeur { font-size:14.5px; line-height:1.6; white-space:pre-wrap; }
  .meta { color:#a89a9a; font-size:12.5px; margin-bottom:18px; }
  .nav { display:flex; justify-content:space-between; align-items:center; font-size:12.5px; color:#a89a9a; margin-bottom:18px; }
  .nav a { color:#e8304f; text-decoration:none; }
</style>
</head>
<body>
<div class="conteneur">
${corps}
</div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const session = await exigerStaff(req, res);
  if (!session) return;

  const id = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');

  if (!id) {
    res.status(400).send(page('<p>ID manquant.</p>'));
    return;
  }

  const candidature = await obtenirCandidature(id);
  if (!candidature) {
    res.status(404).send(page('<p>Candidature introuvable.</p>'));
    return;
  }

  const date = new Date(candidature.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const cartes = ORDRE
    .filter((cle) => candidature.reponses[cle] !== undefined && candidature.reponses[cle] !== '')
    .map((cle) => {
      let valeur = candidature.reponses[cle];
      if (cle === 'majeur') valeur = valeur === 'Oui' ? '✅ Oui' : '❌ Non';
      if (cle === 'reglement') valeur = valeur ? '✅ Accepté' : '❌ Non accepté';
      return `<div class="carte"><div class="label">${echapperHtml(LIBELLES[cle] || cle)}</div><div class="valeur">${echapperHtml(valeur)}</div></div>`;
    })
    .join('\n');

  const corps = `
    <div class="nav"><a href="/staff">← Tableau de bord</a><span>Connecté : ${echapperHtml(session.username)} · <a href="/api/auth/logout">déconnexion</a></span></div>
    <h1>Candidature Sangre Negra</h1>
    <div class="meta">Reçue le ${date}</div>
    ${cartes}
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page(corps));
};
