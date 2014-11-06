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

    app.post("/good", function (req) {
        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, { foo: "bar" });
    });

    app.post("/bad", function (req) {
        // Try to access post params
        req.postParams;
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"foo\": \"bar\"}", "UTF-8"))
    }));

    var response = app(mockRequest("POST", "/bad", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{foo: \"bar\"}", "UTF-8"))
    }));

    // Check for Bad Request
    assert.strictEqual(response.status, 400);
};

exports.testPostParamsParsing = function() {
    var app = new Application();
    app.configure(params, route);

    app.post("/good", function (req) {
        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, {
            "Name": "Jonathan Doe",
            "Age": "23",
            "Formula": "a + b == 13%!"
        });
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/x-www-form-urlencoded"
        },
        input: new io.MemoryStream(new binary.ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"))
    }));
};


if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}