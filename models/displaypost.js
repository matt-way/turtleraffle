var mongoose = require('mongoose');

var displayPostSchema = new mongoose.Schema({
	title: String,
	mediaURI: String,
	mediaThumbnail: String,
	mediaHTML: String,
	mediaTitle: String,
	mediaDescription: String,
	body: String,
	author: String
});

module.exports = mongoose.model('DisplayPost', displayPostSchema);