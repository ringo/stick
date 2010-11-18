var {Application} = require("stick");
var {Server} = require("ringo/httpserver");
var {Buffer} = require("ringo/buffer");
var log = require("ringo/logging").getLogger("demo");
var {gzip, etag, error, notfound, mount, static, basicauth, responselog} =
        require("stick/middleware");

// helper for creating simple dummy pages
function dummyPage(text) {
    return function(req) {
        log.info(text);
        return { status: 200,
                 headers: {"Content-Type": "text/html"},
                 body: new Buffer("<html><body>", text, "</body></html>") };
    }
}

// create a new blank Stick application
var app = exports.app = new Application();
// configure notfound, mount, and static middleware
app.configure(notfound, mount, static);
// middleware chain now is notfound > mount > static > unhandled
// mount hello world application at /hello
app.mount("/hello", dummyPage("hello world!"));
// throw to test error middleware, which is configured differently
// in development and production environments
app.mount("/error", function(req) {
    throw new Error("Something went wrong");
});
// serve files in lib as static resources 
app.static(module.resolve("lib"));

// RINGO_ENV=production environment
var prod = app.env("production");
prod.configure(gzip, etag, error);
// disable error location and stack traces for production env
prod.error.location = false;

// RINGO_ENV=development environment
var dev = app.env("development");
dev.configure(responselog, error);

// create a password protected admin application
var admin = new Application(dummyPage("admin zone"));
admin.configure(basicauth);
// add basic authentication, password is "secret"
admin.basicauth("/", "admin", "e5e9fa1ba31ecd1ae84f75caaa474f3a663f05f4");
// mount on /admin
app.mount("/admin", admin);

// start server if we didn't already do so
var server = server || new Server({app: app});
server.start();
