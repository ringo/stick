
var {isFileUpload, parseFileUpload, BufferFactory} = require("ringo/webapp/fileupload");

exports.middleware = function upload(next, app) {

    app.upload = {
        impl: BufferFactory
    };

    return function upload(req) {

        var postParams, desc = Object.getOwnPropertyDescriptor(req, "postParams");

        /**
         * An object containing the parsed HTTP POST parameters sent with this request.
         * @name Request.instance.postParams
         */
        Object.defineProperty(req, "postParams", {
            get: function() {
                if (!postParams) {
                    var contentType = req.env.servletRequest.getContentType();
                    if ((req.method === "POST" || req.method === "PUT")
                            && isFileUpload(contentType)) {
                        postParams = {};
                        var encoding = req.env.servletRequest.getCharacterEncoding();
                        parseFileUpload(this, postParams, encoding);
                    } else if (desc) {
                        postParams = desc.get ? desc.get.apply(req) : desc.value;
                    }
                }
                return postParams;
            }, configurable: true
        });

        return next(req);
    };

};