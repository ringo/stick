
var {Store} = require('ringo/storage/filestore');

exports.store = new Store('db');

var app = exports.app = require("./actions").app;
app.configure("etag", "responselog", "error", "notfound", "session", "static");
app.static(module.resolve("public"));

