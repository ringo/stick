var {Headers} = require("ringo/utils/http");

var Application = exports.Application = function Application() {

    var middleware = unhandled;
    var environments = {};

    function app(req) {
        return middleware(req);
    }

    Object.defineProperty(app, "configure", {
        value: function() {
            // prepend to existing middleware chain
            var components = Array.slice(arguments);
            middleware = wrap(components, middleware);
            return app;
        }
    });

    Object.defineProperty(app, "env", {
        value: function(name) {
            var env = environments[name];
            if (!env) {
                env = new Application(proxy)
                environments[name] = env;
            }
            return env;
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
                return compose(resolve(outer), resolve(inner));
            });
        }
        if (typeof middleware !== "function") {
            throw new Error("Could not resolve middleware: " + middleware);
        }
        return middleware;
    }

    // wrap middleware helper
    function wrap(middleware, next) {
        next = next || unhandled;
        if (!Array.isArray(middleware)) {
            return compose(resolve(middleware), next);
        }
        return middleware.reduceRight(function(inner, outer) {
            return compose(resolve(outer), inner);
        }, next);
    }

    // return the result of calling outer(inner, app), do some error checking
    // and set up better toString() methods
    function compose(outer, inner) {
        var composed = outer(inner, app);
        if (typeof composed !== "function") {
            throw new Error("Expected function as middleware, got " + composed);
        }
        var functionToString = Function.prototype.toString;
        if (composed.toString === functionToString) {
            var name = composed.name || outer.name || "anonymous";
            var innerName = inner.toString === functionToString ?
                    inner.name || "anonymous" : String(inner);
            composed.toString = function() {
                return name + " > " + innerName;
            }
        }
        return composed;
    }

    function proxy(req) {
        return middleware(req)
    }

    proxy.toString = function() {
        return app.toString();
    };

    app.toString = function() {
        return middleware.toString();
    };

    // add all arguments to the default middleware stack
    if (arguments.length > 0) {
        middleware = arguments[0];
    }

    return app;
};

/**
 * Middleware to mount other application on
 * specific URI paths or virtual hosts.
 */
exports.Mount = function Mount(next, app) {

    var mounts = [];

    // define mount() method on application object
    app.mount = function(spec, target) {
        if (typeof spec === "string") {
            spec = {path: spec};
        } else if (!spec) {
            throw new Error("Missing spec");
        }
        spec.path = spec.path || "/";
        spec.host = spec.host || "";
        mounts.push({
            match: function(req) {
                var host = req.headers.get("host") || "";
                var path = req.pathInfo || "/";

                return host.indexOf(spec.host) > -1
                    && path.indexOf(spec.path) == 0;
            },
            target: target
        });
    };

    // return middleware function
    return function mount(req) {
        Headers(req.headers);
        for (var i = 0; i < mounts.length; i++) {
            if (mounts[i].match(req)) {
                return mounts[i].target(req);
            }
        }
        return next(req);
    };
};

/**
 * Unhandled request handler.
 */
function unhandled(req) {
    throw new Error("Unhandled request");
}

unhandled.toString = function() {
    return "unhandled";
};
