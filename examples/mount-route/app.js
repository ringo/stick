var {Application} = require("stick");
var {linkTo, htmlResponse} = require("stick/helpers");

var app = exports.app = Application(),
    foo = module.resolve("foo"),
    bar = module.resolve("bar");

app.configure("mount", "route");
app.mount("/foo", foo);
app.mount("/bar", bar);

app.get("/", function(req) {
    return htmlResponse("<html><body><h1>Mount/Route middleware demo</h1>",
        "<p>This app demos the composition and linking capabilities of the mount and route middleware. ",
        "Some links: </p>",
        "<ul>",
            "<li>", linkTo(foo), "</li>",
            "<li>", linkTo(bar, {name: "hello"}), "</li>",
            "<li>", linkTo(foo, {name: "hello", ext: "world"}), "</li>",
        "</ul></body></html>");
});

// start server if run as main script
if (require.main === module) {
    require("stick/server").main(module.id);
}

