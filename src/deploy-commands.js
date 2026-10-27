'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');

const commandsPath = path.join(__dirname, 'commands');
const commands = fs.readdirSync(commandsPath)
  .filter((f) => f.endsWith('.js'))
  .map((f) => require(path.join(commandsPath, f)).data.toJSON());

const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = process.env;

if (!DISCORD_TOKEN || !DISCORD_CLIENT_ID || !DISCORD_GUILD_ID) {
  console.error('DISCORD_TOKEN, DISCORD_CLIENT_ID et DISCORD_GUILD_ID sont requis dans .env pour déployer les commandes.');
  process.exit(1);
}

const rest = new REST().setToken(DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Déploiement de ${commands.length} commande(s) sur le serveur ${DISCORD_GUILD_ID}...`);
    await rest.put(Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID), { body: commands });
    console.log('Commandes déployées avec succès.');
  } catch (err) {
    console.error('Échec du déploiement :', err);
    process.exit(1);
  }
})();
