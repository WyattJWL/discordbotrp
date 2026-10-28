'use strict';

const { listerMembresGuilde } = require('../lib/discord-api');
const { exigerMembre } = require('../lib/proteger');
const { estStaff, RANGS_GANG } = require('../lib/autorisation');
const { echapperHtml } = require('../lib/util');
const { page } = require('../lib/layout');

module.exports = async (req, res) => {
  const session = await exigerMembre(req, res);
  if (!session) return;

  const guildId = process.env.DISCORD_GUILD_ID;
  const [membres, staff] = await Promise.all([
    listerMembresGuilde(guildId),
    estStaff(session.userId)
  ]);

  const groupes = RANGS_GANG.map((rang) => ({
    rang,
    membres: membres.filter((m) => (m.roles || []).includes(rang.id))
  })).filter((g) => g.membres.length > 0);

  const corps = groupes.length
    ? groupes.map((g) => `
        <h2>${echapperHtml(g.rang.nom)} <span style="color:var(--texte-faible); font-weight:400">(${g.membres.length})</span></h2>
        <div class="grille-cartes">
          ${g.membres.map((m) => `
            <div class="mini-carte">
              <div class="valeur">${echapperHtml(m.nick || m.user?.global_name || m.user?.username || '?')}</div>
            </div>
          `).join('\n')}
        </div>
      `).join('\n')
    : '<p class="vide">Aucun membre trouvé.</p>';

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.status(200).send(page({
    titre: 'Annuaire',
    actif: 'membres',
    session,
    estStaff: staff,
    corps: `
      <div class="eyebrow">Organisation</div>
      <h1 class="titre">Annuaire des <span>membres</span></h1>
      <p class="texte-intro">Tous les membres de Sangre Negra, par rang.</p>
      ${corps}
    `
  }));
};
