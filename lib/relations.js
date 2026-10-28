'use strict';

const { genererId, ecrireFichier, lireFichierFiable, listerDossier, supprimerFichier } = require('./stockage');

const PREFIX = 'relations/';
const cheminDe = (id) => `${PREFIX}${id}.json`;

const TYPES_VALIDES = ['individu', 'gang'];
const STATUTS_VALIDES = ['allie', 'ennemi', 'neutre', 'rival'];

async function creerRelation({ nom, type, statut, creeParUserId, creeParUsername }) {
  const id = genererId();
  const relation = {
    nom,
    type: TYPES_VALIDES.includes(type) ? type : 'individu',
    statut: STATUTS_VALIDES.includes(statut) ? statut : 'neutre',
    notes: [],
    creeParUserId,
    creeParUsername,
    creeAt: Date.now()
  };
  await ecrireFichier(cheminDe(id), relation);
  return id;
}

async function obtenirRelation(id) {
  return lireFichierFiable(cheminDe(id));
}

async function listerRelations() {
  const toutes = await listerDossier(PREFIX);
  return toutes.sort((a, b) => a.nom.localeCompare(b.nom));
}

async function definirStatutRelation(id, statut) {
  if (!STATUTS_VALIDES.includes(statut)) return false;
  const chemin = cheminDe(id);
  const relation = await lireFichierFiable(chemin);
  if (!relation) return false;
  relation.statut = statut;
  await ecrireFichier(chemin, relation);
  return true;
}

async function ajouterNoteRelation(id, texte, auteurUsername) {
  const chemin = cheminDe(id);
  const relation = await lireFichierFiable(chemin);
  if (!relation) return false;
  relation.notes.push({ texte, auteurUsername, creeAt: Date.now() });
  if (relation.notes.length > 100) relation.notes.shift();
  await ecrireFichier(chemin, relation);
  return true;
}

async function supprimerRelation(id) {
  return supprimerFichier(cheminDe(id));
}

module.exports = {
  creerRelation,
  obtenirRelation,
  listerRelations,
  definirStatutRelation,
  ajouterNoteRelation,
  supprimerRelation,
  TYPES_VALIDES,
  STATUTS_VALIDES
};
