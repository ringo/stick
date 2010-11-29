/**
 * @fileOverview A collection of helper functions that makes
 * working with Stick middleware easier.
 */

var objects = require("ringo/utils/objects");
var mount = require("stick/middleware/mount");

/**
 * Return a link to an action configured using the `route` middleware.
 *
 * The link's URL is generated from the bindings argument as described for
 * the [urlFor helper](#urlFor).
 *
 * @param {object} bindings an object containing the bindings for the target URL.
 * @param {string} text the link text.
 */
exports.linkTo = function(bindings, text) {
    var href = this.urlFor(bindings);
    text = text || "link";
    return '<a href="' + href + '">' + text + '</a>';
};

/**
 * Return a URL to an action configured using the `route` middleware.
 *
 * The `bindings` argument contains informations needed to determine the target
 * application and action.
 *
 *  * `app` - the Stick application to link to. If this is a module or module id,
 *    the app is expected to be exported as `app`. If an app is composed out of
 *    multiple applications internally, they must use the `mount` middleware for
 *    this helper to return the correct URL.
 *
 *  * `action` - the name of the action to link to. Action names are determined from
 *    the path arguments provided to the `route` middleware. For example, the name for
 *    an action routed with `/edit/:id` is "edit".
 *
 *  * `request` - the current request. If this is defined, or a request is currently
 *    associated with the app object, any bindings used by the route middleware to
 *    route the request are used as default values when generating the URL.
 *
 * All other bindings are used to provide values for named placeholders in action routes.
 * For example, to URI path to an action in application `app` routed with "/edit/:id" with
 * id `5` can be generated as follows:
 *
 *     urlFor({app: app, action: "edit", id: 5})
 *  
 * @param {object} bindings an object containing the bindings for the target URL.
 */
var urlFor = exports.urlFor = function(bindings) {
    var module = bindings.module,
        app = bindings.app,
        req = bindings.request;
    if (!app) {
        throw new Error("app binding is missing");
    }
    app = resolveApp(app);
    if (!req) req = app.request;
    var baseUri = app.base || mount.lookup(app) || "";
    if (req && req.route && req.route.bindings) {
        bindings = objects.merge(bindings, req.route.bindings);
    }
    if (app.route && app.route.reverse) {
        baseUri += app.route.reverse(bindings);
    }
    return baseUri;
};

/**
 * Resolve a module name or module object to a JSGI application.
 */
var resolveApp = exports.resolveApp = function(app) {
    var resolved = typeof app === "string" ? require(app).app : app;
    if (typeof resolved !== "function") {
        if (resolved && typeof resolved.app === "function") {
            resolved = resolved.app;
        } else {
            throw new Error("Could not resolve app: " + app);
        }
    }
    return resolved;
};