var mongoose = require('mongoose');

var postSchema = new mongoose.Schema({
	title: String,
	body: String,
	link: String
});
mongoose.model('Post', postSchema);

// add a new post
exports.add = function(_date) {
	// need to verify

}
