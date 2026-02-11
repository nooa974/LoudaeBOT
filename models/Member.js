const mongoose = require('mongoose');
const { Schema } = mongoose;
const mongooseHidden = require('mongoose-hidden')({ defaultHidden: { _id: true, __v: true } });

const memberSchema = new Schema({
	memberId: { type: String, required: true, unique: true },
}, { strict: false, versionKey: false, minimize: false });

memberSchema.plugin(mongooseHidden);

module.exports = memberSchema;