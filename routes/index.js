/**
Routes
**/
var sa = require('superagent');
  //, redis = require('redis')
  //, client = redis.createClient();


exports.index = function(req, res){
	console.log('hi there');
 	// simply return the main page
 	res.render('index', { title: 'Turtle Raffle' });
};

exports.info  = function(req, res){
	// user is requesting the next draw time, and the number of entries
	var dTime = 1576800000000;	
	var output = { 
		entryCount: 5,
		drawTime: dTime
	};
	res.send(output);
};

exports.posts = function(req, res){
	// user is requesting the current winner post/s
	
	// get the winning post from redis

	// if it doesn't exist replace with default

	var output = { post: {
		id: '5a',
		title: 'some title',
		media: '<img src="blahblah.jpg"/>',
		body: 'This is some body text. Need to figure out breaks.',
		name: '<a href="www.twitter.com/person">@Someperson</a>'
	}};
	res.send(output);
};

exports.create = function(req, res, next){
	// validate the post
	// perform size bounds checks
	req.assert('title', 'Title is required.').notEmpty();
	req.assert('body', 'Content text is required.').notEmpty();

	var errors = req.validationErrors();
	if(!errors){
		// validate the captcha
		sa.post('http://verify.solvemedia.com/papi/verify')
		//.set('Accept', 'application/json')
		//.set('Content-Type', 'application/json')
		.send({ privatekey: key,
				challenge: req.body.adcopy_challenge,
				response: req.body.adcopy_response,
				remoteip: req.headers['X-Forwarded-For'] })
		.end(function(result){
			console.log(util.inspect(result, false, null));

			// if the captcha is correct
			// add the post to the db
			
			// return the new count


			// get the next available index
			

			/*
			client.INCR('curPostIndex', function(err, result){
				if(err) { return res.next(err); }

				var postData = {
					title: req.body.title,
					media: req.body.media || '',
					body: req.body.body,
					author: req.body.name
				};

				// store post at the new index
				client.SET('post' + result, postData, function(err, result){
					if(err) { return res.next(err); }
					// post stored successfully
					return res.send(true);
				})
			})
			*/
		});
	}else{
		res.send(errors);
	}
};

exports.resetProcess = function() {
	// get the current index

	// randomly select a post from the index

	// use embedly to get the html of the media query if any

	// store the post data in the winner key

	// reset the current post index back to 0

	// set the next timestamp to now + 23 hours

};

// the cron function for dealing with the 23 hour reset
exports.turtleJob = function() {
	// get the next timestamp for the next reset

	// if it doesn't exist set it for the gap time from now

	// if the reset time is before now perform an initial reset

	// start the timer for the next reset
	/*setInterval(due - Date.now(), function() {
		this.resetProcess();
		// restart the process
		turtleJob();
	});*/
};

// run the first turtle job
this.turtleJob();