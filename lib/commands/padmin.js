'use strict';

const db = require('../db');
const embeds = require('../embeds');
const { estAdmin, parseDuree, obtenirAuteur } = require('../util');
const { repondre } = require('../reponse');

const USAGE = '/padmin creer <pourcentage> <jours|jamais>  |  /padmin liste  |  /padmin revoquer <code>';

async function gerer(interaction, data, config, sousNom, options) {
  if (!estAdmin(interaction)) {
    return repondre(embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
  }

  const guildId = interaction.guild_id;
  const auteur = obtenirAuteur(interaction);

  if (sousNom === 'creer') return creerCode(data, guildId, auteur, options);
  if (sousNom === 'liste') return listerCodes(data, guildId);
  if (sousNom === 'revoquer') return revoquerCode(data, guildId, options);

  return repondre(embeds.erreur('Utilisation', USAGE));
}

function creerCode(data, guildId, auteur, options) {
  const pourcent = options.pourcentage;
  if (!Number.isInteger(pourcent) || pourcent <= 0 || pourcent > 100) {
    return repondre(embeds.erreur('Pourcentage invalide', 'Indique un pourcentage entre 1 et 100.'));
  }

  const expireAt = parseDuree(options.duree);
  if (expireAt === undefined) {
    return repondre(embeds.erreur(
      'Durée invalide',
      'Indique un nombre de jours ou `jamais`. Exemple : `7` (expire dans 7 jours) ou `jamais`.'
    ));
  }

  const code = db.creerPromoCode(data, guildId, { pourcent, expireAt, creePar: auteur.id });

  return repondre(embeds.succes(
    'Code promo créé',
    `**Code :** \`${code}\`\n` +
    `**Réduction :** ${pourcent}%\n` +
    `**Expiration :** ${expireAt === null ? 'jamais' : new Date(expireAt).toLocaleString('fr-FR')}\n\n` +
    `Ce code est à usage unique. La personne l'utilise avec \`/cimpots code code:${code}\`.`
  ));
}

function listerCodes(data, guildId) {
  const codes = db.listerPromoCodesActifs(data, guildId);
  if (codes.length === 0) {
    return repondre(embeds.info('Codes promo actifs', 'Aucun code actif pour le moment.'));
  }

  const lignes = codes.map((c) =>
    `\`${c.code}\` — ${c.pourcent}% — expire : ${c.expireAt === null ? 'jamais' : new Date(c.expireAt).toLocaleString('fr-FR')}`
  );

  return repondre(embeds.info('Codes promo actifs', lignes.join('\n')));
}

function revoquerCode(data, guildId, options) {
  const code = options.code;
  if (!code) {
    return repondre(embeds.erreur('Code manquant', 'Exemple : `/padmin revoquer code:IMPOT-XXXX-XXXX`'));
  }

  const ok = db.revoquerPromoCode(data, guildId, code);
  if (!ok) {
    return repondre(embeds.erreur('Introuvable', "Ce code n'existe pas (ou plus)."));
  }

  return repondre(embeds.succes('Code révoqué', `Le code \`${code.toUpperCase()}\` a été supprimé.`));
}

module.exports = { gerer };
