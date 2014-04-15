var {Application} = require("../lib/stick");
var {mount,route} = require("../lib/middleware")
var assert = require("assert");


exports.xtestMiddleware = function() {
    function twice(next, app) {
        return function(req) {
            return next(req) + next(req)
        }
    }
    function uppercase(next, app) {
        return function(req) {
            return next(req.toUpperCase()).toUpperCase()
        }
    }
    function foobar(next, app) {
        return function(req) {
            return req === "FOO" ?
                "bar" : "unexpected req: " + req
        }
    }
    function append_(next, app) {
        return function(req) {
            return next(req) + "_"
        }
    }
    function _prepend(next, app) {
        return function(req) {
            return "_" + next(req)
        }
    }
    var app = new Application(foobar());
    app.configure(twice, uppercase);
    assert.equal(app("foo"), "BARBAR");
    app = new Application();
    app.configure(twice, uppercase, foobar);
    assert.equal(app("foo"), "BARBAR");
    var dev = app.env("development");
    dev.configure(twice);
    var prod = app.env("production");
    prod.configure(_prepend, append_);
    assert.equal(app("foo"), "BARBAR");
    assert.equal(dev("foo"), "BARBARBARBAR");
    assert.equal(prod("foo"), "_BARBAR_");
};

exports.xtestMount = function() {
    function testMount(app) {
        app.mount("/foo", function() { return "/foo" });
        app.mount({host: "foo.com"}, function() { return "foo.com" });
        app.mount({host: "bar.org", path: "/baz"}, function() { return "bar.org/baz" });
        assert.equal(app({headers: {host: "bar.com"}, env: {}, pathInfo: "/foo"}), "/foo");
        assert.equal(app({headers: {host: "foo.com"}, env: {}, pathInfo: "/foo"}), "/foo");
        assert.equal(app({headers: {host: "foo.com"}, env: {}, pathInfo: "/"}), "foo.com");
        assert.equal(app({headers: {host: "bar.org"}, env: {}, pathInfo: "/baz"}), "bar.org/baz");
        assert.throws(function() {
            app({headers: {host: "bing.org"}, env: {}, pathInfo: "/"});
        }, Error);
    }
    var app = new Application();
    app.configure(mount);
    testMount(app);
    // configuration via module name
    app = new Application();
    app.configure("mount");
    testMount(app);
};

/**
* The default behavior of mount.js middleware will issue a 303 redirect if the
* user enters a mount path which does not end with a slash on a GET request.
* The redirect returns the browser to the same path, but with a trailing slash.
* Not very nice for performance or style when using REST urls.
*/
exports.xtestMountRedirect = function() {
    var response;

    var app = new Application();
    app.configure(mount);

    app.mount("/", function() { return "root" });
    app.mount("/foo", function() { return "foo" });
    app.mount("/foo/bar", function() { return "foo/bar" });

    // These URLs should return a 303 response using the default URL treatment
    response = app({headers: {}, method: "GET", env: {}, scriptName: "", pathInfo: ""});
    assert.strictEqual(response.status, 303);
    assert.strictEqual(response.headers.Location, "/");
    response = app({headers: {}, method: "GET", env: {}, scriptName: "", pathInfo: "/foo"});
    assert.strictEqual(response.status, 303);
    assert.strictEqual(response.headers.Location, "/foo/");
    response = app({headers: {}, method: "GET", env: {}, scriptName: "", pathInfo: "/foo/bar"});
    assert.strictEqual(response.status, 303);
    assert.strictEqual(response.headers.Location, "/foo/bar/");
};

/**
* When using the mount command, the developer can choose to use REST-style URLs
* without a redirect and without a trailing slash on the end of the URL.
*/
exports.xtestMountNoRedirect = function() {
    var response;

    var app = new Application();
    app.configure(mount);

    app.mount("/", function() { return "root" }, true);
    app.mount("/foo", function() { return "foo" }, true);
    app.mount("/foo/bar", function() { return "foo/bar" }, true);

    // Using REST urls, these requests should return the expected content
    assert.equal(app({headers: {}, env: {}, method: "GET", pathInfo: ""}), "root");
    assert.equal(app({headers: {}, env: {}, method: "GET", pathInfo: "/foo"}), "foo");
    assert.equal(app({headers: {}, env: {}, method: "GET", pathInfo: "/foo/bar"}), "foo/bar");
};

exports.xtestMountSort = function() {
    var app = new Application();
    app.configure(mount);

    app.mount("/", function() { return "root" });
    app.mount("/foo", function() { return "foo" });
    app.mount("/foo/bar", function() { return "foo/bar" });

    assert.equal(app({headers: {host: "foo.com"}, env: {}, pathInfo: "/"}), "root");
    assert.equal(app({headers: {host: "foo.com"}, env: {}, pathInfo: "/foo"}), "foo");
    assert.equal(app({headers: {host: "foo.com"}, env: {}, pathInfo: "/foo/bar"}), "foo/bar");

    try {
        var response = app({headers: {host: "foo.com"}, env: {}, pathInfo: "/bars"});
        assert.fail('Expecting unhandled request');
    } catch(e) { }
};

/**
 * Test that makes sure the most 'literal' version of the URL is resolved instead of parameterized
 * version. ie /foo wins over /:param when url is /foo.
 */
exports.xtestRouteResolution = function() {
    function testPath(path, expected) {
        assert.equal(app({method: 'GET', headers: {host: "foo.com"}, env: {}, pathInfo: path}), expected);
    }

    var app = new Application();
    app.configure(route);

    app.get("/:param", function(req, p) { return '[' + p + ']' });
    app.get("/foo", function() { return "foo" });
    app.get("/bar/:param", function(req, p) { return 'bar/[' + p + ']'});
    app.get("/bar/foo", function() { return "bar/foo" });
    app.get("/baz/:param/qux", function(req, p) { return 'baz/[' + p + ']/qux'});
    app.get("/baz/123/qux", function() { return "baz/123/qux" });

    testPath("/foo", "foo");
    testPath("/abc", "[abc]");
    testPath("/bar/foo", "bar/foo");
    testPath("/bar/abc", "bar/[abc]");
    testPath("/baz/abc/qux", "baz/[abc]/qux");
    testPath("/baz/123/qux", "baz/123/qux");
};

/**
 * Test that makes sure the most 'literal' version of the URL is resolved instead of parameterized
 * version. ie /foo wins over /:param when url is /foo.
 */
exports.xtestMountAndRouteResolution = function() {
    function testPath(path, expected) {
        assert.equal(mountApp({method: 'GET', headers: {host: "foo.com"}, env: {}, pathInfo: path}), expected);
    }

    var app = new Application();
    app.configure(route);

    app.get("/:param", function(req, p) { return '[' + p + ']'});
    app.get("/foo", function() { return "foo" });
    app.get("/bar/foo", function() { return "bar/foo" });
    app.get("/bar/:param", function(req, p) { return 'bar/[' + p + ']'});
    app.get("/baz/:param/qux", function(req, p) { return 'baz/[' + p + ']/qux'});
    app.get("/baz/123/qux", function() { return "baz/123/qux" });

    var mountApp = new Application();
    mountApp.configure(mount);
    mountApp.mount("/test", app);

    testPath("/test/foo", "foo");
    testPath("/test/abc", "[abc]");
    testPath("/test/bar/foo", "bar/foo");
    testPath("/test/bar/abc", "bar/[abc]");
    testPath("/test/baz/abc/qux", "baz/[abc]/qux");
    testPath("/test/baz/123/qux", "baz/123/qux");
};

exports.xtestSimpleCors = function() {
   var {text} = require('ringo/jsgi/response');
   var app = new Application();
   app.configure('cors', 'route');
   app.cors({
      allowOrigin: ['http://example.com'],
      exposeHeaders: ['X-FooBar'],
   });
   var responseBody = 'ok';
   app.get('/', function() { return text(responseBody)});

   // no origin
   var response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin'])
   assert.equal(response.body[0], responseBody);

   // invalid origin
   var response = app({
      method: 'GET',
      headers: {origin: 'http://example2.com'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin'])
   assert.equal(response.body[0], responseBody);

   // valid origin
   var response = app({
      method: 'GET',
      headers: {origin: 'http://example.com'},
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.body, responseBody);

   // case sensitive (!)
   var response = app({
      method: 'GET',
      headers: {origin: 'http://exAmpLe.Com'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin']);
   // the actual response *is* sent. The client decides whether to
   // hand the data to the request depending on the Allow-Origin header.
   assert.equal(response.body, responseBody);

   // invalid configuration - can not have allowOrigin=* and allowCredentials
   assert.throws(function() {
      app.cors({
        allowOrigin: ['*'],
        allowCredentials: true
      })
   });

   // allow all
   app.cors({
      allowOrigin: ['*'],
      allowCredentials: false
   });
   var response = app({
      method: 'GET',
      headers: {origin: 'http://example.com'},
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Expose-Headers'], 'X-FooBar');
   assert.equal(response.body, responseBody);
};

exports.xtestPreflightCors = function() {
   var {text} = require('ringo/jsgi/response');
   var app = new Application();
   app.configure('cors', 'route');
   app.cors({
     allowOrigin: ['http://example.com'],
     allowMethods: ['POST'],
     allowHeaders: ['X-FooBar'],
     maxAge: 1728000,
     allowCredentials: true
   });
   var preflightResponseBody = 'preflight okay'
   app.options('/', function() {
    return text(preflightResponseBody)}
   );

   // no origin
   var response = app({
      method: 'OPTIONS',
      headers: {'access-control-request-method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin'])
   assert.equal(response.body[0], preflightResponseBody);

   // invalid origin
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example2.com', 'access-control-request-method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin']);
   // note again how the resource was indeed executed. a compliant
   // client would not have sent this request but stopped the CORS procedure
   // after the failed preflight request.
   assert.equal(response.body[0], preflightResponseBody);

   // invalid method
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example.com', 'access-control-request-method': 'DELETE'},
      env: {},
      pathInfo: '/'
   });
   assert.notEqual(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.body[0], preflightResponseBody);

   // valid preflight
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example.com', 'access-control-request-method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Allow-Methods'], 'POST');
   assert.equal(response.body[0], preflightResponseBody);

   // invalid custom header
   var response = app({
      method: 'OPTIONS',
      headers: {
         origin: 'http://example.com',
         'access-control-request-method': 'POST',
         'access-control-request-headers': 'X-NotFooBar',
      },
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Allow-Headers'], 'X-FooBar');
   assert.equal(response.body[0], preflightResponseBody);

   // valid custom header
   var response = app({
      method: 'OPTIONS',
      headers: {
         origin: 'http://example.com',
         'access-control-request-method': 'POST',
         'access-control-request-headers': 'X-FooBar',
      },
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Allow-Headers'], 'X-FooBar');
   assert.equal(response.headers['Access-Control-Max-Age'], '1728000');
   assert.equal(response.body[0], preflightResponseBody);
}

exports.testCsrf = function() {
    var {text} = require('ringo/jsgi/response');
    var app = new Application();
    app.configure('session', 'csrf', 'route');
    app.get("/", function(req) {
        return text(req.getCsrfToken());
    });
    app.get("/rotate", function(req) {
        return text(req.rotateCsrfToken())
    });
    app.post("/", function(req) {
        return text(req.getCsrfToken());
    });

    var mockSessionData = {};
    var mockSession = {
        "getAttribute": function(name) {
            if (mockSessionData.hasOwnProperty(name)) {
                return mockSessionData[name];
            }
            return null;
        },
        "setAttribute": function(name, value) {
            mockSessionData[name] = value;
        }
    };

    var createRequest = function(method, path, opts) {
        opts || (opts = {});
        return {
            "method": method || "GET",
            "pathInfo": path || "/",
            "env": {
                servletRequest: {
                    getSession: function() { return mockSession; }
                }
            },
            "headers": opts.headers || {},
            "postParams": opts.postParams || {},
            "queryParams": opts.queryParams || {}
        };
    };

    // validate that CSRF token is created and stored in session
    var response = app(createRequest("GET"));
    var token = response.body[0];
    assert.strictEqual(token, mockSessionData.csrfToken);

    // manually rotate token
    response = app(createRequest("GET", "/rotate"));
    assert.isFalse(response.body[0] === token);
    token = response.body[0];
    assert.strictEqual(token, mockSessionData.csrfToken);

    // failed CSRF validation (post parameter doesn't match the session csrf token)
    assert.strictEqual(app(createRequest("POST")).status, 403);
    assert.strictEqual(app(createRequest("POST", "/", {
        postParams: {"csrftoken": "invalid"}
    })).status, 403);

    // successful POST request
    assert.strictEqual(app(createRequest("POST", "/", {
        postParams: {"csrftoken": token}
    })).status, 200);
    // with token submitted as query parameter
    assert.strictEqual(app(createRequest("POST", "/", {
        queryParams: {"csrftoken": token}
    })).status, 200);
    // with token submitted as custom header field
    assert.strictEqual(app(createRequest("POST", "/", {
        headers: {"x-csrf-token": token}
    })).status, 200);

    // switch on token rotation
    app.csrf({
        "rotate": true
    });
    response = app(createRequest("POST", "/", {
        postParams: {"csrftoken": token}
    }));
    assert.strictEqual(response.status, 200);
    assert.isTrue(response.body[0] !== token);
    token = response.body[0];
    response = app(createRequest("POST", "/", {
        postParams: {"csrftoken": "invalid"}
    }));
    assert.isTrue(response.body[0] !== token);
};

if (require.main == module) {
    require("test").run(exports);
}