/**
 * @fileOverview This module provides middleware for mounting other applications
 * on a specific URI path or virtual host.
 *
 * Applying this middleware adds a `mount` method to the application. The mount
 * method takes a path or virtual host specification and an application as arguments.
 * If the spec is a string, it is interpreted as the URI path on which the app will be
 * mounted. If it is an object, it may contain `path` or `host` properties
 * that will be matched against the URI path and `Host` header of incoming requests.
 * _Note that virtual host based mounting has not been tested so far._
 *
 * Mounting one application within another causes the `scriptName` and `pathInfo`
 * properties in the request object to be adjusted so that the mounted application
 * receives the same pathInfo as if it was the main application. This means
 * that forward and reverse request routing will usually work as expected.
 *
 * This middleware maintains an index mapping applications to mount points which
 * can be accessed using the [lookup](#lookup) function. The [stick/helpers] module
 * provides higher level functions for this which include support for the route
 * middleware.
 *
 * @example
 * app.configure("mount");
 * app.mount("/wiki", module.resolve("vendor/ringowiki"));
 */

var {Headers} = require("ringo/utils/http");
var strings = require("ringo/utils/strings");
var {resolveApp} = require("stick/helpers");

var index = index || {};

/**
 * Middleware to mount other application on specific URI paths or virtual hosts.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
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

/**
 * Return the URI path of a mounted application 
 * @param target a mounted JSGI application
 * @returns the URI path of the application, or ""
 */
exports.lookup = function(target) {
    if (!target || typeof target !== "function") {
        throw new Error("target must be a JSGI application");
    }
    if (!target.mountId) return "";
    var spec = index[target.mountId];
    var path = "";
    while (spec && spec.length) {
        path = (spec[0].path || "") + path;
        // TODO check for cyclic paths
        spec = spec[0].parent ? index[spec[0].parent] : null;
    }
    return path;
};
