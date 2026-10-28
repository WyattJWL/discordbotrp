'use strict';

const { obtenirCandidature, supprimerCandidature, marquerVue, definirStatut } = require('../lib/candidatures');
const { exigerStaff } = require('../lib/proteger');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');
const { envoyerDM } = require('../lib/discord-api');
const embeds = require('../lib/embeds');

const MESSAGES_STATUT = {
  acceptee: (candidature, lien) => embeds.succes(
    '🎉 Candidature acceptée !',
    `Ta candidature pour rejoindre **Sangre Negra** a été acceptée.` +
    (candidature.noteStaff ? `\n\n**Message du staff :** ${candidature.noteStaff}` : '') +
    `\n\nClique ci-dessous pour accepter les conditions et finaliser ton arrivée :\n${lien}`
  ),
  refusee: (candidature) => embeds.erreur(
    'Candidature refusée',
    `Ta candidature pour rejoindre **Sangre Negra** a été refusée.` +
    (candidature.noteStaff ? `\n\n**Message du staff :** ${candidature.noteStaff}` : '')
  ),
  corrections: (candidature) => embeds.attention(
    'Corrections demandées',
    `Le staff a demandé des corrections sur ta candidature pour **Sangre Negra**.` +
    (candidature.noteStaff ? `\n\n**Message du staff :** ${candidature.noteStaff}` : '') +
    `\n\nTu peux repostuler avec une nouvelle candidature une fois corrigée.`
  )
};

const LIBELLES = {
  discord: 'Pseudo Discord',
  majeur: '18 ans ou plus',
  experience: 'Expérience en roleplay',
  heures: 'Disponibilité',
  autreFaction: 'Autre faction / gang',
  nomPersonnage: 'Nom du personnage',
  histoire: 'Histoire du personnage',
  motivation: 'Pourquoi Sangre Negra',
  apport: 'Ce qu’il/elle apporte',
  miseEnSituation: 'Mise en situation',
  origine: 'Comment il/elle nous a connus',
  reglement: 'Règlement accepté'
};

const ORDRE = [
  'discord', 'majeur', 'experience', 'heures', 'autreFaction',
  'nomPersonnage', 'histoire', 'motivation', 'apport',
  'miseEnSituation', 'origine', 'reglement'
];

const STATUTS = {
  en_attente: { label: 'En attente' },
  acceptee: { label: 'Accepter' },
  refusee: { label: 'Refuser' },
  corrections: { label: 'Corrections' }
};

function lireCorpsBrut(req) {
  return new Promise((resolve, reject) => {
    const morceaux = [];
    req.on('data', (chunk) => morceaux.push(chunk));
    req.on('end', () => resolve(Buffer.concat(morceaux)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  const session = await exigerStaff(req, res);
  if (!session) return;

  const id = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');

  if (!id) {
    res.status(400).send('ID manquant.');
    return;
  }

  if (req.method === 'POST') {
    const corps = (await lireCorpsBrut(req)).toString('utf8');
    const params = new URLSearchParams(corps);
    const action = params.get('_action');

    if (action === 'supprimer') {
      await supprimerCandidature(id);
      res.writeHead(302, { Location: '/staff' });
      res.end();
      return;
    }

    let roleInfo = '';
    if (action === 'statut') {
      const statut = params.get('statut');
      await definirStatut(id, statut, params.get('note'));

      const fabriqueMessage = MESSAGES_STATUT[statut];
      if (fabriqueMessage) {
        const candidature = await obtenirCandidature(id);
        if (candidature?.candidatUserId) {
          try {
            const lien = statut === 'acceptee' ? `https://${req.headers.host}/rejoindre/${id}` : null;
            await envoyerDM(candidature.candidatUserId, { embeds: [fabriqueMessage(candidature, lien)] });
            roleInfo = '?dm=ok';
          } catch (err) {
            console.error('DM de notification échoué :', err);
            roleInfo = '?dm=echec';
          }
        }
      }
    }

    res.writeHead(302, { Location: `/candidature/${id}${roleInfo}` });
    res.end();
    return;
  }

  const candidature = await obtenirCandidature(id);
  if (!candidature) {
    res.status(404).send(page({
      titre: 'Introuvable', actif: 'staff', session, estStaff: true,
      corps: '<h1 class="titre">Candidature introuvable</h1><p class="texte-intro"><a href="/staff">← Retour au tableau de bord</a></p>'
    }));
    return;
  }

  await marquerVue(id);

  const dmParam = new URL(req.url, 'http://x').searchParams.get('dm');
  let noticeRole = '';
  if (dmParam === 'ok') {
    noticeRole = `<div class="mini-carte" style="margin-bottom:18px; border-color:rgba(95,224,138,0.4)"><div class="valeur">✅ Message privé envoyé au candidat pour l'informer.</div></div>`;
  } else if (dmParam === 'echec') {
    noticeRole = `<div class="mini-carte" style="margin-bottom:18px; border-color:rgba(255,138,138,0.4)"><div class="valeur">⚠️ Impossible d'envoyer un message privé au candidat (DMs peut-être fermés). Préviens-le autrement.</div></div>`;
  }

  const date = new Date(candidature.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const cartes = ORDRE
    .filter((cle) => candidature.reponses[cle] !== undefined && candidature.reponses[cle] !== '')
    .map((cle) => {
      let valeur = candidature.reponses[cle];
      if (cle === 'majeur') valeur = valeur === 'Oui' ? '✅ Oui' : '❌ Non';
      if (cle === 'reglement') valeur = valeur ? '✅ Accepté' : '❌ Non accepté';
      return `<div class="mini-carte" style="grid-column:1/-1"><div class="label">${echapperHtml(LIBELLES[cle] || cle)}</div><div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(valeur)}</div></div>`;
    })
    .join('\n');

  const statutActuel = candidature.statut || 'en_attente';
  const boutonsStatut = Object.entries(STATUTS).map(([valeur, info]) =>
    `<label style="flex:1"><input type="radio" name="statut" value="${valeur}" ${valeur === statutActuel ? 'checked' : ''} required> ${info.label}</label>`
  ).join('\n');

  const corps = `
    <div class="eyebrow"><a href="/staff" style="color:inherit; text-decoration:none">← Candidatures</a></div>
    <h1 class="titre">Candidature de <span>${echapperHtml(candidature.reponses.nomPersonnage || '?')}</span></h1>
    <p class="texte-intro">Reçue le ${date} · ${candidature.vue ? `vue le ${new Date(candidature.vueAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}` : 'première consultation'}</p>

    ${noticeRole}

    <div class="mini-carte" style="margin-bottom:22px">
      <div class="label">Décision</div>
      <form method="POST" style="margin-top:10px">
        <input type="hidden" name="_action" value="statut">
        <div class="radios" style="margin-bottom:14px">${boutonsStatut}</div>
        <textarea name="note" placeholder="Note pour le candidat (visible sur sa page de suivi — utile surtout pour expliquer un refus ou des corrections à apporter)" style="width:100%; min-height:70px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:13.5px; resize:vertical">${echapperHtml(candidature.noteStaff || '')}</textarea>
        <button type="submit" class="btn btn-accent" style="margin-top:12px">Mettre à jour le statut</button>
      </form>
    </div>

    <div class="grille-cartes">${cartes}</div>

    <form method="POST" onsubmit="return confirm('Supprimer définitivement cette candidature ?')" style="margin-top:18px">
      <input type="hidden" name="_action" value="supprimer">
      <button type="submit" class="btn btn-danger">Supprimer cette candidature</button>
    </form>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Candidature', actif: 'staff', session, estStaff: true, corps }));
};
