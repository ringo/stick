var system = require("system");
var assert = require("assert");
var {Application} = require("../lib/stick");
var {text} = require("ringo/jsgi/response");

var mockRequest = function(method, path, opts) {
    opts || (opts = {});
    return {
        "method": method || "GET",
        "pathInfo": path || "/",
        "env": opts.env || {},
        "headers": opts.headers || {},
        "cookies": opts.cookies || {},
        "postParams": opts.postParams || {},
        "queryParams": opts.queryParams || {}
    };
};

var mockSession = function(data) {
    return {
        "servletRequest": {
            "getSession": function() {
                return {
                    "getAttribute": function(name) {
                        if (data.hasOwnProperty(name)) {
                            return data[name];
                        }
                        return null;
                    },
                    "setAttribute": function(name, value) {
                        data[name] = value;
                    }
                };
            }
        }
    };
};

exports.testSession = function() {
    var app = new Application();
    app.configure("session", "csrf", "route");
    app.get("/", function(req) {
        return text(req.getCsrfToken());
    });
    app.get("/rotate", function(req) {
        return text(req.rotateCsrfToken())
    });
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });

    var sessionData = {};

    // validate that CSRF token is created and stored in session
    var response = app(mockRequest("GET", "/", {
        "env": mockSession(sessionData)
    }));
    assert.strictEqual(response.body[0], sessionData.csrfToken);
    assert.strictEqual(sessionData.csrfToken.length, 32);
    // make sure no token cookie is set
    assert.isUndefined(response.headers["Set-Cookie"]);

    // manually rotate token
    var prevToken = response.body[0];
    response = app(mockRequest("GET", "/rotate", {
        "env": mockSession(sessionData)
    }));
    assert.isFalse(response.body[0] === prevToken);
    assert.strictEqual(response.body[0], sessionData.csrfToken);

    // failed CSRF validation (post parameter doesn't match the session csrf token)
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockSession(sessionData)
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "postParams": {"csrftoken": "invalid"}
    })).status, 403);

    // successful POST request
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "postParams": {"csrftoken": sessionData.csrfToken}
    })).status, 200);
    // with token submitted as query parameter
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "queryParams": {"csrftoken": sessionData.csrfToken}
    })).status, 200);
    // with token submitted as custom header field
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "headers": {"x-csrf-token": sessionData.csrfToken}
    })).status, 200);

    // switch on token rotation
    app.csrf({
        "rotate": true
    });
    response = app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "postParams": {"csrftoken": sessionData.csrfToken}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] === sessionData.csrfToken);

    // test getToken option
    app.csrf({
        "rotate": false,
        "getToken": function(req) {
            return req.headers["x-xcrf-token"];
        }
    });
    response = app(mockRequest("POST", "/", {
        "env": mockSession(sessionData),
        "headers": {"x-xcrf-token": sessionData.csrfToken}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] === sessionData.csrfToken);

    // test tokenLength option
    app.csrf({
        "tokenLength": 64
    });
    app(mockRequest("GET", "/", {
        "env": mockSession(sessionData = {})
    }));
    assert.strictEqual(sessionData.csrfToken.length, 64);
};

exports.testCookie = function() {
    var app = new Application();
    app.configure("csrf", "route");
    app.csrf({
        "useCookie": true
    });
    app.get("/", function(req) {
        return text(req.getCsrfToken());
    });
    app.get("/rotate", function(req) {
        return text(req.rotateCsrfToken())
    });
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });

    // validate that cookie containing the CSRF token is set
    var response = app(mockRequest("GET"));
    var token = response.body[0];
    var cookieHeader = response.headers["Set-Cookie"];
    assert.isNotUndefined(cookieHeader);
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);
    assert.isTrue(/httpOnly/i.test(cookieHeader));
    assert.strictEqual(response.headers["Vary"], "Cookie");

    // cookie is not set if it's sent with the request
    response = app(mockRequest("GET", "/", {
        "cookies": {"csrftoken": token}
    }));
    assert.isUndefined(response.headers["Set-Cookie"]);
    assert.strictEqual(response.body[0], token);

    // but it is if the request handler calls rotateCsrfToken
    response = app(mockRequest("GET", "/rotate", {
        "cookies": {"csrftoken": token}
    }));
    assert.isFalse(response.body[0] === token);
    token = response.body[0];
    cookieHeader = response.headers["Set-Cookie"];
    assert.isNotUndefined(cookieHeader);
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);

    // failed CSRF validation (cookie value and post parameter must be equal)
    assert.strictEqual(app(mockRequest("POST")).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": token}
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "postParams": {"csrftoken": token}
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": "invalid"},
        "postParams": {"csrftoken": token}
    })).status, 403);

    // successful POST request
    assert.strictEqual(app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": token},
        "postParams": {"csrftoken": token}
    })).status, 200);
    // with token submitted as query parameter
    assert.strictEqual(app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": token},
        "queryParams": {"csrftoken": token}
    })).status, 200);
    // with token submitted as custom header field
    assert.strictEqual(app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": token},
        "headers": {"x-csrf-token": token}
    })).status, 200);

    // switch on token rotation
    app.csrf({
        "rotate": true
    });
    response = app(mockRequest("POST", "/", {
        "cookies": {"csrftoken": token},
        "postParams": {"csrftoken": token}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] !== token);
    token = response.body[0];
    cookieHeader = response.headers["Set-Cookie"];
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);

    // cookie options
    app.csrf({
        "rotate": false,
        "cookieName": "token",
        "cookieHttpOnly": false,
        "cookieSecure": true
    });
    response = app(mockRequest("GET", "/"));
    token = response.body[0];
    cookieHeader = response.headers["Set-Cookie"];
    assert.strictEqual(cookieHeader.indexOf("token=" + token), 0);
    assert.isFalse(/httpOnly/i.test(cookieHeader));
    assert.isTrue(/secure/i.test(cookieHeader));
};

if (require.main == module.id) {
    system.exit(require("test").run.apply(null,
            [exports].concat(system.args.slice(1))));
}
