'use strict';

const { obtenirOperation, definirStatutOperation, supprimerOperation } = require('../lib/operations');
const { exigerMembre } = require('../lib/proteger');
const { estStaff } = require('../lib/autorisation');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

const TYPES = {
  op: { label: 'Opération', emoji: '🎯' },
  braquage: { label: 'Braquage', emoji: '💰' },
  convocation: { label: 'Convocation', emoji: '📢' },
  reunion: { label: 'Réunion', emoji: '🤝' }
};

const STATUTS = {
  planifiee: { label: 'Planifiée' },
  terminee: { label: 'Terminée' },
  annulee: { label: 'Annulée' }
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
  const session = await exigerMembre(req, res);
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
      await supprimerOperation(id);
      res.writeHead(302, { Location: '/operations' });
      res.end();
      return;
    }

    if (action === 'statut') {
      await definirStatutOperation(id, params.get('statut'));
    }

    res.writeHead(302, { Location: `/operations/${id}` });
    res.end();
    return;
  }

  const [operation, staff] = await Promise.all([obtenirOperation(id), estStaff(session.userId)]);
  if (!operation) {
    res.status(404).send(page({
      titre: 'Introuvable', actif: 'operations', session, estStaff: staff,
      corps: '<h1 class="titre">Opération introuvable</h1><p class="texte-intro"><a href="/operations">← Retour</a></p>'
    }));
    return;
  }

  const t = TYPES[operation.type] || TYPES.op;
  const dateTxt = operation.date ? new Date(operation.date).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' }) : 'Non fixée';
  const boutonsStatut = Object.entries(STATUTS).map(([v, s]) =>
    `<label style="flex:1"><input type="radio" name="statut" value="${v}" ${v === operation.statut ? 'checked' : ''} required> ${s.label}</label>`
  ).join('\n');

  const corps = `
    <div class="eyebrow"><a href="/operations" style="color:inherit; text-decoration:none">← Opérations</a></div>
    <h1 class="titre">${t.emoji} ${echapperHtml(operation.titre)}</h1>
    <p class="texte-intro">${t.label} · créée par ${echapperHtml(operation.creeParUsername)}</p>

    <div class="grille-cartes" style="margin-bottom:18px">
      <div class="mini-carte"><div class="label">Date</div><div class="valeur">${dateTxt}</div></div>
      <div class="mini-carte"><div class="label">Lieu</div><div class="valeur">${echapperHtml(operation.lieu || 'Non précisé')}</div></div>
      <div class="mini-carte" style="grid-column:1/-1"><div class="label">Participants</div><div class="valeur">${echapperHtml(operation.participants || 'Aucun pour le moment')}</div></div>
      ${operation.description ? `<div class="mini-carte" style="grid-column:1/-1"><div class="label">Description</div><div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(operation.description)}</div></div>` : ''}
    </div>

    <div class="mini-carte" style="margin-bottom:14px">
      <div class="label">Statut</div>
      <form method="POST" style="margin-top:10px">
        <input type="hidden" name="_action" value="statut">
        <div class="radios" style="margin-bottom:12px">${boutonsStatut}</div>
        <button type="submit" class="btn btn-accent">Mettre à jour</button>
      </form>
    </div>

    <form method="POST" onsubmit="return confirm('Supprimer cette opération ?')">
      <input type="hidden" name="_action" value="supprimer">
      <button type="submit" class="btn btn-danger">Supprimer</button>
    </form>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: operation.titre, actif: 'operations', session, estStaff: staff, corps }));
};
