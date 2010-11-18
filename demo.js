var {Application} = require("stick");
var {Server} = require("ringo/httpserver");
var {Buffer} = require("ringo/buffer");
var log = require("ringo/logging").getLogger("demo");
var {gzip, etag, error, notfound, mount, static, basicauth, responselog, profiler} =
        require("stick/middleware");

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
var app = exports.app = new Application();
// configure notfound, mount, and static middleware
app.configure(notfound, mount, static);
app.mount("/hello", dummyPage("hello world!"));
app.mount("/error", function(req) {
    throw new Error("Something went wrong");
});
app.static(module.resolve("lib")); // serve files in lib as static resources

// RINGO_ENV=production environment
var prod = app.env("production");
prod.configure(gzip, etag, error);
prod.error.location = false; // disable error location and stack traces

// RINGO_ENV=development environment
var dev = app.env("development");
dev.configure(responselog, error);

// RINGO_ENV=profile environment
var profile = app.env("profile");
profile.configure(responselog, profiler, error);

// create a password protected admin application
var admin = new Application(dummyPage("admin zone"));
admin.configure(basicauth);
// add basic authentication, password is "secret"
admin.basicauth("/", "admin", "e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4");
app.mount("/admin", admin);

// start server if we didn't already do so
var server = server || new Server({app: app});
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
