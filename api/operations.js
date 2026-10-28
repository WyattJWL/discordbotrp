'use strict';

const { creerOperation, listerOperations } = require('../lib/operations');
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
  planifiee: { label: 'Planifiée', classe: 'statut-en_attente' },
  terminee: { label: 'Terminée', classe: 'statut-acceptee' },
  annulee: { label: 'Annulée', classe: 'statut-refusee' }
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

  if (req.method === 'POST') {
    const corps = (await lireCorpsBrut(req)).toString('utf8');
    const params = new URLSearchParams(corps);
    const titre = (params.get('titre') || '').trim().slice(0, 200);
    if (titre) {
      await creerOperation({
        type: params.get('type'),
        titre,
        description: (params.get('description') || '').trim().slice(0, 2000),
        date: params.get('date') || null,
        lieu: (params.get('lieu') || '').trim().slice(0, 200),
        participants: (params.get('participants') || '').trim().slice(0, 500),
        creeParUserId: session.userId,
        creeParUsername: session.username
      });
    }
    res.writeHead(302, { Location: '/operations' });
    res.end();
    return;
  }

  const [operations, staff] = await Promise.all([listerOperations(), estStaff(session.userId)]);

  const lignes = operations.length
    ? operations.map((o) => {
        const t = TYPES[o.type] || TYPES.op;
        const s = STATUTS[o.statut] || STATUTS.planifiee;
        const dateTxt = o.date ? new Date(o.date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'date non fixée';
        return `<a class="liste-item" href="/operations/${o.id}">
          <div>
            <div class="titre-ligne">${t.emoji} ${echapperHtml(o.titre)}</div>
            <div class="sous-ligne">${t.label} · ${dateTxt}${o.lieu ? ' · ' + echapperHtml(o.lieu) : ''}</div>
          </div>
          <span class="statut-badge ${s.classe}" style="font-size:11px">${s.label}</span>
        </a>`;
      }).join('\n')
    : '<p class="vide">Aucune opération planifiée.</p>';

  const optionsType = Object.entries(TYPES).map(([v, t]) => `<option value="${v}">${t.emoji} ${t.label}</option>`).join('');

  const corps = `
    <div class="eyebrow">Organisation</div>
    <h1 class="titre">Opérations <span>du gang</span></h1>
    <p class="texte-intro">OP, braquages, convocations, réunions — tout au même endroit.</p>

    <div class="mini-carte" style="margin:18px 0 26px">
      <div class="label">Planifier quelque chose</div>
      <form method="POST" style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
        <select name="type" style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">${optionsType}</select>
        <input type="text" name="titre" placeholder="Titre" required maxlength="200"
          style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
        <textarea name="description" placeholder="Description, détails, plan..." maxlength="2000" style="min-height:70px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:13.5px; resize:vertical"></textarea>
        <div style="display:flex; gap:10px; flex-wrap:wrap">
          <input type="datetime-local" name="date" style="flex:1; min-width:180px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
          <input type="text" name="lieu" placeholder="Lieu" style="flex:1; min-width:140px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
        </div>
        <input type="text" name="participants" placeholder="Participants (noms, séparés par des virgules)" maxlength="500"
          style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
        <button type="submit" class="btn btn-accent" style="align-self:flex-start">Créer</button>
      </form>
    </div>

    ${lignes}
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Opérations', actif: 'operations', session, estStaff: staff, corps }));
};
