'use strict';

const { EmbedBuilder } = require('discord.js');

const COULEURS = {
  succes: 0x57f287,
  erreur: 0xed4245,
  info: 0x5865f2,
  attention: 0xfee75c
};

function construire(type, titre, description) {
  return new EmbedBuilder()
    .setColor(COULEURS[type] ?? COULEURS.info)
    .setTitle(titre)
    .setDescription(description)
    .setTimestamp();
}

module.exports = {
  succes: (titre, description) => construire('succes', titre, description),
  erreur: (titre, description) => construire('erreur', titre, description),
  info: (titre, description) => construire('info', titre, description),
  attention: (titre, description) => construire('attention', titre, description)
};
