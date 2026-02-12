const { Events } = require('discord.js');
const { connectMain } = require('../utils/mongodb');

const fs = require('fs');
const path = require('path');

const emojiDir = './emojis';

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await connectMain();
		await client.application.emojis.fetch();
		await client.application.emojis.cache.forEach(async emoji => {
			if (!fs.existsSync(path.join(emojiDir, `${emoji.name}.png`))) {
    			await emoji.delete().catch(console.error);
				console.log(`Deleted emoji: ${emoji.name} (not found in emojis directory)`);
			}
		});

		fs.readdirSync('./emojis').filter(file => file.endsWith('.png')).forEach(emoji => {
			const emojiName = emoji.split('.').slice(0, -1).join('.');
			if (emojiName.length > 32) {
				console.warn(`Skipped emoji ${emojiName} because its name exceeds 32 characters.`);
				return;
			}
			if (!client.application.emojis.cache.find(e => e.name === emojiName)) {
				client.application.emojis.create({
					name: emojiName,
					attachment: path.join(emojiDir, emoji),
				}).then(() => {
					console.log(`Added emoji: ${emojiName}`);
				}).catch(console.error);
			};
		});

		try {
			const { REST, Routes } = require('discord.js');
			require('dotenv').config();
			const fs = require('node:fs');
			const path = require('node:path');

			const commands = [];
			// Grab all the command folders from the commands directory you created earlier
			const foldersPath = path.join(__dirname, '../commands');
			const commandFolders = fs.readdirSync(foldersPath).filter(folder => !folder.startsWith('.'));

			for (const folder of commandFolders) {
				// Grab all the command files from the commands directory you created earlier
				const commandsPath = path.join(foldersPath, folder);
				const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith('.js'));
				// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
				for (const file of commandFiles) {
					const filePath = path.join(commandsPath, file);
					const command = require(filePath);
					if ('data' in command && 'execute' in command) {
						commands.push(command.data.toJSON());
					}
					else {
						console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
					}
				}
			}

			async function clearCommands() {
				try {
					await rest.put(Routes.applicationCommands(process.env.CLIENTID), []);
					console.log('✅ Commandes supprimées avec succès.');
				}
				catch (error) {
					console.error('❌ Erreur de suppression des commandes :', error);
				}
			}

			// Construct and prepare an instance of the REST module
			const rest = new REST().setToken(process.env.TOKEN);

			// and deploy your commands!
			(async () => {
				try {
					await clearCommands();
					console.log(`✅ Déploiement de ${commands.length} commandes en cours...`);


					// The put method is used to fully refresh all commands in the guild with the current set
					const data = await rest.put(Routes.applicationCommands(process.env.CLIENTID), { body: commands });

					console.log(`✅ Déploiement réussi de ${commands.length} commandes !`);
				}
				catch (error) {
					// And of course, make sure you catch and log any errors!
					console.error(error);
				}
			})();
		} catch (error) {
			console.error('Error loading commands:', error);
		}
		/* const loudaeGuild = await client.guilds.fetch(process.env.GUILDID);
		await loudaeGuild.emojis.fetch();
		await loudaeGuild.members.fetch();
		await loudaeGuild.roles.fetch();
		console.log('✅ Loudae Guild loaded'); */
	},
};