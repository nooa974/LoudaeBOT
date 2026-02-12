const { SlashCommandBuilder } = require('discord.js');
const { reloadCommands } = require('../../deploy-commands.js');

module.exports = {
    permission: true,
    data: new SlashCommandBuilder()
        .setName('reloadcommands')
        .setDescription('Recharge les commandes du bot.')
        .addBooleanOption(option => option
            .setName('remove')
            .setDescription('Supprimer les commandes avant de les redéployer')
            .setRequired(false),
        ),

    async execute(interaction) {
        await reloadCommands(interaction.options.getBoolean('remove'));
        await interaction.reply({ content: '✅ Commandes rechargées avec succès !', ephemeral: true });
    }
};