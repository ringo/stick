var {Response} = require("ringo/webapp/response");

exports.app = function(req) {
    return Response.skin(module.resolve('skins/logging.txt'), {
        title: "Logging &amp; Profiling"
    });
};