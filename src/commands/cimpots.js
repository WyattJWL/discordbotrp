'use strict';

const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../db');
const { calculerImpotHebdomadaire } = require('../tax');
const { formatMontant, obtenirNomAffichage } = require('../util');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

module.exports = {
  usage: '/cimpots configurer revenu:<nombre> statut:<seul|couple> [partenaire:<@membre>]  |  /cimpots profil  |  /cimpots code code:<CODE>',
  description: 'Configurer ton profil fiscal, le consulter, ou utiliser un code promo.',
  data: new SlashCommandBuilder()
    .setName('cimpots')
    .setDescription('Configurer ou consulter ton profil fiscal.')
    .addSubcommand((sub) => sub
      .setName('configurer')
      .setDescription('Configure ton revenu hebdomadaire et ton statut.')
      .addNumberOption((opt) => opt.setName('revenu').setDescription('Ton revenu par semaine').setRequired(true).setMinValue(0))
      .addStringOption((opt) => opt
        .setName('statut')
        .setDescription('Seul ou en couple')
        .setRequired(true)
        .addChoices({ name: 'Seul', value: 'seul' }, { name: 'Couple', value: 'couple' }))
      .addUserOption((opt) => opt.setName('partenaire').setDescription('Ton/ta partenaire (si en couple) — il/elle devra accepter').setRequired(false)))
    .addSubcommand((sub) => sub
      .setName('profil')
      .setDescription('Voir ton profil fiscal actuel.'))
    .addSubcommand((sub) => sub
      .setName('code')
      .setDescription('Utiliser un code promo pour réduire tes impôts.')
      .addStringOption((opt) => opt.setName('code').setDescription('Le code promo').setRequired(true))),

  async execute(interaction, config) {
    const sous = interaction.options.getSubcommand();
    if (sous === 'configurer') return configurerProfil(interaction, config);
    if (sous === 'profil') return afficherProfil(interaction, config);
    if (sous === 'code') return appliquerCode(interaction, config);
  }
};

async function afficherProfil(interaction, config) {
  const guildId = interaction.guild.id;
  const user = db.getUser(guildId, interaction.user.id);

  if (user.revenu === null) {
    return repondre(interaction, embeds.info(
      'Profil fiscal',
      "Tu n'as pas encore configuré tes impôts.\nUtilise `/cimpots configurer`."
    ));
  }

  const impot = calculerImpotHebdomadaire(user, config);
  let ligneStatut = `**Statut :** ${user.statut}`;

  if (user.statut === 'couple' && user.partenaire) {
    const nomPartenaire = await obtenirNomAffichage(interaction.client, guildId, user.partenaire);
    ligneStatut += ` avec ${nomPartenaire}${user.partenaireConfirme ? '' : ' _(en attente de confirmation)_'}`;
  }

  const lignes = [
    `**Revenu déclaré :** ${formatMontant(user.revenu, config.devise)} / semaine`,
    ligneStatut,
    `**Réduction active :** ${user.reductionPourcent}%`,
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}`,
    `**Total déclaré (historique) :** ${formatMontant(user.totalDeclare, config.devise)}`
  ];

  return repondre(interaction, embeds.info('Ton profil fiscal', lignes.join('\n')));
}

async function configurerProfil(interaction, config) {
  const revenu = interaction.options.getNumber('revenu');
  const statut = interaction.options.getString('statut');
  const partenaireUser = interaction.options.getUser('partenaire');
  const guildId = interaction.guild.id;

  if (statut === 'couple') {
    if (!partenaireUser) {
      return repondre(interaction, embeds.erreur(
        'Partenaire manquant',
        "En couple, choisis ton/ta partenaire dans l'option `partenaire`."
      ));
    }
    if (partenaireUser.id === interaction.user.id) {
      return repondre(interaction, embeds.erreur('Partenaire invalide', 'Tu ne peux pas te mettre en couple avec toi-même.'));
    }
    if (partenaireUser.bot) {
      return repondre(interaction, embeds.erreur('Partenaire invalide', 'Tu ne peux pas te mettre en couple avec un bot.'));
    }
  }

  db.setUserProfil(guildId, interaction.user.id, {
    revenu,
    statut,
    partenaireId: statut === 'couple' ? partenaireUser.id : null
  });

  if (statut === 'couple') {
    const envoyeEnDm = await envoyerInvitationCouple(interaction, partenaireUser);
    return repondre(interaction, embeds.succes(
      'Profil enregistré',
      `**Revenu :** ${formatMontant(revenu, config.devise)} / semaine\n\n` +
      `💌 Invitation de couple envoyée à ${partenaireUser} — en attente de sa confirmation.\n` +
      `La réduction s'appliquera une fois qu'il/elle aura accepté.` +
      (envoyeEnDm ? '' : "\n⚠️ Je n'ai pas pu lui envoyer de message privé (DMs fermés) ; l'invitation a été postée dans ce salon à la place.")
    ));
  }

  const user = db.getUser(guildId, interaction.user.id);
  const impot = calculerImpotHebdomadaire(user, config);

  return repondre(interaction, embeds.succes(
    'Profil fiscal mis à jour',
    `**Revenu :** ${formatMontant(revenu, config.devise)} / semaine\n` +
    `**Statut :** seul\n` +
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}\n\n` +
    "Utilise `/dimpots` chaque semaine pour déclarer ton paiement."
  ));
}

async function envoyerInvitationCouple(interaction, partenaireUser) {
  const guildId = interaction.guild.id;
  const inviteurId = interaction.user.id;

  const ligne = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`couple_accept_${guildId}_${inviteurId}_${partenaireUser.id}`)
      .setLabel('Accepter')
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(`couple_decline_${guildId}_${inviteurId}_${partenaireUser.id}`)
      .setLabel('Refuser')
      .setStyle(ButtonStyle.Danger)
  );

  const embed = embeds.info(
    '💌 Invitation de couple',
    `${interaction.user} veut te mettre comme partenaire pour ses impôts sur **${interaction.guild.name}**.\n` +
    "Si tu acceptes, vous obtenez tous les deux une réduction sur vos impôts hebdomadaires."
  );

  try {
    await partenaireUser.send({ embeds: [embed], components: [ligne] });
    return true;
  } catch {
    await interaction.channel.send({ content: `${partenaireUser}`, embeds: [embed], components: [ligne] }).catch(() => {});
    return false;
  }
}

function appliquerCode(interaction, config) {
  const code = interaction.options.getString('code');
  const guildId = interaction.guild.id;
  const entry = db.trouverPromoCode(guildId, code);

  if (!entry) {
    return repondre(interaction, embeds.erreur('Code invalide', "Ce code promo n'existe pas."));
  }
  if (entry.utilisePar) {
    return repondre(interaction, embeds.erreur('Code déjà utilisé', 'Ce code promo a déjà été utilisé.'));
  }
  if (entry.expireAt !== null && entry.expireAt <= Date.now()) {
    return repondre(interaction, embeds.erreur('Code expiré', 'Ce code promo a expiré.'));
  }

  db.utiliserPromoCode(guildId, code, interaction.user.id);
  const user = db.getUser(guildId, interaction.user.id);
  const impot = user.revenu !== null ? calculerImpotHebdomadaire(user, config) : null;

  return repondre(interaction, embeds.succes(
    'Code promo appliqué !',
    `Réduction de **${entry.pourcent}%** appliquée à tes impôts.` +
    (impot !== null ? `\nNouveau montant à payer / semaine : ${formatMontant(impot, config.devise)}` : '')
  ));
}
