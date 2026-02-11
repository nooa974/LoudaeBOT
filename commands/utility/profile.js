const { SlashCommandBuilder, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { getGuildDb } = require('../../utils/mongodb.js');
const memberSchema = require('../../models/Member.js');
const { applicationEmoji } = require('../../functions/applicationEmoji.js');

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

		const guildDb = getGuildDb(guild.id);
		const Member = guildDb.model('Member', memberSchema);
		let memberData = await Member.findOne({ memberId: member.id });
		if (!memberData) {
			memberData = new Member({ memberId: member.id });
			await memberData.save();
		}

		const embed = new EmbedBuilder()
			.setColor(Colors.NotQuiteBlack);

		const loudaeGuild = await interaction.client.guilds.fetch(process.env.GUILDID);
		if (!loudaeGuild) return interaction.editReply({ content: 'Le serveur Loudae est introuvable.', ephemeral: true });

		const loudaeMember = loudaeGuild
			? await loudaeGuild.members.cache.get(member.id) || await loudaeGuild.members.fetch(member.id).catch(() => null)
			: null;

		if (!loudaeMember) {
			embed.setDescription('Cet utilisateur n\'est pas encore inscrit sur Loudae. Pour s\'inscrire, il suffit de rejoindre le serveur Loudae ! discord.gg/loudae');
			embed.setColor(Colors.DarkGrey);
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
		value += member.roles.cache.size > 1 ? `•  ${applicationEmoji(interaction.client, 'role')} ${member.roles.highest}\n` : '';
		value += `•  ${applicationEmoji(interaction.client, 'member')} ${member}\n`;

		embed.addFields({ name: '>   Personnel :', value: value });

		value = '';
		let genderEmoji = memberData?.gender ? applicationEmoji(interaction.client, `gender_${memberData.gender}`) : applicationEmoji(interaction.client);
		if (memberData?.gender !== 'Homme' && memberData?.gender !== 'Femme') {
			genderEmoji = applicationEmoji(interaction.client, 'gender_transgendre');
		};
		value += memberData?.gender ? `•  ${genderEmoji} ${memberData.gender}\n` : `•  ${applicationEmoji(interaction.client)} Genre indéfini\n`;
		value += memberData?.sexual_orientation ? `•  ${applicationEmoji(interaction.client, `sexual_orientation_${memberData.sexual_orientation}`)} ${memberData.sexual_orientation}\n` : `•  ${applicationEmoji(interaction.client)} Orientation sexuelle indéfinie\n`;

		embed.addFields({ name: '>   Identité :', value: value });

		value = '';
		value += memberData?.love_situation ? `•  ${applicationEmoji(interaction.client, `love_situation_${memberData.love_situation}`)} ${memberData.love_situation}\n` : `•  ${applicationEmoji(interaction.client)} Situation amoureuse indéfinie\n`;
		if (memberData?.love_situation !== 'Célibataire') {
			if (memberData.partner && guild.members.cache.has(memberData.partner)) {
				value += `•  ${applicationEmoji(interaction.client, 'partner')} ${guild.members.cache.get(memberData.partner)}\n`;
			}
			else {
				value += `•  ${applicationEmoji(interaction.client)} Partenaire indéfini(e)\n`;
			}
		}

		embed.addFields({ name: '>   Relationnel :', value: value || '\u200B' });

		const profileButton = new ActionRowBuilder()
			.addComponents(new ButtonBuilder().setCustomId('button.profile.modify').setLabel('Modifier le profil').setStyle(ButtonStyle.Primary));

		return await interaction.editReply({ embeds: [embed], components: [profileButton] });
	},
};