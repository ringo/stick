var {Server} = require("ringo/httpserver");
var {Application, Mount} = require("stick");

var app = new Application();
app.configure(Mount);
app.mount("/foo", function(req) {
    return {
        status: 200, headers: {}, body: ["hello world!"]
    };
});

var server = new Server({app: app});
server.start();
