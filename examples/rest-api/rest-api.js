var {Application} = require("../../lib/stick");
var response = require("ringo/jsgi/response");
var log = require("ringo/logging").getLogger(module.id);

var app = exports.app = Application();
app.configure("params", "route");

app.get("/", function getRoot (req) {
    return response.json({ "message": "Hello World!" });
});

app.post("/echo", function postRoot (req) {
    if (req.postParams && req.headers["content-type"] === "application/json") {
        return response.json(req.postParams);
    } else {
        return response.bad();
    }
});

if (require.main === module) {
    require("ringo/httpserver").main(module.id);
}