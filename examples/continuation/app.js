
// see http://blog.ometer.com/2010/11/28/a-sequential-actor-like-api-for-server-side-javascript/

var {Application} = require("stick");
var {linkTo, redirectTo} = require("stick/helpers");
var {html} = require("ringo/jsgi/response");
var {Deferred, PromiseList} = require("ringo/promise");
var {WorkerPromise} = require("ringo/worker");
var {setTimeout} = require("ringo/scheduler");
var {request} = require("ringo/httpclient");

var app = exports.app = Application();
app.configure("error", "notfound", "session", "params", "continuation", "route");

// generator action that yields a promise and is resumed when the promise
// is resolved, yielding a JSGI response
app.get("/", function (req) {
    var deferred = new Deferred();
    // resolve promise 2 seconds from now to "hello world"
    setTimeout(deferred.resolve, 2000, "hello world");
    // yield a promise
    var body = yield deferred.promise;
    // yield the actual response
    yield html(body);
});

// generator action that fetches 3 URLs in parallel, yields a promise for the
// requests and is resumed when all requests are finished, returning a JSGI
// response with the HTTP status codes
app.get("/http", function(req) {
    // Start three workers with the current module (see onmessage handler below)
    // that operate as promises.
    var results = yield new PromiseList(
        new WorkerPromise(module.id, "http://www.orf.at"),
        new WorkerPromise(module.id, "http://localhost:8080/foo"),
        new WorkerPromise(module.id, "http://www.google.at/"));
    yield html(results.map(function(res) {
        return res.error ? "Error: " + res.error.status :
                           "Success: " + res.value.status;
    }).join("<br/>"));
});

// same as index action above, but resolve to error
app.get("/error", function(req) {
    var deferred = new Deferred();
    // resolve promise 2 seconds from now to an error
    setTimeout(deferred.resolve, 2000, "something went wrong", true);
    // yield a promise
    var body = yield deferred.promise;
    // yield the actual response
    yield html(body);
});

// an example for a user/jsgi continuation. The generator is stored
// in the user's session and yields a response each time the
// continuation middleware sees a request with the generator's id.
app.get("/counter", function(req) {
    var counter = 0;
    var c = app.continuation.activate();
    request = yield redirectTo(app, {_c: c});
    while (true) {
        req = yield html(
                "<h1>", counter, "</h1><p>",
                linkTo(app, {_c: c, inc: 1}, "++"), " ",
                linkTo(app, {_c: c, inc: -1}, "--"), "</p>");
        counter += (+req.queryParams.inc || 0);
    }
});

// This is a plain old promise based asynchronous action. Does not rely on
// continuation middleware, just here for reference and comparison.
app.get("/async", function(req) {
    var deferred = defer();
    setTimeout(deferred.resolve, 2000, html("delayed"));
    // return a promise
    return deferred.promise;    
});

// Worker message handler
function onmessage(e) {
    e.source.postMessage(request({url: e.data}));
}


// start server if run as main script
if (require.main === module) {
    require("ringo/httpserver").main(module.id);
}

