const system = require("system");
const assert = require("assert");

const {Application} = require("../../lib/stick");

exports.testBasicAuth401 = function() {
    const {text} = require("ringo/jsgi/response");
    const app = new Application();

    app.configure("basicauth", "route");

    app.get("/", function() { return text("ok"); } );
    app.get("/protected/:route?", function(req, route) {
        if (route) {
            assert.equal(route, "foobar", "Route should be foobar");
        }
        return text("ok");
    });
    app.get("/public", function() { return text("ok"); } );
    app.get("/public/protected-md5", function() { return text("ok"); } );
    app.get("/public/protected-sha256", function() { return text("ok"); } );

    // helper function to build a request object
    const buildRequest = function(headers, path) {
        return {
            method: "GET",
            headers: headers || {},
            env: {},
            scriptName: "/",
            pathInfo: path || "/"
        };
    };

    // Content characteristic not available - app wide
    app.basicauth("/protected/", "admin", "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
    app.basicauth("/public/protected-md5", "admin", "5f4dcc3b5aa765d61d8327deb882cf99", "MD5");
    app.basicauth("/public/protected-sha256", "admin", "6b3a55e0261b0304143f805a24924d0c1c44524821305f31d9277843b8a10f4e", "SHA-256");

    let response = app(buildRequest({}, "/public/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({}, "/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({}, "/protected/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({}, "/protected/foobar"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({}, "/public/protected-md5"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({}, "/public/protected-md5/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({}, "/public/protected-sha256"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({}, "/public/protected-sha256/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");
};

exports.testBasicAuthCorrectCredentials = function() {
    const {text, html} = require("ringo/jsgi/response");
    const app = new Application();

    app.configure("basicauth", "route");

    app.get("/", function() { return text("ok"); } );
    app.get("/protected/:route?", function(req, route) {
        if (route) {
            assert.equal(route, "foobar", "Route should be foobar");
        }
        return text("ok");
    });
    app.get("/public", function() { return text("ok"); } );
    app.get("/public/protected-md5", function() { return text("ok"); } );
    app.get("/public/protected-sha256", function() { return text("ok"); } );

    // helper function to build a request object
    const buildRequest = function(headers, path) {
        return {
            method: "GET",
            headers: headers || {},
            env: {},
            scriptName: "/",
            pathInfo: path || "/"
        };
    };

    // Content characteristic not available - app wide
    app.basicauth("/protected/", "admin", "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
    app.basicauth("/public/protected-md5", "admin", "5f4dcc3b5aa765d61d8327deb882cf99", "MD5");
    app.basicauth("/public/protected-sha256", "admin", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "SHA-256");

    let response = app(buildRequest({}, "/public/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({}, "/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/protected/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/protected/foobar"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/public/protected-md5"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/public/protected-md5/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/public/protected-sha256"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic YWRtaW46cGFzc3dvcmQ=" }, "/public/protected-sha256/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");
};

exports.testBasicAuthWrongCredentials = function() {
    const {text, html} = require("ringo/jsgi/response");
    const app = new Application();

    app.configure("basicauth", "route");

    app.get("/", function() { return text("ok"); } );
    app.get("/protected/:route?", function(req, route) {
        if (route) {
            assert.equal(route, "foobar", "Route should be foobar");
        }
        return text("ok");
    });
    app.get("/public", function() { return text("ok"); } );
    app.get("/public/protected-md5", function() { return text("ok"); } );
    app.get("/public/protected-sha256", function() { return text("ok"); } );

    // helper function to build a request object
    const buildRequest = function(headers, path) {
        return {
            method: "GET",
            headers: headers || {},
            env: {},
            scriptName: "/",
            pathInfo: path || "/"
        };
    };

    // Content characteristic not available - app wide
    app.basicauth("/protected/", "admin", "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
    app.basicauth("/public/protected-md5", "admin", "5f4dcc3b5aa765d61d8327deb882cf99", "MD5");
    app.basicauth("/public/protected-sha256", "admin", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "SHA-256");

    let response = app(buildRequest({}, "/public/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({}, "/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/protected/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/protected/foobar"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/public/protected-md5"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/public/protected-md5/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/public/protected-sha256"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/public/protected-sha256/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");
};

exports.testBasicAuthWrongBase64 = function() {
    const {text, html} = require("ringo/jsgi/response");
    const app = new Application();

    app.configure("basicauth", "route");

    app.get("/", function() { return text("ok"); } );
    app.get("/protected/:route?", function(req, route) {
        if (route) {
            assert.equal(route, "foobar", "Route should be foobar");
        }
        return text("ok");
    });
    app.get("/public", function() { return text("ok"); } );
    app.get("/public/protected-md5", function() { return text("ok"); } );
    app.get("/public/protected-sha256", function() { return text("ok"); } );

    // helper function to build a request object
    const buildRequest = function(headers, path) {
        return {
            method: "GET",
            headers: headers || {},
            env: {},
            scriptName: "/",
            pathInfo: path || "/"
        };
    };

    // Content characteristic not available - app wide
    app.basicauth("/protected/", "admin", "5baa61e4c9b93f3f0682250b6cf8331b7ee68fd8");
    app.basicauth("/public/protected-md5", "admin", "5f4dcc3b5aa765d61d8327deb882cf99", "MD5");
    app.basicauth("/public/protected-sha256", "admin", "5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8", "SHA-256");

    let response = app(buildRequest({}, "/public/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({}, "/"));
    assert.equal(response.status, 200);
    assert.equal(response.body, "ok");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE==" }, "/protected/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE=" }, "/protected/foobar"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic UEFTU1dPUkxE" }, "/public/protected-md5"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic aslkdjfaslökdfjaslkjfaslkjf" }, "/public/protected-md5/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "" }, "/public/protected-sha256"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");

    response = app(buildRequest({ "authorization": "Basic " }, "/public/protected-sha256/"));
    assert.equal(response.status, 401);
    assert.equal(response.headers["www-authenticate"], "Basic realm=\"Secure Area\"");
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
