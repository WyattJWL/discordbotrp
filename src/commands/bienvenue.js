'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  adminOnly: true,
  usage: '/bienvenue membre:<@membre>',
  description: "[Admin] Accepte une candidature et poste le message de bienvenue ici.",
  data: new SlashCommandBuilder()
    .setName('bienvenue')
    .setDescription("[Admin] Accepte une candidature et poste le message de bienvenue ici.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addUserOption((opt) => opt.setName('membre').setDescription('Le membre à accueillir').setRequired(true)),

  // Exécutée côté Vercel (lib/commands/bienvenue.js) ; ce fichier sert au déploiement des commandes.
  async execute() {}
};
