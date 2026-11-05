/**
 * @fileOverview Middleware for conditional HTTP GET request based on
 * response body message digests.
 *
 * If the response body doesn't implement a `digest()` method this middleware
 * creates a base 16 encoded MD5 digest of it. Note that for binary responses
 * this is a memory expensive operation, as it needs to copy the body contents
 * to create the digest. Especially for streamed JSGI responses the body should
 * contain a `digest()` method.
 */

const strings = require('ringo/utils/strings');
const {Headers} = require('ringo/utils/http');
const binary = require('binary');

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
        return strings.b16encode(binary.ByteString.wrap(md.digest()));
    }

    return function etag(request) {

        const res = next(request);
        let {status, headers, body} = res;

        if (status === 200) {
            let etags, etag, binBody;
            let header = request.headers["if-none-match"];
            if (header) {
                etags = header.split(",").map(function(s) {return s.trim() });
            }

            // if body provides a digest() method use that
            if (typeof body.digest === "function") {
                etag = body.digest();
            } else {
                // we can't rely on body having map(), so we fake it with forEach()
                binBody = [];
                body.forEach(function(part) {
                    binBody.push((part instanceof Binary) ? part.slice() : binary.toByteString(part));
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
