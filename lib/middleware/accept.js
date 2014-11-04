/**
 * @fileoverview This module provides middleware to check if a
 * HTTP request accepts the possible response and makes content
 * negotiation more convenient.
 */
var strings = require("ringo/utils/strings");
var response = require("ringo/jsgi/response");


// secure float parser
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat
var filterFloat = function (value) {
    if (/^([0-9]+(\.[0-9]+)?)$/.test(value)) {
        return Number(value);
    } else {
        return NaN;
    }
};

/**
 * This middleware installs a `accept` function in the application object.
 * If the client request does not accept one of the specified content types,
 * the middleware returns a `406 - Not Acceptable` response.
 *
 * Applying this middleware adds an `accepted` property to the request object.
 * This contains an array with the client's accepted media types sorted
 * from highest to the lowest quality.
 * 
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 * 
 * @example
 * app.configure("accept", "route");
 * app.accept(["text/plain", "text/html"]);
 * app.get("/", function(req) {
 *    if (req.accepted[0].subType === "html") {
 *       return response.html("<!doctype html>");
 *    } else {
 *       return response.text("foo");    
 *    }
 * });
 */
exports.middleware = function accept(next, app) {

    var availableCharacteristics = [];

    app.accept = function(types) {
        availableCharacteristics = (typeof types === "string" ? [types] : types).map(function(type) {
            return type.split("/");
        });
    };

    // checks if the candidate type is accepted by type
    var typeAccepted = function(candidate, type) {
        return (candidate[0] === type[0] || "*" === candidate[0] || "*" === type[0]) &&
            (candidate[1] === type[1] || "*" === candidate[1] || "*" === type[1]);
    };

    return function accept(req) {
        if (req.headers["accept"]) {
            var acceptedTypes = req.headers["accept"].split(/ *, */).map(function(type) {
                // drops the preference ';q='
                var index = type.indexOf(";");
                return (index < 0 ? type : type.substring(0, index)).split("/");
            });

            var accepted = false;
            search:
            for (var i = 0; i < acceptedTypes.length; i++) {
                if (acceptedTypes[i].length !== 2 || acceptedTypes[i][0].length == 0 || acceptedTypes[i][1].length == 0) {
                    return response.bad();
                }

                for (var u = 0; u < availableCharacteristics.length; u++) {
                    if (typeAccepted(acceptedTypes[i], availableCharacteristics[u])) {
                        accepted = true;
                        break search;
                    }
                }
            }

            if (accepted) {
                Object.defineProperty(req, "accepted", {
                    configurable: false,
                    writeable: false,
                    value: (function(headerValue) {
                        return headerValue.split(/ *, */).map(function(type) {
                            var acceptRange = {};

                            var parameters = type.split(/ *; */);
                            var mediaRange = parameters[0].split("/");
                            acceptRange["mimeType"] = parameters[0];
                            acceptRange["type"]     = mediaRange[0];
                            acceptRange["subType"]  = mediaRange[1];
                            parameters.slice(1).forEach(function(param) {
                                var tokens = param.split(/ *= */);
                                if (tokens.length == 2) {
                                    acceptRange[tokens[0]] = (tokens[0] === "q" ? filterFloat(tokens[1]) : tokens[1]);
                                }
                            });

                            // if q is absent
                            if (acceptRange["q"] === undefined) {
                                acceptRange["q"] = 1;
                            }

                            return acceptRange;
                        }).sort(function(a, b) {
                            return b["q"] - a["q"];
                        });
                    })(req.headers["accept"])
                });
            } else {
                var available = availableCharacteristics.map(function(type) {
                    return type.join("/");
                }).join(", ");
                return response.setStatus(406).text("Not Acceptable. Available entity content characteristics: " + available);
            }
        }

        return next(req);
    };

};