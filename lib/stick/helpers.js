
var objects = require("ringo/utils/objects");

exports.linkTo = function(app, bindings, text) {
    var href = this.urlFor(app, bindings);
    text = text || "link";
    return '<a href="' + href + '">' + text + '</a>';
};

var urlFor = exports.urlFor = function(app, bindings) {
    var module = bindings.module,
        targetApp = app,
        baseUri = app.base,
        req = app.request;
    if (!req) {
        throw new Error("No current request");
    }
    if (module) {
        if (!req.mount.lookup) {
            throw new Error("Inter-module reverse routing requires mount middleware");
        }
        targetApp = require(module).app;
        baseUri = req.mount.lookup(module);
    }
    if (req.route) {
        bindings = objects.merge(bindings, req.route.bindings);
    }
    return baseUri + targetApp.route.reverse(bindings);
};