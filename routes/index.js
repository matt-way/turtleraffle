/**
Routes
**/
var sa = require('superagent'),
	Post = require('../models/post'),
	DisplayPost = require('../models/displaypost'),
	Settings = require('../models/settings'),
	Embedly = require('embedly'),
	util = require('util');
  
var settings = null;

var EMBEDLY_KEY = 'f6314fb0aa1d11e18f9f4040aae4d8c9';

//var SOLVE_MEDIA_KEY = 'OKpkQc1XcHVw3Nl5jWyqfwT7p0bB6Q2.'; // local dev key
var SOLVE_MEDIA_KEY = '8ZW0RfG-FN9I180HTr2Zb3bg2HkZEYHH';

// returns the app to the user
exports.index = function(req, res){	
 	// simply return the main page
 	res.render('index', { title: 'Turtle Raffle' });
};

// returns the current timer info and entry count to the user
exports.info  = function(req, res){
	var dTime = null;	
	if(settings){
		dTime = settings.nextDrawTime.getTime();
	}

	Post.count({}, function(err, eCount){		
		// user is requesting the next draw time, and the number of entries	
		var output = { 
			entryCount: eCount,
			drawTime: dTime
		};
		res.send(output);
	});	
};

// returns the currently selected post to the user
exports.posts = function(req, res){
	// user is requesting the current winner post/s
	DisplayPost.findOne(function(err, _post){
		if(err) { console.log(err); }

		if(_post){
			res.send(_post);
		}else{
			res.send(null);
		}
	});	
};

exports.create = function(req, res, next){
	// validate the post
	// perform size bounds checks
	req.assert('title', 'Title is required.').notEmpty().len(1, 200);
	req.assert('body', 'Content text is required.').notEmpty().len(1, 1024);
	req.assert('adcopy_response', 'Captcha response is required.').notEmpty();

	var errors = req.validationErrors();
	if(!errors){

		var inputObj = 'privatekey=' + SOLVE_MEDIA_KEY + 
					   '&challenge=' + req.body.adcopy_challenge + 
					   '&response='  + req.body.adcopy_response +
					   '&remoteip='  + (req.headers['X-Forwarded-For'] || req.connection.remoteAddress);
		
		// validate the captcha
		sa.post('http://verify.solvemedia.com/papi/verify')
			.type('form')
			.send(inputObj)
			.end(function(result){
				var results = result.text.split('\n');
				if(results[0] == 'true'){
					// save post in database
					var newPost = new Post({
						title: req.body.title,
						media: req.body.media || {},
						body: req.body.body,
						author: req.body.author || {}
					});

					newPost.save(function(err, newPost){
						if(err) {
							console.log(err);
							res.send(err);
						}

						res.send(true);
					});
				}else{
					console.log(results);
					if(results.length > 1 && results[1].length <= 0){
						res.send('Captcha response was incorrect.');
					}else{
						res.send(results[1]);
					}
				}
			});
	}else{
		res.send(errors);
	}
};

// given a selected post object, the data is processed and the primary post is selected
exports.setDisplayPost = function(_post, _callback) {
	// run the post link through embedly if a link is given

	if(_post.media){
		// run embedly on the url
		new Embedly({key: EMBEDLY_KEY}, function(err, api) {
			if(!!err){
				console.log('Error creating Embedly api');
				return next(err);
			}

			var url = _post.media;
			api.oembed({url: url}, function(err, objs){
				if(!!err){
					console.log('embedly request failed');
					return next(err);
				}

				console.log(util.inspect(objs[0]));
					
				// create an embed node with the given data
				var obj = objs[0];

				var dPost = new DisplayPost({
					title: _post.title,
					mediaURI: url,
					mediaThumbnail: obj.thumbnail_url,
					mediaType: obj.type,
					mediaHTML: obj.html,
					mediaTitle: obj.title,
					mediaDescription: obj.description,
					body: _post.body,
					author: _post.author
				});	

				DisplayPost.find().remove();
				dPost.save(function(err){
					if(err) { return _callback(err); }

					_callback();
				});		
			});
		});
	}else{
		var dPost = new DisplayPost({
			title: _post.title,
			body: _post.body,
			author: _post.author
		});	

		DisplayPost.find().remove();
		dPost.save(function(err){
			if(err) { return _callback(err); }

			return _callback();
		});		
	}
};

// Draws the next post to display, clears the db's and resets the timer
exports.drawPost = function() {
	// randomly select a post from the database
	Post.random(function(err, _post){
		if(err) { console.log(err); }

		// make sure we have posts to choose from
		if(_post){
			// process the new post (embedly, etc.)
			exports.setDisplayPost(_post, function(err){
				if(err) { console.log(err); }

				// clear the post database
				Post.find().remove();

				// reset the timer
				exports.resetTimer();
			})

		}else{
			console.log('no entries to choose randomly from');

			// reset the timer anyway for next period
			exports.resetTimer();
		}
	});
};

// start the schedule for post selection process
exports.startSchedule = function() {
	if(settings){		
		// start the timer for the next reset
		setTimeout(function() {
			exports.drawPost();
		}, settings.nextDrawTime - Date.now());
	}else{
		console.log('fatal error, no timer to start schedule by');
	}
};

// called by the end of the draw post process to reset the timer and restart the schedule
exports.resetTimer = function() {
	if(settings){
		settings.nextDrawTime = exports.getNextDrawTime();

		exports.startSchedule();

		settings.save(function(err){
			if(err) { console.log(err); }
		});
	}
};

// get the next draw time
exports.getNextDrawTime = function() {	
	var curDate = new Date();
	// increment now by 23 hours
	//var increment = 23 * 60*60*1000;
	var increment = 60*1000;
	return curDate.setTime(curDate.getTime() + increment);	
};

// the primary cron function for turtle raffle, handles the settings and setting up the initial schedule
exports.turtleJob = function() {
	// firstly check if the settings object exists, and create one if it does not
	Settings.findOne(function(err, _settings){
		if(err) { console.log(err); }

		if(!_settings){
			console.log('creating initial settings object');
			settings = new Settings();
		}else{
			settings = _settings;
		}

		// if there is no next draw time or an invalid next draw time, start the choosing process
		if(!settings.nextDrawTime || _settings.nextDrawTime.getTime() < new Date().getTime()){
			exports.drawPost();			
		}else{
			// otherwise start the schedule
			exports.startSchedule();
		}

		// make sure the settings persist		
		settings.save(function(err){
			if(err) { console.log(err); }
		});
	});
};

// run the first turtle job
this.turtleJob();