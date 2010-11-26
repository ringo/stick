var objects = require("ringo/utils/objects");
var {resolveUri} = require("ringo/utils/files");
var {render} = require("ringo/skin");

exports.middleware = function skin(next, app) {

    var base, helpers;
    var request = new java.lang.ThreadLocal();

    var skinHelpers = {
        linkTo: function(tag) {
            var href = this.urlFor(tag),
                text = tag.parameters[0] || "link";
            return '<a href="' + href + '">' + text + '</a>';
        },
        urlFor: function(tag) {
            var req = request.get(),
                named = tag.namedParameters,
                module = named.module,
                targetApp = app,
                baseUri = req.scriptName;
            if (module) {
                targetApp = require(module).app;
                var lookup = req.env.lookupModule;
                if (typeof lookup === "function") baseUri = lookup(module);
            }
            var parts = objects.merge(named, req.env.route);
            return baseUri + app.route.reverse(parts);
        }
    };

    app.skin = function(skin, context) {
        if (helpers) {
            var imported = helpers.map(function(helper) {
                return typeof helper === "string" ? require(helper) : helper;
            });
            context = objects.merge.apply(objects,
                    [context].concat(imported).concat([skinHelpers]))
        }
        skin = skin instanceof org.ringojs.repository.Resource ?
                skin : base ? base.getResource(skin) : getResource(skin);
        if (!skin || !skin.exists()) {
            throw new Error("skin " + skin + " not found");
        }
        var contentType = app.skin.contentType + "; charset=" + app.skin.encoding;
        return {
            status: 200,
            headers: {"Content-Type": contentType},
            body: [render(skin, context)]
        };
    };

    app.skin.base = function(path) {
        base = path instanceof org.ringojs.repository.Repository ? path : getRepository(path);
    };

    app.skin.helpers = function() {
        helpers = Array.slice(arguments);
    };

    app.skin.contentType = "text/html";

    app.skin.encoding = "utf-8";

    return function skin(req) {
        request.set(req);
        try {
            return next(req);
        } finally {
            request.remove();
        }
    }

};