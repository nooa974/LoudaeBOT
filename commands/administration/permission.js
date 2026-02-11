const { SlashCommandBuilder, MessageFlagsBitField } = require('discord.js');
const { load, save } = require('../../utils/db');

module.exports = {
	permission: true,
	data: new SlashCommandBuilder()
		.setName('permissions')
		.setDescription('Configurer les permissions des rôles et les rôles d\'utilisateurs')
		.addSubcommandGroup(group => group
			.setName('role')
			.setDescription('Gérer les permissions des rôles')
			.addSubcommand(subcommand => subcommand
				.setName('get')
				.setDescription('Obtenir les permissions d\'un rôle')
				.addRoleOption(option => option
					.setName('role')
					.setDescription('Le rôle dont on veut obtenir les permissions')
					.setRequired(true),
				),
			)
			.addSubcommand(subcommand => subcommand
				.setName('add')
				.setDescription('Ajouter une permission à un rôle')
				.addRoleOption(option => option
					.setName('role')
					.setDescription('Le rôle auquel ajouter une permission')
					.setRequired(true),
				)
				.addStringOption(option => option
					.setName('permission')
					.setDescription('La permission à ajouter')
					.setRequired(true),
				),
			)
			.addSubcommand(subcommand => subcommand
				.setName('remove')
				.setDescription('Supprimer une permission d\'un rôle')
				.addRoleOption(option => option
					.setName('role')
					.setDescription('Le rôle auquel ajouter une permission')
					.setRequired(true),
				)
				.addStringOption(option => option
					.setName('permission')
					.setDescription('La permission à supprimer')
					.setRequired(true),
				),
			),
		)
		.addSubcommandGroup(group => group
			.setName('user')
			.setDescription('Gérer les rôles des utilisateurs')
			.addSubcommand(subcommand => subcommand
				.setName('get')
				.setDescription('Obtenir les rôles d\'un utilisateur')
				.addUserOption(option => option
					.setName('user')
					.setDescription('L\'utilisateur dont on veut obtenir les rôles')
					.setRequired(true),
				),
			)
			.addSubcommand(subcommand => subcommand
				.setName('add')
				.setDescription('Ajouter un rôle à un utilisateur')
				.addUserOption(option => option
					.setName('user')
					.setDescription('L\'utilisateur auquel ajouter un rôle')
					.setRequired(true),
				)
				.addRoleOption(option => option
					.setName('role')
					.setDescription('Le rôle à ajouter')
					.setRequired(true),
				),
			)
			.addSubcommand(subcommand => subcommand
				.setName('remove')
				.setDescription('Supprimer un rôle d\'un utilisateur')
				.addUserOption(option => option
					.setName('user')
					.setDescription('L\'utilisateur dont on veut supprimer un rôle')
					.setRequired(true),
				)
				.addRoleOption(option => option
					.setName('role')
					.setDescription('Le rôle à supprimer')
					.setRequired(true),
				),
			),
		),
	async execute(interaction) {
		const guild = interaction.guild;
		if (interaction.options.getSubcommandGroup() === 'role') {
			const role = guild.roles.cache.get(interaction.options.getRole('role')?.id);
			if (!role) {
				return interaction.reply({ content: 'Rôle non trouvé.', flags: MessageFlagsBitField.Ephemeral });
			}

			const permissions = load(guild.id, 'permissions');

			if (interaction.options.getSubcommand() === 'get') {
				const permissionKeys = [];

				for (const [permKey, permObj] of Object.entries(permissions)) {
					if (Object.keys(permObj).includes(role.id)) permissionKeys.push(permKey);
				}

				if (permissionKeys.length >= 2) return interaction.reply(`${role} a les permissions suivantes :\n${permissionKeys.join('\n')}`);
				else if (permissionKeys.length === 1) return interaction.reply(`${role} a la permission ` + permissionKeys[0] + '.');
				else return interaction.reply(`${role} n'a pas de permissions.`);
			}

			if (!interaction.client.commands.has(interaction.options.getString('permission'))) return interaction.reply({ content: 'Commande non trouvée.', flags: MessageFlagsBitField.Ephemeral });
			if (!interaction.client.commands.get(interaction.options.getString('permission')).permission) return interaction.reply({ content: 'Cette commande ne nécessite pas de permission.', flags: MessageFlagsBitField.Ephemeral });
			const key = interaction.options.getString('permission');
			if (!permissions[key]) permissions[key] = {};

			if (interaction.options.getSubcommand() === 'add') {
				if (permissions[key][role.id]) {
					return interaction.reply({ content: `${role} a déjà la permission ${interaction.options.getString('permission')}`, ephemeral: true });
				}
				permissions[key][role.id] = role.name;
				save(guild.id, 'permissions', permissions);
				return interaction.reply(`La permission ${interaction.options.getString('permission')} a été ajoutée au rôle ${role}.`);
			}

			if (interaction.options.getSubcommand() === 'remove') {
				if (!permissions[key][role.id]) {
					return interaction.reply({ content: `${role} n'a pas la permission ${interaction.options.getString('permission')}`, ephemeral: true });
				}
				delete permissions[key][role.id];
				save(guild.id, 'permissions', permissions);
				return interaction.reply(`La permission ${interaction.options.getString('permission')} a été retirée du rôle ${role}.`);
			}
		}
		else if (interaction.options.getSubcommandGroup() === 'user') {
			const member = guild.members.cache.get(interaction.options.getUser('user')?.id);
			if (!member) {
				return interaction.reply({ content: 'Utilisateur non trouvé.', flags: MessageFlagsBitField.Ephemeral });
			}

			const roles = member.roles.cache;

			if (interaction.options.getSubcommand() === 'get') {
				if (roles.size > 2) return interaction.reply(`${member} a les rôles suivants :\n${roles.filter(r => r.name != '@everyone').sort((a, b) => b.position - a.position).map(r => r).join('\n')}`);
				else if (roles.size === 2) return interaction.reply(`${member} a le rôle ` + roles.filter(r => r.name != '@everyone').map(r => r));
				else if (roles.size === 1) return interaction.reply(`${member} n'a pas de rôles.`);
			}

			const role = guild.roles.cache.get(interaction.options.getRole('role')?.id);
			if (!role) {
				return interaction.reply({ content: 'Rôle non trouvé.', flags: MessageFlagsBitField.Ephemeral });
			}
			else if (role.position + 1 >= interaction.member.roles.highest.position && interaction.member.id !== guild.ownerId) {
				return interaction.reply({ content: 'Vous n\'avez pas la permission de gérer ce rôle.', flags: MessageFlagsBitField.Ephemeral });
			}

			if (interaction.options.getSubcommand() === 'add') {
				if (roles.has(role.id)) {
					return interaction.reply({ content: `${member} a déjà le rôle ${role}.`, flags: MessageFlagsBitField.Ephemeral });
				}

				try {
					await member.roles.add(role);
					member.send(`Vous avez reçu le rôle ${role.name} dans ${guild.name} par ${interaction.user.tag}.`).catch(() => console.error('Impossible d\'envoyer un DM à l\'utilisateur.'));
				    return interaction.reply(`Le rôle ${role} a été ajouté à ${member}`);
				}
				catch (err) {
					interaction.reply({ content: `Erreur d'ajout de rôle : ${err}`, flags: MessageFlagsBitField.Ephemeral });
					return console.error(`Erreur d'ajout de rôle : ${err}`);
				}
			}

			if (interaction.options.getSubcommand() === 'remove') {
				if (!roles.has(role.id)) {
					return interaction.reply({ content: `${member} n'a pas le rôle ${role}.`, flags: MessageFlagsBitField.Ephemeral });
				}

				try {
					await member.roles.remove(role);
					member.send(`Vous avez été retiré du rôle ${role.name} dans ${guild.name} par ${interaction.user.tag}.`).catch(() => console.error('Impossible d\'envoyer un DM à l\'utilisateur.'));
				    return interaction.reply(`Le rôle ${role} a été retiré de ${member}`);
				}
				catch (err) {
					interaction.reply({ content: `Erreur de suppression de rôle : ${err}`, flags: MessageFlagsBitField.Ephemeral });
					return console.error(`Erreur de suppression de rôle : ${err}`);
				}
			}
		}
		return interaction.reply({ content: 'Cette commande est en cours de construction.', flags: MessageFlagsBitField.Ephemeral });
	},
};