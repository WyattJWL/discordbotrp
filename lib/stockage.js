'use strict';

const { put, head, list, del } = require('@vercel/blob');

function attendre(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

/**
 * Comme lireFichier, mais reessaie si introuvable : juste apres une ecriture,
 * Vercel Blob peut mettre quelques secondes avant d'etre lisible de facon fiable.
 */
async function lireFichierFiable(pathname, tentatives = 5, delaiMs = 700) {
  for (let i = 0; i < tentatives; i++) {
    const data = await lireFichier(pathname);
    if (data) return data;
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

async function listerDossier(prefix) {
  const { blobs } = await list({ prefix });
  const resultats = await Promise.all(
    blobs.map(async (b) => {
      try {
        const res = await fetch(b.url, { cache: 'no-store' });
        if (!res.ok) return null;
        const texte = await res.text();
        if (!texte.trim()) return null;
        const id = b.pathname.slice(prefix.length).replace(/\.json$/, '');
        return { id, ...JSON.parse(texte) };
      } catch {
        return null;
      }
    })
  );
  return resultats.filter(Boolean);
}

async function supprimerFichier(pathname) {
  if (!(await existeFichier(pathname))) return false;
  await del(pathname);
  return true;
}

function genererId() {
  const alphabet = 'abcdefghjkmnpqrstuvwxyz23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return id;
}

module.exports = {
  existeFichier,
  lireFichier,
  lireFichierFiable,
  ecrireFichier,
  listerDossier,
  supprimerFichier,
  genererId
};
