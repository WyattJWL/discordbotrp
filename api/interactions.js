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

// TEMPORAIRE : enregistre /ssalon sur le serveur (a supprimer avec la commande).
async function enregistrerSsalon(res) {
  const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;
  const r = await fetch(`https://discord.com/api/v10/applications/${DISCORD_CLIENT_ID}/guilds/${DISCORD_GUILD_ID}/commands`, {
    method: 'POST',
    headers: { Authorization: `Bot ${DISCORD_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'ssalon',
      description: '[Admin] Supprime tous les salons, ne garde que #général.',
      default_member_permissions: '8'
    })
  });
  res.status(200).send(r.ok ? 'Commande /ssalon enregistree.' : `Echec ${r.status} : ${await r.text()}`);
}

async function handler(req, res) {
  if (req.method === 'GET' && req.query?.enregistrer === 'ssalon') {
    await enregistrerSsalon(res);
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const corpsBrut = await lireCorpsBrut(req);

  const estValide = signature && timestamp && (await verifyKey(corpsBrut, signature, timestamp, PUBLIC_KEY));
  if (!estValide) {
    res.status(401).send('Signature invalide');
    return;
  }

  let interaction;
  try {
    interaction = JSON.parse(corpsBrut.toString('utf8'));
  } catch {
    res.status(400).send('Corps JSON invalide');
    return;
  }

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
}

module.exports = handler;
module.exports.config = {
  api: {
    bodyParser: false
  }
};
