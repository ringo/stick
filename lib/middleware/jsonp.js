var response = require('ringo/jsgi/response');

/**
 * @fileoverview JSONP middleware
 *
 * Wraps JSON responses in a function call specified by the query parameter
 * `callback`, for example:
 *     foo({
 *         meta: {...},
 *         data: {...}
 *     })
 *
 * The `meta` object contains the `status` code of the original application
 * response (JSONP responses are always returned as 200 OK) plus all response
 * header fields set by the application with the exception of `content-type`.
 *
 * The `data` object contains the original JSON response of the application.
 *
 * ### Configuration options:
 * - `callbackName`: the name of the query parameter specifying the name
 * of the callback method to use in the JSONP response. Defaults to "callback"
 * - `metaName`: the name of the property containing the request metadata.
 * Defaults to "meta"
 * - `payloadName`: the name of the property containing the response payload.
 * Defaults to "data"
 *
 * @example
 *
 *     app.configure('jsonp')
 *     app.jsonp({
 *         callbackName: 'foo',
 *         metaName: 'metadata',
 *         payloadName: 'payload'
 *     });
 *
 * @type {string}
 */
var CONTENT_TYPE = "application/javascript";
var CALLBACK_REGEX = /^[a-zA-Z_$][\w-]+$/;

var getMeta = function(res) {
    var meta = {
        "status": res.status
    };
    for each (let [key, value] in Iterator(res.headers)) {
        if (key.toLowerCase() !== "content-type") {
            meta[key] = value;
        }
    }
    return meta;
};

/**
 * Stick middleware factory to wrap JSON responses in a JSONP function call
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function jsonp(next, app) {

    var config = {
        "callbackName": "callback",
        "metaName": "meta",
        "payloadName": "data"
    };

    app.jsonp = function(options) {
        var valid = Object.keys(config);
        var unknown = Object.keys(options).filter(function(key) {
            var idx = valid.indexOf(key);
            if (idx > -1) {
                config[key] = options[key];
            }
            return idx < 0;
        });
        if (unknown.length > 0) {
            throw new Error("Unknown config option(s) '" + unknown.join(", ") + "'");
        }
    };

    return function jsonp(req) {
        var callback = req.queryParams && req.queryParams[config.callbackName];
        if (!callback) {
            return next(req);
        } else if (!CALLBACK_REGEX.test(callback)) {
            return response.json({
                "error": "Invalid callback name",
                "description": "Callback names must match " + CALLBACK_REGEX.source
            }).bad();
        } else if (req.method !== "GET") {
            return response.json({
                "error": "Method not allowed",
                "description": "Only method 'GET' allowed for JSONP requests"
            }).bad();
        }

        var res = next(req);
        var contentType = res.headers["content-type"];
        var isJson = contentType && contentType.indexOf("application/json") === 0;
        if (isJson) {
            res.body = [
                callback,
                '({"', config.metaName, '": ',
                JSON.stringify(getMeta(res), null, 4),
                ',"', config.payloadName, '": ',
                res.body.join(""),
                '})'
            ];
            res.status = 200;
            res.headers["content-type"] = CONTENT_TYPE + "; charset=" + res._charset;
        }
        return res;
    };
};