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

async function find(guildId, schema, id) {
	const db = getGuildDb(guildId);
	const dbModel = db?.model(schema, require(`../models/${schema}`));
	if (!db) return console.error(`❌ MongoDB ▪ Impossible de trouver la base de données ${guildId}`);
	const model = await dbModel?.findOne({ memberId: id });
	if (!model) console.warn(`⚠️ MongoDB ▪ ${db.name}\nAucun document trouvé pour le schéma ${id}.`);
	return [model, dbModel];
}

async function create(guildId, schema, id, additionalData = {}) {
	const [foundModel, dbModel] = await find(guildId, schema, id);
	if (!dbModel) return console.error(`❌ MongoDB ▪ Impossible de trouver le modèle pour la base ${guildId} et le schéma ${schema} !`);
	let model = foundModel;
	if (!model) {
		model = new dbModel({ memberId: id, ...additionalData });
		await model.save();
	}
	return model;
}

async function update(guildId, schema, id, updateData) {
	const [model] = await find(guildId, schema, id);
	if (!model) return console.error(`❌ MongoDB ▪ Impossible de trouver le document pour la base ${guildId}, le schéma ${schema} et l'id ${id} !`);
	Object.keys(updateData).forEach(key => {
		model.set(key, updateData[key]);
	});
	await model.save();
	return model;
}

module.exports = { connectMain, mainConn, getGuildDb, find, create, update };