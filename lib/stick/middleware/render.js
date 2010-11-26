var objects = require("ringo/utils/objects");
var {resolveUri} = require("ringo/utils/files");
var skin = require("ringo/skin");

exports.middleware = function render(next, app) {

    var base, helpers;

    app.render = function(template, context) {
        var contentType = app.render.contentType + "; charset=" + app.render.encoding;
        return {
            status: 200,
            headers: {"Content-Type": contentType},
            body: [app.render.impl(template, context, base, helpers)]
        };
    };

    app.render.impl = function(template, context, base, helpers) {
        if (helpers) {
            var imported = helpers.map(function(helper) {
                return typeof helper === "string" ? require(helper) : helper;
            });
            context = objects.merge.apply(null, [context]
                    .concat(imported)
                    .concat([standardHelpers]))
        }
        template = template instanceof org.ringojs.repository.Resource ?
                template : base ? base.getResource(template) : getResource(template);
        if (!template || !template.exists()) {
            throw new Error("Template " + template + " not found");
        }
        return skin.render(template, context);
    };

    app.render.base = function(path) {
        base = path instanceof org.ringojs.repository.Repository ?
                path : getRepository(path);
    };

    app.render.helpers = function() {
        helpers = Array.slice(arguments);
    };

    var standardHelpers = {
        linkTo: function(tag) {
            var href = this.urlFor(tag),
                text = tag.parameters[0] || "link";
            return '<a href="' + href + '">' + text + '</a>';
        },
        urlFor: function(tag) {
            var bindings = tag.namedParameters,
                module = bindings.module,
                targetApp = app,
                baseUri = app.base,
                req = app.request;
            if (!req) {
                throw new Error("No current request");
            } else if (!req.route.bindings) {
                throw new Error("Reverse routing requires route middleware");
            }
            if (module) {
                if (!req.mount.lookup) {
                    throw new Error("Inter-module reverse routing requires mount middleware");
                }
                targetApp = require(module).app;
                baseUri = req.mount.lookup(module);
            }
            var parts = objects.merge(bindings, req.route.bindings);
            return baseUri + targetApp.route.reverse(parts);
        }
    };

    app.render.contentType = "text/html";

    app.render.encoding = "utf-8";

    // We don't actually add any middleware
    return next;

};