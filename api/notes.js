'use strict';

const { creerNote, listerNotes } = require('../lib/notes');
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

  if (req.method === 'POST') {
    const corps = (await lireCorpsBrut(req)).toString('utf8');
    const params = new URLSearchParams(corps);
    const titre = (params.get('titre') || '').trim().slice(0, 200);
    const contenu = (params.get('contenu') || '').trim().slice(0, 4000);
    if (titre && contenu) {
      await creerNote(titre, contenu, session.userId, session.username);
    }
    res.writeHead(302, { Location: '/notes' });
    res.end();
    return;
  }

  const [notes, staff] = await Promise.all([listerNotes(), estStaff(session.userId)]);

  const lignes = notes.length
    ? notes.map((n) => {
        const date = new Date(n.creeAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        return `<a class="liste-item" href="/notes/${n.id}">
          <div>
            <div class="titre-ligne">${echapperHtml(n.titre)}</div>
            <div class="sous-ligne">${echapperHtml(n.auteurUsername)} · ${date}</div>
          </div>
          <span class="fleche">→</span>
        </a>`;
      }).join('\n')
    : '<p class="vide">Aucune note pour le moment.</p>';

  const corps = `
    <div class="eyebrow">Interne</div>
    <h1 class="titre">Notes <span>du gang</span></h1>
    <p class="texte-intro">Un espace libre pour noter des infos, décisions, intel — entre membres.</p>

    <div class="mini-carte" style="margin:18px 0 26px">
      <div class="label">Nouvelle note</div>
      <form method="POST" style="margin-top:10px; display:flex; flex-direction:column; gap:10px">
        <input type="text" name="titre" placeholder="Titre" required maxlength="200"
          style="background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:14px">
        <textarea name="contenu" placeholder="Contenu..." required maxlength="4000" style="min-height:90px; background:#1b1414; border:1px solid var(--bordure); border-radius:9px; color:var(--texte); padding:10px 12px; font-family:inherit; font-size:13.5px; resize:vertical"></textarea>
        <button type="submit" class="btn btn-accent" style="align-self:flex-start">Ajouter la note</button>
      </form>
    </div>

    ${lignes}
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Notes', actif: 'notes', session, estStaff: staff, corps }));
};
