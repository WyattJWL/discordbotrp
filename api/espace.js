'use strict';

const path = require('path');
const db = require('../lib/db');
const { calculerImpotHebdomadaire } = require('../lib/tax');
const { formatMontant, obtenirNomAffichage, echapperHtml } = require('../lib/util');
const { exigerMembre } = require('../lib/proteger');
const { estStaff, ROLES_GANG } = require('../lib/autorisation');
const { listerMembresGuilde } = require('../lib/discord-api');
const { envoyerInvitationCouple } = require('../lib/couple');
const { page } = require('../lib/layout');

const config = require(path.join(__dirname, '..', 'config.json'));

const REVENU_MAX = 1000000000;

const MESSAGES = {
  profil: ['succes', 'Impôts enregistrés ✅'],
  invitation: ['succes', 'Impôts enregistrés ✅ Une invitation de couple a été envoyée en message privé à ton/ta partenaire. La réduction s’applique dès qu’il/elle accepte.'],
  invitation_sans_dm: ['erreur', 'Impôts enregistrés, mais ton/ta partenaire a ses messages privés fermés : l’invitation n’a pas pu être envoyée. Préviens-le/la pour qu’il/elle t’ajoute autrement.'],
  code: ['succes', 'Code promo appliqué 🎉 Ta réduction est active.'],
  declare: ['succes', 'Paiement déclaré ✅ N’oublie pas d’effectuer le virement.'],
  revenu: ['erreur', 'Revenu invalide : indique un nombre positif (ex. 12000).'],
  partenaire: ['erreur', 'Choisis un/une partenaire dans la liste (pas toi-même).'],
  membres: ['erreur', 'Impossible de charger la liste des membres pour le moment. Réessaie dans un instant.'],
  code_vide: ['erreur', 'Entre un code promo.'],
  code_invalide: ['erreur', 'Ce code promo n’existe pas.'],
  code_utilise: ['erreur', 'Ce code promo a déjà été utilisé.'],
  code_expire: ['erreur', 'Ce code promo a expiré.'],
  non_configure: ['erreur', 'Configure d’abord tes impôts avant de déclarer un paiement.']
};

function lireCorpsBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on('data', (chunk) => morceaux.push(chunk));
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
}

function nomMembre(m) {
  return m.nick || m.user?.global_name || m.user?.username || '?';
}

async function listerPartenairesPossibles(guildId, moiId) {
  const membres = await listerMembresGuilde(guildId);
  return membres
    .filter((m) => m.user && !m.user.bot && m.user.id !== moiId && (m.roles || []).some((r) => ROLES_GANG.has(r)))
    .map((m) => ({ id: m.user.id, nom: nomMembre(m) }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

function analyserRevenu(texte) {
  const valeur = Number(String(texte || '').replace(/\s/g, '').replace(',', '.'));
  if (!Number.isFinite(valeur) || valeur < 0 || valeur > REVENU_MAX) return null;
  return Math.round(valeur * 100) / 100;
}

async function traiterFormulaire(req, session, guildId) {
  const params = new URLSearchParams((await lireCorpsBrut(req)).toString('utf8'));
  const action = params.get('_action');
  const data = await db.charger();

  if (action === 'configurer') {
    const revenu = analyserRevenu(params.get('revenu'));
    if (revenu === null) return 'revenu';

    const statut = params.get('statut') === 'couple' ? 'couple' : 'seul';
    let partenaireId = null;

    if (statut === 'couple') {
      partenaireId = params.get('partenaire');
      let possibles;
      try {
        possibles = await listerPartenairesPossibles(guildId, session.userId);
      } catch (err) {
        console.error('Impôts : liste des membres indisponible :', err);
        return 'membres';
      }
      if (!possibles.some((p) => p.id === partenaireId)) return 'partenaire';
    }

    const avant = db.getUser(data, guildId, session.userId);
    const dejaConfirme = statut === 'couple' && avant.partenaire === partenaireId && avant.partenaireConfirme;

    db.setUserProfil(data, guildId, session.userId, { revenu, statut, partenaireId });
    await db.sauvegarder(data);

    if (statut === 'couple' && !dejaConfirme) {
      const envoye = await envoyerInvitationCouple(guildId, session.userId, partenaireId, null);
      return envoye ? 'invitation' : 'invitation_sans_dm';
    }
    return 'profil';
  }

  if (action === 'code') {
    const code = (params.get('code') || '').trim();
    if (!code) return 'code_vide';
    const entree = db.trouverPromoCode(data, guildId, code);
    if (!entree) return 'code_invalide';
    if (entree.utilisePar) return 'code_utilise';
    if (entree.expireAt !== null && entree.expireAt <= Date.now()) return 'code_expire';
    db.utiliserPromoCode(data, guildId, code, session.userId);
    await db.sauvegarder(data);
    return 'code';
  }

  if (action === 'declarer') {
    const user = db.getUser(data, guildId, session.userId);
    if (user.revenu === null) return 'non_configure';
    db.enregistrerDeclaration(data, guildId, session.userId, calculerImpotHebdomadaire(user, config));
    await db.sauvegarder(data);
    return 'declare';
  }

  return null;
}

module.exports = async (req, res) => {
  const session = await exigerMembre(req, res);
  if (!session) return;

  const guildId = process.env.DISCORD_GUILD_ID;

  if (req.method === 'POST') {
    const resultat = await traiterFormulaire(req, session, guildId);
    res.writeHead(303, { Location: resultat ? `/espace?m=${resultat}` : '/espace' });
    res.end();
    return;
  }

  const [data, estAdminStaff] = await Promise.all([db.charger(), estStaff(session.userId)]);
  const user = db.getUser(data, guildId, session.userId);
  const guilde = db.getGuild(data, guildId);

  const cle = new URL(req.url, 'http://x').searchParams.get('m');
  const message = MESSAGES[cle];
  const flash = message
    ? `<div class="mini-carte ${message[0]}" style="margin-bottom:18px"><div class="valeur">${echapperHtml(message[1])}</div></div>`
    : '';

  // Résumé
  let resume;
  if (user.revenu === null) {
    resume = `<div class="mini-carte" style="grid-column:1/-1"><p class="vide" style="margin:0">Tes impôts ne sont pas encore configurés. Remplis le formulaire ci-dessous.</p></div>`;
  } else {
    const impot = calculerImpotHebdomadaire(user, config);
    let ligneStatut = 'Seul';
    if (user.statut === 'couple' && user.partenaire) {
      const nomPartenaire = await obtenirNomAffichage(guildId, user.partenaire);
      ligneStatut = `En couple avec ${echapperHtml(nomPartenaire)}${user.partenaireConfirme ? '' : ' (en attente)'}`;
    }
    resume = `
      <div class="mini-carte"><div class="label">Revenu déclaré</div><div class="valeur">${formatMontant(user.revenu, config.devise)} / sem.</div></div>
      <div class="mini-carte"><div class="label">Statut</div><div class="valeur">${ligneStatut}</div></div>
      <div class="mini-carte"><div class="label">Réduction active</div><div class="valeur">${user.reductionPourcent}%</div></div>
      <div class="mini-carte"><div class="label">Impôt / semaine</div><div class="valeur gros">${formatMontant(impot, config.devise)}</div></div>
      <div class="mini-carte"><div class="label">Total déclaré</div><div class="valeur">${formatMontant(user.totalDeclare, config.devise)}</div></div>
      <div class="mini-carte"><div class="label">Dernière déclaration</div><div class="valeur">${user.derniereDeclarationAt ? new Date(user.derniereDeclarationAt).toLocaleString('fr-FR') : 'jamais'}</div></div>
    `;
  }

  // Liste des partenaires possibles (pour le statut « en couple »)
  let champPartenaire;
  try {
    const possibles = await listerPartenairesPossibles(guildId, session.userId);
    const options = possibles
      .map((p) => `<option value="${echapperHtml(p.id)}" ${p.id === user.partenaire ? 'selected' : ''}>${echapperHtml(p.nom)}</option>`)
      .join('');
    champPartenaire = `<select name="partenaire" style="width:100%; padding:10px 12px; font-size:14px"><option value="">Choisir…</option>${options}</select>`;
  } catch (err) {
    console.error('Impôts : liste des membres indisponible :', err);
    champPartenaire = '<p class="vide" style="margin:0">Liste des membres indisponible pour le moment. Recharge la page pour choisir un/une partenaire.</p>';
  }

  const enCouple = user.statut === 'couple';
  const telephone = guilde.config.telephone;

  const corps = `
    <div class="eyebrow">Mon espace</div>
    <h1 class="titre">Salut, <span>${echapperHtml(session.username)}</span></h1>
    <p class="texte-intro">Configure tes impôts, applique un code promo et déclare ton paiement. Tout est synchronisé avec les commandes Discord.</p>
    ${flash}
    <div class="grille-cartes">${resume}</div>

    <h2 class="titre-section">Configurer mes impôts</h2>
    <div class="mini-carte">
      <form method="POST" action="/espace" class="formulaire-impots">
        <input type="hidden" name="_action" value="configurer">
        <div class="champ">
          <label for="revenu">Revenu hebdomadaire (${echapperHtml(config.devise)})</label>
          <input type="text" id="revenu" name="revenu" inputmode="decimal" required style="width:100%; padding:10px 12px; font-size:14px" placeholder="ex. 12000" value="${user.revenu !== null ? String(user.revenu) : ''}">
        </div>
        <div class="champ">
          <label>Statut</label>
          <div class="radios">
            <label><input type="radio" name="statut" value="seul" ${enCouple ? '' : 'checked'}> Seul</label>
            <label><input type="radio" name="statut" value="couple" ${enCouple ? 'checked' : ''}> En couple</label>
          </div>
        </div>
        <div class="champ champ-partenaire">
          <label>Mon/ma partenaire</label>
          ${champPartenaire}
          <div class="aide">Il/elle reçoit une invitation en message privé et doit l'accepter pour que la réduction s'applique.</div>
        </div>
        <button type="submit" class="btn btn-accent">Enregistrer</button>
      </form>
    </div>

    <h2 class="titre-section">Code promo</h2>
    <div class="mini-carte">
      <form method="POST" action="/espace" class="ligne-formulaire">
        <input type="hidden" name="_action" value="code">
        <input type="text" name="code" placeholder="IMPOT-XXXX-XXXX" autocomplete="off" style="flex:1; min-width:0; padding:10px 12px; font-size:14px">
        <button type="submit" class="btn btn-ghost">Appliquer</button>
      </form>
    </div>

    <h2 class="titre-section">Payer mes impôts</h2>
    <div class="mini-carte">
      <p class="texte-intro" style="margin-top:0">${telephone
        ? `Transfère le montant dû au numéro <strong>${echapperHtml(telephone)}</strong>, puis déclare ton paiement ci-dessous.`
        : 'Aucun numéro de paiement n’a encore été configuré par un admin.'}</p>
      <form method="POST" action="/espace" onsubmit="return confirm('Déclarer le paiement de tes impôts de la semaine ?')">
        <input type="hidden" name="_action" value="declarer">
        <button type="submit" class="btn btn-ghost" ${user.revenu === null ? 'disabled' : ''}>J'ai payé — déclarer mon paiement</button>
      </form>
    </div>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Mon espace', actif: 'espace', session, estStaff: estAdminStaff, corps }));
};
