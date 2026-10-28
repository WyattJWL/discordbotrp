'use strict';

const { put } = require('@vercel/blob');

function lireCorpsBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on('data', (chunk) => morceaux.push(chunk));
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
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

  const corpsBrut = await lireCorpsBrut(req);

  try {
    JSON.parse(corpsBrut.toString('utf8'));
  } catch {
    res.status(400).send('JSON invalide');
    return;
  }

  await put('db.json', corpsBrut, {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true
  });

  res.status(200).send('Migration terminee');
};

module.exports.config = {
  api: {
    bodyParser: false
  }
};
