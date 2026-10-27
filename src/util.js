'use strict';

const { PermissionsBitField } = require('discord.js');

function formatMontant(montant, devise) {
  return `${montant.toFixed(2)} ${devise}`;
}

function estAdmin(member) {
  return member.permissions.has(PermissionsBitField.Flags.Administrator);
}

/**
 * Renvoie un timestamp d'expiration, null pour "jamais", ou undefined si invalide.
 */
function parseDuree(arg) {
  if (!arg) return undefined;
  const normalise = arg.toLowerCase();
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
async function obtenirNomAffichage(client, guildId, userId) {
  try {
    const guild = await client.guilds.fetch(guildId);
    const membre = await guild.members.fetch(userId);
    return membre.displayName;
  } catch {
    try {
      const user = await client.users.fetch(userId);
      return user.username;
    } catch {
      return 'Utilisateur inconnu';
    }
  }
}

module.exports = { formatMontant, estAdmin, parseDuree, obtenirNomAffichage };
