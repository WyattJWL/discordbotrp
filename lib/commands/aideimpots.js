'use strict';

const { repondre } = require('../reponse');
const embeds = require('../embeds');

const COMMANDES = [
  { usage: '/cimpots configurer revenu:<nombre> statut:<seul|couple> [partenaire:<@membre>]', description: 'Configure ton revenu et ton statut (envoie une invitation si en couple).', adminOnly: false },
  { usage: '/cimpots profil', description: 'Voir ton profil fiscal actuel.', adminOnly: false },
  { usage: '/cimpots code code:<CODE>', description: 'Utiliser un code promo pour réduire tes impôts.', adminOnly: false },
  { usage: '/dimpots', description: 'Déclarer le paiement de tes impôts de la semaine.', adminOnly: false },
  { usage: '/himpot', description: 'Afficher le numéro pour transférer le paiement des impôts.', adminOnly: false },
  { usage: '/aideimpots', description: 'Afficher la liste de toutes les commandes.', adminOnly: false },
  { usage: '/padmin creer pourcentage:<1-100> duree:<jours|jamais>  |  /padmin liste  |  /padmin revoquer code:<CODE>', description: "[Admin] Créer, lister ou révoquer des codes promo.", adminOnly: true },
  { usage: '/aimpots reset|ajouter|retirer|telephone|voir|liste', description: '[Admin] Gérer manuellement les impôts des membres.', adminOnly: true }
];

async function gerer() {
  const lignesUser = COMMANDES.filter((c) => !c.adminOnly).map((c) => `\`${c.usage}\`\n${c.description}`);
  const lignesAdmin = COMMANDES.filter((c) => c.adminOnly).map((c) => `\`${c.usage}\`\n${c.description}`);

  const embed = embeds.info('📋 Commandes impôts', lignesUser.join('\n\n'));
  embed.fields = [{ name: '🔧 Commandes admin', value: lignesAdmin.join('\n\n') }];

  return repondre(embed);
}

module.exports = { gerer };
