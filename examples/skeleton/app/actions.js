var {Application} = require("stick");

export("app");

var app = Application();
app.configure("params", "render", "route");


app.get("/", function(request) {
    return app.render(module.resolve("skins/index.html"), {
        title: "It's working!"
    });
});