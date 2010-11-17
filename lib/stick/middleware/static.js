/**
 * @fileOverview Middleware for serving static resources.
 */

var {Response} = require("ringo/webapp/response");
var {mimeType} = require("ringo/webapp/mime");

/**
 * Middleware for serving static resources.
 *
 *  This installs a `static()` method in the application that accepts the following arguments:
 *  - `base`: the base resource directory (required)
 *  - `index`: the name of a file to serve if the path matches a directory (e.g.
 *    "index.html")
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function static(next, app) {
    
    var baseRepository, indexDocument;

    app.static = function(base, index) {
        if (typeof base === "string") {
            baseRepository = getRepository(base);
        } else if (base instanceof org.ringojs.repository.Repository) {
            baseRepository = base;
        } else {
            throw new Error ("base must be of type String or Repository");
        }
        baseRepository.setRoot();
        indexDocument = index;
    };

    return function static(request) {
        var path = request.pathInfo;
        if (indexDocument && path.charAt(path.length-1) === "/") {
            path += indexDocument;
        }
        if (path.length > 1) {
            var resource = baseRepository.getResource(path);
            if (resource && resource.exists()) {
                return Response.static(resource, mimeType(path, "text/plain"));
            }
        }
        return next(request);
    };
};
