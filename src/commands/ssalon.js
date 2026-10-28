'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
  adminOnly: true,
  usage: '/ssalon',
  description: '[Admin] Supprime tous les salons et catégories, ne garde que #général.',
  data: new SlashCommandBuilder()
    .setName('ssalon')
    .setDescription('[Admin] Supprime tous les salons et catégories, ne garde que #général.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  // Exécutée côté Vercel (lib/commands/ssalon.js) ; ce fichier sert uniquement au déploiement.
  async execute() {}
};
