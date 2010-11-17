var {Headers} = require("ringo/utils/http");
var strings = require("ringo/utils/strings");

/**
 * Middleware to mount other application on
 * specific URI paths or virtual hosts.
 */
exports.middleware = function Mount(next, app) {

    var mounts = [];

    // define mount() method on application object
    app.mount = function(spec, target) {
        if (typeof spec === "string") {
            spec = {path: spec};
        } else if (!spec) {
            throw new Error("Missing spec");
        }
        if (spec.path) {
            // set up canonical path with trailing slash
            if (strings.endsWith(spec.path, "/")) {
                spec.canonicalPath = spec.path;
                spec.path = spec.path.slice(0, -1);
            } else {
                spec.canonicalPath = spec.path + "/";
            }
        }
        spec.host = spec.host ? String(spec.host) : null;

        mounts.push({
            match: function(req) {
                var host = req.headers.get("host") || "";
                var path = req.pathInfo || "/";

                return (!spec.host || (host && strings.endsWith(host, spec.host)))
                    && (!spec.path || path === spec.path
                                   || (path && strings.startsWith(path, spec.canonicalPath)));
            },
            path: spec.path,
            target: target
        });
    };

    // return middleware function
    return function mount(req) {
        Headers(req.headers);
        for (var i = 0, length = mounts.length; i < length; i++) {
            var mount = mounts[i];
            if (mount.match(req)) {
                // adjust scriptName and pathInfo
                if (mount.path) {
                    req.scriptName += mount.path;
                    req.pathInfo = req.pathInfo.slice(mount.path.length);
                }
                return mount.target(req);
            }
        }
        return next(req);
    };
};