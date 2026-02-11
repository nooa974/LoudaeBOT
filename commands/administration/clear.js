const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	permission: true,
	data: new SlashCommandBuilder()
		.setName('clear')
		.setDescription('Efface un certain nombre de messages dans le canal actuel')
		.addIntegerOption(option => option
			.setName('amount')
			.setDescription('Le nombre de messages à effacer')
			.setMinValue(1)
			.setMaxValue(100)
			.setRequired(true),
		),
	async execute(interaction) {
		const amount = interaction.options.getInteger('amount');
		const messages = await interaction.channel.messages.fetch({ limit: amount });
		await interaction.channel.bulkDelete(messages).catch(err => {
			console.error(err);
			interaction.reply({ content: 'Il y a eu une erreur en essayant d\'effacer les messages dans ce canal!', ephemeral: true });
		});
		return interaction.reply({ content: `✅ J'ai effacé ${amount} messages.`, ephemeral: true });
	},
};