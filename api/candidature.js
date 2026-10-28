'use strict';

const { creerCandidature } = require('../lib/candidatures');
const { envoyerMessageSalon } = require('../lib/discord-api');
const { charger: chargerDb, getGuild } = require('../lib/db');

const CHAMPS_REQUIS = [
  'discord', 'majeur', 'experience', 'heures',
  'nomPersonnage', 'histoire', 'motivation', 'apport', 'miseEnSituation'
];

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

  let reponses;
  try {
    const corpsBrut = await lireCorpsBrut(req);
    reponses = JSON.parse(corpsBrut.toString('utf8'));
  } catch {
    res.status(400).send('JSON invalide');
    return;
  }

  for (const champ of CHAMPS_REQUIS) {
    if (!reponses[champ] || !String(reponses[champ]).trim()) {
      res.status(400).send(`Champ manquant : ${champ}`);
      return;
    }
  }
  if (!reponses.reglement) {
    res.status(400).send('Le règlement doit être accepté');
    return;
  }

  const propre = {};
  for (const [cle, valeur] of Object.entries(reponses)) {
    propre[cle] = typeof valeur === 'string' ? valeur.trim().slice(0, 2000) : valeur;
  }

  const id = await creerCandidature(propre);

  try {
    const guildId = process.env.DISCORD_GUILD_ID;
    const data = await chargerDb();
    const canalId = getGuild(data, guildId).config.canalCandidatures;

    if (canalId) {
      const urlVoir = `https://${req.headers.host}/candidature/${id}`;
      await envoyerMessageSalon(canalId, {
        embeds: [{
          color: 0xc81e3a,
          title: '📋 Nouvelle candidature',
          description:
            `**Pseudo Discord :** ${propre.discord}\n` +
            `**Personnage :** ${propre.nomPersonnage}\n\n` +
            `[Voir la candidature complète](${urlVoir})`,
          timestamp: new Date().toISOString()
        }]
      });
    }
  } catch (err) {
    console.error('Notification admin échouée :', err);
  }

  res.status(200).json({ id });
};
