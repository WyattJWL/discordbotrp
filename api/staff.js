'use strict';

const { listerCandidatures } = require('../lib/candidatures');
const { exigerStaff } = require('../lib/proteger');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

module.exports = async (req, res) => {
  const session = await exigerStaff(req, res);
  if (!session) return;

  const candidatures = await listerCandidatures();

  const lignes = candidatures.length
    ? candidatures.map((c) => {
        const date = new Date(c.creeAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
        return `<a class="liste-item" href="/candidature/${c.id}">
          <div>
            <div class="titre-ligne">${echapperHtml(c.reponses.nomPersonnage || '?')}</div>
            <div class="sous-ligne">${echapperHtml(c.reponses.discord || '?')} · ${date}</div>
          </div>
          <span class="fleche">→</span>
        </a>`;
      }).join('\n')
    : '<p class="vide">Aucune candidature reçue pour le moment.</p>';

  const corps = `
    <div class="eyebrow">Espace staff</div>
    <h1 class="titre">Candidatures <span>(${candidatures.length})</span></h1>
    <p class="texte-intro">Les nouvelles candidatures arrivent ici et dans le salon configuré.</p>
    <div style="margin-top:22px">${lignes}</div>
  `;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({ titre: 'Tableau de bord', actif: 'staff', session, estStaff: true, corps }));
};
