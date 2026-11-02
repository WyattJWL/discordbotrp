'use strict';

// TEMPORAIRE : actions ponctuelles pour le proprietaire (a supprimer ensuite).
//   /api/interactions?candidature=<id>    -> enregistre une candidature faite manuellement
//   /api/interactions?enregistrer=bienvenue -> enregistre la commande /bienvenue sur le serveur
// Si la personne n'est pas connectee avec Discord, elle est envoyee se connecter puis revient ici.

const { lireCookies, lireSession } = require('./session');
const { PROPRIETAIRE_ID } = require('./autorisation');
const { obtenirUtilisateur } = require('./discord-api');
const { creerCandidature, definirStatut, trouverCandidaturePourUtilisateur } = require('./candidatures');
const { echapperHtml } = require('./util');

function page(res, statut, titre, message) {
  res.status(statut).setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titre}</title></head><body style="font-family:sans-serif;background:#0b0909;color:#ece6e6;text-align:center;padding:60px 20px">
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

async function enregistrerBienvenue(res) {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
  const r = await fetch(`https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/guilds/${DISCORD_GUILD_ID}/commands`, {
    method: 'POST',
    headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'bienvenue',
      description: "[Admin] Accepte la candidature d'un membre et poste le message de bienvenue avec le lien dans ce salon.",
      default_member_permissions: '8',
      options: [{ type: 6, name: 'membre', description: 'Le membre à accueillir', required: true }]
    })
  });
  if (!r.ok) return page(res, 500, 'Échec', `Discord a répondu ${r.status} : ${echapperHtml(await r.text())}`);
  page(res, 200, 'Commande enregistrée ✅', 'La commande /bienvenue est disponible sur le serveur (recharge Discord avec Ctrl+R).');
}

async function gererTemporaire(req, res) {
  const url = new URL(req.url, `https://${req.headers.host}`);
  const candidature = url.searchParams.get('candidature');
  const enregistrer = url.searchParams.get('enregistrer');
  if (!candidature && !enregistrer) {
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
    if (enregistrer === 'bienvenue') await enregistrerBienvenue(res);
    else await enregistrerCandidatureManuelle(res, candidature);
  } catch (err) {
    console.error('Action temporaire échouée :', err);
    page(res, 500, 'Erreur', echapperHtml(err.message));
  }
}

module.exports = { gererTemporaire };
