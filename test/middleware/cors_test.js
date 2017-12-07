const system = require("system");
const assert = require("assert");

const {Application} = require("../../lib/stick");
const {route} = require("../../lib/middleware");

exports.testSimpleCors = function() {
    const {text} = require('ringo/jsgi/response');
    const app = new Application();
    app.configure('cors', 'route');
    app.cors({
        allowOrigin: ['http://example.com'],
        exposeHeaders: ['X-FooBar'],
    });
    const responseBody = 'ok';
    app.get('/', function() { return text(responseBody)});

    // no origin
    let response = app({
        method: 'GET',
        headers: {},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);
    assert.equal(response.body[0], responseBody);

    // invalid origin
    response = app({
        method: 'GET',
        headers: {origin: 'http://example2.com'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);
    assert.equal(response.body[0], responseBody);

    // valid origin
    response = app({
        method: 'GET',
        headers: {origin: 'http://example.com'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.body, responseBody);

    // case sensitive (!)
    response = app({
        method: 'GET',
        headers: {origin: 'http://exAmpLe.Com'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);
    // the actual response *is* sent. The client decides whether to
    // hand the data to the request depending on the Allow-Origin header.
    assert.equal(response.body, responseBody);

    // allow all
    app.cors({
        allowOrigin: ['*']
    });
    response = app({
        method: 'GET',
        headers: {origin: 'http://example.com'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(response.headers['access-control-expose-headers'], 'X-FooBar');
    assert.equal(response.body, responseBody);
};

exports.testPreflightCors = function() {
    const {text} = require('ringo/jsgi/response');
    const app = new Application();
    app.configure('cors', 'route');
    app.cors({
        allowOrigin: ['http://example.com'],
        allowMethods: ['POST'],
        allowHeaders: ['X-FooBar'],
        maxAge: 1728000
    });

    // no origin
    let response;

    assert.throws(function() {
        app({
            method: 'OPTIONS',
            headers: {'access-control-request-method': 'POST'},
            env: {},
            pathInfo: '/'
        });
    });

    // invalid origin
    response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example2.com', 'access-control-request-method': 'POST'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);

    // invalid method
    response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example.com', 'access-control-request-method': 'DELETE'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-methods'], 'POST');

    // valid preflight
    response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example.com', 'access-control-request-method': 'POST'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-methods'], 'POST');

    // invalid custom header
    response = app({
        method: 'OPTIONS',
        headers: {
            origin: 'http://example.com',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'X-NotFooBar',
        },
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-headers'], 'X-FooBar');

    // valid custom header
    response = app({
        method: 'OPTIONS',
        headers: {
            origin: 'http://example.com',
            'access-control-request-method': 'POST',
            'access-control-request-headers': 'X-FooBar',
        },
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-headers'], 'X-FooBar');
    assert.equal(response.headers['access-control-max-age'], '1728000');
};

exports.testSimpleGetHead = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        allowMethods: ["GET"]
    });

    app.get("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.isUndefined(response.headers["access-control-allow-credentials"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "HEAD",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.isUndefined(response.headers["access-control-allow-credentials"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");
};

exports.testSimplePost = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        allowMethods: ["POST"]
    });

    app.post("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "POST",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");
};

exports.testBadOrigin = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        allowMethods: ["POST"]
    });

    app.post("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "POST",
        headers: {
            "origin": "https://bad.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // this is the important part
    assert.isUndefined(response.headers["access-control-allow-origin"]);

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");
};

exports.testPreflightsAndPessimisticVary = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"]
    });

    app.post("/", function () {
            return text("okay").setStatus(201);
        }
    );

    //
    // STEP 1
    //
    // non-cors request => only set vary
    let response = app({
        method: "POST",
        headers: {
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.isUndefined(response.headers["access-control-allow-origin"]); // <-- this is the important part
    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");
    assert.equal(response.status, 201);

    //
    // STEP 2
    //
    // cors request ==> simulate preflight with bad origin
    response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://bad.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // the combination of these four assertions tell us it's a preflight handled by the middleware
    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
    assert.equal(response.status, 204);

    //
    // STEP 3
    //
    // cors request ==> simulate preflight with good origin
    response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // the combination of these four assertions tell us it's a preflight handled by the middleware
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
    assert.equal(response.status, 204);
};

exports.testPassthroughPreflights = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        passthroughPreflights: true
    });

    let workCounter = 0;
    app.options("/", function () {
        workCounter ++;
        return text("options done").setStatus(234);
    });

    let response = app({
        method: "OPTIONS",
        headers: {
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "options done");
    assert.equal(workCounter, 1);
    assert.equal(response.status, 234);

    response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "options done");
    assert.equal(workCounter, 2);
    assert.equal(response.status, 204);
};

exports.testStopPreflights = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        passthroughPreflights: false
    });

    let workCounter = 0;
    app.options("/", function () {
        workCounter ++;
        return text("options done").setStatus(222);
    });

    let response = app({
        method: "OPTIONS",
        headers: {
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // since this request is NO preflight => middleware forwards the request
    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(workCounter, 1);
    assert.equal(response.status, 222);

    response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(workCounter, 1);
    assert.equal(response.status, 204);
};

exports.testPreflightStatus = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        optionsSuccessStatus: 200
    });

    app.post("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://bad.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // the combination of these four assertions tell us it's a preflight handled by the middleware
    assert.equal(response.status, 200);
    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
};

exports.testExposeHeaders = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        exposeHeaders: ["x-foo", "x-bar"]
    });

    app.post("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // the combination of these four assertions tell us it's a preflight handled by the middleware
    assert.equal(response.status, 204);
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.isTrue(
        response.headers["access-control-expose-headers"] === "x-foo, x-bar" ||
        response.headers["access-control-expose-headers"] === "x-bar, x-foo"
    );
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
};

exports.testExposeHeaders = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        exposeHeaders: ["x-foo", "x-bar"]
    });

    app.post("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // the combination of these four assertions tell us it's a preflight handled by the middleware
    assert.equal(response.status, 204);
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.isTrue(
        response.headers["access-control-expose-headers"] === "x-foo, x-bar" ||
        response.headers["access-control-expose-headers"] === "x-bar, x-foo"
    );
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
};

exports.testAllowCredentials = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        allowCredentials: true
    });

    app.get("/", function () {
            return text("okay");
        }
    );

    let response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "HEAD",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "OPTIONS",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.isUndefined(response.headers["content-type"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body.length, 0);
};

exports.testFlexibleOrigins = function() {
    const {text} = require("ringo/jsgi/response");

    //
    // Step 1: single String
    //
    let app = new Application();
    app.configure("cors", "route");
    app.get("/", function () { return text("okay"); });
    app.cors({
        allowOrigin: "https://example.com"
    });

    let response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "http://example.com:8080",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    // origin mismatch => browser would reject the response
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    //
    // Step 2: array of strings
    //
    app = new Application();
    app.configure("cors", "route");
    app.get("/", function () { return text("okay"); });
    app.cors({
        allowOrigin: ["https://www1.example.com", "https://www2.example.com"]
    });

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www1.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://www1.example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www2.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://www2.example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    //
    // Step 3: RegExp
    //
    app = new Application();
    app.configure("cors", "route");
    app.get("/", function () { return text("okay"); });
    app.cors({
        allowOrigin: /https:\/\/www[12]\.example\.com/
    });

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www1.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://www1.example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www2.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "https://www2.example.com");
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www3.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.isUndefined(response.headers["access-control-allow-origin"]);
    assert.equal(response.headers["vary"], "Origin");
    assert.equal(response.body, "okay");

    //
    // Step 4: Star
    //
    app = new Application();
    app.configure("cors", "route");
    app.get("/", function () { return text("okay"); });
    app.cors({
        allowOrigin: "*"
    });

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www1.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.isUndefined(response.headers["vary"]);
    assert.equal(response.body, "okay");

    app.cors({
        allowOrigin: ["*"]
    });

    response = app({
        method: "GET",
        headers: {
            "origin": "https://www1.example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["access-control-allow-origin"], "*");
    assert.isUndefined(response.headers["vary"]);
    assert.equal(response.body, "okay");
};

exports.testAppendVaryOrigin = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();
    app.configure("cors", "route");
    app.cors({
        allowOrigin: ["https://example.com"],
        allowCredentials: true
    });

    app.get("/", function () {
            return text("okay").addHeaders({
                "vary": "User-Agent, Accept-Encoding"
            });
        }
    );

    let response = app({
        method: "GET",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });

    assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
    assert.equal(response.headers["access-control-allow-origin"], "https://example.com");
    assert.equal(response.headers["access-control-allow-credentials"], "true");
    assert.equal(response.headers["vary"], "User-Agent, Accept-Encoding, Origin");
    assert.equal(response.body, "okay");

    response = app({
        method: "HEAD",
        headers: {
            "origin": "https://example.com",
            "content-type": "text/plain"
        },
        env: {},
        pathInfo: "/"
    });
};

if (require.main === module) {
    system.exit(require("test").run(module.id));
}
