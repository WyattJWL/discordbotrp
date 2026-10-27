'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { calculerImpotHebdomadaire } = require('../tax');
const { formatMontant } = require('../util');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

module.exports = {
  usage: '/dimpots',
  description: "Déclarer le paiement de tes impôts de la semaine (s'accumule dans ton historique).",
  data: new SlashCommandBuilder()
    .setName('dimpots')
    .setDescription('Déclarer le paiement de tes impôts de la semaine.'),

  async execute(interaction, config) {
    const guildId = interaction.guild.id;
    const userId = interaction.user.id;
    const user = db.getUser(guildId, userId);

    if (user.revenu === null) {
      return repondre(interaction, embeds.erreur(
        'Profil non configuré',
        "Configure d'abord tes impôts avec `/cimpots configurer`."
      ));
    }

    const montant = calculerImpotHebdomadaire(user, config);
    db.enregistrerDeclaration(guildId, userId, montant);
    const totalApres = db.getUser(guildId, userId).totalDeclare;

    return repondre(interaction, embeds.succes(
      'Déclaration enregistrée',
      `Tu as déclaré **${formatMontant(montant, config.devise)}** d'impôts.\n` +
      `**Total déclaré à ce jour :** ${formatMontant(totalApres, config.devise)}\n\n` +
      "N'oublie pas d'effectuer le virement — utilise `/himpot` pour les infos de paiement."
    ));
  }
};
