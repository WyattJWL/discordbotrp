'use strict';

const path = require('path');
const db = require('../lib/db');
const { calculerImpotHebdomadaire } = require('../lib/tax');
const { formatMontant, obtenirNomAffichage, echapperHtml } = require('../lib/util');
const { exigerMembre } = require('../lib/proteger');
const { estStaff } = require('../lib/autorisation');
const { page } = require('../lib/layout');

const config = require(path.join(__dirname, '..', 'config.json'));

module.exports = async (req, res) => {
  const session = await exigerMembre(req, res);
  if (!session) return;

  const guildId = process.env.DISCORD_GUILD_ID;
  const [data, estAdminStaff] = await Promise.all([db.charger(), estStaff(session.userId)]);
  const user = db.getUser(data, guildId, session.userId);

  let blocImpots;
  if (user.revenu === null) {
    blocImpots = `<div class="mini-carte" style="grid-column:1/-1"><p class="vide" style="margin:0">Tes impôts ne sont pas encore configurés. Utilise <code>/cimpots configurer</code> sur Discord.</p></div>`;
  } else {
    const impot = calculerImpotHebdomadaire(user, config);
    let ligneStatut = 'Seul';
    if (user.statut === 'couple' && user.partenaire) {
      const nomPartenaire = await obtenirNomAffichage(guildId, user.partenaire);
      ligneStatut = `En couple avec ${echapperHtml(nomPartenaire)}${user.partenaireConfirme ? '' : ' (en attente)'}`;
    }

    blocImpots = `
      <div class="mini-carte"><div class="label">Revenu déclaré</div><div class="valeur">${formatMontant(user.revenu, config.devise)} / sem.</div></div>
      <div class="mini-carte"><div class="label">Statut</div><div class="valeur">${ligneStatut}</div></div>
      <div class="mini-carte"><div class="label">Impôt / semaine</div><div class="valeur gros">${formatMontant(impot, config.devise)}</div></div>
      <div class="mini-carte"><div class="label">Total déclaré</div><div class="valeur">${formatMontant(user.totalDeclare, config.devise)}</div></div>
      <div class="mini-carte"><div class="label">Dernière déclaration</div><div class="valeur">${user.derniereDeclarationAt ? new Date(user.derniereDeclarationAt).toLocaleString('fr-FR') : 'jamais'}</div></div>
    `;
  }

  const corps = `
    <div class="eyebrow">Mon espace</div>
    <h1 class="titre">Salut, <span>${echapperHtml(session.username)}</span></h1>
    <p class="texte-intro">Voici ton profil fiscal. Utilise les commandes Discord (<code>/cimpots</code>, <code>/dimpots</code>) pour le mettre à jour.</p>
    <div class="grille-cartes">${blocImpots}</div>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Mon espace', actif: 'espace', session, estStaff: estAdminStaff, corps }));
};
