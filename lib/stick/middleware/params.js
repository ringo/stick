
var {isFileUpload, parseFileUpload, BufferFactory} = require("ringo/webapp/fileupload");
var {isUrlEncoded, parseParameters} = require("ringo/webapp/parameters");
var objects = require("ringo/utils/objects");

exports.middleware = function params(next, app) {

    return function upload(req) {

        var params, queryParams, postParams,
            desc = Object.getOwnPropertyDescriptor(req, "postParams");


        /**
         * An object containing the parsed HTTP parameters sent with this request.
         * @name Request.instance.params
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
         * @name Request.instance.queryParams
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
         * @name Request.instance.postParams
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