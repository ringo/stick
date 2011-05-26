
var {Application} = require("stick");

var app = exports.app = Application();
app.configure("notfound", "error", "static", "params", "mount");
app.static(module.resolve("public"));
app.mount("/", require("./actions"));

// export init, start, stop, destroy to get called on daemon life-cycle events

