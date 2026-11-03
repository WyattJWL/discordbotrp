'use strict';

const db = require('../db');
const { calculerImpotHebdomadaire } = require('../tax');
const { formatMontant, obtenirAuteur, obtenirNomAffichage } = require('../util');
const { repondre } = require('../reponse');
const embeds = require('../embeds');
const { envoyerInvitationCouple: invitationCouple } = require('../couple');

async function gerer(interaction, data, config, sousNom, options) {
  const guildId = interaction.guild_id;
  const auteur = obtenirAuteur(interaction);

  if (sousNom === 'profil') return afficherProfil(data, config, guildId, auteur.id);
  if (sousNom === 'code') return appliquerCode(data, config, guildId, auteur.id, options.code);
  if (sousNom === 'configurer') return configurerProfil(interaction, data, config, guildId, auteur, options);

  return repondre(embeds.erreur('Commande inconnue', 'Sous-commande non reconnue.'));
}

async function afficherProfil(data, config, guildId, userId) {
  const user = db.getUser(data, guildId, userId);

  if (user.revenu === null) {
    return repondre(embeds.info(
      'Profil fiscal',
      "Tu n'as pas encore configuré tes impôts.\nUtilise `/cimpots configurer`."
    ));
  }

  const impot = calculerImpotHebdomadaire(user, config);
  let ligneStatut = `**Statut :** ${user.statut}`;

  if (user.statut === 'couple' && user.partenaire) {
    const nomPartenaire = await obtenirNomAffichage(guildId, user.partenaire);
    ligneStatut += ` avec ${nomPartenaire}${user.partenaireConfirme ? '' : ' _(en attente de confirmation)_'}`;
  }

  const lignes = [
    `**Revenu déclaré :** ${formatMontant(user.revenu, config.devise)} / semaine`,
    ligneStatut,
    `**Réduction active :** ${user.reductionPourcent}%`,
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}`,
    `**Total déclaré (historique) :** ${formatMontant(user.totalDeclare, config.devise)}`
  ];

  return repondre(embeds.info('Ton profil fiscal', lignes.join('\n')));
}

async function configurerProfil(interaction, data, config, guildId, auteur, options) {
  const revenu = options.revenu;
  const statut = options.statut;
  const partenaireId = options.partenaire || null;

  if (statut === 'couple') {
    if (!partenaireId) {
      return repondre(embeds.erreur(
        'Partenaire manquant',
        "En couple, choisis ton/ta partenaire dans l'option `partenaire`."
      ));
    }
    if (partenaireId === auteur.id) {
      return repondre(embeds.erreur('Partenaire invalide', 'Tu ne peux pas te mettre en couple avec toi-même.'));
    }
    const partenaireResolu = interaction.data.resolved?.users?.[partenaireId];
    if (partenaireResolu?.bot) {
      return repondre(embeds.erreur('Partenaire invalide', 'Tu ne peux pas te mettre en couple avec un bot.'));
    }
  }

  db.setUserProfil(data, guildId, auteur.id, {
    revenu,
    statut,
    partenaireId: statut === 'couple' ? partenaireId : null
  });

  if (statut === 'couple') {
    const envoyeEnDm = await envoyerInvitationCouple(interaction, guildId, auteur, partenaireId);
    return repondre(embeds.succes(
      'Profil enregistré',
      `**Revenu :** ${formatMontant(revenu, config.devise)} / semaine\n\n` +
      `💌 Invitation de couple envoyée à <@${partenaireId}> — en attente de sa confirmation.\n` +
      "La réduction s'appliquera une fois qu'il/elle aura accepté." +
      (envoyeEnDm ? '' : "\n⚠️ Je n'ai pas pu lui envoyer de message privé (DMs fermés) ; l'invitation a été postée dans ce salon à la place.")
    ));
  }

  const user = db.getUser(data, guildId, auteur.id);
  const impot = calculerImpotHebdomadaire(user, config);

  return repondre(embeds.succes(
    'Profil fiscal mis à jour',
    `**Revenu :** ${formatMontant(revenu, config.devise)} / semaine\n` +
    `**Statut :** seul\n` +
    `**Impôt à payer / semaine :** ${formatMontant(impot, config.devise)}\n\n` +
    "Utilise `/dimpots` chaque semaine pour déclarer ton paiement."
  ));
}

function envoyerInvitationCouple(interaction, guildId, auteur, partenaireId) {
  return invitationCouple(guildId, auteur.id, partenaireId, interaction.channel_id);
}

async function appliquerCode(data, config, guildId, userId, code) {
  if (!code) {
    return repondre(embeds.erreur('Code manquant', 'Exemple : `/cimpots code code:IMPOT-XXXX-XXXX`'));
  }

  const entry = db.trouverPromoCode(data, guildId, code);
  if (!entry) {
    return repondre(embeds.erreur('Code invalide', "Ce code promo n'existe pas."));
  }
  if (entry.utilisePar) {
    return repondre(embeds.erreur('Code déjà utilisé', 'Ce code promo a déjà été utilisé.'));
  }
  if (entry.expireAt !== null && entry.expireAt <= Date.now()) {
    return repondre(embeds.erreur('Code expiré', 'Ce code promo a expiré.'));
  }

  db.utiliserPromoCode(data, guildId, code, userId);
  const user = db.getUser(data, guildId, userId);
  const impot = user.revenu !== null ? calculerImpotHebdomadaire(user, config) : null;

  return repondre(embeds.succes(
    'Code promo appliqué !',
    `Réduction de **${entry.pourcent}%** appliquée à tes impôts.` +
    (impot !== null ? `\nNouveau montant à payer / semaine : ${formatMontant(impot, config.devise)}` : '')
  ));
}

module.exports = { gerer };
