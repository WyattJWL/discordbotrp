'use strict';

// TEMPORAIRE : actions ponctuelles pour le proprietaire (a supprimer ensuite).
//   /api/interactions?ssalon=1            -> supprime tous les salons/categories, garde #general
//   /api/interactions?candidature=<id>    -> enregistre une candidature faite manuellement
// Si la personne n'est pas connectee avec Discord, elle est envoyee se connecter puis revient ici.

const { lireCookies, lireSession } = require('./session');
const { PROPRIETAIRE_ID } = require('./autorisation');
const { listerSalons, creerSalonTexte, supprimerSalon, obtenirUtilisateur } = require('./discord-api');
const { creerCandidature, definirStatut, trouverCandidaturePourUtilisateur } = require('./candidatures');
const { echapperHtml } = require('./util');

const PARALLELE = 5;

function page(res, statut, titre, message) {
  res.status(statut).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title></head><body style="font-family:sans-serif;background:#0b0909;color:#ece6e6;text-align:center;padding:60px 20px">
<h1>${titre}</h1><p>${message}</p></body></html>`);
}

async function supprimerEnParallele(salons) {
  let echecs = 0;
  const file = [...salons];
  await Promise.all(Array.from({ length: PARALLELE }, async () => {
    while (file.length) {
      const salon = file.shift();
      try {
        await supprimerSalon(salon.id);
      } catch {
        echecs += 1;
      }
    }
  }));
  return echecs;
}

async function nettoyerServeur(res) {
  const guildId = process.env.DISCORD_GUILD_ID;
  const anciens = await listerSalons(guildId);
  const general = await creerSalonTexte(guildId, 'général');
  const echecs = await supprimerEnParallele(anciens.filter((s) => s.id !== general.id));

  const detail = echecs > 0
    ? ` ${echecs} salon(s) n'ont pas pu être supprimés (salons système d'un serveur Communauté ou permission « Gérer les salons » manquante).`
    : '';
  page(res, 200, 'Serveur nettoyé ✅', `${anciens.length - echecs} salon(s)/catégorie(s) supprimé(s). Il ne reste que #général.${detail}`);
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
  const ssalon = url.searchParams.get('ssalon');
  const candidature = url.searchParams.get('candidature');
  if (!ssalon && !candidature) {
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
    if (ssalon) await nettoyerServeur(res);
    else await enregistrerCandidatureManuelle(res, candidature);
  } catch (err) {
    console.error('Action temporaire échouée :', err);
    page(res, 500, 'Erreur', echapperHtml(err.message));
  }
}

module.exports = { gererTemporaire };
