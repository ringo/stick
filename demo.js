var {Server} = require("ringo/httpserver");
var {Application} = require("stick");
var {error, mount} = require("stick/middleware");

var app = new Application();
app.configure(error, mount);
app.mount("/foo", function(req) {
    return {
        status: 200, headers: {}, body: ["hello world!"]
    };
});

var server = new Server({app: app});
server.start();
