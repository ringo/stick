var {Application} = require("stick"),
    {Server} = require("ringo/httpserver"),
    {Buffer} = require("ringo/buffer"),
    log = require("ringo/logging").getLogger("demo");

/*
 Example Stick application. The final application will look somewhat like this:

 +- production ------------+      +- app ---------------------------------------+
 |                         |      |                                             |
 |  gzip -> etag -> error  |--+   |                       +-> lib/*             |
 |                         |  |   |                       |                     |
 +-------------------------+  |   | notfound -> mount -> static -> unhandled    |
                              +-->|              |                              |
 +- development -----------+  |   |              +-> "hello world"              |
 |                         |  |   |              |                              |
 |  responselog -> error   |--+   |              +-> basicauth -> "admin zone"  |
 |                         |      |                                             |
 +-------------------------+      +---------------------------------------------+
 */

// Our main application
var app = exports.app = Application();
// configure notfound, mount, and static middleware
app.configure("notfound", "mount", "static");
app.mount("/hello", dummyPage("hello world!"));
app.mount("/error", function(req) {
    throw new Error("Something went wrong");
});
app.static(module.resolve("lib")); // serve files in lib as static resources

// mount examples/ringowiki app on /wiki
app.mount("/wiki", module.resolve("examples/ringowiki/config"));

// production environment, run with RINGO_ENV=production ringo demo.js
var prod = app.env("production");
prod.configure("gzip", "etag", "error");
prod.error.location = false; // disable error location and stack traces

// development environment, run with RINGO_ENV=development ringo demo.js
app.env("development").configure("responselog", "error");

// profiler environment, run with RINGO_ENV=profiler ringo -o-1 demo.js
app.env("profiler").configure("responselog", "profiler", "error");

// create a password protected admin application
var admin = new Application(dummyPage("admin zone"));
admin.configure("basicauth");
// add basic authentication, password is "secret"
admin.basicauth("/", "admin", "e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4");
app.mount("/admin", admin);

// start server if we didn't already do so
var server = server || new Server({config: module.id, app: "app"});
server.start();

// helper for creating simple dummy pages
function dummyPage(text) {
    return function(req) {
        log.info(text);
        return { status: 200,
                 headers: {"Content-Type": "text/html"},
                 body: new Buffer("<html><body>", text, "</body></html>") };
    }
}
