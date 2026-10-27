'use strict';

function repondre(interaction, embed) {
  return interaction.reply({ embeds: [embed], ephemeral: true });
}

module.exports = { repondre };
