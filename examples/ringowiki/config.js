
var {Application} = require("stick");
var {Store} = require('ringo/storage/filestore');

exports.store = new Store('db');

var app = exports.app = Application(require("./actions"));
app.configure("etag", "responselog", "error", "notfound", "session", "static");
app.static(module.resolve("public"));

