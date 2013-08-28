var mongoose = require('mongoose');

var postSchema = new mongoose.Schema({
	title: String,
	body: String,
	media: String,
	author: String
});

postSchema.statics.random = function(callback) {
  this.count(function(err, count) {
    if (err) {
      return callback(err);
    }
    var rand = Math.floor(Math.random() * count);
    this.findOne().skip(rand).exec(callback);
  }.bind(this));
};

module.exports = mongoose.model('Post', postSchema);
