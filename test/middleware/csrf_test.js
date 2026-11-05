const system = require("system");
const assert = require("assert");
const {Application} = require("../../lib/stick");
const {text} = require("ringo/jsgi/response");

const mockRequest = function(method, path, opts) {
    opts || (opts = {});
    return {
        "method": method || "GET",
        "host": opts.host || "localhost",
        "port": opts.port || 80,
        "scheme": opts.scheme || "http",
        "pathInfo": path || "/",
        "env": opts.env || {},
        "headers": opts.headers || {},
        "cookies": opts.cookies || {},
        "postParams": opts.postParams || {},
        "queryParams": opts.queryParams || {},
        "remoteAddress": opts.remoteAddress || ""
    };
};

const mockEnv = function(data, isSecure) {
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
            },
            "isSecure": function() {
                return isSecure === true;
            }
        }
    };
};

exports.testSession = function() {
    const app = new Application();
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

    let sessionData = {};

    // validate that CSRF token is created and stored in session
    let response = app(mockRequest("GET", "/", {
        "env": mockEnv(sessionData)
    }));
    assert.strictEqual(response.body[0], sessionData.csrfToken);
    assert.strictEqual(sessionData.csrfToken.length, 32);
    // make sure no token cookie is set
    assert.isUndefined(response.headers["set-cookie"]);

    // manually rotate token
    const prevToken = response.body[0];
    response = app(mockRequest("GET", "/rotate", {
        "env": mockEnv(sessionData)
    }));
    assert.isFalse(response.body[0] === prevToken);
    assert.strictEqual(response.body[0], sessionData.csrfToken);

    // failed CSRF validation (post parameter doesn't match the session csrf token)
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData)
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData),
        "postParams": {"csrftoken": "invalid"}
    })).status, 403);

    // successful POST request
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData),
        "postParams": {"csrftoken": sessionData.csrfToken}
    })).status, 200);
    // with token submitted as query parameter
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData),
        "queryParams": {"csrftoken": sessionData.csrfToken}
    })).status, 200);
    // with token submitted as custom header field
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData),
        "headers": {"x-csrf-token": sessionData.csrfToken}
    })).status, 200);

    // switch on token rotation
    app.csrf({
        "rotate": true
    });
    response = app(mockRequest("POST", "/", {
        "env": mockEnv(sessionData),
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
        "env": mockEnv(sessionData),
        "headers": {"x-xcrf-token": sessionData.csrfToken}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] === sessionData.csrfToken);

    // test tokenLength option
    app.csrf({
        "tokenLength": 64
    });
    app(mockRequest("GET", "/", {
        "env": mockEnv(sessionData = {})
    }));
    assert.strictEqual(sessionData.csrfToken.length, 64);
};

exports.testCookie = function() {
    const app = new Application();
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
    let response = app(mockRequest("GET"), "/", {
        "env": mockEnv()
    });
    let token = response.body[0];
    let cookieHeader = response.headers["set-cookie"];
    assert.isNotUndefined(cookieHeader);
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);
    assert.isTrue(/httpOnly/i.test(cookieHeader));
    assert.strictEqual(response.headers["vary"], "Cookie");

    // cookie is not set if it's sent with the request
    response = app(mockRequest("GET", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token}
    }));
    assert.isUndefined(response.headers["set-cookie"]);
    assert.strictEqual(response.body[0], token);

    // but it is if the request handler calls rotateCsrfToken
    response = app(mockRequest("GET", "/rotate", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token}
    }));
    assert.isFalse(response.body[0] === token);
    token = response.body[0];
    cookieHeader = response.headers["set-cookie"];
    assert.isNotUndefined(cookieHeader);
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);

    // failed CSRF validation (cookie value and post parameter must be equal)
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv()
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token}
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "postParams": {"csrftoken": token}
    })).status, 403);
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": "invalid"},
        "postParams": {"csrftoken": token}
    })).status, 403);

    // successful POST request
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token},
        "postParams": {"csrftoken": token}
    })).status, 200);
    // with token submitted as query parameter
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token},
        "queryParams": {"csrftoken": token}
    })).status, 200);
    // with token submitted as custom header field
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token},
        "headers": {"x-csrf-token": token}
    })).status, 200);

    // switch on token rotation
    app.csrf({
        "rotate": true
    });
    response = app(mockRequest("POST", "/", {
        "env": mockEnv(),
        "cookies": {"csrftoken": token},
        "postParams": {"csrftoken": token}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] !== token);
    token = response.body[0];
    cookieHeader = response.headers["set-cookie"];
    assert.strictEqual(cookieHeader.indexOf("csrftoken=" + token), 0);

    // cookie options
    app.csrf({
        "rotate": false,
        "cookieName": "token",
        "cookieHttpOnly": false,
        "cookieSecure": true
    });
    response = app(mockRequest("GET", "/", {
        "env": mockEnv()
    }));
    token = response.body[0];
    cookieHeader = response.headers["set-cookie"];
    assert.strictEqual(cookieHeader.indexOf("token=" + token), 0);
    assert.isFalse(/httpOnly/i.test(cookieHeader));
    assert.isTrue(/secure/i.test(cookieHeader));
};

exports.testIsSameOrigin = function() {
    const app = new Application();
    app.configure("session", "csrf", "route");
    app.get("/", function(req) {
        return text(req.getCsrfToken());
    });
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });
    const token = "testTokenStr"
    // no referrer checking if not https
    let response = app(mockRequest("POST", "/", {
        "env": mockEnv({"csrfToken": token}),
        "postParams": {"csrftoken": token}
    }));
    assert.strictEqual(response.status, 200);
    // reject if https request with missing referrer
    response = app(mockRequest("POST", "/", {
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token}
    }));
    assert.strictEqual(response.status, 403);
    response = app(mockRequest("POST", "/", {
        "scheme": "https",
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token},
        "remoteAddress": "http://localhost/test"
    }));
    assert.strictEqual(response.status, 403);
    response = app(mockRequest("POST", "/", {
        "scheme": "https",
        "host": "localhost",
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token},
        "remoteAddress": "https://ringojs.org/test"
    }));
    assert.strictEqual(response.status, 403);
    response = app(mockRequest("POST", "/", {
        "scheme": "https",
        "host": "localhost",
        "port": 443,
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token},
        "remoteAddress": "https://localhost:8080/test"
    }));
    assert.strictEqual(response.status, 403);
    // passes the referrer check
    response = app(mockRequest("POST", "/", {
        "scheme": "https",
        "host": "localhost",
        "port": 443,
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token},
        "remoteAddress": "https://localhost/test"
    }));
    assert.strictEqual(response.status, 200);

    // disable referrer checking
    app.csrf({
        "checkReferrer": false
    });
    response = app(mockRequest("POST", "/", {
        "scheme": "https",
        "host": "localhost",
        "port": 443,
        "env": mockEnv({"csrfToken": token}, true),
        "postParams": {"csrftoken": token},
        "remoteAddress": "http://localhost/test"
    }));
    assert.strictEqual(response.status, 200);
};

exports.testGetFailureResponse = function() {
    const app = new Application();
    app.configure("session", "csrf", "route");
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });
    assert.strictEqual(app(mockRequest("POST", "/", {
        "env": mockEnv({})
    })).status, 403);
    app.csrf({
        "getFailureResponse": function() {
            return false;
        }
    });
    assert.isFalse(app(mockRequest("POST", "/", {
        "env": mockEnv({})
    })));
};

exports.testCustomSafeMethod = function() {
    const app = new Application();
    app.configure("session", "csrf", "route");
    app.get("/:name", function(req, name) {
        return text(req.getCsrfToken());
    });
    app.del("/", function(req) {
        return text(req.getCsrfToken());
    });
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });
    const token = "testTokenStr"
    
    app.csrf({
        "safeMethods": ["DELETE"],
        "isSafeRequest": function(req) {
            return req.pathInfo.indexOf("/safe") === 0;
        }
    });

    let response = app(mockRequest("GET", "/", {
        "env": mockEnv({"csrfToken": "foo"})
    }));
    assert.strictEqual(response.status, 403);   

    response = app(mockRequest("DELETE", "/", {
        "env": mockEnv({"csrfToken": "foo"})
    }));
    assert.strictEqual(response.status, 200);  

    response = app(mockRequest("GET", "/", {
        "env": mockEnv({"csrfToken": token})
    }));
    assert.strictEqual(response.status, 403); 

    response = app(mockRequest("GET", "/safe", {
        "env": mockEnv({"csrfToken": token})
    }));
    assert.strictEqual(response.status, 200); 
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
