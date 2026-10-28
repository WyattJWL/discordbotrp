'use strict';

const { lireCookies, lireSession } = require('../lib/session');

module.exports = async (req, res) => {
  const cookies = lireCookies(req);
  const session = lireSession(cookies.session);

  res.setHeader('Content-Type', 'application/json');
  if (!session) {
    res.status(200).json({ connecte: false });
    return;
  }
  res.status(200).json({ connecte: true, username: session.username });
};
