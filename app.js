
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')  
  , http = require('http')
  , path = require('path')
  //, expressValidator = require('express-validator')
  , redis = require('redis')
  , client = redis.createClient();

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
//app.use(expressValidator);
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

// initialise any db requirements
// need to set post count key if not already set
//client.SETNX('curPostIndex', '0');

app.get('/', routes.index);
app.get('/api/info', routes.info);
app.get('/api/posts', routes.posts);
app.post('/api/create', routes.create);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});
