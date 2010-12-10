// Stick demo app. Run with `ringo demo.js`, or see below for running with
// various environments

var {Application} = require("stick"),
    {Server} = require("ringo/httpserver"),
    {Buffer} = require("ringo/buffer"),
    log = require("ringo/logging").getLogger("demo");

/*
 Example Stick application. This is a partial scheme of what the app looks like:

 +- production ------------+      +- app ---------------------------------------+
 |                         |      |                                             |
 |  gzip -> etag -> error  |--+   |                       +-> docs/*             |
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
app.static(module.resolve("docs"), "index.html"); // serve files in docs as static resources

// mount example apps
app.mount("/wiki", module.resolve("examples/ringowiki/config"));
app.mount("/mount", module.resolve("examples/mount-route/app"));
app.mount("/demo", module.resolve("examples/demo/config"));

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

// helper for creating simple dummy pages
function dummyPage(text) {
    return function(req) {
        log.info(text);
        return { status: 200,
                 headers: {"Content-Type": "text/html"},
                 body: new Buffer("<html><body>", text, "</body></html>") };
    }
}

// start server if run as main script
if (require.main === module) {
    require("stick/server").main(module.id);
}

