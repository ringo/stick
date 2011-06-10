/**
 * @fileoverview This module provides middleware for reading
 * cookies from the request.
 *
 */

/**
 * This middleware provides support for cookie access.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function session(next, app) {

    return function cookies(req) {

        /**
         * A session object for the current request. If no session exists
         * a new one will be created.
         * @see ServletSession
         * @name request.session
         */
        Object.defineProperty(req, "cookies", {
            get: function() {
                if (!cookies) {
                    cookies = new ScriptableMap();
                    var servletCookies = servletRequest.getCookies();
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
