'use strict';

const { trouverCandidaturePourUtilisateur, obtenirCandidature, marquerAccueilli } = require('../lib/candidatures');
const { exigerConnexion } = require('../lib/proteger');
const { echapperHtml } = require('../lib/util');
const { ajouterRole } = require('../lib/discord-api');
const { ROLE_RECRUE } = require('../lib/autorisation');

const STATUTS = {
  en_attente: { label: 'En attente de lecture', badge: 'statut-en_attente' },
  acceptee: { label: 'Candidature acceptée', badge: 'statut-acceptee' },
  refusee: { label: 'Candidature refusée', badge: 'statut-refusee' },
  corrections: { label: 'Corrections demandées', badge: 'statut-corrections' }
};

const CONDITIONS = [
  'Je respecte la hiérarchie et les décisions du Chef Suprême, des Sous-Chefs et des Lieutenants.',
  'Je garde confidentielles les informations internes (notes, opérations, relations) partagées sur cet espace.',
  'Je mets à jour mon pseudo Discord pour qu’il reflète mon personnage RP.',
  'Je reste actif·ve et je préviens le staff en cas d’absence prolongée.',
  'Je comprends que mon accès peut être suspendu par le staff en cas de non-respect de ces règles.'
];

function enrobage(corps) {
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Suivre ma candidature — Sangre Negra</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="topnav">
  <div class="marque">
    <div class="ecusson">SN</div>
    <div>
      <div class="nom">SANGRE <span>NEGRA</span></div>
      <div class="sous">Suivi de candidature</div>
    </div>
  </div>
  <div class="droite"><a href="/">← Accueil</a></div>
</div>
<div class="page-centree">${corps}</div>
</body>
</html>`;
}

async function gererRejoindre(req, res, session, id) {
  const candidature = await obtenirCandidature(id);
  const autorise = !!candidature && candidature.candidatUserId === session.userId;

  if (req.method === 'POST') {
    if (!autorise) {
      res.status(403).json({ ok: false, erreur: 'Lien invalide.' });
      return;
    }
    if (candidature.statut !== 'acceptee') {
      res.status(400).json({ ok: false, erreur: 'Cette candidature n’est pas (ou plus) acceptée.' });
      return;
    }

    if (!candidature.accueilli) {
      try {
        await ajouterRole(process.env.DISCORD_GUILD_ID, session.userId, ROLE_RECRUE);
      } catch (err) {
        console.error('Attribution du rôle Recrue échouée :', err);
        res.status(502).json({ ok: false, erreur: "Impossible d'attribuer le rôle Discord pour le moment. Réessaie dans un instant." });
        return;
      }
      await marquerAccueilli(id);
    }

    res.status(200).json({ ok: true });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!autorise) {
    res.status(404).send(enrobage(`
      <div class="carte-accent" style="text-align:center">
        <h1 class="titre">Lien <span>invalide</span></h1>
        <p class="texte-intro">Ce lien d'intégration n'existe pas ou ne correspond pas à ton compte.</p>
        <a class="btn btn-ghost btn-large" href="/suivre" style="margin-top:14px">← Retour au suivi</a>
      </div>
    `));
    return;
  }

  if (candidature.accueilli) {
    res.status(200).send(enrobage(`
      <div class="carte-accent" style="text-align:center">
        <div class="badge-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
          Déjà intégré
        </div>
        <h1 class="titre">Tu es déjà <span>dans le gang</span></h1>
        <p class="texte-intro">Ton intégration est déjà finalisée. Direction ton espace membre.</p>
        <a class="btn btn-accent btn-large" href="/espace" style="margin-top:14px">Aller à mon espace</a>
      </div>
    `));
    return;
  }

  if (candidature.statut !== 'acceptee') {
    res.status(200).send(enrobage(`
      <div class="carte-accent" style="text-align:center">
        <h1 class="titre">Candidature non <span>acceptée</span></h1>
        <p class="texte-intro">Ce lien d'intégration n'est valable que pour une candidature acceptée.</p>
        <a class="btn btn-ghost btn-large" href="/suivre" style="margin-top:14px">← Retour au suivi</a>
      </div>
    `));
    return;
  }

  const nom = echapperHtml(candidature.reponses?.nomPersonnage || candidature.candidatUsername || '');
  const conditions = CONDITIONS.map((c) => `<li>${echapperHtml(c)}</li>`).join('\n      ');

  res.status(200).send(enrobage(`
    <div class="carte-accent" style="text-align:center">
      <div class="badge-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M20 6 9 17l-5-5"/></svg>
        Candidature acceptée
      </div>
      <h1 class="titre">Bienvenue, <span>${nom}</span></h1>
      <p class="texte-intro">Dernière étape avant de rejoindre officiellement Sangre Negra : lis et accepte les conditions ci-dessous.</p>

      <ul class="liste-conditions" style="text-align:left">
      ${conditions}
      </ul>

      <label class="case-accepter">
        <input type="checkbox" id="accepteConditions">
        <span>J'ai lu et j'accepte ces conditions</span>
      </label>

      <button type="button" id="btnRejoindre" class="btn btn-accent btn-large" disabled style="margin-top:16px">Rejoindre Sangre Negra</button>

      <div class="alerte" id="erreurRejoindre"></div>

      <div class="progression" id="progression">
        <div class="progression-piste"><div class="progression-remplissage" id="barreProgression"></div></div>
        <div class="progression-texte" id="texteProgression">Vérification de ta candidature…</div>
      </div>
    </div>

    <script>
    (function () {
      var checkbox = document.getElementById('accepteConditions');
      var btn = document.getElementById('btnRejoindre');
      var erreurBox = document.getElementById('erreurRejoindre');
      var progression = document.getElementById('progression');
      var barre = document.getElementById('barreProgression');
      var texte = document.getElementById('texteProgression');
      var etapes = ['Vérification de ta candidature…', 'Attribution du rôle Recrue…', 'Création de ton espace membre…'];

      checkbox.addEventListener('change', function () { btn.disabled = !checkbox.checked; });

      btn.addEventListener('click', function () {
        btn.disabled = true;
        checkbox.disabled = true;
        erreurBox.style.display = 'none';
        progression.style.display = 'block';
        barre.style.width = '0%';
        texte.textContent = etapes[0];

        requestAnimationFrame(function () {
          requestAnimationFrame(function () { barre.style.width = '85%'; });
        });

        var etape = 0;
        var minuteur = setInterval(function () {
          etape++;
          if (etape < etapes.length) texte.textContent = etapes[etape];
        }, 700);

        fetch(window.location.pathname + window.location.search, { method: 'POST' })
          .then(function (reponse) {
            return reponse.json().catch(function () { return { ok: false }; }).then(function (data) {
              return { ok: reponse.ok && data.ok, erreur: data.erreur };
            });
          })
          .then(function (resultat) {
            clearInterval(minuteur);
            if (!resultat.ok) throw new Error(resultat.erreur || 'Une erreur est survenue.');
            barre.style.width = '100%';
            texte.textContent = 'Bienvenue dans Sangre Negra !';
            setTimeout(function () { window.location.href = '/espace'; }, 800);
          })
          .catch(function (err) {
            clearInterval(minuteur);
            progression.style.display = 'none';
            erreurBox.textContent = err.message;
            erreurBox.style.display = 'block';
            btn.disabled = false;
            checkbox.disabled = false;
          });
      });
    })();
    </script>
  `));
}

module.exports = async (req, res) => {
  const session = await exigerConnexion(req, res);
  if (!session) return;

  const idRejoindre = req.query?.rejoindre || new URL(req.url, 'http://x').searchParams.get('rejoindre');
  if (idRejoindre) {
    await gererRejoindre(req, res, session, idRejoindre);
    return;
  }

  const candidature = await trouverCandidaturePourUtilisateur(session.userId);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');

  if (!candidature) {
    res.status(200).send(enrobage(`
      <div class="carte-accent" style="text-align:center">
        <div class="badge-pill">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
          Suivi
        </div>
        <h1 class="titre">Aucune candidature <span>en cours</span></h1>
        <p class="texte-intro">Tu n'as pas encore postulé pour rejoindre Sangre Negra.</p>
        <a class="btn btn-accent btn-large" href="/candidature" style="margin-top:18px">Postuler maintenant</a>
      </div>
    `));
    return;
  }

  const statutInfo = STATUTS[candidature.statut] || STATUTS.en_attente;
  const dateEnvoi = new Date(candidature.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });

  const ligneVue = candidature.vue
    ? `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>Consultée par le staff le ${new Date(candidature.vueAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</li>`
    : `<li><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>Pas encore consultée par le staff</li>`;

  const blocNote = candidature.noteStaff
    ? `<div class="mini-carte" style="text-align:left; margin-top:18px"><div class="label">Message du staff</div><div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(candidature.noteStaff)}</div></div>`
    : '';

  const boutonRepostuler = candidature.statut === 'refusee'
    ? `<a class="btn btn-ghost btn-large" href="/candidature" style="margin-top:12px">Postuler à nouveau</a>`
    : '';

  const boutonRejoindre = candidature.statut === 'acceptee' && !candidature.accueilli
    ? `<a class="btn btn-accent btn-large" href="/rejoindre/${candidature.id || ''}" style="margin-top:12px">Finaliser mon arrivée →</a>`
    : '';

  res.status(200).send(enrobage(`
    <div class="carte-accent" style="text-align:center">
      <div class="badge-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
        Suivi de candidature
      </div>
      <h1 class="titre">Salut <span>${echapperHtml(candidature.candidatUsername)}</span></h1>
      <p class="texte-intro">Candidature envoyée le ${dateEnvoi}</p>
      <div class="statut-badge ${statutInfo.badge}" style="margin:16px 0">${statutInfo.label}</div>
      ${blocNote}
      <ul class="puces-info" style="text-align:left">${ligneVue}</ul>
      ${boutonRejoindre}
      ${boutonRepostuler}
    </div>
  `));
};
