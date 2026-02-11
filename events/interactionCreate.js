const { Events, Collection, EmbedBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, LabelBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, UserSelectMenuBuilder } = require('discord.js');
const { load } = require('../utils/db');
const { getGuildDb } = require('../utils/mongodb.js');
const memberSchema = require('../models/Member.js');
const { applicationEmoji } = require('../functions/applicationEmoji.js');

const profile = {
	gender: ['Homme', 'Femme', 'Non-binaire', 'Autre'],
	sexual_orientation: ['Hétérosexuel', 'Homosexuel', 'Bisexuel', 'Pansexuel', 'Asexuel', 'Autre'],
	love_situation: ['Célibataire', 'En couple', 'Marié(e)', 'Autre'],
};

const profileNames = {
	gender: 'genre',
	sexual_orientation: 'orientation sexuelle',
	love_situation: 'situation amoureuse',
};

module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		let guildDB = interaction.guild != null ? getGuildDb(interaction.guild.id).model('Member', memberSchema) : null;
		let memberData = await guildDB?.findOne({ memberId: interaction.user.id }) || null;
		if (guildDB && !memberData) {
			memberData = new guildDB({ memberId: interaction.user.id });
			await memberData.save();
		}

		const customId = interaction.customId ? interaction.customId.split('.') : null;
		const type = customId ? customId[0] : null;
		const activity = customId ? customId[1] : null;
		const option = customId ? customId[2] : null;

		if (type === 'button') {
			if (activity === 'truthordare') {
				if (option === 'truth' || option === 'dare') {
					const choix = option === 'truth' ? 'vérité' : 'action';

					if (memberData[activity]) {
						return interaction.reply({ content: 'Vous ne pouvez pas jouer à action ou vérité plus d\'une fois en même temps !', ephemeral: true });
					}
					const embed = new EmbedBuilder()
						.setTitle(`ACTION ${applicationEmoji(interaction.client, 'dare')} __OU__ VÉRITÉ ${applicationEmoji(interaction.client, 'truth')}`)
						// .addFields({ name: '\u200B', value: `${applicationEmoji(interaction.client, 'certified')} ${interaction.user} a choisi une **${choix.toUpperCase()}** ${option === 'truth' ? applicationEmoji(interaction.client, 'truth') : applicationEmoji(interaction.client, 'dare')}` })
						.addFields({ name: '\u200B', value: `${applicationEmoji(interaction.client, 'suggestion')} ${interaction.user}\n> \`RECHERCHE\` Une proposition ${option === 'truth' ? `de **vérité** à avouer ${applicationEmoji(interaction.client, 'truth')}` : `d'**action** à relever ${applicationEmoji(interaction.client, 'dare')}`}` })
						.setColor(option === 'truth' ? '#FD4342' : '#E1E8EE');
					const messageButtons = new ActionRowBuilder()
						.addComponents(new ButtonBuilder().setCustomId(`button.truthordare.suggestion-${interaction.user.id}-${option}`).setLabel(`FAIRE UNE SUGGESTION ${option === 'truth' ? 'DE VÉRITÉ' : 'D\'ACTION'}`).setStyle(ButtonStyle.Primary));
					const message = await interaction.reply({ embeds: [embed], components: [messageButtons], fetchReply: true });
					return await guildDB.updateOne(
						{ memberId: interaction.user.id },
						{
							$set: {
								[activity]: {
									status: 'waiting',
									choice: option,
									channelId: interaction.channel.id,
									messageId: message.id,
								},
							},
						},
						{ upsert: true },
					);
				}
				else if (option.startsWith('suggestion-')) {
					const memberId = option.split('-')[1];
					memberData = await guildDB.findOne({ memberId: memberId });
					const choix = option.split('-')[2];
					if (memberData.activity || memberData[activity].status !== 'waiting') {
						return interaction.reply({ content: 'L\'utilisateur n\'est plus en attente d\'une proposition pour le moment !', ephemeral: true });
					}
					// if (interaction.user.id === memberId) {
					// 	return interaction.reply({ content: `Vous ne pouvez pas proposer une ${choix} à vous-même !`, ephemeral: true });
					// }
					const modal = new ModalBuilder().setCustomId(`modal.truthordare.suggestion-${memberId}`).setTitle('Proposer une ' + (choix === 'truth' ? 'vérité' : 'action'));
					const propositionInput = new TextInputBuilder()
						.setCustomId('propositionInput')
						.setStyle(TextInputStyle.Short)
						.setPlaceholder(choix === 'truth' ? 'Quel est ton plus grand rêve...' : 'Chantes la reine des neiges...');
					const propositionLabel = new LabelBuilder()
						.setLabel(choix === 'truth' ? 'Proposez une vérité' : 'Proposez une action')
						.setDescription('Votre proposition doit être claire et concise.')
						.setTextInputComponent(propositionInput);
					modal.addLabelComponents(propositionLabel);
					await interaction.showModal(modal);
				}
				else if (option.startsWith('accept-') || option.startsWith('refuse-')) {
					const guildId = option.split('-')[1];
					const memberId = option.split('-')[2];
					guildDB = getGuildDb(guildId).model('Member', memberSchema);
					memberData = await guildDB.findOne({ memberId: memberId });
					const channel = await interaction.client.channels.fetch(memberData[activity].channelId);
					console.log(channel);
					const message = await channel.messages.fetch(memberData[activity].messageId);
					console.log(message);
					const embed = message.embeds[0];
					console.log(embed.fields);
					if (option.startsWith('accept-')) {
						embed.fields[embed.fields.length - 1].value = embed.fields[embed.fields.length - 1].value.replace('PROPOSE', 'ACCEPTÉ');
					}
					else if (option.startsWith('refuse-')) {
						return await guildDB.updateOne(
							{ memberId: memberId },
							{
								$set: {
									'truthordare.status': 'waiting',
								},
								$unset: {
									'truthordare.suggestion': '',
								},
							},
						);
					}
					await message.edit({ embeds: [embed] });
				}
			}
			else if (activity === 'profile') {
				const modal = new ModalBuilder().setCustomId('modal.profile.modify').setTitle('Modifier votre profil');
				for (const field of ['gender', 'sexual_orientation', 'love_situation']) {
					const name = profileNames[field];
					const selectMenu = new StringSelectMenuBuilder()
						.setCustomId(field)
						.setPlaceholder(memberData?.[field] ? memberData?.[field] : `Choisissez votre ${name}`)
						.addOptions(
							(field === 'gender' ? profile.gender : field === 'sexual_orientation' ? profile.sexual_orientation : profile.love_situation).map(opt =>
								new StringSelectMenuOptionBuilder()
									.setLabel(opt)
									.setValue(opt),
							),
						)
						.setRequired(false);
					const label = new LabelBuilder()
						.setLabel(name.charAt(0).toUpperCase() + name.slice(1) + ' :')
						.setStringSelectMenuComponent(selectMenu);

					modal.addLabelComponents(label);
				}

				const selectPartner = new UserSelectMenuBuilder()
					.setCustomId('partner')
					.setPlaceholder('Sélectionnez votre partenaire')
					.addDefaultUsers(memberData?.partner ? [memberData.partner] : [])
					.setRequired(false);

				const labelPartner = new LabelBuilder()
					.setLabel('Partenaire :')
					.setUserSelectMenuComponent(selectPartner);

				modal.addLabelComponents(labelPartner);

				await interaction.showModal(modal);
			}
		}
		else if (type === 'modal') {
			if (activity === 'truthordare') {
				if (option.startsWith('suggestion-')) {
					const memberId = option.split('-')[1];
					memberData = await guildDB.findOne({ memberId: memberId });
					if (!memberData || memberData.activity || memberData[activity].status !== 'waiting') {
						return interaction.reply({ content: 'L\'utilisateur n\'est plus en attente d\'une proposition pour le moment !', ephemeral: true });
					}
					let suggestion = interaction.components[0].component.value.toLowerCase();
					suggestion = suggestion.charAt(0).toUpperCase() + suggestion.slice(1).toLowerCase();
					const embed = EmbedBuilder.from(interaction.message.embeds[0]);
					embed.addFields({ name: '\u200B', value: `${applicationEmoji(interaction.client, 'suggestion')} ${interaction.user}\n> \`PROPOSE\` ${suggestion}` });
					await interaction.update({ embeds: [embed] });
					embed.setFields({ name: '\u200B', value: `${interaction.user} vous a suggéré ${memberData[activity].choice === 'truth' ? `une vérité ${applicationEmoji(interaction.client, 'truth')}` : `une action ${applicationEmoji(interaction.client, 'dare')}`} :\n - \`${suggestion}\`` });
					const messageButtons = new ActionRowBuilder()
						.addComponents(new ButtonBuilder().setCustomId(`button.truthordare.accept-${interaction.guild.id}-${memberId}`).setLabel('ACCEPTER').setStyle(ButtonStyle.Primary))
						.addComponents(new ButtonBuilder().setCustomId(`button.truthordare.refuse-${interaction.guild.id}-${memberId}`).setLabel('REFUSER').setStyle(ButtonStyle.Danger));
					const member = await interaction.guild.members.fetch(memberId);
					await member.send({ embeds: [embed], components: [messageButtons] });
					return await guildDB.updateOne({ memberId: memberId }, { 'truthordare.status': 'confirming', 'truthordare.suggestion.idea': suggestion, 'truthordare.suggestion.author': interaction.user.id });
				}
			}
			else if (activity === 'profile') {
				if (option === 'modify') {
					const updates = {};
					interaction.fields.fields.forEach((field) => {
						const value = field.values[0];
						if (memberData[field.customId] !== value) {
							updates[field.customId] = value;
						}
					});

					await guildDB.updateOne(
						{ memberId: interaction.user.id },
						{ $set: updates },
						{ new: true, upsert: true },
					);

					await interaction.reply({ content: 'Votre profil a été mis à jour avec succès !', ephemeral: true });
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
					const perms = load(interaction.guild.id, 'permissions');
					const key = interaction.commandName;
					const memberRoles = interaction.member.roles.cache.map(r => r.id);

					const hasPerm = perms[key] && Object.keys(perms[key]).some(roleId => memberRoles.includes(roleId));
					if (!hasPerm && interaction.user.id !== interaction.guild.ownerId) {
						return interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
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