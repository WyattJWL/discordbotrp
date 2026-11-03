'use strict';

// TEMPORAIRE : actions ponctuelles pour le proprietaire (a supprimer ensuite).
//   /api/interactions?candidature=<id>    -> enregistre une candidature faite manuellement
// Si la personne n'est pas connectee avec Discord, elle est envoyee se connecter puis revient ici.

const { lireCookies, lireSession } = require('./session');
const { PROPRIETAIRE_ID } = require('./autorisation');
const { obtenirUtilisateur } = require('./discord-api');
const { creerCandidature, definirStatut, trouverCandidaturePourUtilisateur } = require('./candidatures');
const { echapperHtml } = require('./util');

function page(res, statut, titre, message) {
  res.status(statut).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title></head><body style="font-family:sans-serif;color-scheme:light dark;text-align:center;padding:60px 20px">
<h1>${titre}</h1><p>${message}</p></body></html>`);
}

async function enregistrerCandidatureManuelle(res, userId) {
  if (!/^\d{15,25}$/.test(userId)) return page(res, 400, 'ID invalide', 'Identifiant Discord invalide.');

  const existante = await trouverCandidaturePourUtilisateur(userId);
  if (existante) return page(res, 200, 'Déjà enregistrée ✅', 'Ce membre a déjà une candidature sur le site.');

  const utilisateur = await obtenirUtilisateur(userId);
  const pseudo = utilisateur?.global_name || utilisateur?.username || userId;

  const id = await creerCandidature({
    discord: pseudo,
    nomPersonnage: pseudo,
    motivation: 'Candidature faite manuellement (hors site).'
  }, userId, pseudo);
  await definirStatut(id, 'en_attente', 'Candidature faite manuellement, enregistrée par le staff.');

  page(res, 200, 'Candidature enregistrée ✅', `${echapperHtml(pseudo)} apparaît maintenant comme ayant postulé (statut : en attente).`);
}

async function gererTemporaire(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const candidature = url.searchParams.get('candidature');
  if (!candidature) {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const session = lireSession(lireCookies(req).session);
  if (!session) {
    res.writeHead(302, { Location: `/api/auth/login?retour=${encodeURIComponent(req.url)}` });
    res.end();
    return;
  }
  if (session.userId !== PROPRIETAIRE_ID) {
    page(res, 403, 'Accès refusé', `Réservé au propriétaire. Ton identifiant Discord : ${echapperHtml(session.userId)}`);
    return;
  }

  try {
    await enregistrerCandidatureManuelle(res, candidature);
  } catch (err) {
    console.error('Action temporaire échouée :', err);
    page(res, 500, 'Erreur', echapperHtml(err.message));
  }
}

module.exports = { gererTemporaire };
