/**
 * @fileoverview This module provides middleware to check if a
 * HTTP request accepts the possible response and makes content
 * negotiation more convenient.
 */
var strings = require("ringo/utils/strings");
var response = require("ringo/jsgi/response");

/**
 * This middleware installs a `accept` function in the application object.
 * If the client request does not accept one of the specified content types,
 * the middleware returns a `406 - Not Acceptable` response.
 * 
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 * 
 * @example
 * app.configure("accept");
 * app.accept(["text/html', 'application/xhtml+xml"]);
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
            var acceptedTypes = req.headers["accept"].split(",").map(function(type) {
                type = type.trim();
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

            if (!accepted) {
                var available = availableCharacteristics.map(function(type) {
                    return type.join("/");
                }).join("; ");
                return response.setStatus(406).text("Not Acceptable. Available entity content characteristics: " + available);
            };
        }

        return next(req);
    };

};