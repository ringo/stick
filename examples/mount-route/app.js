var {Application} = require("stick");
var {linkTo} = require("stick/helpers");

var app = exports.app = Application(),
    foo = module.resolve("foo"),
    bar = module.resolve("bar");

app.configure("mount", "route");
app.mount("/foo", foo);
app.mount("/bar", bar);

app.get("/", function(req) {
    return {
        status: 200,
        headers: {"Content-Type": "text/html"},
        body: ["<html><body><h1>Mount/Route middleware demo</h1>" +
              "<p>This app demos the composition and linking capabilities of the mount and route middleware. " +
                 "Some links: </p>" +
                 "<ul>" +
                     "<li>" + linkTo({app: foo}) + "</li>" +
                     "<li>" + linkTo({app: bar, name: "hello"}) + "</li>" +
                     "<li>" + linkTo({app: foo, name: "hello", ext: "world"}) + "</li>" +
                 "</ul>" +
              "</body></html>"]
    }
});

if (require.main === module) {
    var Server = require("ringo/httpserver").Server;
    var server = server || new Server({config: module.id, app: "app"});
    server.start();
}

