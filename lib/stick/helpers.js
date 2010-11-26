
var objects = require("ringo/utils/objects");
var mount = require("stick/middleware/mount");

exports.linkTo = function(app, bindings, text) {
    var href = this.urlFor(app, bindings);
    text = text || "link";
    return '<a href="' + href + '">' + text + '</a>';
};

var urlFor = exports.urlFor = function(app, bindings) {
    var module = bindings.module,
        targetApp = app,
        req = app.request;
    if (module) {
        targetApp = require(module).app;
        /* if (req && req.mount && req.mount.lookup) {
            baseUri = req.mount.lookup(module);
        } */
    }
    var baseUri = targetApp.base || mount.lookup(targetApp) || "";
    if (req && req.route && req.route.bindings) {
        bindings = objects.merge(bindings, req.route.bindings);
    }
    return baseUri + targetApp.route.reverse(bindings);
};