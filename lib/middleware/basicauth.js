/**
 * @fileOverview Basic Authentication middleware.
 *
 * To apply authentication to parts of your
 * website configure this middleware and call the app's basicauth method with
 * the URI path, user name, digest, and the name of digest's function of the user's password as arguments for
 * each path you want to protect:
 *
 * @example
 * app.configure("basicauth");
 * app.basicauth('/protected/path', 'admin',
 *         'd32b568cd1b96d459e7291ebf4b25d007f275c9f13149beeb782fac0716613f8', 'SHA-256');
 */

var strings = require('ringo/utils/strings');
var base64 = require('ringo/base64');

/**
 * This middleware installs a `basicauth` function in the application object.
 * If the client request does not provide valid user name and password,
 * requests will be rejected with a `401 - Unauthorized` response.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function basicauth(next, app) {

    var config = {};

    app.basicauth = function(path, role, digest, hashAlgorithm) {
        // to avoid "sha256" and other invalid names ...
        strings.digest("test if digest available", hashAlgorithm);

        config[path] = {};
        // strings.digest() uses upper-case hex encoding
        config[path][role] = {
            "algorithm": (hashAlgorithm || "sha1"),
            "digest": String(digest).toUpperCase()
        };
    };

    return function basicauth(req) {
        // normalize multiple slashes in request path
        var path = (req.scriptName + req.pathInfo).replace(/\/+/g, '/');
        var toAuth;
        for (var realm in config) {
            if (path.indexOf(realm) == 0) {
                toAuth = config[realm];
                break;
            }
        }
        if (toAuth) {
            if (req.headers.authorization) { // Extract credentials from HTTP.
                var credentials = base64.decode(req.headers.authorization
                        .replace(/Basic /, '')).split(':');
                if (credentials.length === 2 && toAuth[credentials[0]] != null && strings.digest(credentials[1], toAuth[credentials[0]].algorithm) === toAuth[credentials[0]].digest) {
                    return next(req); // Authorization.
                }
            }
            var msg = '401 Unauthorized';
            return { // Access denied.
                status: 401,
                headers: {
                    'content-type': 'text/html',
                    'www-authenticate': 'Basic realm="Secure Area"'
                },
                body: [
                    '<html><head><title>', msg, '</title></head>',
                    '<body><h1>', msg, '</h1>',
                    '</body></html>'
                ]
            };
        }
        return next(req);
    }
};
