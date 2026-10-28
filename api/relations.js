'use strict';

const { creerRelation, obtenirRelation, listerRelations, definirStatutRelation, ajouterNoteRelation, supprimerRelation } = require('../lib/relations');
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

  const id = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id');

  if (req.method === 'POST') {
    const corps = (await lireCorpsBrut(req)).toString('utf8');
    const params = new URLSearchParams(corps);

    if (!id) {
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

    const action = params.get('_action');
    if (action === 'supprimer') {
      await supprimerRelation(id);
      res.writeHead(302, { Location: '/relations' });
      res.end();
      return;
    }
    if (action === 'statut') {
      await definirStatutRelation(id, params.get('statut'));
    }
    if (action === 'note') {
      const texte = (params.get('texte') || '').trim().slice(0, 1000);
      if (texte) await ajouterNoteRelation(id, texte, session.username);
    }
    res.writeHead(302, { Location: `/relations/${id}` });
    res.end();
    return;
  }

  const staff = await estStaff(session.userId);

  if (id) {
    const relation = await obtenirRelation(id);
    if (!relation) {
      res.status(404).send(page({
        titre: 'Introuvable', actif: 'relations', session, estStaff: staff,
        corps: '<h1 class="titre">Relation introuvable</h1><p class="texte-intro"><a href="/relations">← Retour</a></p>'
      }));
      return;
    }

    const boutonsStatut = Object.entries(STATUTS).map(([v, s]) =>
      `<label style="flex:1"><input type="radio" name="statut" value="${v}" ${v === relation.statut ? 'checked' : ''} required> ${s.label}</label>`
    ).join('\n');

    const notesHtml = relation.notes.length
      ? [...relation.notes].reverse().map((n) => `
          <div class="mini-carte" style="margin-bottom:8px">
            <div class="valeur" style="white-space:pre-wrap; line-height:1.6">${echapperHtml(n.texte)}</div>
            <div class="sous-ligne" style="margin-top:8px">— ${echapperHtml(n.auteurUsername)}, ${new Date(n.creeAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}</div>
          </div>
        `).join('\n')
      : '<p class="vide">Aucune note pour le moment.</p>';

    const corps = `
      <div class="eyebrow"><a href="/relations" style="color:inherit; text-decoration:none">← Relations</a></div>
      <h1 class="titre">${echapperHtml(relation.nom)}</h1>
      <p class="texte-intro">${TYPES[relation.type] || TYPES.individu} · ajouté par ${echapperHtml(relation.creeParUsername)}</p>

      <div class="mini-carte" style="margin-bottom:14px">
        <div class="label">Statut</div>
        <form method="POST" style="margin-top:10px">
          <input type="hidden" name="_action" value="statut">
          <div class="radios" style="margin-bottom:12px">${boutonsStatut}</div>
          <button type="submit" class="btn btn-accent">Mettre à jour</button>
        </form>
      </div>

      <h2 style="font-size:13px; text-transform:uppercase; letter-spacing:2px; color:var(--texte-faible); margin:26px 0 12px">Journal / rencontres</h2>

      <div class="mini-carte" style="margin-bottom:18px">
        <form method="POST" style="display:flex; flex-direction:column; gap:10px">
          <input type="hidden" name="_action" value="note">
          <textarea name="texte" placeholder="Noter une rencontre, un échange, une info..." required maxlength="1000" style="min-height:70px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:13.5px; resize:vertical"></textarea>
          <button type="submit" class="btn btn-ghost" style="align-self:flex-start">Ajouter une note</button>
        </form>
      </div>

      ${notesHtml}

      <form method="POST" onsubmit="return confirm('Supprimer cette relation et tout son journal ?')" style="margin-top:18px">
        <input type="hidden" name="_action" value="supprimer">
        <button type="submit" class="btn btn-danger">Supprimer cette relation</button>
      </form>
    `;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(200).send(page({ titre: relation.nom, actif: 'relations', session, estStaff: staff, corps }));
    return;
  }

  const relations = await listerRelations();

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
