/**
 * @fileOverview Middleware for on-the-fly GZip compression of response bodies.
 *
 * By default only text content types are compressed. This can be controlled
 * using the `gzip.contentTypes` property:
 * @example
 * app.configure("gzip");
 * app.gzip.contentTypes = /^text|xml|json|javascript/;
 * 
 */
const binary = require('binary');
const {ResponseFilter, Headers} = require('ringo/utils/http');

const {ByteArrayOutputStream} = java.io;
const {GZIPOutputStream} = java.util.zip;

/**
 * JSGI middleware for GZIP compression.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function gzip(next, app) {

    // app.gzip.contentTypes is a regular expression that use used to determine
    // whether or not gzip encoding should be applied to a response
    app.gzip = {
        contentTypes: /^text|xml|json|javascript/
    };

    function canCompress(status, acceptEncoding, contentType, contentEncoding) {
        // Return true if content-type matches regex and other conditions are met
        return status === 200 && acceptEncoding && !contentEncoding
                && acceptEncoding.indexOf('gzip') > -1
                && contentType && contentType.match(app.gzip.contentTypes);
    }

    return function gzip(request) {
        const res = next(request),
            headers = Headers(res.headers);

        if (canCompress(res.status,
                request.headers["accept-encoding"],
                headers.get('content-type'),
                headers.get('content-encoding'))) {
            const bytes = new ByteArrayOutputStream(),
                gzip = new GZIPOutputStream(bytes);
            res.body = new ResponseFilter(res.body, function(part) {
                if (!(part instanceof binary.Binary)) {
                    part = binary.toByteString(part);
                }
                gzip.write(part);
                if (bytes.size() > 1024) {
                    const zipped = binary.toByteArray(bytes);
                    bytes.reset();
                    return new binary.ByteString(zipped);
                }
                return null;
            });
            res.body.close = function(fn) {
                gzip.close();
                fn(new binary.ByteString(bytes.toByteArray()));
            };
            
            headers.set('content-encoding', 'gzip');
        }
        return res;
    };

};

