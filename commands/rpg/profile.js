const { SlashCommandBuilder, EmbedBuilder, Colors } = require('discord.js');
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const { formatNumber } = require('../../functions/numbers.js');
const { applicationEmoji } = require('../../functions/applicationEmoji.js');
const { getGuildDb } = require('../../utils/mongodb.js');
const memberSchema = require('../../models/Member.js');

async function profileEmbed(interaction, userId, customId) {
	if (interaction.message) await interaction.deferUpdate();
	else await interaction.deferReply();

	const guild = interaction.guild;
	if (!guild) return interaction.editReply({ content: 'Cette commande doit être utilisée dans un serveur.', ephemeral: true });

	const member = guild.members.cache.get(userId);
	if (!member) return interaction.editReply({ content: 'Utilisateur introuvable dans ce serveur.', ephemeral: true });

	const dbMember = await getGuildDb(interaction.guildId)?.model('Member', memberSchema);

	let memberData = await dbMember.findOne({ memberId: userId });
	if (!memberData) {
		memberData = await dbMember.create({ memberId: userId, memberName: member.user.tag });
	}

	const profilEmbed = new EmbedBuilder()
		.setColor(Colors.NotQuiteBlack)
		.setThumbnail(member.user.displayAvatarURL())

	const loudaeGuild = interaction.client.guilds.cache.find(g => g.id === process.env.GUILDID);

	const loudaeMember = loudaeGuild
		? await loudaeGuild.members.fetch(userId)
		: null;

	if (loudaeMember && loudaeMember.roles.cache.size > 1 && loudaeMember.roles.hoist) {
		const roleEmoji = applicationEmoji(interaction.client, `roles_${loudaeMember.roles.hoist.name.toLowerCase()}`);
		profilEmbed.setDescription(`${roleEmoji} **${loudaeMember.roles.hoist.name} de Loudae**`, );
		profilEmbed.setColor(loudaeMember.roles.hoist.color);
	}
	else {
		profilEmbed.setAuthor({ name: `Non-inscrit sur discord.gg/loudae`, url: loudaeGuild ? 'https://discord.gg/loudae' : null });
	}

	// Profil
	let value = '';
	if (member.roles.cache.size > 1) value += `•  ${applicationEmoji(interaction.client, 'role')} ${member.roles.highest}\n`;
	value += `•  ${applicationEmoji(interaction.client, 'member')} ${member}\n`;
	profilEmbed.addFields({ name: '>   Personnel :', value: value });

	const component = new ActionRowBuilder();

	if (!customId) {

		// Monnaie(s)
		if (memberData?.currencys) {
			value = '';
			for (const [name, number] of Object.entries(memberData.currencys)) {
				value += `•  ${applicationEmoji(interaction.client, `currencys_${name}`)} \`${formatNumber(number)}\` **${name.toUpperCase()}**\n`;
			}
			if (value) profilEmbed.addFields({ name: '>   Monnaie(s) :', value });
		}

		// Badge(s)
		if (memberData?.badges) {
			value = '';
			for (const badge of memberData.badges) {
				value += `•  ${applicationEmoji(interaction.client, `badges_${badge}`)} **\`${badge.toUpperCase()}\`**\n`;
			}
			if (value) profilEmbed.addFields({ name: '>   Badge(s) :', value });
		}
		
		const petsButton = new ButtonBuilder()
			.setCustomId('button.profile.pets-' + userId)
			.setLabel('FAMILIERS')
			.setEmoji(applicationEmoji(interaction.client, 'pets').toString())
			.setStyle(ButtonStyle.Primary);
		component.addComponents(petsButton);
	}
	else if (customId === 'pets') {
		value = '';
		for (const pet of (memberData.pets || [])) {
			const petName = pet.charAt(0).toUpperCase() + pet.slice(1);
			const petEmoji = applicationEmoji(interaction.client, `pets_${pet.toLowerCase()}`);
			value += `•  ${petEmoji} **${petName}** \`x 1.5\`\n`;
		}
		if (!value) value = `•  ${applicationEmoji(interaction.client, 'pets')} Aucun familier.`;
		profilEmbed.addFields({ name: '>   Familiers :', value });

		const accueilButton = new ButtonBuilder()
			.setCustomId('button.profile.accueil-' + userId)
			.setLabel('ACCUEIL')
			.setEmoji(applicationEmoji(interaction.client, 'member').toString())
			.setStyle(ButtonStyle.Primary);
		component.addComponents(accueilButton);
	}

	return await interaction.editReply({ embeds: [profilEmbed], components: component.components.length > 0 ? [component] : [] });
}

module.exports = {
    permission: true,
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('Affiche votre profil ou celui d\'un autre utilisateur.')
		.addUserOption(option => option
			.setName('utilisateur')
			.setDescription('L\'utilisateur dont vous voulez voir le profil')
			.setRequired(false),
		),

    async execute(interaction) {
		const user = interaction.options.getUser('utilisateur')?.id || interaction.user.id;
		console.log(user);
        profileEmbed(interaction, user);
    },
	profileEmbed
};