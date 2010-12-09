
var {Application} = require("stick");
var {Server} = require("ringo/httpserver");
var server, app;

export("app", "init", "start", "stop", "destroy");

app = Application();
app.configure("notfound", "error", "static", "params", "mount");
app.static(module.resolve("public"));
app.mount("/", require("./actions"));


// Daemon life-cycle functions.

function init() {
    server = server || new Server({
        config: module.id,
        app: "app"
    });
}

function start() {
    server.start();
}

function stop() {
    server.stop();
}

function destroy() {
    server.destroy();
}

// Script run from command line
if (require.main === module) {
    init();
    start();
}
