
// see http://blog.ometer.com/2010/11/28/a-sequential-actor-like-api-for-server-side-javascript/

var {Application} = require("stick");
var {htmlResponse, linkTo, redirectTo} = require("stick/helpers");
var {defer, promises} = require("ringo/promise");
var {setTimeout} = require("ringo/scheduler");
var {request} = require("ringo/httpclient");

var app = exports.app = Application();
app.configure("error", "notfound", "session", "params", "continuation", "route");

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

app.get("/http", function(req) {
    var results = yield promises(
        request({url: "http://www.orf.at", promise: true}),
        request({url: "http://localhost:8080/foo", promise: true}),
        request({url: "http://www.google.at/", promise: true}));
    yield htmlResponse(results.map(function(res) {
        return res.error ? "Error: " + res.error.status :
                           "Success: " + res.value.status;
    }).join("<br/>"));
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

app.get("/counter", function(req) {
    var counter = 0;
    var c = app.continuation.activate();
    request = yield redirectTo(app, {_c: c});
    while (true) {
        req = yield htmlResponse(
                "<h1>", counter, "</h1><p>",
                linkTo(app, {_c: c, inc: 1}, "++"), " ",
                linkTo(app, {_c: c, inc: -1}, "--"), "</p>");
        counter += (+req.queryParams.inc || 0);
    }
});

app.get("/async", function(req) {
    var deferred = defer();
    setTimeout(function() {
        deferred.resolve(htmlResponse("delayed")) ;
    }, 2000);
    // return a promise
    return deferred.promise;    
});


// start server
if (require.main === module) {
    var Server = require("ringo/httpserver").Server;
    var server = server || new Server({config: module.id, app: "app"});
    server.start();
}

