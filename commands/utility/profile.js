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

		let name = '';
		value = '';
		if (memberData?.experience && memberData.experience.needed && memberData.experience.acquired) {
			name += `>   Experience :  **NIVEAU ${memberData.experience.level}**`;
			value += `•  ${applicationEmoji(interaction.client, 'xp')} ${getBar(interaction.client, memberData.experience.acquired, memberData.experience.needed)}`;
		}
		if (name && value) embed.addFields({ name, value });

		value = '';
		// let genderEmoji = memberData?.gender ? applicationEmoji(interaction.client, `gender_${memberData.gender}`) : applicationEmoji(interaction.client);
		// if (memberData?.gender !== 'Homme' && memberData?.gender !== 'Femme') {
		// 	genderEmoji = applicationEmoji(interaction.client, 'gender_transgendre');
		// };
		if (memberData?.gender) value += `•  ${applicationEmoji(interaction.client, `gender_${memberData.gender}`)} ${memberData.gender}\n`;
		if (memberData?.sexual_orientation) value += `•  ${applicationEmoji(interaction.client, `sexual_orientation_${memberData.sexual_orientation}`)} ${memberData.sexual_orientation}\n`;

		if (value) embed.addFields({ name: '>   Identité :', value: value });

		value = '';
		if (memberData?.love_situation) value += `•  ${applicationEmoji(interaction.client, `love_situation_${memberData.love_situation}`)} ${memberData.love_situation}\n`;
		// value += memberData?.love_situation ? `•  ${applicationEmoji(interaction.client, `love_situation_${memberData.love_situation}`)} ${memberData.love_situation}\n` : `•  ${applicationEmoji(interaction.client)} Situation amoureuse indéfinie\n`;
		// if (memberData?.love_situation !== 'Célibataire') {
		// 	if (memberData.partner && guild.members.cache.has(memberData.partner)) {
		// 		value += `•  ${applicationEmoji(interaction.client, 'partner')} ${guild.members.cache.get(memberData.partner)}\n`;
		// 	}
		// 	else {
		// 		value += `•  ${applicationEmoji(interaction.client)} Partenaire indéfini(e)\n`;
		// 	}
		// }

		if (value) embed.addFields({ name: '>   Relationnel :', value: value || '\u200B' });

		const profileButton = new ActionRowBuilder()
			.addComponents(new ButtonBuilder().setCustomId('button.profile.modify').setLabel('Modifier le profil').setStyle(ButtonStyle.Primary));

		return await interaction.editReply({ embeds: [embed], components: [profileButton] });
	},
};