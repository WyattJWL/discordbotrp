'use strict';

const { obtenirCandidature, supprimerCandidature } = require('../lib/candidatures');
const { exigerStaff } = require('../lib/proteger');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

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

function lireCorpsBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on('data', (chunk) => morceaux.push(chunk));
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const session = await exigerStaff(req, res);
  if (!session) return;

  const id = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');

  if (!id) {
    res.status(400).send('ID manquant.');
    return;
  }

  if (req.method === 'POST') {
    const corps = (await lireCorpsBrut(req)).toString('utf8');
    if (new URLSearchParams(corps).get('_action') === 'supprimer') {
      await supprimerCandidature(id);
    }
    res.writeHead(302, { Location: '/staff' });
    res.end();
    return;
  }

  const candidature = await obtenirCandidature(id);
  if (!candidature) {
    res.status(404).send(page({
      titre: 'Introuvable', actif: 'staff', session, estStaff: true,
      corps: '<h1 class="titre">Candidature introuvable</h1><p class="texte-intro"><a href="/staff">← Retour au tableau de bord</a></p>'
    }));
    return;
  }

  const date = new Date(candidature.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const cartes = ORDRE
    .filter((cle) => candidature.reponses[cle] !== undefined && candidature.reponses[cle] !== '')
    .map((cle) => {
      let valeur = candidature.reponses[cle];
      if (cle === 'majeur') valeur = valeur === 'Oui' ? '✅ Oui' : '❌ Non';
      if (cle === 'reglement') valeur = valeur ? '✅ Accepté' : '❌ Non accepté';
      return `<div class="mini-carte" style="grid-column:1/-1"><div class="label">${echapperHtml(LIBELLES[cle] || cle)}</div><div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(valeur)}</div></div>`;
    })
    .join('\n');

  const corps = `
    <div class="eyebrow"><a href="/staff" style="color:inherit; text-decoration:none">← Candidatures</a></div>
    <h1 class="titre">Candidature de <span>${echapperHtml(candidature.reponses.nomPersonnage || '?')}</span></h1>
    <p class="texte-intro">Reçue le ${date}</p>
    <div class="grille-cartes">${cartes}</div>
    <form method="POST" onsubmit="return confirm('Supprimer définitivement cette candidature ?')" style="margin-top:18px">
      <input type="hidden" name="_action" value="supprimer">
      <button type="submit" class="btn btn-danger">Supprimer cette candidature</button>
    </form>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Candidature', actif: 'staff', session, estStaff: true, corps }));
};
