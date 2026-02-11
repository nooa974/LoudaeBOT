const mongoose = require('mongoose');

let mainConn;

async function connectMain() {
	mainConn = await mongoose.createConnection(process.env.MONGODB_URI);
	mainConn.on('connected', () => {
		console.log('✅ Connexion à MongoDB établie');
	});
	mainConn.on('error', err => {
		console.error('❌ Erreur de connexion à MongoDB:', err);
	});
}

const dbCache = {};

function getGuildDb(guildId) {
	const dbName = guildId ? `guild_${guildId}` : 'global';
	if (!dbCache[dbName]) {
		dbCache[dbName] = mainConn.useDb(dbName, { useCache: true });
		if (dbCache[dbName]) console.log(`✅ Connexion à la base de données ${dbName} établie`);
	}
	return dbCache[dbName];
}

module.exports = { connectMain, mainConn, getGuildDb };
