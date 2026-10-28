'use strict';

const db = require('./db');
const embeds = require('./embeds');
const { obtenirNomAffichage } = require('./util');
const { mettreAJour, repondreTexte } = require('./reponse');
const { envoyerDM } = require('./discord-api');

async function gererBouton(interaction) {
  const [prefixe, action, guildId, inviteurId, partenaireId] = interaction.data.custom_id.split('_');
  if (prefixe !== 'couple') return repondreTexte('Interaction inconnue.');

  const cliqueurId = (interaction.member?.user || interaction.user).id;
  if (cliqueurId !== partenaireId) {
    return repondreTexte("Cette invitation ne t'est pas destinée.");
  }

  const data = await db.charger();
  const nomInviteur = await obtenirNomAffichage(guildId, inviteurId);
  const nomPartenaire = await obtenirNomAffichage(guildId, partenaireId);

  if (action === 'accept') {
    db.confirmerCouple(data, guildId, inviteurId, partenaireId);
    await db.sauvegarder(data);
    await notifierInviteur(inviteurId, embeds.succes(
      'Invitation acceptée !',
      `**${nomPartenaire}** a accepté ton invitation de couple. La réduction s'applique dès maintenant.`
    ));
    return mettreAJour(embeds.succes(
      'Invitation acceptée',
      `Tu es maintenant en couple avec **${nomInviteur}**.\n` +
      "Pense à configurer tes propres impôts avec `/cimpots configurer` si ce n'est pas déjà fait."
    ));
  }

  if (action === 'decline') {
    db.refuserCouple(data, guildId, inviteurId);
    await db.sauvegarder(data);
    await notifierInviteur(inviteurId, embeds.erreur(
      'Invitation refusée',
      `**${nomPartenaire}** a refusé ton invitation de couple.`
    ));
    return mettreAJour(embeds.info('Invitation refusée', `Tu as refusé l'invitation de **${nomInviteur}**.`));
  }

  return repondreTexte('Action inconnue.');
}

async function notifierInviteur(inviteurId, embed) {
  try {
    await envoyerDM(inviteurId, { embeds: [embed] });
  } catch {
    // DMs fermés chez l'inviteur, tant pis.
  }
}

module.exports = { gererBouton };
