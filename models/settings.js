var mongoose = require('mongoose');

var settingsSchema = new mongoose.Schema({
	nextDrawTime: Date
});

module.exports = mongoose.model('Settings', settingsSchema);