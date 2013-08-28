
/**
 * Module dependencies.
 */

var express = require('express'),
	http = require('http'),
	path = require('path'),
	expressValidator = require('express-validator'),
	mongoose = require('mongoose');
	
var app = express();

// all environments
app.set('port', process.env.PORT || 3030);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(expressValidator());
app.use(express.methodOverride());
app.use(express.cookieParser('maaaargh...turtle turtle!'));
app.use(express.session());
app.use(app.router);
  app.use(require('less-middleware')({ src: __dirname + '/public' }));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// connect to the db
mongoose.connect('mongodb://localhost/turtleraffle');

// confirm db connection
var db = mongoose.connection;
db.on('error', console.error.bind(console, 'mongo connection error:'));
db.once('open', function callback () {
	// init db modelling + other server init
	var routes = require('./routes');

	app.get('/', routes.index);
	app.get('/api/info', routes.info);
	app.get('/api/posts', routes.posts);
	app.post('/api/create', routes.create);

	// init the web server
  	http.createServer(app).listen(app.get('port'), function(){
  		console.log('Turtle Raffle server listening on port ' + app.get('port'));
	});
});
