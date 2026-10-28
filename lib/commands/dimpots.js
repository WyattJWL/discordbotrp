'use strict';

const db = require('../db');
const { calculerImpotHebdomadaire } = require('../tax');
const { formatMontant, obtenirAuteur } = require('../util');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

async function gerer(interaction, data, config) {
  const guildId = interaction.guild_id;
  const auteur = obtenirAuteur(interaction);
  const user = db.getUser(data, guildId, auteur.id);

  if (user.revenu === null) {
    return repondre(embeds.erreur(
      'Profil non configuré',
      "Configure d'abord tes impôts avec `/cimpots configurer`."
    ));
  }

  const montant = calculerImpotHebdomadaire(user, config);
  db.enregistrerDeclaration(data, guildId, auteur.id, montant);

  return repondre(embeds.succes(
    'Déclaration enregistrée',
    `Tu as déclaré **${formatMontant(montant, config.devise)}** d'impôts.\n` +
    `**Total déclaré à ce jour :** ${formatMontant(user.totalDeclare, config.devise)}\n\n` +
    "N'oublie pas d'effectuer le virement — utilise `/himpot` pour les infos de paiement."
  ));
}

module.exports = { gerer };
