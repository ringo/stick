
var system = require("system");
var {Application} = require("stick");
var {Server} = require("ringo/httpserver");
var {Parser} = require("ringo/args");
var server, app;

export("app", "init", "start", "stop", "destroy", "server");

app = Application();
app.configure("notfound", "error", "static", "mount");
app.static(module.resolve("public"));
app.mount("/", module.resolve("actions"));


// Daemon life-cycle functions.

function init() {
    var options = parseOptions();
    server = server || new Server(options);
}

function start() {
    server.getDefaultContext().serveApplication({
        config: module.id,
        app: "app"
    });
    server.start();
}

function stop() {
    server.stop();
}

function destroy() {
    server.destroy();
}

function parseOptions() {
    var script = system.args.shift();
    var parser = new Parser()
        .addOption("j", "jetty-config", "PATH", "Jetty configuration file (default: 'config/jetty.xml')")
        .addOption("H", "host", "ADDRESS", "IP address to bind to (default: 0.0.0.0)")
        .addOption("p", "port", "PORT", "TCP port to listen on (default: 8080)")
        .addOption("v", "virtual-host", "VHOST", "Virtual host name (default: undefined)")
        .addOption("h", "help", null, "Print this message and exit");
    var options = parser.parse(system.args);
    if (options.help) {
        print("Usage:");
        print("ringo", script, "[OPTIONS]");
        print("Options:");
        print(parser.help());
        system.exit();
    }
    if (options.port) {
        if (isNaN(options.port)) {
            throw new Error("Invalid value for port: " + options.port);
        }
        options.port = +options.port;
    }
    return options;
}

// Script run from command line
if (require.main === module) {
    init();
    start();
}
