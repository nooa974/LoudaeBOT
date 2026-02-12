const { Events } = require('discord.js');
const mongoDb = require('../utils/mongodb');
const { mongo } = require('mongoose');

module.exports = {
	name: Events.MessageCreate,
	async execute(message) {
		if (message.author.bot) return;
		const memberData = await mongoDb.create(message.guildId, 'Member', message.author.id, { memberName: message.author.tag });
		if (memberData) {
			if (!memberData.experience?.level) memberData.set('experience.level', 1);
			if (!memberData.experience?.needed) memberData.set('experience.needed', 100 * ((memberData.experience?.level || 1) ** 2));
			let xp = 1;
			let multiplier = 1;
			if (message.member.premiumSince || message.member.roles.cache.find(role => role.name.includes('Staff'))) multiplier *= 1.5;
			if (message.member.presence?.activities?.find(activity => activity.type === 4 && activity.state === 'discord.gg/loudae')) multiplier *= 1.3;
			if (message.author.primaryGuild?.identityEnabled && message.author.primaryGuild.identityGuildId === message.guildId) multiplier *= 1.2;
			message.reply(multiplier.toString());
			xp *= multiplier.toFixed(2);
			memberData.set('experience.acquired', memberData.experience?.acquired ? (memberData.experience.acquired + xp) : xp);
			await memberData.save();
		}
	},
};