'use strict';

const { put, head } = require('@vercel/blob');

const PATHNAME = 'candidatures.json';

async function charger() {
  try {
    const meta = await head(PATHNAME);
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return {};
    const texte = await res.text();
    return texte.trim() ? JSON.parse(texte) : {};
  } catch {
    return {};
  }
}

async function sauvegarder(data) {
  await put(PATHNAME, JSON.stringify(data, null, 2), {
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

async function creerCandidature(reponses) {
  const data = await charger();
  let id;
  do {
    id = genererId();
  } while (data[id]);

  data[id] = {
    reponses,
    creeAt: Date.now(),
    statut: 'en_attente'
  };

  await sauvegarder(data);
  return id;
}

async function obtenirCandidature(id) {
  const data = await charger();
  return data[id] || null;
}

async function listerCandidatures() {
  const data = await charger();
  return Object.entries(data)
    .map(([id, candidature]) => ({ id, ...candidature }))
    .sort((a, b) => b.creeAt - a.creeAt);
}

module.exports = { creerCandidature, obtenirCandidature, listerCandidatures };
