/**
 * @fileoverview Cross-site HTTP Request headers
 *
 * Ability to configure all CORS headers. For a detailed explanation
 * on what the different headers do see
 * [MDN on CORS](https://developer.mozilla.org/en-US/docs/HTTP/Access_control_CORS)
 *
 * Even if `allowOrigin` is defined as "*" (`allowOrigin: ['*']`) this middleware
 * will always respond with an "Access-Control-Allow-Origin" header with the value of the "Origin" header.
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
    };

    return function cors(req) {
        var res = next(req);

        var requestOrigin = req.headers.origin;
        var isAllowedOrigin = config.allowOrigin[0] == '*' || config.allowOrigin.indexOf(requestOrigin) > -1;

        if (isAllowedOrigin) {
            var acRequestMethod = req.headers['access-control-request-method'];
            var isAllowedRequestMethod = (acRequestMethod == undefined ) ||
                config.allowMethods[0] === '*' ||
                config.allowMethods.indexOf(acRequestMethod) > -1;
            if (isAllowedRequestMethod && req.method.toLowerCase() == 'options' && acRequestMethod) {
                if (config.maxAge !== undefined) {
                    res.headers['access-control-max-age'] = config.maxAge;
                }
                res.headers['access-control-allow-methods'] = config.allowMethods.join(', ');
                if (config.allowHeaders.length > 0) {
                    res.headers['access-control-allow-headers'] = config.allowHeaders.join(', ');
                };
            }
            if (isAllowedRequestMethod) {
                res.headers['access-control-allow-origin'] = requestOrigin;
                if (config.allowCredentials === true) {
                    res.headers['access-control-allow-credentials'] = 'true';
                }
                if (config.exposeHeaders.length > 0) {
                    res.headers['access-control-expose-headers'] = config.exposeHeaders.join(', ');
                }
            }
        }
        // set or append to Vary Header
        var newVary = "Origin";
        if (res.headers['vary'] && res.headers['vary'].length) {
            newVary = res.headers['vary'] + ',' + 'Origin';
        }
        res.headers['vary'] = newVary;
        return res;
    }
};
