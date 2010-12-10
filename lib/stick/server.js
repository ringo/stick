
var system = require("system");
var {Server} = require("ringo/httpserver");
var {Parser} = require("ringo/args");
var server, app;

export("init", "start", "stop", "destroy", "main");

// Daemon life-cycle functions.

function init(moduleId, defaults) {
    require.paths.push(".");
    var options = parseOptions(defaults);
    moduleId = moduleId || system.args[0];
    options.config = moduleId;
    options.app = "app";
    server = server || new Server(options);
    app = require(moduleId);
    if (typeof app.init === "function") {
        app.init(server);
    }
}

function start() {
    server.start();
    if (typeof app.start === "function") {
        app.start(server);
    }
}

function stop() {
    if (typeof app.stop === "function") {
        app.stop(server);
    }
    server.stop();
}

function destroy() {
    if (typeof app.destroy === "function") {
        app.destroy(server);
    }
    server.destroy();
}

function parseOptions(defaults) {
    var script = system.args.shift();
    var parser = new Parser()
        .addOption("j", "jetty-config", "PATH", "Jetty configuration file (default: 'config/jetty.xml')")
        .addOption("H", "host", "ADDRESS", "IP address to bind to (default: 0.0.0.0)")
        .addOption("p", "port", "PORT", "TCP port to listen on (default: 8080)")
        .addOption("v", "virtual-host", "VHOST", "Virtual host name (default: undefined)")
        .addOption("h", "help", null, "Print this message and exit");
    var options = parser.parse(system.args, defaults || {port: 8080});
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

// Command line main function
function main(moduleId, defaults) {
    init(moduleId, defaults);
    start();
}

// Script run from command line
if (require.main === module) {
    main();
}