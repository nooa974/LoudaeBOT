const mongoose = require('mongoose');

let mainConn;

async function connectMain() {
	mainConn = await mongoose.createConnection(process.env.MONGODB_URI);
	mainConn.on('connected', () => {
		console.log('✅ MongoDB ▪ Connection établie avec la base principale.');
	});
	mainConn.on('error', err => {
		console.error('❌ MongoDB ▪ Erreur de connexion à la base principale :', err);
	});
}

const dbCache = {};

function getGuildDb(guildId) {
	const dbName = guildId ? `guild_${guildId}` : 'global';
	if (!dbCache[dbName]) {
		dbCache[dbName] = mainConn.useDb(dbName, { useCache: true });
		if (dbCache[dbName]) console.log(`✅ MongoDB ▪ Connection établie à la base : ${dbName}`);
	}
	return dbCache[dbName];
}

module.exports = { connectMain, mainConn, getGuildDb };