'use strict';

const db = require('../db');
const embeds = require('../embeds');
const { estAdmin, formatMontant, obtenirNomAffichage } = require('../util');
const { calculerImpotHebdomadaire } = require('../tax');
const { repondre } = require('../reponse');

const USAGE =
  '/aimpots reset <@membre>  |  /aimpots ajouter <@membre> <montant>  |  /aimpots retirer <@membre> <montant>  |  ' +
  '/aimpots telephone <numero>  |  /aimpots canalcandidatures <#salon>  |  /aimpots voir <@membre>  |  /aimpots liste';

async function gerer(interaction, data, config, sousNom, options) {
  if (!estAdmin(interaction)) {
    return repondre(embeds.erreur('Accès refusé', 'Commande réservée aux administrateurs.'));
  }

  const guildId = interaction.guild_id;

  switch (sousNom) {
    case 'reset':
      return resetMembre(data, guildId, options);
    case 'ajouter':
      return ajusterMontant(data, guildId, config, options, 1);
    case 'retirer':
      return ajusterMontant(data, guildId, config, options, -1);
    case 'telephone':
      return configurerTelephone(data, guildId, options);
    case 'canalcandidatures':
      return configurerCanalCandidatures(data, guildId, options);
    case 'voir':
      return voirMembre(data, guildId, config, options);
    case 'liste':
      return listerMembres(data, guildId, config);
    default:
      return repondre(embeds.erreur('Utilisation', USAGE));
  }
}

async function resetMembre(data, guildId, options) {
  const membreId = options.membre;
  const nom = await obtenirNomAffichage(guildId, membreId);
  db.resetUser(data, guildId, membreId);
  return repondre(embeds.succes('Profil réinitialisé', `Le profil fiscal de ${nom} a été réinitialisé.`));
}

async function ajusterMontant(data, guildId, config, options, sens) {
  const membreId = options.membre;
  const montant = options.montant;
  const nom = await obtenirNomAffichage(guildId, membreId);

  const user = db.ajusterTotal(data, guildId, membreId, montant * sens);
  const action = sens > 0 ? 'ajouté à' : 'retiré de';

  return repondre(embeds.succes(
    'Montant ajusté',
    `${formatMontant(montant, config.devise)} ${action} le total déclaré de ${nom}.\n` +
    `Nouveau total : ${formatMontant(user.totalDeclare, config.devise)}`
  ));
}

function configurerTelephone(data, guildId, options) {
  const numero = String(options.numero || '').trim();
  if (!numero) {
    return repondre(embeds.erreur('Numéro manquant', 'Exemple : `/aimpots telephone numero:06 12 34 56 78`'));
  }
  db.setTelephone(data, guildId, numero);
  return repondre(embeds.succes('Numéro mis à jour', `Le numéro affiché par \`/himpot\` est maintenant : **${numero}**`));
}

function configurerCanalCandidatures(data, guildId, options) {
  const canalId = options.salon;
  if (!canalId) {
    return repondre(embeds.erreur('Salon manquant', 'Exemple : `/aimpots canalcandidatures salon:#candidatures`'));
  }
  db.setCanalCandidatures(data, guildId, canalId);
  return repondre(embeds.succes(
    'Salon mis à jour',
    `Les nouvelles candidatures seront désormais annoncées dans <#${canalId}>.`
  ));
}

async function voirMembre(data, guildId, config, options) {
  const membreId = options.membre;
  const nom = await obtenirNomAffichage(guildId, membreId);
  const user = db.getUser(data, guildId, membreId);

  if (user.revenu === null) {
    return repondre(embeds.info(`Profil de ${nom}`, "Ce membre n'a pas encore configuré ses impôts."));
  }

  let ligneStatut = `**Statut :** ${user.statut}`;
  if (user.statut === 'couple' && user.partenaire) {
    const nomPartenaire = await obtenirNomAffichage(guildId, user.partenaire);
    ligneStatut += ` avec ${nomPartenaire}${user.partenaireConfirme ? '' : ' (en attente de confirmation)'}`;
  }

  const impot = calculerImpotHebdomadaire(user, config);
  const lignes = [
    `**Revenu :** ${formatMontant(user.revenu, config.devise)} / semaine`,
    ligneStatut,
    `**Réduction :** ${user.reductionPourcent}%`,
    `**Impôt / semaine :** ${formatMontant(impot, config.devise)}`,
    `**Total déclaré :** ${formatMontant(user.totalDeclare, config.devise)}`,
    `**Dernière déclaration :** ${user.derniereDeclarationAt ? new Date(user.derniereDeclarationAt).toLocaleString('fr-FR') : 'jamais'}`
  ];

  return repondre(embeds.info(`Profil de ${nom}`, lignes.join('\n')));
}

function listerMembres(data, guildId, config) {
  const guild = db.getGuild(data, guildId);
  const entries = Object.entries(guild.users).filter(([, u]) => u.revenu !== null);

  if (entries.length === 0) {
    return repondre(embeds.info("Vue d'ensemble", "Aucun membre n'a encore configuré ses impôts."));
  }

  const lignes = entries.map(([id, u]) => {
    const impot = calculerImpotHebdomadaire(u, config);
    const statutCouple = u.statut === 'couple' ? (u.partenaireConfirme ? ' 💑' : ' 💌') : '';
    return `<@${id}>${statutCouple} — ${formatMontant(impot, config.devise)}/sem — total déclaré : ${formatMontant(u.totalDeclare, config.devise)}`;
  });

  return repondre(embeds.info("Vue d'ensemble des impôts", lignes.join('\n')));
}

module.exports = { gerer };
