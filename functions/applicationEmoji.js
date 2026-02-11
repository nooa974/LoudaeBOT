function applicationEmoji(client, name) {
	return name ? client.application.emojis.cache.find(e => e.name === name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) : ':grey_question:';
};

module.exports = { applicationEmoji };