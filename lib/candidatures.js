'use strict';

const { put, head, list, del } = require('@vercel/blob');

const PREFIX = 'candidatures/';
const STATUTS_VALIDES = ['en_attente', 'acceptee', 'refusee', 'corrections'];

function cheminDe(id) {
  return `${PREFIX}${id}.json`;
}

async function existeFichier(pathname) {
  try {
    await head(pathname);
    return true;
  } catch {
    return false;
  }
}

async function lireFichier(pathname) {
  try {
    const meta = await head(pathname);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return null;
    const texte = await res.text();
    return texte.trim() ? JSON.parse(texte) : null;
  } catch {
    return null;
  }
}

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Comme lireFichier, mais reessaie si le fichier est introuvable : juste après une
 * écriture (ex: creerCandidature), Vercel Blob peut mettre quelques secondes avant
 * qu'un head()/fetch() ne voie la version la plus récente de façon fiable.
 */
async function lireFichierFiable(pathname, tentatives = 5, delaiMs = 700) {
  for (let i = 0; i < tentatives; i++) {
    const candidature = await lireFichier(pathname);
    if (candidature) return candidature;
    if (i < tentatives - 1) await attendre(delaiMs);
  }
  return null;
}

async function ecrireFichier(pathname, data) {
  await put(pathname, JSON.stringify(data, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

function genererId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

async function creerCandidature(reponses, candidatUserId, candidatUsername) {
  let id;
  do {
    id = genererId();
  } while (await existeFichier(cheminDe(id)));

  const candidature = {
    reponses,
    candidatUserId,
    candidatUsername,
    creeAt: Date.now(),
    statut: 'en_attente',
    vue: false,
    vueAt: null,
    noteStaff: null,
    statutMisAJourAt: null,
    accueilli: false,
    accueilliAt: null
  };

  await ecrireFichier(cheminDe(id), candidature);
  return id;
}

async function obtenirCandidature(id) {
  return lireFichierFiable(cheminDe(id));
}

async function listerToutesBrut() {
  const { blobs } = await list({ prefix: PREFIX });
  const resultats = await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: 'no-store' });
        if (!res.ok) return null;
        const texte = await res.text();
        if (!texte.trim()) return null;
        const id = b.pathname.slice(PREFIX.length).replace(/\.json$/, '');
        return { id, ...JSON.parse(texte) };
      } catch {
        return null;
      }
    })
  );
  return resultats.filter(Boolean);
}

async function listerCandidatures() {
  const toutes = await listerToutesBrut();
  return toutes.sort((a, b) => b.creeAt - a.creeAt);
}

async function supprimerCandidature(id) {
  const chemin = cheminDe(id);
  if (!(await existeFichier(chemin))) return false;
  await del(chemin);
  return true;
}

async function marquerVue(id) {
  const chemin = cheminDe(id);
  const candidature = await lireFichierFiable(chemin);
  if (!candidature || candidature.vue) return;
  candidature.vue = true;
  candidature.vueAt = Date.now();
  await ecrireFichier(chemin, candidature);
}

async function definirStatut(id, statut, note) {
  if (!STATUTS_VALIDES.includes(statut)) return false;
  const chemin = cheminDe(id);
  const candidature = await lireFichierFiable(chemin);
  if (!candidature) return false;

  candidature.statut = statut;
  candidature.noteStaff = note ? note.trim().slice(0, 1000) : null;
  candidature.statutMisAJourAt = Date.now();
  if (!candidature.vue) {
    candidature.vue = true;
    candidature.vueAt = Date.now();
  }

  await ecrireFichier(chemin, candidature);
  return true;
}

async function marquerAccueilli(id) {
  const chemin = cheminDe(id);
  const candidature = await lireFichierFiable(chemin);
  if (!candidature || candidature.accueilli) return false;
  candidature.accueilli = true;
  candidature.accueilliAt = Date.now();
  await ecrireFichier(chemin, candidature);
  return true;
}

async function trouverCandidaturePourUtilisateur(userId) {
  const toutes = await listerToutesBrut();
  const trouvees = toutes
    .filter((c) => c.candidatUserId === userId)
    .sort((a, b) => b.creeAt - a.creeAt);
  return trouvees[0] || null;
}

module.exports = {
  creerCandidature,
  obtenirCandidature,
  listerCandidatures,
  supprimerCandidature,
  marquerVue,
  definirStatut,
  marquerAccueilli,
  trouverCandidaturePourUtilisateur,
  STATUTS_VALIDES
};
