var {Headers} = require("ringo/utils/http");

exports.Application = function Application() {

    var middleware = {};

    var app = function app(req, env) {
        var stack = middleware[env || "__"];
        return stack(req);
    };

    Object.defineProperty(app, "configure", {
        value: function(env, components) {
            if (arguments.length === 1) {
                // no env argument, apply to default stack
                components = env;
                env = "__";
            }
            // prepend to existing middleware stack or a default stack proxy
            var chain = middleware[env]
                    || function(req) middleware.__(req);
            middleware[env] = wrap(components, chain);
        }
    });

    // resolve middleware helper
    function resolve(middleware) {
        if (typeof middleware == 'string') {
            var module = require(middleware);
            middleware = module.app || module.middleware;
        } else if (Array.isArray(middleware)) {
            // allow a middleware item to be itself a list of middlewares
            middleware = middleware.reduceRight(function(inner, outer) {
                return resolve(outer)(resolve(inner), app);
            });
        }
        if (typeof middleware !== "function") {
            throw new Error("Couldn not resolve middleware: " + middleware);
        }
        return middleware;
    }

    Object.defineProperty(app, "resolve", {
        value: resolve
    });

    // wrap middleware helper
    function wrap(middleware, next) {
        next = next || unhandled;
        if (!Array.isArray(middleware)) {
            return resolve(middleware)(next, app);
        }
        return middleware.reduceRight(function(inner, outer) {
            return resolve(outer)(inner, app);
        }, next);
    }

    // add all arguments to the default middleware stack
    middleware.__ = arguments.length > 0 ?
        wrap(Array.slice(arguments), unhandled) : unhandled;

    return app;
};

/**
 * Middleware to mount other application on
 * specific URI paths or virtual hosts.
 */
exports.Mount = function Mount(next, app) {

    var mounts = [];

    var middleware = function mount(req) {
        Headers(req.headers);
        for (var i = 0; i < mounts.length; i++) {
            if (mounts[i].match(req)) {
                return mounts[i].target(req);
            }
        }
        return next(req);
    };

    app.mount = function(spec, target) {
        if (typeof spec === "string") {
            spec = {path: spec};
        } else if (!spec) {
            throw new Error("Missing spec");
        }
        spec.path = spec.path || "/";
        spec.host = spec.host || "";
        target = app.resolve(target);
        mounts.push(new MountedApp(spec, target));
    };

    var MountedApp = function(spec, target) {

        this.match = function(req) {
            var host = req.headers.get("host") || "";
            var path = req.pathInfo || "/";

            return host.indexOf(spec.host) > -1
                && path.indexOf(spec.path) == 0;
        };

        this.target = target;
    };

    return middleware;
};

/**
 * Unhandled request handler.
 */
function unhandled(req) {
    throw new Error("Unhandled request");
}
