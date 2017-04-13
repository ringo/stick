/**
 * @fileoverview This module provides middleware for reading
 * cookies from the request. It does not provide any functions
 * to set cookies in the response.
 *
 * @example const {Application} = require("stick");
 * const {setCookie} = require("ringo/utils/http");
 * const response = require("ringo/jsgi/response");
 * const app = exports.app = new Application();
 * app.configure("cookies", "route");
 *
 * app.get("/setCookies", function(req) {
 *   // ringo/utils/http is used to set cookies
 *   return response.addHeaders({
 *     "set-cookie": [
 *       setCookie("test1", "value1", 1),
 *       setCookie("test2", "value2", 1)
 *     ]
 *   }).text("Done.");
 * });
 *
 * app.get("/getCookies", function(req) {
 *   // req.cookies is provided by this middleware
 *   // result will be:
 *   // {
 *   //   "test1": "value1",
 *   //   "test2": "value2"
 *   // }
 *   return response.json(req.cookies);
 * });
 */

/**
 * This middleware provides support for cookie access.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function session(next, app) {

    return function (req) {

        /**
         * A cookies object for the current request.
         * @see servletRequest
         * @name request.cookies
         */
        Object.defineProperty(req, "cookies", {
            get: function() {
                if (!cookies) {
                    var cookies = new ScriptableMap();
                    var servletCookies = req.env.servletRequest.getCookies();
                    if (servletCookies) {
                        servletCookies.forEach(function(cookie) {
                            cookies[cookie.getName()] = cookie.getValue();
                        });
                    }
                }
                return cookies;
            }
        });
        return next(req);
    };
};
