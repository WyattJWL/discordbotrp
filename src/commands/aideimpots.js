'use strict';

const { SlashCommandBuilder } = require('discord.js');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

module.exports = {
  usage: '/aideimpots',
  description: 'Afficher la liste de toutes les commandes du bot impôts.',
  data: new SlashCommandBuilder()
    .setName('aideimpots')
    .setDescription('Afficher la liste de toutes les commandes du bot impôts.'),

  async execute(interaction, config, commands) {
    const lignesUser = [];
    const lignesAdmin = [];

    for (const cmd of commands.values()) {
      const ligne = `\`${cmd.usage}\`\n${cmd.description}`;
      if (cmd.adminOnly) lignesAdmin.push(ligne);
      else lignesUser.push(ligne);
    }

    const embed = embeds.info('📋 Commandes impôts', lignesUser.join('\n\n'));
    if (lignesAdmin.length) {
      embed.addFields({ name: '🔧 Commandes admin', value: lignesAdmin.join('\n\n') });
    }

    return repondre(interaction, embed);
  }
};
