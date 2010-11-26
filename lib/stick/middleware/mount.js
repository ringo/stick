var {Headers} = require("ringo/utils/http");
var strings = require("ringo/utils/strings");

var index = index || {};

/**
 * Middleware to mount other application on specific URI paths or virtual hosts.
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
        spec.parent = app.mountId;

        // if target is a string it is interpreted as module id
        if (typeof target === "string") {
            target = require(target).app;
        }
        if (typeof target !== "function") {
            if (target && typeof target.app === "function") {
                target = target.app;
            } else {
                throw new Error("Error resolving target: " + target);
            }
        }

        if (!target.mountId) {
            target.mountId = String(java.util.UUID.randomUUID());
            index[target.mountId] = [];
        }
        index[target.mountId].push(spec);

        mounts.push({
            match: function(req) {
                var host = req.headers.get("host") || "";
                var path = req.pathInfo || "/";

                return (!spec.host || (host && strings.endsWith(host, spec.host)))
                    && (!spec.path || path === spec.path
                                   || (path && strings.startsWith(path, spec.canonicalPath)));
            },
            path: spec.path,
            canonicalPath: spec.canonicalPath,
            target: target
        });
    };

    app.mountId = String(java.util.UUID.randomUUID());
    index[app.mountId] = [];

    // return middleware function
    return function mount(req) {

        /* var parentLookup = req.mount ? req.mount.lookup : null;

        // install reverse module id -> URI path lookup function
        req.mount = {
            lookup:  function(id) {
                var spec = reverse[id];
                if (spec && spec.canonicalPath) {
                    // not working with virtual hosts based mounts yet
                    return encodeURI(app.base + spec.path);
                }
                return typeof parentLookup === "function" ?
                        parentLookup.apply(req.env, arguments) : null;
            }
        }; */

        Headers(req.headers);
        for (var i = 0, length = mounts.length; i < length; i++) {
            var mount = mounts[i];
            if (mount.match(req)) {

                // if trailing slash is missing redirect to canonical path
                if (req.pathInfo === mount.path && req.method === "GET") {
                    var location = req.scriptName + mount.canonicalPath;
                    if (req.queryString) location += "?" + req.queryString;
                    return {
                        status: 303,
                        headers: {"Location": location},
                        body: ["See other: ", location]
                    }
                }

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

exports.lookup = function(target) {
    /* if (typeof target === "string") {
        target = require(target).app;
    }
    if (typeof target !== "function") {
        if (target && typeof target.app === "function") {
            target = target.app;
        } else {
            throw new Error("Error resolving target: " + target);
        }
    }  */
    if (!target.mountId) return "";
    var spec = index[target.mountId];
    var path = "";
    while (spec) {
        path += spec.length && spec[0].path || "";
        spec = spec.parent ? index[spec.parent] : null;
    }
    return path;
};
