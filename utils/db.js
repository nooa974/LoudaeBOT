const fs = require('fs');

function initDB(guildId, file) {
	if (!fs.existsSync('./data')) fs.mkdirSync('./data');
	if (!fs.existsSync(`./data/${guildId}`)) fs.mkdirSync(`./data/${guildId}`);
	if (!fs.existsSync(`./data/${guildId}/${file}.json`)) fs.writeFileSync(`./data/${guildId}/${file}.json`, '{}');
}

function load(guildId, file) {
	initDB(guildId, file);
	return JSON.parse(fs.readFileSync(`./data/${guildId}/${file}.json`, 'utf8'));
}

function save(guildId, file, data) {
	fs.writeFileSync(`./data/${guildId}/${file}.json`, JSON.stringify(data, null, 2));
}

module.exports = { load, save };
