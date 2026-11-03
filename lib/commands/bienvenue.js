'use strict';

const embeds = require('../embeds');
const { estAdmin } = require('../util');
const { repondre } = require('../reponse');
const { trouverCandidaturePourUtilisateur, listerCandidatures, definirStatut } = require('../candidatures');

function normaliser(texte) {
  return String(texte || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

/**
 * Cherche la candidature du membre : d'abord par identifiant Discord, puis, à défaut,
 * par pseudo (nom d'utilisateur, nom global ou surnom du serveur).
 */
async function trouverCandidature(interaction, membreId) {
  const parId = await trouverCandidaturePourUtilisateur(membreId);
  if (parId) return { candidature: parId, recentes: [] };

  const utilisateur = interaction.data.resolved?.users?.[membreId];
  const membre = interaction.data.resolved?.members?.[membreId];
  const pseudos = new Set([utilisateur?.username, utilisateur?.global_name, membre?.nick].map(normaliser).filter(Boolean));

  const toutes = await listerCandidatures();
  const parPseudo = toutes.find((c) =>
    [c.candidatUsername, c.reponses?.discord].map(normaliser).some((p) => p && pseudos.has(p))
  );
  return { candidature: parPseudo || null, recentes: toutes.slice(0, 5) };
}

function urlSite() {
  return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'discordbotrp.vercel.app'}`;
}

async function gerer(interaction, data, config, sousNom, options) {
  if (!estAdmin(interaction)) {
    return repondre(embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
  }

  // Pas de sous-commande ici : l'option est directement dans interaction.data.options.
  const membreId = interaction.data.options?.find((o) => o.name === 'membre')?.value;
  if (!membreId) {
    return repondre(embeds.erreur('Membre manquant', 'Indique le membre à accueillir.'));
  }
  const { candidature, recentes } = await trouverCandidature(interaction, membreId);
  if (!candidature) {
    const lignes = recentes.map((c) => `• \`${c.candidatUsername || '?'}\` — ${c.reponses?.nomPersonnage || '?'} (${c.statut})`);
    return repondre(embeds.erreur(
      'Aucune candidature trouvée',
      `Aucune candidature ne correspond à <@${membreId}> (ni par compte Discord, ni par pseudo).` +
      (lignes.length ? `\n\n**Dernières candidatures :**\n${lignes.join('\n')}\n\nLa personne a peut-être postulé avec un autre compte Discord.` : '')
    ));
  }

  if (candidature.statut !== 'acceptee') {
    await definirStatut(candidature.id, 'acceptee', candidature.noteStaff);
  }

  const lien = `${urlSite()}/rejoindre/${candidature.id}`;
  const embed = embeds.succes(
    '🎉 Candidature acceptée !',
    `Ta candidature pour rejoindre **M13** a été acceptée.\n\n` +
    `Clique ci-dessous pour accepter les conditions et finaliser ton arrivée :\n${lien}`
  );

  return {
    type: 4,
    data: {
      content: `<@${candidature.candidatUserId}>`,
      embeds: [embed],
      allowed_mentions: { users: [candidature.candidatUserId] }
    }
  };
}

module.exports = { gerer };
