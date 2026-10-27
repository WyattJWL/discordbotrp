'use strict';

const { MessageFlags } = require('discord.js');
const db = require('./db');
const embeds = require('./embeds');
const { obtenirNomAffichage } = require('./util');

async function gererBouton(interaction) {
  const [prefixe, action, guildId, inviteurId, partenaireId] = interaction.customId.split('_');
  if (prefixe !== 'couple') return;

  if (interaction.user.id !== partenaireId) {
    return interaction.reply({ content: "Cette invitation ne t'est pas destinée.", flags: MessageFlags.Ephemeral });
  }

  const nomInviteur = await obtenirNomAffichage(interaction.client, guildId, inviteurId);
  const nomPartenaire = await obtenirNomAffichage(interaction.client, guildId, partenaireId);

  if (action === 'accept') {
    db.confirmerCouple(guildId, inviteurId, partenaireId);
    await interaction.update({
      embeds: [embeds.succes(
        'Invitation acceptée',
        `Tu es maintenant en couple avec **${nomInviteur}**.\n` +
        "Pense à configurer tes propres impôts avec `/cimpots configurer` si ce n'est pas déjà fait."
      )],
      components: []
    });
    await notifierInviteur(interaction.client, inviteurId, embeds.succes(
      'Invitation acceptée !',
      `**${nomPartenaire}** a accepté ton invitation de couple. La réduction s'applique dès maintenant.`
    ));
    return;
  }

  if (action === 'decline') {
    db.refuserCouple(guildId, inviteurId);
    await interaction.update({
      embeds: [embeds.info('Invitation refusée', `Tu as refusé l'invitation de **${nomInviteur}**.`)],
      components: []
    });
    await notifierInviteur(interaction.client, inviteurId, embeds.erreur(
      'Invitation refusée',
      `**${nomPartenaire}** a refusé ton invitation de couple.`
    ));
  }
}

async function notifierInviteur(client, inviteurId, embed) {
  try {
    const user = await client.users.fetch(inviteurId);
    await user.send({ embeds: [embed] });
  } catch {
    // DMs fermés chez l'inviteur, tant pis.
  }
}

module.exports = { gererBouton };
