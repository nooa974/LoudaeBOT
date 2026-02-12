const { Events } = require('discord.js');
const { connectMain } = require('../utils/mongodb');

const fs = require('fs');
const path = require('path');

module.exports = {
	name: Events.ClientReady,
	once: true,
	async execute(client) {
		console.log(`Ready! Logged in as ${client.user.tag}`);
		await connectMain();
		await client.application.emojis.fetch();

		function collectEmojiNames(dirPath, prefix = '') {
			const names = [];
			const items = fs.readdirSync(dirPath, { withFileTypes: true });
			
			items.forEach(item => {
				const fullPath = path.join(dirPath, item.name);
				
				if (item.isDirectory()) {
					names.push(...collectEmojiNames(fullPath, prefix + item.name + '_'));
				} else if (item.isFile() && item.name.endsWith('.png')) {
					const fileName = item.name.slice(0, -4);
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
					console.log(`Deleted orphan emoji: ${emoji.name}`);
				}
			});


		function loadEmojisFromDir(dirPath, prefix = '') {
			const items = fs.readdirSync(dirPath, { withFileTypes: true });
			
			items.forEach(item => {
				const fullPath = path.join(dirPath, item.name);
				
				if (item.isDirectory()) {
					loadEmojisFromDir(fullPath, prefix + item.name + '_');
				} else if (item.isFile() && item.name.endsWith('.png')) {
				// Fichier PNG : utilise le préfixe (dossier_fichier)
				const fileName = item.name.slice(0, -4); // enlève .png
				const emojiName = (prefix + fileName).slice(0, 32); // limite à 32 chars
				
				if (emojiName.length > 32) {
					console.warn(`Skipped ${emojiName} because its name exceeds 32 characters.`);
					return;
				}
				
				if (!client.application.emojis.cache.find(e => e.name === emojiName)) {
					client.application.emojis.create(
						{
							name: emojiName,
							attachment: fullPath,
						}
					).then(() => console.log(`Added emoji: ${emojiName}`))
					.catch(console.error);
				}
				}
			});
		}

		loadEmojisFromDir('./emojis');
	},
};