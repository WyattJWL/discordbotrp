'use strict';

const EPHEMERAL = 64;

function repondre(embed) {
  return { type: 4, data: { embeds: [embed], flags: EPHEMERAL } };
}

function mettreAJour(embed) {
  return { type: 7, data: { embeds: [embed], components: [] } };
}

function repondreTexte(texte) {
  return { type: 4, data: { content: texte, flags: EPHEMERAL } };
}

module.exports = { repondre, mettreAJour, repondreTexte, EPHEMERAL };
