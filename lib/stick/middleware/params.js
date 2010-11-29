/**
 * @fileoverview This module provides middleware for parsing
 * HTTP parameters from the query string and request body.
 *
 * It does not parse multipart MIME data such as file uploads which are handled
 * by the [upload] module.
 */
var {isFileUpload, parseFileUpload, BufferFactory} = require("ringo/webapp/fileupload");
var {isUrlEncoded, parseParameters} = require("ringo/webapp/parameters");
var objects = require("ringo/utils/objects");

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

    return function upload(req) {

        var params, queryParams, postParams,
            desc = Object.getOwnPropertyDescriptor(req, "postParams");


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
            }, configurable: true
        });

        /**
         * An object containing the parsed HTTP query string parameters sent with this request.
         * @name request.queryParams
         */
        Object.defineProperty(req, "queryParams", {
            get: function() {
                if (!queryParams) {
                    queryParams = {};
                    var encoding = req.env.servletRequest.getCharacterEncoding();
                    parseParameters(this.queryString, queryParams, encoding);
                }
                return queryParams;
            }, configurable: true
        });

        /**
         * An object containing the parsed HTTP POST parameters sent with this request.
         * @name request.postParams
         */
        Object.defineProperty(req, "postParams", {
            get: function() {
                if (!postParams) {
                    var contentType = req.env.servletRequest.getContentType();
                    if (req.method === "POST" || req.method === "PUT") {
                        if (isUrlEncoded(contentType)) {
                            postParams = {};
                            var encoding = req.env.servletRequest.getCharacterEncoding();
                            parseParameters(this.input.read(), postParams, encoding);
                        } else if (contentType === "application/json") {
                            postParams = JSON.parse(this.input.read.decodeToString(encoding));
                        }
                    }
                    if (!postParams && desc) {
                        postParams = desc.get ? desc.get.apply(req) : desc.value;
                    }
                }
                return postParams;
            }, configurable: true
        });

        return next(req);
    };

};