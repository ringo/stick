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


exports.middleware = function cors(next, app) {
    // all `section.numbers#step` comments
    // refer to spec <http://www.w3.org/TR/cors/>
    var config = {
        allowOrigin: [],
        allowMethods: [],
        allowHeaders: [],
        exposeHeaders: [],
        maxAge: 0,
        allowCredentials: false
    };

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
    };



    function isPreflight (req) {
        // 6.2#3
        var corsRequestMethod = req.headers['access-control-request-method'];
        return req.method.toLowerCase() === 'options'  && corsRequestMethod != undefined;
    };

    function isSimpleCors(req) {
        var isSimpleMethod = ['GET', 'HEAD', 'POST'].indexOf(req.method) > -1
        // ringo makes header names lowercase
        var isSimpleHeader = Object.keys(req.headers).every(function(headerName) {
            return ['origin', 'accept', 'accept-language', 'content-language'].indexOf(headerName) > -1;
        });
        var isOtherSimpleHeader = req.headers['content-type'] && 
            ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'].some(function(val) {
                return req.headers['content-type'].toLowerCase().indexOf(val) > -1;
            });

        return isSimpleMethod && (isSimpleHeader || isOtherSimpleHeader);

    }

    function isAllowedPreflight(req) {
        // 6.2#4
        var corsRequestHeaders = [];
        if (req.headers['access-control-request-headers']) {
            corsRequestHeaders = req.headers['access-control-request-headers'].split(/,\s?/);
        }

        // 6.2#5
        var corsRequestMethod = req.headers['access-control-request-method'];
        var isAllowedRequestMethod = config.allowMethods[0] === '*' ||
                        config.allowMethods.indexOf(corsRequestMethod) > -1;

        if (isAllowedRequestMethod == false) {
            return false;
        }
        // 6.2#6
        var areAllowedHeaders = corsRequestHeaders.every(function(header) {
            return config.allowHeaders[0] === '*' || config.allowHeaders.indexOf(header) > -1;
        });

        if (areAllowedHeaders == false) {
            return false;
        }
        return true;
    };

    function handleCors(req) {
        var requestOrigin = req.headers.origin;
        // 6.1#1
        // 6.2#1
        if (requestOrigin === undefined) {
            return next(req);
        }
        // 6.1#2
        // 6.2#2
        if (config.allowOrigin[0] !== '*' && config.allowOrigin.indexOf(requestOrigin) == -1) {
            return response.bad();
        }
        if (isSimpleCors(req)) {
            var res = next(req);
            // 6.1#3
            if (config.allowCredentials === true) {
                res.addHeaders({'Access-Control-Allow-Credentials': 'true'});
            }
            res.addHeaders({'Access-Control-Allow-Origin': requestOrigin});
            // 6.1#4
            if (config.exposeHeaders.length > 0) {
                res.addHeaders({'Access-Control-Expose-Headers': config.exposeHeaders.join(', ')});
            }
            return res;
        } else if (isPreflight(req)) {
            if (isAllowedPreflight(req)) {
                var res = response.ok();
                // 6.2#7
                if (config.allowCredentials === true) {
                    res.addHeaders({'Access-Control-Allow-Credentials': 'true'});
                }
                res.addHeaders({'Access-Control-Allow-Origin': requestOrigin});
                // 6.2#8
                if (config.maxAge !== undefined) {
                    res.addHeaders({'Access-Control-Max-Age': config.maxAge});
                }
                // 6.2#9
                res.addHeaders({'Access-Control-Allow-Methods': config.allowMethods.join(', ')});
                // 6.2#10
                if (config.allowHeaders.length > 0) {
                    res.addHeaders({'Access-Control-Allow-Headers': config.allowHeaders.join(', ')});
                };
                return res;
            };
            return response.bad();
        }
    }

    return function cors(req) {
        var res = handleCors(req);
        res.addHeaders({'Vary': 'Origin'});
        return res;
    }
};
