'use strict';

const { trouverCandidaturePourUtilisateur } = require('../lib/candidatures');
const { exigerConnexion } = require('../lib/proteger');
const { echapperHtml } = require('../lib/util');

const STATUTS = {
  en_attente: { label: 'En attente de lecture', badge: 'statut-en_attente' },
  acceptee: { label: 'Candidature acceptée', badge: 'statut-acceptee' },
  refusee: { label: 'Candidature refusée', badge: 'statut-refusee' },
  corrections: { label: 'Corrections demandées', badge: 'statut-corrections' }
};

function enrobage(corps) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Suivre ma candidature — Sangre Negra</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="topnav">
  <div class="marque">
    <div class="ecusson">SN</div>
    <div>
      <div class="nom">SANGRE <span>NEGRA</span></div>
      <div class="sous">Suivi de candidature</div>
    </div>
  </div>
  <div class="droite"><a href="/">← Accueil</a></div>
</div>
<div class="page-centree">${corps}</div>
</body>
</html>`;
}

module.exports = async (req, res) => {
  const session = await exigerConnexion(req, res);
  if (!session) return;

  const candidature = await trouverCandidaturePourUtilisateur(session.userId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!candidature) {
    res.status(200).send(enrobage(`
      <div class="carte-accent" style="text-align:center">
        <div class="badge-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          Suivi
        </div>
        <h1 class="titre">Aucune candidature <span>en cours</span></h1>
        <p class="texte-intro">Tu n'as pas encore postulé pour rejoindre Sangre Negra.</p>
        <a class="btn btn-accent btn-large" href="/candidature" style="margin-top:18px">Postuler maintenant</a>
      </div>
    `));
    return;
  }

  const statutInfo = STATUTS[candidature.statut] || STATUTS.en_attente;
  const dateEnvoi = new Date(candidature.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const ligneVue = candidature.vue
    ? `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>Consultée par le staff le ${new Date(candidature.vueAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</li>`
    : `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>Pas encore consultée par le staff</li>`;

  const blocNote = candidature.noteStaff
    ? `<div class="mini-carte" style="text-align:left; margin-top:18px"><div class="label">Message du staff</div><div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(candidature.noteStaff)}</div></div>`
    : '';

  const boutonRepostuler = candidature.statut === 'refusee'
    ? `<a class="btn btn-ghost btn-large" href="/candidature" style="margin-top:12px">Postuler à nouveau</a>`
    : '';

  res.status(200).send(enrobage(`
    <div class="carte-accent" style="text-align:center">
      <div class="badge-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        Suivi de candidature
      </div>
      <h1 class="titre">Salut <span>${echapperHtml(candidature.candidatUsername)}</span></h1>
      <p class="texte-intro">Candidature envoyée le ${dateEnvoi}</p>
      <div class="statut-badge ${statutInfo.badge}" style="margin:16px 0">${statutInfo.label}</div>
      ${blocNote}
      <ul class="puces-info" style="text-align:left">${ligneVue}</ul>
      ${boutonRepostuler}
    </div>
  `));
};
