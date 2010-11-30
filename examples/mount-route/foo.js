var {Application} = require("stick");
var {linkTo, urlFor} = require("stick/helpers");

var app = exports.app = Application(),
    bar = module.resolve("bar"),
    home = module.resolve("app");

app.configure("route");

// Define an index route that takes optional name and ext arguments.
// Link to the other module's index action with the same name and ext.
app.get("/:name?.:ext?", function(req, name, ext) {
    return {
        status: 200,
        headers: {"Content-Type": "text/html"},
        body: ["<html><body><h1>Foo</h1><p>This is module <b>'foo'</b> called with <b>" +
               name + "</b>, <b>" + ext + "</b>. " +
               "Go to " + linkTo({app: bar, name: name, ext: ext}) +
               " or back " + linkTo({app: home}, "home") + ".</p></body></html>"]
    };
});
