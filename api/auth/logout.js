'use strict';

module.exports = async (req, res) => {
  res.setHeader('Set-Cookie', 'session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0');
  res.writeHead(302, { Location: '/' });
  res.end();
};
