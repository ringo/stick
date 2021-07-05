/**
 * @fileOverview Middleware for conditional HTTP GET request based on
 * response body message digests.
 *
 * The response body must implement a digest() method for this middleware to work.
 */

const strings = require('ringo/utils/strings');
const {Headers} = require('ringo/utils/http');
let {Binary, ByteString, toByteString} = require('binary');

/**
 * Middleware for conditional HTTP GET request based on
 * response body message digests.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function etag(next, app) {

    function digest(body) {
        const md = java.security.MessageDigest.getInstance("MD5");
        body.forEach(function(part) {
            md.update(part);
        });
        return strings.b16encode(ByteString.wrap(md.digest()));
    }

    return function etag(request) {

        const res = next(request);
        let {status, headers, body} = res;

        if (status === 200) {
            let etags, etag;
            let header = request.headers["if-none-match"];
            if (header) {
                etags = header.split(",").map(function(s) {return s.trim() });
            }

            // if body provides a digest() method use that
            if (typeof body.digest === "function") {
                etag = body.digest();
            } else {
                // we can't rely on body having map(), so we fake it with forEach()
                const binBody = [];
                body.forEach(function(part) {
                    binBody.push((part instanceof Binary) ? part.toByteString() : toByteString(part));
                });
                etag = digest(binBody);
            }
            if (etag) {
                headers = Headers(headers);
                headers.set("etag", etag);

                if (etags && strings.contains(etags, etag)) {
                    // return not-modified response
                    headers.unset('content-length');
                    return {status: 304, headers: headers, body: []};
                }
            }

            if (binBody) {
                // body has been converted to ByteStrings as a byproduct of digest()
                res.body = binBody;
            }
        }
        return res;
    };
};
