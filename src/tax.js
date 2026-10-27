'use strict';

function calculerImpotBase(revenu, tranches) {
  let impot = 0;
  let limitePrecedente = 0;

  for (const tranche of tranches) {
    const limite = tranche.jusquA === null ? Infinity : tranche.jusquA;
    if (revenu <= limitePrecedente) break;

    const partImposable = Math.min(revenu, limite) - limitePrecedente;
    if (partImposable > 0) {
      impot += partImposable * (tranche.taux / 100);
    }

    limitePrecedente = limite;
    if (revenu <= limite) break;
  }

  return impot;
}

function calculerImpotHebdomadaire(user, config) {
  if (user.revenu === null || user.statut === null) return null;

  let impot = calculerImpotBase(user.revenu, config.impots.tranches);

  if (user.statut === 'couple') {
    impot *= 1 - config.impots.reductionCouplePourcent / 100;
  }
  if (user.reductionPourcent) {
    impot *= 1 - user.reductionPourcent / 100;
  }

  return Math.round(impot * 100) / 100;
}

module.exports = { calculerImpotBase, calculerImpotHebdomadaire };
