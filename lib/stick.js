var {Headers} = require("ringo/utils/http");

exports.Application = function() {

    var app,
        mounts = [],
        routes = {},
        middleware = {};

    // add all arguments to the default middleware stack
    middleware.__ = Array.slice(arguments)
                         .reduceRight(wrapMiddleware, unhandled);

    var app = function(req) {
        Headers(req.headers);
        for (var i = 0; i < mounts.length; i++) {
            if (mounts[i].match(req)) {
                return mounts[i].call(req);
            }
        }
        return middleware.__(req);
    };

    app.configure = function(env, components) {
        // prepend to existing middleware stack or default stack
        var mw = middleware[env] || middleware.__;
        middleware[env] = resolve(compenents)(mw);
    };

    app.mount = function(spec, target) {
        if (typeof spec === "string") {
            spec = {path: spec};
        } else if (!spec) {
            throw new Error("Missing spec");
        }
        mounts.push(new Mount(spec, target));
    };

    /*
    app.map;
    app.get;
    app.post;
    app.put;
    app.del;
    app.render;
    */

    return app;
};

/**
 * Represents a mounted application.
 */
function Mount(spec, target) {
    spec.path = spec.path || "/";
    spec.host = spec.host || "";
    target = resolve(target);

    this.match = function(req) {
        var host = req.headers.get("host") || "";
        var path = req.pathInfo || "/";

        return host.indexOf(spec.host) > -1
            && path.indexOf(spec.path) == 0;
    };

    this.call = function(req) {
        // TODO adjust paths
        return target(req);
    };
}

/**
 * Convenience function that resolves a module id or object to a
 * JSGI middleware or application function. This assumes the function is
 * exported as "app" or "middleware".
 * @param app a function, module object, module id, or an array of
 *            any of these
 * @returns the resolved middleware function
 */
function resolve(app) {
    if (typeof app == 'string') {
        var module = require(app);
        return module.app || module.middleware;
    } else if (Array.isArray(app)) {
        // allow an app or middleware item to be itself a list of middlewares
        return app.reduceRight(wrapMiddleware);
    }
    return app;
}

/**
 * Helper function for wrapping middleware stacks
 * @param inner an app or middleware module or function wrapped by outer
 * @param outer a middleware module or function wrapping inner
 * @returns the wrapped middleware function
 */
function wrapMiddleware(inner, outer) {
    return resolve(outer)(inner);
}

/**
 * Unhandled request handler.
 */
function unhandled(req) {
    throw new Error("Unhandled request");
}
