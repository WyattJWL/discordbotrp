'use strict';

const { MessageFlags } = require('discord.js');

function repondre(interaction, embed) {
  return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
}

module.exports = { repondre };
