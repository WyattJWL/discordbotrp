'use strict';

const { creerRelation, listerRelations } = require('../lib/relations');
const { exigerMembre } = require('../lib/proteger');
const { estStaff } = require('../lib/autorisation');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

const TYPES = { individu: '👤 Individu', gang: '🏴 Gang' };
const STATUTS = {
  allie: { label: 'Allié', classe: 'statut-acceptee' },
  ennemi: { label: 'Ennemi', classe: 'statut-refusee' },
  rival: { label: 'Rival', classe: 'statut-corrections' },
  neutre: { label: 'Neutre', classe: 'statut-en_attente' }
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
    const nom = (params.get('nom') || '').trim().slice(0, 150);
    if (nom) {
      await creerRelation({
        nom,
        type: params.get('type'),
        statut: params.get('statut'),
        creeParUserId: session.userId,
        creeParUsername: session.username
      });
    }
    res.writeHead(302, { Location: '/relations' });
    res.end();
    return;
  }

  const [relations, staff] = await Promise.all([listerRelations(), estStaff(session.userId)]);

  const lignes = relations.length
    ? relations.map((r) => {
        const s = STATUTS[r.statut] || STATUTS.neutre;
        return `<a class="liste-item" href="/relations/${r.id}">
          <div>
            <div class="titre-ligne">${echapperHtml(r.nom)}</div>
            <div class="sous-ligne">${TYPES[r.type] || TYPES.individu} · ${r.notes.length} note${r.notes.length > 1 ? 's' : ''}</div>
          </div>
          <span class="statut-badge ${s.classe}" style="font-size:11px">${s.label}</span>
        </a>`;
      }).join('\n')
    : '<p class="vide">Aucune relation enregistrée.</p>';

  const optionsType = Object.entries(TYPES).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  const optionsStatut = Object.entries(STATUTS).map(([v, s]) => `<option value="${v}">${s.label}</option>`).join('');

  const corps = `
    <div class="eyebrow">Diplomatie</div>
    <h1 class="titre">Relations <span>extérieures</span></h1>
    <p class="texte-intro">Individus et gangs : qui est allié, ennemi, rival ou neutre.</p>

    <div class="mini-carte" style="margin:18px 0 26px">
      <div class="label">Nouvelle relation</div>
      <form method="POST" style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
        <input type="text" name="nom" placeholder="Nom (personnage ou gang)" required maxlength="150"
          style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
        <div style="display:flex; gap:10px">
          <select name="type" style="flex:1; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">${optionsType}</select>
          <select name="statut" style="flex:1; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">${optionsStatut}</select>
        </div>
        <button type="submit" class="btn btn-accent" style="align-self:flex-start">Ajouter</button>
      </form>
    </div>

    ${lignes}
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Relations', actif: 'relations', session, estStaff: staff, corps }));
};
