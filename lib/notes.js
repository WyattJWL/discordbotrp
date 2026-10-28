'use strict';

const { genererId, ecrireFichier, lireFichierFiable, listerDossier, supprimerFichier } = require('./stockage');

const PREFIX = 'notes/';
const cheminDe = (id) => `${PREFIX}${id}.json`;

async function creerNote(titre, contenu, auteurUserId, auteurUsername) {
  const id = genererId();
  const note = {
    titre,
    contenu,
    auteurUserId,
    auteurUsername,
    creeAt: Date.now(),
    modifieAt: null
  };
  await ecrireFichier(cheminDe(id), note);
  return id;
}

async function obtenirNote(id) {
  return lireFichierFiable(cheminDe(id));
}

async function listerNotes() {
  const toutes = await listerDossier(PREFIX);
  return toutes.sort((a, b) => b.creeAt - a.creeAt);
}

async function modifierNote(id, titre, contenu) {
  const chemin = cheminDe(id);
  const note = await lireFichierFiable(chemin);
  if (!note) return false;
  note.titre = titre;
  note.contenu = contenu;
  note.modifieAt = Date.now();
  await ecrireFichier(chemin, note);
  return true;
}

async function supprimerNote(id) {
  return supprimerFichier(cheminDe(id));
}

module.exports = { creerNote, obtenirNote, listerNotes, modifierNote, supprimerNote };
