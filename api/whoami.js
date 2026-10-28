'use strict';

const { lireCookies, lireSession } = require('../lib/session');
const { estMembreGang, estStaff } = require('../lib/autorisation');
const { trouverCandidaturePourUtilisateur } = require('../lib/candidatures');

module.exports = async (req, res) => {
  const cookies = lireCookies(req);
  const session = lireSession(cookies.session);

  res.setHeader('Content-Type', 'application/json');
  if (!session) {
    res.status(200).json({ connecte: false });
    return;
  }

  const [membre, staff, candidature] = await Promise.all([
    estMembreGang(session.userId),
    estStaff(session.userId),
    trouverCandidaturePourUtilisateur(session.userId)
  ]);

  res.status(200).json({
    connecte: true,
    username: session.username,
    estMembre: membre,
    estStaff: staff,
    aPostule: !!candidature,
    statutCandidature: candidature ? candidature.statut : null
  });
};
