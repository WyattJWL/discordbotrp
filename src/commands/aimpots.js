'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const db = require('../db');
const embeds = require('../embeds');
const { estAdmin, formatMontant } = require('../util');
const { calculerImpotHebdomadaire } = require('../tax');
const { repondre } = require('../reponse');

module.exports = {
  adminOnly: true,
  usage: '/aimpots reset|ajouter|retirer|telephone|voir|liste',
  description: "[Admin] Gérer manuellement les impôts des membres (reset, correction, téléphone, vue d'ensemble).",
  data: new SlashCommandBuilder()
    .setName('aimpots')
    .setDescription('[Admin] Gérer manuellement les impôts des membres.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((sub) => sub
      .setName('reset')
      .setDescription("Réinitialiser le profil fiscal d'un membre.")
      .addUserOption((opt) => opt.setName('membre').setDescription('Le membre cible').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('ajouter')
      .setDescription('Ajouter un montant au total déclaré.')
      .addUserOption((opt) => opt.setName('membre').setDescription('Le membre cible').setRequired(true))
      .addNumberOption((opt) => opt.setName('montant').setDescription('Montant à ajouter').setRequired(true).setMinValue(0.01)))
    .addSubcommand((sub) => sub
      .setName('retirer')
      .setDescription('Retirer un montant du total déclaré.')
      .addUserOption((opt) => opt.setName('membre').setDescription('Le membre cible').setRequired(true))
      .addNumberOption((opt) => opt.setName('montant').setDescription('Montant à retirer').setRequired(true).setMinValue(0.01)))
    .addSubcommand((sub) => sub
      .setName('telephone')
      .setDescription('Configurer le numéro affiché par /himpot.')
      .addStringOption((opt) => opt.setName('numero').setDescription('Le numéro à afficher').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('voir')
      .setDescription("Voir le profil fiscal complet d'un membre.")
      .addUserOption((opt) => opt.setName('membre').setDescription('Le membre cible').setRequired(true)))
    .addSubcommand((sub) => sub
      .setName('liste')
      .setDescription('Vue d\'ensemble de tous les membres configurés.')),

  async execute(interaction, config) {
    if (!estAdmin(interaction.member)) {
      return repondre(interaction, embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
    }

    const guildId = interaction.guild.id;
    const sous = interaction.options.getSubcommand();

    switch (sous) {
      case 'reset':
        return resetMembre(interaction, guildId);
      case 'ajouter':
        return ajusterMontant(interaction, guildId, config, 1);
      case 'retirer':
        return ajusterMontant(interaction, guildId, config, -1);
      case 'telephone':
        return configurerTelephone(interaction, guildId);
      case 'voir':
        return voirMembre(interaction, guildId, config);
      case 'liste':
        return listerMembres(interaction, guildId, config);
      default:
        return;
    }
  }
};

function ajusterMontant(interaction, guildId, config, sens) {
  const utilisateur = interaction.options.getUser('membre');
  const montant = interaction.options.getNumber('montant');

  const user = db.ajusterTotal(guildId, utilisateur.id, montant * sens);
  const action = sens > 0 ? 'ajouté à' : 'retiré de';

  return repondre(interaction, embeds.succes(
    'Montant ajusté',
    `${formatMontant(montant, config.devise)} ${action} le total déclaré de ${utilisateur.username}.\n` +
    `Nouveau total : ${formatMontant(user.totalDeclare, config.devise)}`
  ));
}

function resetMembre(interaction, guildId) {
  const utilisateur = interaction.options.getUser('membre');
  db.resetUser(guildId, utilisateur.id);
  return repondre(interaction, embeds.succes('Profil réinitialisé', `Le profil fiscal de ${utilisateur.username} a été réinitialisé.`));
}

function configurerTelephone(interaction, guildId) {
  const numero = interaction.options.getString('numero').trim();
  db.setTelephone(guildId, numero);
  return repondre(interaction, embeds.succes('Numéro mis à jour', `Le numéro affiché par \`/himpot\` est maintenant : **${numero}**`));
}

function voirMembre(interaction, guildId, config) {
  const utilisateur = interaction.options.getUser('membre');
  const user = db.getUser(guildId, utilisateur.id);

  if (user.revenu === null) {
    return repondre(interaction, embeds.info(`Profil de ${utilisateur.username}`, "Ce membre n'a pas encore configuré ses impôts."));
  }

  const impot = calculerImpotHebdomadaire(user, config);
  const lignes = [
    `**Revenu :** ${formatMontant(user.revenu, config.devise)} / semaine`,
    `**Statut :** ${user.statut}${user.partenaire ? ` avec ${user.partenaire}` : ''}`,
    `**Réduction :** ${user.reductionPourcent}%`,
    `**Impôt / semaine :** ${formatMontant(impot, config.devise)}`,
    `**Total déclaré :** ${formatMontant(user.totalDeclare, config.devise)}`,
    `**Dernière déclaration :** ${user.derniereDeclarationAt ? new Date(user.derniereDeclarationAt).toLocaleString('fr-FR') : 'jamais'}`
  ];

  return repondre(interaction, embeds.info(`Profil de ${utilisateur.username}`, lignes.join('\n')));
}

function listerMembres(interaction, guildId, config) {
  const guild = db.getGuild(guildId);
  const entries = Object.entries(guild.users).filter(([, u]) => u.revenu !== null);

  if (entries.length === 0) {
    return repondre(interaction, embeds.info("Vue d'ensemble", "Aucun membre n'a encore configuré ses impôts."));
  }

  const lignes = entries.map(([id, u]) => {
    const impot = calculerImpotHebdomadaire(u, config);
    return `<@${id}> — ${formatMontant(impot, config.devise)}/sem — total déclaré : ${formatMontant(u.totalDeclare, config.devise)}`;
  });

  return repondre(interaction, embeds.info("Vue d'ensemble des impôts", lignes.join('\n')));
}
