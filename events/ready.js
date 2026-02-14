const { Events } = require('discord.js');
const { connectMain } = require('../utils/mongodb');

const fs = require('fs');
const path = require('path');
const mongoDb = require('../utils/mongodb.js');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Connecté en tant que ${client.user.tag}`);
		await connectMain();
		await client.application.emojis.fetch();

		function collectEmojiNames(dirPath, prefix = '') {
			const names = [];
			const items = fs.readdirSync(dirPath, { withFileTypes: true });
			
			items.forEach(item => {
				const fullPath = path.join(dirPath, item.name);
				
				if (item.isDirectory()) {
					names.push(...collectEmojiNames(fullPath, prefix + item.name + '_'));
				} else if (item.isFile() && !item.name.startsWith('-') && (item.name.endsWith('.png') || item.name.endsWith('.gif'))) {
					const fileName = item.name.slice(0, -4).replace(/ /g, '_');
					const emojiName = (prefix + fileName).slice(0, 32);
					names.push(emojiName);
				}
			});
			
			return names;
			}

			const existingEmojiNames = collectEmojiNames('./emojis');

			await client.application.emojis.cache.forEach(async (emoji) => {
				if (!existingEmojiNames.includes(emoji.name)) {
					await emoji.delete().catch(console.error);
					console.log(`Emoji ${emoji.name} supprimé.`);
				}
			});


		function loadEmojisFromDir(dirPath, prefix = '') {
			const items = fs.readdirSync(dirPath, { withFileTypes: true });
			
			items.forEach(item => {
				const fullPath = path.join(dirPath, item.name);
				
				if (item.isDirectory()) {
					loadEmojisFromDir(fullPath, prefix + item.name + '_');
				} else if (item.isFile() && !item.name.startsWith('-') && (item.name.endsWith('.png') || item.name.endsWith('.gif'))) {
				// Fichier PNG : utilise le préfixe (dossier_fichier)
				const fileName = item.name.slice(0, -4).replace(/ /g, '_'); // enlève .png et remplace les espaces par des underscores
				const emojiName = (prefix + fileName).slice(0, 32); // limite à 32 chars
				
				if (emojiName.length > 32) {
					console.warn(`Emoji ${emojiName} dépasse 32 caractères.`);
					return;
				}
				
				if (!client.application.emojis.cache.find(e => e.name === emojiName)) {
					client.application.emojis.create(
						{
							name: emojiName,
							attachment: fullPath,
						}
					).then(() => console.log(`Emoji ${emojiName} ajouté.`))
					.catch(console.error);
				}
				}
			});
		}

		loadEmojisFromDir('./emojis');

		const activeGuilds = client.guilds.cache.map(g => g);
  
		setInterval(async () => {
			for (const guild of activeGuilds) {
				try {
					const Members = await mongoDb.getGuildDb(guild.id)?.model('Member', require('../models/Member'));
					await Members.updateMany({}, { $inc: { "currencys.bronze": 1 } });
					console.log(`+1 coin pour tous les joueurs du serveur ${guild.name}`);
				} catch (err) { console.error(err); }
			}
		}, 1000);
	},
};