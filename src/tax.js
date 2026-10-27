'use strict';

function calculerImpotHebdomadaire(user, config) {
  if (user.revenu === null || user.statut === null) return null;

  let impot = user.revenu * (config.impots.tauxPourcent / 100);

  if (user.statut === 'couple' && user.partenaireConfirme) {
    impot *= 1 - config.impots.reductionCouplePourcent / 100;
  }
  if (user.reductionPourcent) {
    impot *= 1 - user.reductionPourcent / 100;
  }

  return Math.round(impot * 100) / 100;
}

module.exports = { calculerImpotHebdomadaire };
