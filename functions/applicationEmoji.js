function applicationEmoji(client, name) {
	const emoji = client.application.emojis.cache.find(e => e.name === name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase());
	return emoji ? emoji : ':grey_question:';
};

module.exports = { applicationEmoji };