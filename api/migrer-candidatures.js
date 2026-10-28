'use strict';

const { head, put } = require('@vercel/blob');

async function lireAncien() {
  try {
    const meta = await head('candidatures.json');
    const res = await fetch(meta.url, { cache: 'no-store' });
    if (!res.ok) return {};
    const texte = await res.text();
    return texte.trim() ? JSON.parse(texte) : {};
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  if (req.headers['x-migration-secret'] !== process.env.MIGRATION_SECRET) {
    res.status(401).send('Non autorisé');
    return;
  }

  const ancien = await lireAncien();
  const ids = Object.keys(ancien);

  for (const id of ids) {
    await put(`candidatures/${id}.json`, JSON.stringify(ancien[id], null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
      allowOverwrite: true
    });
  }

  res.status(200).json({ migrees: ids });
};
