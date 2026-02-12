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
	},
};