var system = require("system");
var assert = require("assert");
var io = require("io");
var binary = require("binary");
var response = require("ringo/jsgi/response");

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
    const app = new Application();
    app.configure(params, route);

    app.post("/good", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, { foo: "bar" });
        return response.ok().json(req.postParams);
    });

    app.post("/bad", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;
        return response.ok().json({});
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"foo\": \"bar\"}", "UTF-8"))
    }));

    let res = app(mockRequest("POST", "/bad", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{foo: \"bar\"}", "UTF-8"))
    }));

    // Check for Bad Request
    assert.strictEqual(res.status, 400);

    // Check the reviver support
    app.params({
        reviver: function(key, val) {
            if (typeof val === "number") {
                return val * 3
            }

            return val;
        }
    });

    app.post("/reviver", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, { "num": 3, "str": "foobar" });
        return response.ok().json(req.postParams);
    });

    res = app(mockRequest("POST", "/reviver", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"num\": 1, \"str\": \"foobar\" }", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);
};

exports.testStrictJSONParsing = function() {
    const app = new Application();
    app.configure(params, route);

    app.post("/tester", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        return response.ok().json();
    });

    let res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             {\"foo\": \"bar\"}   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             []   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             [[[1], 2], 3]   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("[[[1], 2], 3]", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{}", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             123   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("123", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("false", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    app.params({
        strict: false
    });

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             {\"foo\": \"bar\"}   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             []   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             [[[1], 2], 3]   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("[[[1], 2], 3]", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{}", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("                             123   ", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("123", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    res = app(mockRequest("POST", "/tester", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("false", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);
};

exports.testParameterParsingLimit = function() {
    const app = new Application();
    app.configure(params, route);

    app.params({
        limit: 13
    });

    app.post("/good", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, { foo: "bar" });

        return response.ok().json({});
    });

    let res = app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"foo\": \"bar\"}", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    app.params({
        limit: 14
    });

    res = app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"foo\": \"bar\"}", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    app.post("/postparams", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, {
            "Name": "Jonathan Doe",
            "Age": "23",
            "Formula": "a + b == 13%!"
        });
        return response.ok().json({});
    });

    app.params({
        limit: 55
    });

    res = app(mockRequest("POST", "/postparams", {
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "content-length": "56"
        },
        input: new io.MemoryStream(new binary.ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"))
    }));
    assert.strictEqual(res.status, 400);

    app.params({
        limit: 56
    });

    res = app(mockRequest("POST", "/postparams", {
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "content-length": "56"
        },
        input: new io.MemoryStream(new binary.ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);

    app.params({
        limit: -1
    });

    res = app(mockRequest("POST", "/postparams", {
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "content-length": "56"
        },
        input: new io.MemoryStream(new binary.ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"))
    }));
    assert.strictEqual(res.status, 200);
};

exports.testPostParamsParsing = function() {
    const app = new Application();
    app.configure(params, route);

    app.post("/good", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, {
            "Name": "Jonathan Doe",
            "Age": "23",
            "Formula": "a + b == 13%!"
        });
        return response.ok().json({});
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/x-www-form-urlencoded",
            "content-length": "56"
        },
        input: new io.MemoryStream(new binary.ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"))
    }));
};


if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
