/**
 * @fileOverview Middleware for conditional HTTP GET request based on
 * response body message digests.
 *
 * The response body must implement a digest() method for this middleware to work.
 */

var strings = require('ringo/utils/strings');
var {Headers} = require('ringo/utils/http');
var {ByteString} = require('binary');
var base16 = require('ringo/base16');

/**
 * Middleware for conditional HTTP GET request based on
 * response body message digests.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function etag(next, app) {

    function digest(body) {
        var md = java.security.MessageDigest.getInstance("MD5");
        body.forEach(function(part) {
            md.update(part);
        });
        var b = ByteString.wrap(md.digest());
        return base16.encode(b);
    }

    return function etag(request) {

        var res = next(request);
        var {status, headers, body} = res;

        if (status === 200) {
            var etags;
            var header = request.headers["if-none-match"];
            if (header) {
                etags = header.split(",").map(function(s) s.trim());
            }

            // we can't rely on body having map(), so we fake it with forEach()
            var binBody = [];
            body.forEach(function(part) {
                binBody.push(part.toByteString());
            });
            var etag = '"' + digest(binBody) + '"';
            headers = Headers(headers);
            headers.set("ETag", etag);

            if (etags && strings.contains(etags, etag)) {
                // return not-modified response
                headers.unset('Content-Length');
                return {status: 304, headers: headers, body: []};
            }

            // body has been converted to ByteStrings as a byproduct of digest()
            res.body = binBody;
        }
        return res;
    };

}
