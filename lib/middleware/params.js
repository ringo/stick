/**
 * @fileoverview This module provides middleware for parsing
 * HTTP parameters from the query string and request body. It does not parse
 * multipart MIME data such as file uploads which are handled by the [upload](../upload) module.
 *
 * This installs a `params()` method in the application that accepts a configuration object with
 * the following properties:
 *
 * <ul>
 *    <li><code>limit</code>: maximum length of the request body in bytes, -1 disables the limit, defaults to 100 KiB</li>
 *    <li><code>strict</code>: if true (default), only accept JSON following RFC 4627, otherwise also parse pseudo-JSON like <code>"1234"</code></li>
 *    <li><code>reviver</code>: optional function to transform the result JSON, see
 *    <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse#Example.3A_Using_the_reviver_parameter">JSON.parse(str,&nbsp;reviver)</a>
 *    for details</li>
 * </ul>
 *
 * @example const app = new Application();
 * app.configure("params", "route");
 * app.params({
 *   limit: 10,
 *   strict: true,
 *   reviver: function(key, val) {
 *     return (typeof val === "number") ? val * 2 : val;
 *   }
 * });
 *
 * app.post("/example-json", function (req) {
 *   // JSON requests will parsed into req.postParams
 *   const jsonObj = req.postParams;
 * };
 *
 * app.post("/example-form", function (req) {
 *   // submitted form params are parsed into req.postParams
 *   // for application/x-www-form-urlencoded requests
 *   const formFields = req.postParams;
 * };
 */
var {isUrlEncoded, parseParameters, mergeParameter} = require("ringo/utils/http");
var objects = require("ringo/utils/objects");
var strings = require("ringo/utils/strings");
var response = require("ringo/jsgi/response");

/**
 * Middleware for parsing HTTP parameters.
 * This module handles URL-endcoded form data transmitted in the query string
 * and request body as well as JSON encoded data in the request body.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function params(next, app) {
    // allow whitspace: Space, Horizontal tab, Line feed or New line, Carriage return
    // https://www.ietf.org/rfc/rfc4627.txt
    const startCharPattern = java.util.regex.Pattern.compile("^[\u0020\u0009\u000A\u000D]*[\\{\\[]");

    let config = {
        limit: 102400,
        reviver: null,
        strict: true
    };

    app.params = function(mwConfig) {
        config = objects.merge(mwConfig, config);
    };

    // Custom Error
    function ParamsParseException (message) {
        this.name = 'ParamsParseException';
        this.message = message;
        this.stack = (new Error()).stack;
    }

    return function(req) {

        var params, queryParams, postParams;
        var desc = Object.getOwnPropertyDescriptor(req, "postParams");
        var servletRequest = req.env.servletRequest;

        /**
         * An object containing the parsed HTTP parameters sent with this request.
         * @name request.params
         */
        Object.defineProperty(req, "params", {
            get: function() {
                if (!params) {
                    params = objects.merge(this.postParams, this.queryParams);
                }
                return params;
            }, configurable: true, enumerable: true
        });

        /**
         * An object containing the parsed HTTP query string parameters sent with this request.
         * @name request.queryParams
         */
        Object.defineProperty(req, "queryParams", {
            get: function() {
                if (!queryParams) {
                    queryParams = {};
                    var encoding = servletRequest.getCharacterEncoding() || "utf8";
                    parseParameters(this.queryString, queryParams, encoding);
                }
                return queryParams;
            }, configurable: true, enumerable: true
        });

        /**
         * An object containing the parsed HTTP POST parameters sent with this request.
         * If the content type of the request is <code>application/json</code>, the middleware
         * parses the body and stores the in <code>request.postParams</code>.
         * @name request.postParams
         */
        Object.defineProperty(req, "postParams", {
            get: function() {
                if (!postParams) {
                    var contentType = req.headers["content-type"];
                    if (req.method === "POST" || req.method === "PUT") {
                        var input;
                        var encoding = servletRequest.getCharacterEncoding() || "utf8";
                        if (isUrlEncoded(contentType)) {
                            // check if the body could be parsed inside the req.body limit
                            if (config.limit >= 0 && req.input.length > config.limit) {
                                throw new ParamsParseException("Maximum request body size exceeded!");
                            }

                            postParams = {};

                            input = req.input.read();
                            var contentLength = parseInt(req.headers["content-length"]);
                            if (!input.length && contentLength > 0) {
                                // Entity body already consumed, ask servlet API for params
                                // See ringo issues #70 and #130
                                var map = servletRequest.getParameterMap();
                                for (var entry in Iterator(map.entrySet())) {
                                    var {key, value} = entry;
                                    // value is a java string array
                                    for each (var val in value) {
                                        mergeParameter(postParams, key, val);
                                    }
                                }
                            } else {
                                parseParameters(input, postParams, encoding);
                            }
                        } else if (strings.startsWith(contentType, "application/json")) {
                            // check if the body could be parsed inside the req.body limit
                            if (config.limit >= 0 && req.input.length > config.limit) {
                                throw new ParamsParseException("Maximum request body size exceeded!");
                            }

                            input = req.input.read();

                            try {
                                const jsonStr = input.decodeToString(encoding);

                                // RFC 4627 by Crockford defines a JSON-text = object / array,
                                // so in strict mode all other values are not allowed.
                                if (config.strict !== false) {
                                    // check first character in strict mode
                                    const fcMatcher = startCharPattern.matcher(jsonStr);
                                    if (!fcMatcher.find()) {
                                        throw new ParamsParseException("JSON Parsing Error!");
                                    }
                                }

                                postParams = JSON.parse(jsonStr, config.reviver);
                            } catch (e) {
                                throw new ParamsParseException();
                            }
                        }
                    }
                    // query previous postParams property descriptor in case
                    // this is a file upload
                    if (!postParams && desc) {
                        postParams = desc.get ? desc.get.apply(req) : desc.value;
                    }
                }
                return postParams;
            }, configurable: true, enumerable: true
        });

        try {
            return next(req);
        } catch (e if e instanceof ParamsParseException) {
            return response.bad();
        }
    };

};
