'use strict';

const db = require('../db');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

async function gerer(interaction, data) {
  const guild = db.getGuild(data, interaction.guild_id);
  const telephone = guild.config.telephone;

  if (!telephone) {
    return repondre(embeds.attention(
      'Paiement des impôts',
      "Aucun numéro n'a encore été configuré par un admin.\n(Admin : `/aimpots telephone`)"
    ));
  }

  return repondre(embeds.info(
    'Paiement des impôts',
    `Pour régler tes impôts, transfère le montant dû au numéro suivant :\n📞 **${telephone}**\n\n` +
    "Déclare ensuite ton paiement avec `/dimpots`."
  ));
}

module.exports = { gerer };
