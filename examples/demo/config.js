
var app = exports.app = require("./actions").app;

app.configure("gzip", "etag", "static", "responselog", "mount", "error", "notfound");

app.static(module.resolve("public"));
app.mount("/mount/point", module.resolve("webmodule"));
