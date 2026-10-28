'use strict';

const db = require('../lib/db');
const { calculerImpotHebdomadaire } = require('../lib/tax');
const { formatMontant, obtenirNomAffichage } = require('../lib/util');
const { exigerMembre } = require('../lib/proteger');

const config = require(require('path').join(__dirname, '..', 'config.json'));

function echapperHtml(texte) {
  return String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async (req, res) => {
  const session = await exigerMembre(req, res);
  if (!session) return;

  const guildId = process.env.DISCORD_GUILD_ID;
  const data = await db.charger();
  const user = db.getUser(data, guildId, session.userId);

  let blocImpots;
  if (user.revenu === null) {
    blocImpots = `<div class="carte"><p class="vide">Tes impôts ne sont pas encore configurés. Utilise <code>/cimpots configurer</code> sur Discord.</p></div>`;
  } else {
    const impot = calculerImpotHebdomadaire(user, config);
    let ligneStatut = `Seul`;
    if (user.statut === 'couple' && user.partenaire) {
      const nomPartenaire = await obtenirNomAffichage(guildId, user.partenaire);
      ligneStatut = `En couple avec ${echapperHtml(nomPartenaire)}${user.partenaireConfirme ? '' : ' (en attente de confirmation)'}`;
    }

    blocImpots = `
      <div class="carte"><div class="label">Revenu déclaré</div><div class="valeur">${formatMontant(user.revenu, config.devise)} / semaine</div></div>
      <div class="carte"><div class="label">Statut</div><div class="valeur">${ligneStatut}</div></div>
      <div class="carte"><div class="label">Impôt à payer / semaine</div><div class="valeur gros">${formatMontant(impot, config.devise)}</div></div>
      <div class="carte"><div class="label">Total déclaré (historique)</div><div class="valeur">${formatMontant(user.totalDeclare, config.devise)}</div></div>
      <div class="carte"><div class="label">Dernière déclaration</div><div class="valeur">${user.derniereDeclarationAt ? new Date(user.derniereDeclarationAt).toLocaleString('fr-FR') : 'jamais'}</div></div>
    `;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(`<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mon espace — Sangre Negra</title>
<style>
  body { margin:0; background:#0b0909; color:#ece6e6; font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; padding:24px 16px 60px; }
  .conteneur { max-width:640px; margin:0 auto; }
  .nav { display:flex; justify-content:space-between; align-items:center; font-size:12.5px; color:#a89a9a; margin-bottom:24px; }
  .nav a { color:#e8304f; text-decoration:none; }
  .logo { font-size:12px; letter-spacing:3px; color:#e8304f; text-transform:uppercase; margin-bottom:4px; }
  h1 { font-size:24px; margin:0 0 24px; }
  h2 { font-size:13px; text-transform:uppercase; letter-spacing:2px; color:#a89a9a; margin:26px 0 12px; }
  .carte { background:#151010; border:1px solid #2a1a1a; border-radius:10px; padding:16px 18px; margin-bottom:10px; }
  .label { font-size:12px; text-transform:uppercase; letter-spacing:1.5px; color:#e8304f; margin-bottom:6px; }
  .valeur { font-size:14.5px; }
  .valeur.gros { font-size:22px; font-weight:700; }
  .vide { color:#a89a9a; font-size:14px; margin:0; }
  code { background:#1d1515; padding:2px 6px; border-radius:4px; }
</style>
</head>
<body>
<div class="conteneur">
  <div class="nav"><span></span><span>Connecté : ${echapperHtml(session.username)} · <a href="/api/auth/logout">déconnexion</a></span></div>
  <div class="logo">Sangre Negra</div>
  <h1>Mon espace</h1>
  <h2>Mes impôts</h2>
  ${blocImpots}
</div>
</body>
</html>`);
};
