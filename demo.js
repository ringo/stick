var {Server} = require("ringo/httpserver");
var {Application} = require("stick");
var {error, notfound, mount} = require("stick/middleware");

var app = new Application();
app.configure(error, notfound, mount);
app.mount("/hello", function(req) {
    return {
        status: 200, headers: {}, body: ["hello world!"]
    };
});
app.mount("/notfound", function(req) {
    throw { notfound: true };
});

var server = new Server({app: app});
server.start();
