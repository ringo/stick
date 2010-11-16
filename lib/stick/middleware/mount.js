var {Headers} = require("ringo/utils/http");

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