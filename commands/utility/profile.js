const { SlashCommandBuilder, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const mongoDb = require('../../utils/mongodb.js');
const memberSchema = require('../../models/Member.js');
const { applicationEmoji } = require('../../functions/applicationEmoji.js');

function getBar(client, value, maxValue = 100) {
	const filledSlots = Math.round((value / maxValue) * 10);
	let bar = '';

	for (let i = 0; i < 10; i++) {
		const isFilled = i < filledSlots;
		if (i === 0) {
			bar += isFilled ? applicationEmoji(client, 'loading_full_first').toString() : applicationEmoji(client, 'loading_empty_first').toString();
		}
		else if (i === 9) {
			bar += isFilled ? applicationEmoji(client, 'loading_full_last').toString() : applicationEmoji(client, 'loading_empty_last').toString();
		}
		else {
			bar += isFilled ? applicationEmoji(client, 'loading_full_middle').toString() : applicationEmoji(client, 'loading_empty_middle').toString();
		}
	}
	return bar;
}

function digitToEmoji(client, digits = 0) {
	const str = String(digits);
	let result = '';

	for (const digit of str) {
		result += applicationEmoji(client, `number_${digit}`).toString() ?? digit;
	}

	return result;
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('profile')
		.setDescription('Afficher le profil d\'un joueur. (ou de vous même)')
		.addUserOption(option => option
			.setName('user')
			.setDescription('L\'utilisateur dont vous voulez voir le profil')
			.setRequired(false),
		),
	async execute(interaction) {
		await interaction.deferReply();

		const guild = interaction.guild;
		const user = interaction.options.getUser('user') || interaction.user;
		if (user.bot) return;
		const member = guild.members.cache.get(user.id);
		if (!member) return interaction.editReply({ content: 'Utilisateur introuvable dans ce serveur.', ephemeral: true });

		const memberData = await mongoDb.create(interaction.guildId, 'Member', member.id, { memberName: member.user.tag });

		const embed = new EmbedBuilder()
			.setColor(Colors.DarkGrey);

		const loudaeGuild = await interaction.client.guilds.fetch(process.env.GUILDID);
		const loudaeMember = loudaeGuild
			? await loudaeGuild.members.cache.get(member.id) || await loudaeGuild.members.fetch(member.id).catch(() => null)
			: null;

		if (!loudaeMember) {
			embed.setDescription('Cet utilisateur n\'est pas encore inscrit sur Loudae. Pour s\'inscrire, il suffit de rejoindre le serveur Loudae ! discord.gg/loudae');
			embed.setColor(Colors.NotQuiteBlack);
		}
		else if (loudaeMember.roles.cache.has(process.env.PROPRIETAIREID)) {
			const ownerEmoji = applicationEmoji(interaction.client, 'owner');
			embed.addFields({ name: `${ownerEmoji} Propriétaire de Loudae`, value: '' });
			embed.setColor(Colors.Red);
		}
		else if (loudaeMember.roles.cache.has(process.env.STAFFID)) {
			const staffEmoji = applicationEmoji(interaction.client, 'staff');
			embed.addFields({ name: `${staffEmoji} Staff de Loudae`, value: '' });
			embed.setColor(Colors.Blue);
		}
		else if (loudaeMember.roles.cache.has(process.env.PREMIUMID)) {
			const premiumEmoji = applicationEmoji(interaction.client, 'premium');
			embed.addFields({ name: `${premiumEmoji} Premium de Loudae`, value: '' });
			embed.setColor(Colors.White);
		}
		else {
			const memberEmoji = applicationEmoji(interaction.client, 'member');
			embed.addFields({ name: `${memberEmoji} Joueur de Loudae`, value: '' });
		}

		let value = '';
		if (member.roles.cache.size > 1) value += `•  ${applicationEmoji(interaction.client, 'role')} ${member.roles.highest}\n`;
		value += `•  ${applicationEmoji(interaction.client, 'member')} ${member}\n`;

		embed.addFields({ name: '>   Personnel :', value: value });

		value = '';
		if (memberData?.currencys) {
			for (const [currencyKey, currencyValue] of Object.entries(memberData.currencys)) {
				value += `•  ${applicationEmoji(interaction.client, `${currencyKey}`)} **${currencyKey.toUpperCase()}** ${digitToEmoji(interaction.client, currencyValue)}\n`;
			}
			if (value) embed.addFields({ name: '>   Portefeuille :', value });
		}

		let name = '';
		value = '';
		if (memberData?.experience && memberData.experience.needed && memberData.experience.acquired) {
			name += `>   Experience :  **NIVEAU** ${memberData.experience.level}`;
			value += `•  ${applicationEmoji(interaction.client, 'xp')} ${getBar(interaction.client, memberData.experience.acquired, memberData.experience.needed)}`;
		}
		if (name && value) embed.addFields({ name, value });

		value = '';
		if (memberData?.badges) {
			for (const badge of memberData.badges) {
				value += `•  ${applicationEmoji(interaction.client, `badge_${badge}`)} **\`${badge.toUpperCase()}\`**\n`;
			}
			if (value) embed.addFields({ name: '>   Badges :', value });
		}

		return await interaction.editReply({ embeds: [embed]});
	},
};