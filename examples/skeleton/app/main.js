
var {Application} = require("stick");

export("app");

app = Application();
app.configure("notfound", "error", "static", "params", "mount");
app.static(module.resolve("public"));
app.mount("/", require("./actions"));


// export init, start, stop, destroy to get called on daemon life-cycle events


// Script run from command line
if (require.main === module) {
    require("stick/server").main(module.id);
}
