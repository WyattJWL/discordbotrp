'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

module.exports = {
  usage: '/himpot',
  description: 'Afficher le numéro pour transférer le paiement des impôts.',
  data: new SlashCommandBuilder()
    .setName('himpot')
    .setDescription('Afficher le numéro pour transférer le paiement des impôts.'),

  async execute(interaction, config) {
    const guild = db.getGuild(interaction.guild.id);
    const telephone = guild.config.telephone;

    if (!telephone) {
      return repondre(interaction, embeds.attention(
        'Paiement des impôts',
        "Aucun numéro n'a encore été configuré par un admin.\n(Admin : `/aimpots telephone`)"
      ));
    }

    return repondre(interaction, embeds.info(
      'Paiement des impôts',
      `Pour régler tes impôts, transfère le montant dû au numéro suivant :\n📞 **${telephone}**\n\n` +
      "Déclare ensuite ton paiement avec `/dimpots`."
    ));
  }
};
