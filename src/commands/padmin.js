'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const embeds = require('../embeds');
const { estAdmin, parseDuree } = require('../util');
const { repondre } = require('../reponse');

module.exports = {
  adminOnly: true,
  usage: '/padmin creer pourcentage:<1-100> duree:<jours|jamais>  |  /padmin liste  |  /padmin revoquer code:<CODE>',
  description: "[Admin] Créer, lister ou révoquer des codes promo de réduction d'impôts.",
  data: new SlashCommandBuilder()
    .setName('padmin')
    .setDescription("[Admin] Créer, lister ou révoquer des codes promo de réduction d'impôts.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub
      .setName('creer')
      .setDescription('Créer un nouveau code promo à usage unique.')
      .addIntegerOption((opt) => opt.setName('pourcentage').setDescription('Réduction en %').setRequired(true).setMinValue(1).setMaxValue(100))
      .addStringOption((opt) => opt.setName('duree').setDescription('Nombre de jours avant expiration, ou "jamais"').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('liste')
      .setDescription('Lister les codes promo actifs.'))
    .addSubcommand((sub) => sub
      .setName('revoquer')
      .setDescription('Invalider un code promo avant son utilisation.')
      .addStringOption((opt) => opt.setName('code').setDescription('Le code à révoquer').setRequired(true))),

  async execute(interaction) {
    if (!estAdmin(interaction.member)) {
      return repondre(interaction, embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
    }

    const sous = interaction.options.getSubcommand();
    if (sous === 'creer') return creerCode(interaction);
    if (sous === 'liste') return listerCodes(interaction);
    if (sous === 'revoquer') return revoquerCode(interaction);
  }
};

function creerCode(interaction) {
  const pourcent = interaction.options.getInteger('pourcentage');
  const dureeArg = interaction.options.getString('duree');
  const expireAt = parseDuree(dureeArg);

  if (expireAt === undefined) {
    return repondre(interaction, embeds.erreur(
      'Durée invalide',
      'Indique un nombre de jours ou `jamais`. Exemple : `7` (expire dans 7 jours) ou `jamais`.'
    ));
  }

  const code = db.creerPromoCode(interaction.guild.id, { pourcent, expireAt, creePar: interaction.user.id });

  return repondre(interaction, embeds.succes(
    'Code promo créé',
    `**Code :** \`${code}\`\n` +
    `**Réduction :** ${pourcent}%\n` +
    `**Expiration :** ${expireAt === null ? 'jamais' : new Date(expireAt).toLocaleString('fr-FR')}\n\n` +
    `Ce code est à usage unique. La personne l'utilise avec \`/cimpots code code:${code}\`.`
  ));
}

function listerCodes(interaction) {
  const codes = db.listerPromoCodesActifs(interaction.guild.id);
  if (codes.length === 0) {
    return repondre(interaction, embeds.info('Codes promo actifs', 'Aucun code actif pour le moment.'));
  }

  const lignes = codes.map((c) =>
    `\`${c.code}\` — ${c.pourcent}% — expire : ${c.expireAt === null ? 'jamais' : new Date(c.expireAt).toLocaleString('fr-FR')}`
  );

  return repondre(interaction, embeds.info('Codes promo actifs', lignes.join('\n')));
}

function revoquerCode(interaction) {
  const code = interaction.options.getString('code');
  const ok = db.revoquerPromoCode(interaction.guild.id, code);

  if (!ok) {
    return repondre(interaction, embeds.erreur('Introuvable', "Ce code n'existe pas (ou plus)."));
  }

  return repondre(interaction, embeds.succes('Code révoqué', `Le code \`${code.toUpperCase()}\` a été supprimé.`));
}
