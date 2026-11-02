'use strict';

const embeds = require('../embeds');
const { estAdmin } = require('../util');
const { repondre } = require('../reponse');
const { trouverCandidaturePourUtilisateur, definirStatut } = require('../candidatures');

function urlSite() {
  return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'discordbotrp.vercel.app'}`;
}

async function gerer(interaction, data, config, sousNom, options) {
  if (!estAdmin(interaction)) {
    return repondre(embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
  }

  const membreId = options.membre;
  const candidature = await trouverCandidaturePourUtilisateur(membreId);
  if (!candidature) {
    return repondre(embeds.erreur('Aucune candidature', "Ce membre n'a pas de candidature sur le site."));
  }

  if (candidature.statut !== 'acceptee') {
    await definirStatut(candidature.id, 'acceptee', candidature.noteStaff);
  }

  const lien = `${urlSite()}/rejoindre/${candidature.id}`;
  const embed = embeds.succes(
    '🎉 Candidature acceptée !',
    `Ta candidature pour rejoindre **Sangre Negra** a été acceptée.\n\n` +
    `Clique ci-dessous pour accepter les conditions et finaliser ton arrivée :\n${lien}`
  );

  return {
    type: 4,
    data: {
      content: `<@${membreId}>`,
      embeds: [embed],
      allowed_mentions: { users: [membreId] }
    }
  };
}

module.exports = { gerer };
