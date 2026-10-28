'use strict';

const path = require('path');
const config = require(path.join(__dirname, '..', 'config.json'));
const db = require('./db');
const embeds = require('./embeds');
const { repondre } = require('./reponse');

const MODULES = {
  cimpots: require('./commands/cimpots'),
  dimpots: require('./commands/dimpots'),
  himpot: require('./commands/himpot'),
  aideimpots: require('./commands/aideimpots'),
  padmin: require('./commands/padmin'),
  aimpots: require('./commands/aimpots'),
  ssalon: require('./commands/ssalon')
};

function extraireSousCommande(interactionData) {
  const sous = interactionData.options?.[0];
  if (!sous || sous.type !== 1) return { nom: null, options: {} };

  const options = {};
  for (const opt of sous.options || []) {
    options[opt.name] = opt.value;
  }
  return { nom: sous.name, options };
}

async function gererCommande(interaction) {
  const module = MODULES[interaction.data.name];
  if (!module) {
    return repondre(embeds.erreur('Commande inconnue', "Cette commande n'existe plus."));
  }

  const { nom: sousNom, options } = extraireSousCommande(interaction.data);
  const data = await db.charger();
  const avant = JSON.stringify(data);

  const reponse = await module.gerer(interaction, data, config, sousNom, options);

  if (JSON.stringify(data) !== avant) {
    await db.sauvegarder(data);
  }

  return reponse;
}

module.exports = { gererCommande };
