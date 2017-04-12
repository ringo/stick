/**
 * @fileOverview Middleware for serving static resources.
 *
 * This installs a `static()` method in the application that accepts the following arguments:
 *
 * <ul>
 *  <li>`base`: the base resource directory (required)
 *  <li>`index`: the name of a file to serve if the path matches a directory (e.g. "index.html")
 *  <li>`baseURI`: a common prefix for a resource URI (e.g. "/static")
 *  <li>`options`: an object with fine-grained configuration options
 *  <li>
 *     <ul>
 *     <li>`servePrecompressed`: if true (default), static resources with a pre-compressed gzip equivalent will be
 *                           served instead of the original file.
 *     <li>`maxAge`: set the `Cache-Control` header in seconds, default is 0.
 *     <li>`lastModified`: if true (default), set the `Last-Modified` header to the modification date of the resource.
 *     <li>`setHeaders`: allows a user to specify a function which returns additional headers to be set for a given path.
 *                   The given function produces an object containing the header names as keys and takes the path as
 *                   argument. User-provided headers take precedence over all other headers.
 *     <li>`dotfiles`: determines how should files starting with a dot character be treated.
 *                 `allow` (default) serves dotfiles, `deny` respond with status 403, `ignore` respond with status 404.
 *    </ul>
 *  </li>
 * </ul>
 *
 * You can call `static()` multiple times to register multiple resources to be served.
 */

const RFC_822 = "EEE, dd MMM yyyy HH:mm:ss z";

var objects = require("ringo/utils/objects");
var dates = require("ringo/utils/dates");
var response = require("ringo/jsgi/response");
var {mimeType} = require("ringo/mime");

/**
 * Middleware for serving static resources.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function static(next, app) {

    var resourceConfigs = [];
    
    app.static = function(base, index, baseURI, options) {
        var opts = objects.merge(options || {}, {
            "servePrecompressed": true,
            "dotfiles": "allow",
            "lastModified": true,
            "maxAge": 0,
            "setHeaders": null
        });
        var baseRepository;
        if (typeof base === "string") {
            baseRepository = getRepository(base);
        } else if (base instanceof org.ringojs.repository.Repository) {
            baseRepository = base;
        } else {
            throw new Error ("base must be of type String or Repository");
        }
        baseRepository.setRoot();
        resourceConfigs.push({
            repository: baseRepository,
            index: index,
            prefix: (typeof baseURI === "string" ? baseURI : ""),
            options: opts
        });
    };

    return function static(request) {
        for each (var config in resourceConfigs) {
            if (request.pathInfo.indexOf(config.prefix) === 0) {
                var path = request.pathInfo.substr(config.prefix.length);
                if (config.index && path.charAt(path.length-1) === "/") {
                    path += config.index;
                }
                if (path.length > 1) {
                    var resource = config.repository.getResource(path);
                    if (resource && resource.exists()) {
                        if (resource.getName().charAt(0) === ".") {
                            switch (config.options.dotfiles.toLowerCase()) {
                                case "deny": return response.text("403 Forbidden").setStatus(403);
                                case "ignore": return response.text("404 Not Found").setStatus(404);
                            }
                        }

                        let userHeaders = typeof config.options.setHeaders === "function" ? config.options.setHeaders() : {};

                        let defaultHeaders = {
                            "cache-control": "max-age=" + config.options.maxAge || 0
                        };

                        if (config.options.lastModified === true) {
                            defaultHeaders["last-modified"] = dates.format(new Date(resource.lastModified()), RFC_822, "en", "GMT");
                        }

                        // check if precompressed gzip resource is available and it's serving is enabled
                        let acceptEncoding = (request.headers["accept-encoding"] || "").toLowerCase();
                        if (acceptEncoding.indexOf("gzip") > -1 && config.options.servePrecompressed === true) {
                            let gzippedResource = config.repository.getResource(path + ".gz");
                            if (gzippedResource && gzippedResource.exists()) {
                                let jsgiResponse = response.static(gzippedResource, mimeType(path, "text/plain"));
                                jsgiResponse.headers = objects.merge(userHeaders, jsgiResponse.headers, {
                                    "content-encoding": "gzip"
                                }, defaultHeaders);
                                return jsgiResponse;
                            }
                        }

                        let jsgiResponse = response.static(resource, mimeType(path, "text/plain"));
                        jsgiResponse.headers = objects.merge(userHeaders, jsgiResponse.headers, defaultHeaders);
                        return jsgiResponse;
                    }
                }
            }
        }
        return next(request);
    };
};
