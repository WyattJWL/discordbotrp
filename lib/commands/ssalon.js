'use strict';

const embeds = require('../embeds');
const { estAdmin } = require('../util');
const { repondre } = require('../reponse');
const { listerSalons, creerSalonTexte, supprimerSalon } = require('../discord-api');

const PARALLELE = 5;

async function supprimerEnParallele(salons) {
  let echecs = 0;
  const file = [...salons];
  const travailleurs = Array.from({ length: PARALLELE }, async () => {
    while (file.length) {
      const salon = file.shift();
      try {
        await supprimerSalon(salon.id);
      } catch {
        echecs += 1;
      }
    }
  });
  await Promise.all(travailleurs);
  return echecs;
}

async function gerer(interaction) {
  if (!estAdmin(interaction)) {
    return repondre(embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
  }

  const guildId = interaction.guild_id;
  const anciens = await listerSalons(guildId);
  const general = await creerSalonTexte(guildId, 'général');

  const echecs = await supprimerEnParallele(anciens.filter((s) => s.id !== general.id));
  const supprimes = anciens.length - echecs;

  const detail = echecs > 0
    ? `\n⚠️ ${echecs} salon(s) n'ont pas pu être supprimés (salons système d'un serveur Communauté, ou permissions manquantes).`
    : '';

  return repondre(embeds.succes(
    'Serveur nettoyé',
    `${supprimes} salon(s)/catégorie(s) supprimé(s). Il ne reste que <#${general.id}>.${detail}`
  ));
}

module.exports = { gerer };
