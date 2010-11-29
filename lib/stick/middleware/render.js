var objects = require("ringo/utils/objects");
var {resolveUri} = require("ringo/utils/files");
var skin = require("ringo/skin");
var {Resource, Repository} =  org.ringojs.repository;

exports.middleware = function render(next, app) {

    var base, helpers, partials;

    app.render = function() {
        var contentType = app.render.contentType + "; charset=" + app.render.encoding;
        var args = Array.slice(arguments).concat([base, helpers, partials]);
        return {
            status: 200,
            headers: {"Content-Type": contentType},
            body: [app.render.impl.apply(app.render, args)]
        };
    };

    app.render.impl = function(template, context, base, helpers) {
        if (helpers) {
            context = objects.merge.apply(null, [context].concat(helpers));
        }
        template = template instanceof Resource ?
                template : base ? base.getResource(template) : getResource(template);
        if (!template || !template.exists()) {
            throw new Error("Template " + template + " not found");
        }
        return skin.render(template, context);
    };

    app.render.base = function(path) {
        base = path instanceof Repository ?
                path : getRepository(path);
    };

    app.render.partials = function(path) {
        partials = path instanceof Repository ?
                path : getRepository(path);
    };

    app.render.helpers = function() {
        helpers = Array.slice(arguments).map(function(helper) {
            return typeof helper === "string" ? require(helper) : helper;
        });
    };

    app.render.contentType = "text/html";

    app.render.encoding = "utf-8";

    // We don't actually add any middleware
    return next;

};

