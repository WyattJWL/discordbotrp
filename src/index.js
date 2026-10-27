'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, ActivityType } = require('discord.js');

const config = require(path.join(__dirname, '..', 'config.json'));

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const command = require(path.join(commandsPath, file));
  client.commands.set(command.data.name, command);
}

client.once('clientReady', () => {
  console.log(`Connecté en tant que ${client.user.tag}`);
  console.log(`${client.commands.size} commandes chargées : ${[...client.commands.keys()].join(', ')}`);
  client.user.setActivity('Sangre Negra RP', { type: ActivityType.Watching });
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, config, client.commands);
  } catch (err) {
    console.error(`Erreur dans la commande ${interaction.commandName} :`, err);
    const payload = { content: 'Une erreur est survenue en exécutant cette commande.', ephemeral: true };
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(() => {});
    } else {
      await interaction.reply(payload).catch(() => {});
    }
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('DISCORD_TOKEN manquant. Copie .env.example vers .env et renseigne ton token.');
  process.exit(1);
}

client.login(token);
