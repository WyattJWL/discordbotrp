'use strict';

const { echapperHtml } = require('./util');

const ICONES = {
  espace: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  staff: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2 4 6v6c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-4Z"/></svg>',
  accueil: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  postuler: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>'
};

/**
 * Enrobe une page dans la mise en page sidebar commune aux espaces connectés.
 * @param {{titre: string, actif: string, session: {username:string}, estStaff: boolean, corps: string}} opts
 */
function page({ titre, actif, session, estStaff, corps }) {
  const liens = [{ id: 'espace', href: '/espace', label: 'Mon espace' }];
  if (estStaff) liens.push({ id: 'staff', href: '/staff', label: 'Candidatures' });
  liens.push({ id: 'postuler', href: '/candidature', label: 'Parrainer' });
  liens.push({ id: 'accueil', href: '/', label: 'Accueil' });

  const nav = liens
    .map((l) => `<a href="${l.href}" class="${l.id === actif ? 'actif' : ''}">${ICONES[l.id] || ''}<span class="libelle">${l.label}</span></a>`)
    .join('\n');

  const nomEchappe = echapperHtml(session.username);

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${echapperHtml(titre)} — Sangre Negra</title>
<link rel="stylesheet" href="/style.css">
</head>
<body>
<div class="app">
  <div class="sidebar">
    <div class="marque">
      <div class="ecusson" style="width:30px;height:30px;font-size:11px;border-radius:8px">SN</div>
      <div class="nom">SANGRE <span>NEGRA</span></div>
    </div>
    <nav>${nav}</nav>
    <div class="bas">
      <div class="profil">
        <div class="avatar">${nomEchappe.charAt(0).toUpperCase()}</div>
        <div style="flex:1; min-width:0">
          <div class="nom-utilisateur">${nomEchappe}</div>
          <a class="deco" href="/api/auth/logout">Déconnexion</a>
        </div>
      </div>
    </div>
  </div>
  <div class="contenu">
    ${corps}
  </div>
</div>
</body>
</html>`;
}

module.exports = { page };
