'use strict';

const { obtenirNote, modifierNote, supprimerNote } = require('../lib/notes');
const { exigerMembre } = require('../lib/proteger');
const { estStaff } = require('../lib/autorisation');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

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
      await supprimerNote(id);
      res.writeHead(302, { Location: '/notes' });
      res.end();
      return;
    }

    if (action === 'modifier') {
      const titre = (params.get('titre') || '').trim().slice(0, 200);
      const contenu = (params.get('contenu') || '').trim().slice(0, 4000);
      if (titre && contenu) await modifierNote(id, titre, contenu);
    }

    res.writeHead(302, { Location: `/notes/${id}` });
    res.end();
    return;
  }

  const [note, staff] = await Promise.all([obtenirNote(id), estStaff(session.userId)]);
  if (!note) {
    res.status(404).send(page({
      titre: 'Introuvable', actif: 'notes', session, estStaff: staff,
      corps: '<h1 class="titre">Note introuvable</h1><p class="texte-intro"><a href="/notes">← Retour aux notes</a></p>'
    }));
    return;
  }

  const date = new Date(note.creeAt).toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' });
  const peutModifier = note.auteurUserId === session.userId || staff;

  const corps = `
    <div class="eyebrow"><a href="/notes" style="color:inherit; text-decoration:none">← Notes</a></div>
    <h1 class="titre">${echapperHtml(note.titre)}</h1>
    <p class="texte-intro">Par ${echapperHtml(note.auteurUsername)} · ${date}${note.modifieAt ? ' · modifiée' : ''}</p>

    <div class="mini-carte" style="margin-bottom:18px">
      <div class="valeur" style="white-space:pre-wrap; line-height:1.7">${echapperHtml(note.contenu)}</div>
    </div>

    ${peutModifier ? `
      <div class="mini-carte" style="margin-bottom:14px">
        <div class="label">Modifier</div>
        <form method="POST" style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
          <input type="hidden" name="_action" value="modifier">
          <input type="text" name="titre" value="${echapperHtml(note.titre)}" required maxlength="200"
            style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
          <textarea name="contenu" required maxlength="4000" style="min-height:90px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:13.5px; resize:vertical">${echapperHtml(note.contenu)}</textarea>
          <button type="submit" class="btn btn-accent" style="align-self:flex-start">Enregistrer</button>
        </form>
      </div>
      <form method="POST" onsubmit="return confirm('Supprimer cette note ?')">
        <input type="hidden" name="_action" value="supprimer">
        <button type="submit" class="btn btn-danger">Supprimer</button>
      </form>
    ` : ''}
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: note.titre, actif: 'notes', session, estStaff: staff, corps }));
};
