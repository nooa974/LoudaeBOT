const mongoose = require('mongoose');
const { Schema } = mongoose;

const memberSchema = new Schema({
	memberName: { type: String, required: true },
	memberId: { type: String, required: true, unique: true },
}, { strict: false, versionKey: false, minimize: false });

module.exports = memberSchema;