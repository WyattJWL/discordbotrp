'use strict';

const COULEURS = {
  succes: 0x57f287,
  erreur: 0xed4245,
  info: 0x5865f2,
  attention: 0xfee75c
};

function construire(type, titre, description) {
  return {
    color: COULEURS[type] ?? COULEURS.info,
    title: titre,
    description,
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  succes: (titre, description) => construire('succes', titre, description),
  erreur: (titre, description) => construire('erreur', titre, description),
  info: (titre, description) => construire('info', titre, description),
  attention: (titre, description) => construire('attention', titre, description)
};
