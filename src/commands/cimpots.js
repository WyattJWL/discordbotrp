'use strict';

const { SlashCommandBuilder } = require('discord.js');
const db = require('../db');
const { calculerImpotHebdomadaire } = require('../tax');
const { formatMontant } = require('../util');
const { repondre } = require('../reponse');
const embeds = require('../embeds');

module.exports = {
  usage: '/cimpots configurer revenu:<nombre> statut:<seul|couple> [partenaire:<nom>]  |  /cimpots profil  |  /cimpots code code:<CODE>',
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
      .addStringOption((opt) => opt.setName('partenaire').setDescription('Nom du/de la partenaire (si en couple)').setRequired(false)))
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

function afficherProfil(interaction, config) {
  const user = db.getUser(interaction.guild.id, interaction.user.id);

  if (user.revenu === null) {
    return repondre(interaction, embeds.info(
      'Profil fiscal',
      "Tu n'as pas encore configuré tes impôts.\nUtilise `/cimpots configurer`."
    ));
  }

  const impot = calculerImpotHebdomadaire(user, config);
  const lignes = [
    `**Revenu déclaré :** ${formatMontant(user.revenu, config.devise)} / semaine`,
    `**Statut :** ${user.statut}${user.partenaire ? ` avec ${user.partenaire}` : ''}`,
    `**Réduction active :** ${user.reductionPourcent}%`,
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}`,
    `**Total déclaré (historique) :** ${formatMontant(user.totalDeclare, config.devise)}`
  ];

  return repondre(interaction, embeds.info('Ton profil fiscal', lignes.join('\n')));
}

function configurerProfil(interaction, config) {
  const revenu = interaction.options.getNumber('revenu');
  const statut = interaction.options.getString('statut');
  const partenaire = (interaction.options.getString('partenaire') || '').trim();

  if (statut === 'couple' && !partenaire) {
    return repondre(interaction, embeds.erreur(
      'Partenaire manquant',
      "En couple, précise le nom du/de la partenaire dans l'option `partenaire`."
    ));
  }

  const user = db.setUserProfil(interaction.guild.id, interaction.user.id, {
    revenu,
    statut,
    partenaire: partenaire || null
  });
  const impot = calculerImpotHebdomadaire(user, config);

  return repondre(interaction, embeds.succes(
    'Profil fiscal mis à jour',
    `**Revenu :** ${formatMontant(revenu, config.devise)} / semaine\n` +
    `**Statut :** ${statut}${partenaire ? ` avec ${partenaire}` : ''}\n` +
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}\n\n` +
    "Utilise `/dimpots` chaque semaine pour déclarer ton paiement."
  ));
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
