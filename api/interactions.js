'use strict';

const { verifyKey } = require('discord-interactions');
const { gererCommande } = require('../lib/commandes');
const { gererBouton } = require('../lib/boutons');

const PUBLIC_KEY = process.env.DISCORD_PUBLIC_KEY;

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

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const corpsBrut = await lireCorpsBrut(req);

  const estValide = signature && timestamp && verifyKey(corpsBrut, signature, timestamp, PUBLIC_KEY);
  if (!estValide) {
    res.status(401).send('Signature invalide');
    return;
  }

  const interaction = JSON.parse(corpsBrut.toString('utf8'));

  if (interaction.type === 1) {
    res.status(200).json({ type: 1 });
    return;
  }

  try {
    if (interaction.type === 2) {
      const reponse = await gererCommande(interaction);
      res.status(200).json(reponse);
      return;
    }

    if (interaction.type === 3) {
      const reponse = await gererBouton(interaction);
      res.status(200).json(reponse);
      return;
    }

    res.status(400).send('Type non supporté');
  } catch (err) {
    console.error('Erreur interaction :', err);
    res.status(200).json({
      type: 4,
      data: { content: 'Une erreur est survenue en exécutant cette commande.', flags: 64 }
    });
  }
};
