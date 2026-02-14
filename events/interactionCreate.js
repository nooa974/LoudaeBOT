const { Events, Collection, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, UserSelectMenuBuilder } = require('discord.js');
const { load } = require('../utils/db');
const { getGuildDb } = require('../utils/mongodb');
const { applicationEmoji } = require('../functions/applicationEmoji.js');
const { profileEmbed } = require('../commands/rpg/profile.js');

const memberSchema = require('../models/Member.js');

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		const user = interaction.user;
		if (user.bot) return;

		const customId = interaction.customId ? interaction.customId.split('.') : null;

		if(customId) {
			if (customId[0] === 'button') {
				if (customId[1] === 'profile') {
					const interactionUser = interaction.customId.split('-')[1];
					console.log(interactionUser);
					if (customId[2].startsWith('accueil-')) {
						return profileEmbed(interaction, interactionUser);
					}
					if (customId[2].startsWith('pets-')) {
						return profileEmbed(interaction, interactionUser, 'pets');
					}
				}
			}
		}
		else if (interaction.isChatInputCommand()) {
			const command = interaction.client.commands.get(interaction.commandName);

			if (!command) {
				console.error(`No command matching ${interaction.commandName} was found.`);
				return;
			}

			try {
				if (command.experimentation) return interaction.reply({ content: 'This command is only available to developers and testers.', ephemeral: true });
				if (command.permission) {
					if(interaction.guild) {
						const key = interaction.commandName;
						const memberRoles = interaction.member.roles.cache.map(r => r.id);

						let permissions = await load(interaction.guild.id, 'permissions');

						const hasPerm = permissions[key] && Object.keys(permissions[key]).some(roleId => memberRoles.includes(roleId));
						if (!hasPerm && interaction.user.id !== interaction.guild.ownerId) {
							return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
						}
					}
				}

				const cooldowns = interaction.client.cooldowns;

				if (!cooldowns.has(command.data.name)) {
					cooldowns.set(command.data.name, new Collection());
				}

				const now = Date.now();
				const timestamps = cooldowns.get(command.data.name);
				const defaultCooldownDuration = 3;
				const cooldownAmount = (command.cooldown ?? defaultCooldownDuration) * 1_000;

				if (timestamps.has(interaction.user.id)) {
					const expirationTime = timestamps.get(interaction.user.id) + cooldownAmount;

					if (now < expirationTime) {
						const expiredTimestamp = Math.round(expirationTime / 1_000);
						return interaction.reply({
							content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
							ephemeral: true,
						});
					}
				}

				timestamps.set(interaction.user.id, now);
				setTimeout(() => timestamps.delete(interaction.user.id), cooldownAmount);

				await command.execute(interaction);
			}
			catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content: 'There was an error while executing this command!',
						ephemeral: true,
					});
				}
				else {
					await interaction.reply({
						content: 'There was an error while executing this command!',
						ephemeral: true,
					});
				}
			}
		}
	},
};