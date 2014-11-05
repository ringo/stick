var system = require("system");
var assert = require("assert");
var io = require("io");
var binary = require("binary");

var {Application} = require("../../lib/stick");
var {route,params} = require("../../lib/middleware");

var mockRequest = exports.mockRequest = function(method, path, opts) {
    return {
        "method": method || "GET",
        "host": opts.host || "localhost",
        "port": opts.port || 80,
        "scheme": opts.scheme || "http",
        "pathInfo": path || "/",
        "env": opts.env || {
            servletRequest: {
                getCharacterEncoding: function() { return "UTF-8"; }
            }
        },
        "headers": opts.headers || {},
        "input": opts.input || new io.MemoryStream(new binary.ByteString(""))
    };
};

exports.testJSONParsing = function() {
    var app = new Application();
    app.configure(params, route);

    app.post("/", function (req) {
        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, { foo: "bar" });
    });

    app(mockRequest("POST", "/", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"foo\": \"bar\"}", "UTF-8"))
    }));
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}