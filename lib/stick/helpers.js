/**
 * @fileOverview A collection of helper functions that makes
 * working with Stick middleware easier.
 */

var objects = require("ringo/utils/objects");
var {urlEncode} = require("ringo/utils/http");
var mount = require("stick/middleware/mount");

/**
 * Return a link to an action configured using the `route` middleware.
 *
 * The link's URL is generated from the bindings argument as described for
 * the [urlFor helper](#urlFor).
 *
 * @param {object|string} app the application to link to
 * @param {object} bindings an object containing the bindings for the target URL.
 * @param {string} text the link text.
 */
exports.linkTo = function(app, bindings, text) {
    var href = urlFor(app, bindings);
    text = text || href;
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
 * @param {object|string} app the application to link to
 * @param {object} bindings an object containing the bindings for the target URL.
 */
var urlFor = exports.urlFor = function(app, bindings) {
    bindings = bindings ? objects.clone(bindings) : {};

    if (!app) {
        throw new Error("app binding is missing");
    }
    app = resolveApp(app);

    var baseUri = app.base || mount.lookup(app) || "";
    if (app.route) {
        baseUri += app.route.reverse(bindings);
    }

    // add any bindings left over by route.reverse() to the query string
    var unbound = Object.keys(bindings);
    if (unbound.length) {
        baseUri += "?" + urlEncode(bindings);
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

/**
 * Create a response that redirects the client to a different URL.
 * @param {string|object} app either the URL as string or an app
 *        to be passed to `urlFor`
 * @param {bindings} bindings to pass to `urlFor` if first argument is an app.
 * @returns {object} a JSGI response that will redirect the client to the
 *        specified target
 */
exports.redirectTo = function(app, bindings) {
    var target;
    if (typeof app === "function") {
        target = urlFor(app, bindings);
    } else if (typeof app === "string") {
        target = app;
    } else {
        throw new Error("redirectTo requires an argument of type string or object");
    }
    return {
        status: 303,
        headers: {Location: target},
        body: ["See other: " + target]
    };
};

/**
 * Create a JSGI response with content-type 'text/html' with the string
 * or binary arguments as response body.
 * @param {string} string... a variable number of strings to send as response body 
 */
exports.htmlResponse = function() {
    return {
        status: 200,
        headers: {"Content-Type": "text/html"},
        body: Array.slice(arguments).map(String)
    }
};

/**
 * Create a JSGI response with content-type 'application/json' with the JSON
 * representation of the given object as response body.
 * @param {object} object the object whose JSON representation to return
 */
exports.jsonResponse = function(object) {
    return {
        status: 200,
        headers: {"Content-Type": "application/json"},
        body: [JSON.stringify(object)]
    };
};

/**
 * Create a JSGI response with content-type 'application/xml' with the given
 * XML document as response body.
 * @param {xml|string} xml an XML document
 */
exports.xmlResponse = function(xml) {
    return {
        status: 200,
        headers: {"Content-Type": "application/xml"},
        body: [typeof xml === 'xml' ? xml.toXMLString() : xml]
    };
};