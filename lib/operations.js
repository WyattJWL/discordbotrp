'use strict';

const { genererId, ecrireFichier, lireFichierFiable, listerDossier, supprimerFichier } = require('./stockage');

const PREFIX = 'operations/';
const cheminDe = (id) => `${PREFIX}${id}.json`;

const TYPES_VALIDES = ['op', 'braquage', 'convocation', 'reunion'];
const STATUTS_VALIDES = ['planifiee', 'terminee', 'annulee'];

async function creerOperation({ type, titre, description, date, lieu, participants, creeParUserId, creeParUsername }) {
  const id = genererId();
  const operation = {
    type: TYPES_VALIDES.includes(type) ? type : 'op',
    titre,
    description,
    date: date || null,
    lieu: lieu || '',
    participants: participants || '',
    statut: 'planifiee',
    creeParUserId,
    creeParUsername,
    creeAt: Date.now()
  };
  await ecrireFichier(cheminDe(id), operation);
  return id;
}

async function obtenirOperation(id) {
  return lireFichierFiable(cheminDe(id));
}

async function listerOperations() {
  const toutes = await listerDossier(PREFIX);
  return toutes.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : a.creeAt;
    const db = b.date ? new Date(b.date).getTime() : b.creeAt;
    return da - db;
  });
}

async function modifierOperation(id, champs) {
  const chemin = cheminDe(id);
  const operation = await lireFichierFiable(chemin);
  if (!operation) return false;
  Object.assign(operation, champs);
  await ecrireFichier(chemin, operation);
  return true;
}

async function definirStatutOperation(id, statut) {
  if (!STATUTS_VALIDES.includes(statut)) return false;
  return modifierOperation(id, { statut });
}

async function supprimerOperation(id) {
  return supprimerFichier(cheminDe(id));
}

module.exports = {
  creerOperation,
  obtenirOperation,
  listerOperations,
  modifierOperation,
  definirStatutOperation,
  supprimerOperation,
  TYPES_VALIDES,
  STATUTS_VALIDES
};
