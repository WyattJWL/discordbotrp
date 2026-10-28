'use strict';

const { obtenirMembre, obtenirUtilisateur } = require('./discord-api');

const ADMINISTRATOR = 0x8n;

function formatMontant(montant, devise) {
  return `${montant.toFixed(2)} ${devise}`;
}

function estAdmin(interaction) {
  const permissions = interaction.member?.permissions;
  if (!permissions) return false;
  return (BigInt(permissions) & ADMINISTRATOR) === ADMINISTRATOR;
}

function obtenirAuteur(interaction) {
  return interaction.member?.user || interaction.user;
}

/**
 * Renvoie un timestamp d'expiration, null pour "jamais", ou undefined si invalide.
 */
function parseDuree(arg) {
  if (!arg) return undefined;
  const normalise = String(arg).toLowerCase();
  if (['jamais', 'never', 'illimite', 'illimité'].includes(normalise)) {
    return null;
  }
  const nombre = parseInt(normalise.replace(/[^0-9]/g, ''), 10);
  if (Number.isNaN(nombre) || nombre <= 0) return undefined;
  return Date.now() + nombre * 24 * 60 * 60 * 1000;
}

/**
 * Nom d'affichage RP : le pseudo/surnom sur le serveur (souvent le nom de personnage),
 * avec repli sur le nom d'utilisateur Discord global si la personne n'est plus sur le serveur.
 */
async function obtenirNomAffichage(guildId, userId) {
  const membre = await obtenirMembre(guildId, userId);
  if (membre) {
    return membre.nick || membre.user?.global_name || membre.user?.username || 'Utilisateur inconnu';
  }
  const utilisateur = await obtenirUtilisateur(userId);
  if (utilisateur) {
    return utilisateur.global_name || utilisateur.username;
  }
  return 'Utilisateur inconnu';
}

module.exports = { formatMontant, estAdmin, obtenirAuteur, parseDuree, obtenirNomAffichage };
