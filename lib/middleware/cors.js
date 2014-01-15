var response = require('ringo/jsgi/response');

/**
 * @fileoverview Cross-site HTTP Request headers
 *
 * Ability to configure all CORS headers. For a detailed explanation
 * on what the different headers do see
 * [MDN on CORS](https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS)
 *
 * @example
 * app.configure("cors");
 * app.cors({
 *    allowOrigin: ['http://example.com', 'https://example.com'],
 *    allowMethods: ['POST', 'GET'],
 *    allowHeaders: ['X-PingOther'],
 *    exposeHeaders: []
 *    maxAge: 1728000,
 *    allowCredentials: true
 * })
 */

// @@ this middleware only has one config for the whole application.
//  a sensible enhancement would be to allow per route configuration.


exports.middleware = function cors(next, app) {
    // all section numbers refer to spec <http://www.w3.org/TR/cors/>
    var config = {
        allowOrigin: [],
        allowMethods: [],
        allowHeaders: [],
        exposeHeaders: [],
        maxAge: 0,
        allowCredentials: false
    }
    app.cors = function(conf) {
        for (var key in conf) {
            if (config[key] !== undefined) {
                config[key] = conf[key];
            } else {
                throw new Error("Unknown config option '" + key + '"');
            }
        }
        // Note of 7.1.5.7
        if (config.allowOrigin[0] === '*' && config.allowCredentials) {
            throw new Error("Invalid configuration: allowOrigin=* and allowCredentials=true not allowed");
        }
    }
    return function cors(req) {
        var requestOrigin = req.headers.origin;
        // 6.1.1
        if (requestOrigin !== undefined) {
            // 6.1.2
            var isAllowedOrigin = config.allowOrigin[0] === '*' || config.allowOrigin.indexOf(requestOrigin) > -1;
            if (isAllowedOrigin) {
                // preflight
                // 7.1.5.3
                var corsRequestMethod = req.headers['Access-Control-Request-Method'];
                // 7.1.5.4
                var corsRequestHeaders = req.headers['Access-Control-Request-Headers'];
                var isPreflight = false;
                if (req.method.toLowerCase() === 'options' && corsRequestMethod) {
                    isPreflight = true;
                    // 7.1.5.5
                    var isAllowedRequestMethod = config.allowMethods[0] === '*' ||
                                                        config.allowMethods.indexOf(corsRequestMethod) > -1;
                    if (!isAllowedRequestMethod) {
                        return response.bad();
                    }
                    // 7.1.5.6
                    var isAllowedHeaders = true;
                    if (typeof corsRequestHeaders === 'string') {
                        corsRequestHeaders = [corsRequestHeaders];
                    }
                    if (corsRequestHeaders && corsRequestHeaders.length > 0) {
                        isAllowedHeaders = corsRequestHeaders.every(function(header) {
                            return config.allowHeaders[0] === '*' || config.allowHeaders.indexOf(header) > -1;
                        });
                    }
                    if (!isAllowedHeaders) {
                        return response.bad();
                    }
                }

                // `response` is overriden in else path
                var res = response.ok();
                if (isPreflight == true) {
                    // 7.1.5.8
                    if (config.maxAge !== undefined) {
                        res.addHeaders({'Access-Control-Max-Age': config.maxAge});
                    }
                    // 7.1.5.9
                    res.addHeaders({'Access-Control-Allow-Methods': config.allowMethods.join(', ')});
                    if (config.allowHeaders.length > 0) {
                        res.addHeaders({'Access-Control-Allow-Headers': config.allowHeaders.join(', ')});
                    }
                } else {
                    res = next(req);
                    // 6.1.4
                    if (config.exposeHeaders.length > 0) {
                        res.addHeaders({'Access-Control-Expose-Headers': config.exposeHeaders.join(', ')});
                    }
                }
                // 6.1.3
                if (config.allowCredentials === true) {
                    res.addHeaders({'Access-Control-Allow-Credentials': 'true'});
                }
                // 6.4
                res.addHeaders({'Vary': 'Origin'});
                res.addHeaders({'Access-Control-Allow-Origin': requestOrigin});
            }
        }
        return res || response.bad();
    }
};
