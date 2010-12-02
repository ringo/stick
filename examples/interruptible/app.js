
// see http://blog.ometer.com/2010/11/28/a-sequential-actor-like-api-for-server-side-javascript/

var {Application} = require("stick");
var {htmlResponse} = require("stick/helpers");
var {defer} = require("ringo/promise");
var {setTimeout} = require("ringo/scheduler");

var app = exports.app = Application();
app.configure("notfound", "interruptible", "route");

app.get("/", function (req) {
    var deferred = defer();
    setTimeout(function() {
        deferred.resolve("hello world");
    }, 2000);
    // yield a promise
    var body = yield deferred.promise;
    // yield the actual response
    yield htmlResponse(body);
});

// same as index action, but resolve to error
app.get("/error", function(req) {
    var deferred = defer();
    setTimeout(function() {
        deferred.resolve("something went wrong", true) ;
    }, 2000);
    // yield a promise
    var body = yield deferred.promise;
    // yield the actual response
    yield htmlResponse(body);
});


// start server
if (require.main === module) {
    var Server = require("ringo/httpserver").Server;
    var server = server || new Server({config: module.id, app: "app"});
    server.start();
}

