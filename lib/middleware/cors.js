/**
 * @fileoverview Cross-site HTTP request headers
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

const response = require("ringo/jsgi/response");
const {Headers} = require("ringo/utils/http");

exports.middleware = function cors(next, app) {
    // all `section.numbers#step` comments
    // refer to spec <http://www.w3.org/TR/cors/>
    const config = {
        allowOrigin: "*",
        allowMethods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
        allowHeaders:  [],
        exposeHeaders: [],
        allowCredentials: false,
        maxAge: -1,
        forwardPreflights: false,
        optionsSuccessStatus: 204
    };

    app.cors = function(conf) {
        for (let key in conf) {
            if (config.hasOwnProperty(key)) {
                if (["allowMethods", "allowHeaders", "exposeHeaders"].indexOf(key) >= 0) {
                    if (!Array.isArray(conf[key])) {
                        throw new Error("Invalid option " + option + ", must be an Array!");
                    }
                } else if (key === "allowOrigin" &&
                        !(typeof conf.allowOrigin === "string" || conf.allowOrigin instanceof String) &&
                        !(conf.allowOrigin instanceof RegExp) &&
                        !(Array.isArray(conf.allowOrigin) && conf.allowOrigin.every(function (org) {
                            return typeof org === "string" || org instanceof String
                        }))
                ) {
                    throw new Error("allowOrigin must be a string, RegExp, or an array of origin strings");
                } else if (key === "maxAge" && (!Number.isInteger(conf.maxAge) || conf.maxAge < -1)) {
                    throw new Error("maxAge must be an integer bigger greater or equal -1");
                } else if (key === "optionsSuccessStatus" && (!Number.isSafeInteger(conf.optionsSuccessStatus) ||
                        conf.optionsSuccessStatus < 200 || conf.optionsSuccessStatus >= 300)) {
                    throw new Error("optionsSuccessStatus must be an integer between 200 and 299");
                } else if (key === "allowCredentials" && typeof(conf.allowCredentials) !== "boolean") {
                    throw new Error("allowCredentials must be boolean");
                } else if (key === "forwardPreflights" && typeof(conf.forwardPreflights) !== "boolean") {
                    throw new Error("forwardPreflights must be boolean");
                }

                // apply the configuration
                config[key] = conf[key];
            } else {
                throw new Error("Unknown config option '" + key + "'");
            }
        }
    };

    const generateOrigin = function(headers, req) {
        const requestOrigin = req.headers.origin;

        let responseAllowOrigin = null;

        // check if the origin is allowed and if, add the response header
        if (config.allowOrigin === "*") {
            responseAllowOrigin = "*";
        } else if (typeof config.allowOrigin === "string" || config.allowOrigin instanceof String) {
            responseAllowOrigin = config.allowOrigin;
        } else if (config.allowOrigin instanceof RegExp && config.allowOrigin.test(requestOrigin)) {
            responseAllowOrigin = requestOrigin;
        } else if (Array.isArray(config.allowOrigin)) {
            if (config.allowOrigin.indexOf(requestOrigin) > -1) {
                responseAllowOrigin = requestOrigin;
            } else if (config.allowOrigin.length === 1 && config.allowOrigin[0] === "*") {
                responseAllowOrigin = "*";
            }
        }

        if (responseAllowOrigin !== null) {
            headers.set("access-control-allow-origin", responseAllowOrigin);
        } else {
            // this will fail the CORS request in the browser
            headers.unset("access-control-allow-origin");
        }

        // set or append to vary HTTP header
        if (config.allowOrigin !== "*") {
            headers.set("vary", (headers.contains("vary") ? headers.get("vary") + "," : "") + "Origin");
        }
    };

    const generateCredentials = function(headers, req) {
        if (config.allowCredentials === true) {
            headers.set("access-control-allow-credentials", "true");
        }
    };

    const generateExposedHeaders = function(headers, req) {
        if (config.exposeHeaders.length > 0) {
            headers.set("access-control-expose-headers", config.exposeHeaders.join(", "));
        }
    };

    const generateMaxAge = function(headers, req) {
        if (config.maxAge >= 0) {
            headers.set("access-control-max-age", String(config.maxAge));
        }
    };

    const generateAllowMethods = function(headers, req) {
        headers.set("access-control-allow-methods", config.allowMethods.join(", "));
    };

    const generateAllowedHeaders = function(headers, req) {
        if (config.allowHeaders) {
            headers.set("access-control-allow-headers", config.allowHeaders.join(", "));
        }
    };

    const generateHeaders = function(headers, req) {
        // general CORS protocol response headers
        generateOrigin(headers, req);
        generateCredentials(headers, req);
        generateExposedHeaders(headers, req);

        // only suitable for preflight requests
        if (req.method === "OPTIONS") {
            generateMaxAge(headers, req);
            generateAllowMethods(headers, req);
            generateAllowedHeaders(headers, req);
        }
    };

    return function cors(req) {
        const requestOrigin = req.headers.origin;
        const method = (req.method || "").toUpperCase();

        // requests without an origin aren't following the CORS protocol
        if (!requestOrigin) {
            const nonCorsResponse = next(req);

            // set vary to prevent retrieving cached content if the same resource is accessed by a CORS request later
            nonCorsResponse.headers = Headers(nonCorsResponse.headers);
            nonCorsResponse.headers.set(
                "vary",
                (nonCorsResponse.headers.contains("vary") ? nonCorsResponse.headers.get("vary") + "," : "") + "Origin"
            );

            return nonCorsResponse;
        }

        // the following if provides main protection mechanism of CORS:
        // preflighting prevents any subsequent malicious requests being sent by the browser
        // note the following exceptions, where a preflight request will be omitted:
        // https://fetch.spec.whatwg.org/#cors-protocol-exceptions
        if (method === "OPTIONS") {
            const pref = (config.forwardPreflights ? next(req) : {
                status: 204,
                headers: { "content-length": 0 },
                body: []
            });
            pref.status = config.optionsSuccessStatus;
            pref.headers = Headers(pref.headers);
            generateHeaders(pref.headers, req);

            return pref;
        }

        // CORS is a client protection, not a server-side security mechanism!
        // If the preflight fails, a browser under attack will not be able to reach this point.
        // Though, clients not corresponding to the CORS protocol might land here and execute next().
        const res = next(req);
        res.headers = Headers(res.headers);
        generateHeaders(res.headers, req);

        return res;
    }
};
