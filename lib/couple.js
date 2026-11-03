'use strict';

const embeds = require('./embeds');
const { envoyerDM, envoyerMessageSalon } = require('./discord-api');

/**
 * Envoie l'invitation de couple en DM (avec boutons Accepter/Refuser).
 * Si les DMs sont fermés et qu'un salon de secours est fourni, l'invitation y est postée.
 * Renvoie true si le DM est bien parti.
 */
async function envoyerInvitationCouple(guildId, auteurId, partenaireId, canalSecoursId) {
  const ligne = {
    type: 1,
    components: [
      { type: 2, style: 3, label: 'Accepter', custom_id: `couple_accept_${guildId}_${auteurId}_${partenaireId}` },
      { type: 2, style: 4, label: 'Refuser', custom_id: `couple_decline_${guildId}_${auteurId}_${partenaireId}` }
    ]
  };

  const embed = embeds.info(
    '💌 Invitation de couple',
    `<@${auteurId}> veut te mettre comme partenaire pour ses impôts sur ce serveur.\n` +
    "Si tu acceptes, vous obtenez tous les deux une réduction sur vos impôts hebdomadaires."
  );

  try {
    await envoyerDM(partenaireId, { embeds: [embed], components: [ligne] });
    return true;
  } catch {
    if (canalSecoursId) {
      try {
        await envoyerMessageSalon(canalSecoursId, { content: `<@${partenaireId}>`, embeds: [embed], components: [ligne] });
      } catch {
        // tant pis, l'appelant le signale à l'utilisateur
      }
    }
    return false;
  }
}

module.exports = { envoyerInvitationCouple };
