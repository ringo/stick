/**
 * @fileOverview Middleware for conditional HTTP GET request based on
 * response body message digests. The response body must implement
 * a digest() method for this middleware to work.
 */

var strings = require('ringo/utils/strings');
var {Headers} = require('ringo/utils/http');

/**
 * Middleware for conditional HTTP GET request based on
 * response body message digests.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function etag(next, app) {

    return function etag(request) {

        var res = next(request);
        var {status, headers, body} = res;

        if (status === 200 && typeof body.digest === "function") {
            var etags;
            var header = request.headers["if-none-match"];
            if (header) {
                etags = header.split(",").map(function(s) s.trim());
            }
            var digest = '"' + body.digest() + '"';
            headers = Headers(headers);
            headers.set("ETag", digest);
            if (etags && strings.contains(etags, digest)) {
                // return not-modified response
                headers.unset('Content-Length');
                return {status: 304, headers: headers, body: []};
            }
        }
        return res;
    };

}
