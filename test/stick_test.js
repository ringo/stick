var {Application} = require("../lib/stick");
var {mount,route} = require("../lib/middleware")
var assert = require("assert");


exports.testMiddleware = function() {
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

exports.testMount = function() {
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
exports.testMountRedirect = function() {
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
exports.testMountNoRedirect = function() {
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

exports.testMountSort = function() {
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
exports.testRouteResolution = function() {
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
exports.testMountAndRouteResolution = function() {
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

exports.testSimpleCors = function() {
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
   assert.notEqual(response.body[0], responseBody);

   // invalid origin
   var response = app({
      method: 'GET',
      headers: {origin: 'http://example2.com'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin'])
   assert.notEqual(response.body[0], responseBody);

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
   assert.notEqual(response.body, responseBody);

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

exports.testPreflightCors = function() {
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
   var responseBody = 'ok';
   app.options('/', function() {
    return text(responseBody)}
   );

   // no origin
   var response = app({
      method: 'OPTIONS',
      headers: {'Access-Control-Request-Method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin'])
   // the route itself was not executed so we should not be
   // able to see the body it returns
   assert.notEqual(response.body[0], responseBody);

   // invalid origin
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example2.com', 'Access-Control-Request-Method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin']);
   assert.notEqual(response.body[0], responseBody);

   // invalid method
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example.com', 'Access-Control-Request-Method': 'DELETE'},
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin']);
   assert.notEqual(response.body[0], responseBody);

   // valid preflight
   var response = app({
      method: 'OPTIONS',
      headers: {origin: 'http://example.com', 'Access-Control-Request-Method': 'POST'},
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Allow-Methods'], 'POST');
   assert.notEqual(response.body[0], responseBody);

   // invalid custom header
   var response = app({
      method: 'OPTIONS',
      headers: {
         origin: 'http://example.com',
         'Access-Control-Request-Method': 'POST',
         'Access-Control-Request-Headers': 'X-NotFooBar',
      },
      env: {},
      pathInfo: '/'
   });
   assert.isUndefined(response.headers['Access-Control-Allow-Origin']);
   assert.isUndefined(response.headers['Access-Control-Allow-Headers']);
   assert.notEqual(response.body[0], responseBody);

   // valid custom header
   var response = app({
      method: 'OPTIONS',
      headers: {
         origin: 'http://example.com',
         'Access-Control-Request-Method': 'POST',
         'Access-Control-Request-Headers': 'X-FooBar',
      },
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.headers['Access-Control-Allow-Origin'], 'http://example.com');
   assert.equal(response.headers['Access-Control-Allow-Headers'], 'X-FooBar');
   assert.equal(response.headers['Access-Control-Max-Age'], '1728000');
   assert.notEqual(response.body[0], responseBody);
}

exports.testAccept = function() {
   var {text, html} = require('ringo/jsgi/response');
   var app = new Application();

   app.configure('accept', 'route');

   var responseBody = 'ok';
   app.get('/', function() { return text(responseBody)} );

   // helper function to build a request object
   var buildRequest = function(acceptHeader) {
      return {
         method: 'GET',
         headers: {
            'accept': acceptHeader
         },
         env: {},
         pathInfo: '/'
      };
   };
   
   // Content characteristic not available - app wide
   app.accept(['text/html', 'application/xhtml+xml']);
   var response = app(buildRequest('application/json'));
   assert.equal(response.status, 406);
   assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: text/html, application/xhtml+xml');

   // No matching characteristic
   app.accept([]);
   response = app(buildRequest('application/json'));
   assert.equal(response.status, 406);
   assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: ');

   // Matching characteristic, including quality
   app.accept(['text/html', 'application/json']);
   var req = buildRequest('application/json');
   response = app(req);

   assert.deepEqual(req.accepted, [{
      "mimeType": "application/json",
      "type": "application",
      "subtype": "json",
      "q": 1
   }])
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Matching characteristic, including multiple qualities
   app.accept(['text/html', 'application/json']);
   var req = buildRequest('text/plain; q=0.5, text/html, text/csv, text/x-dvi; q=0.8');
   response = app(req);

   assert.deepEqual(req.accepted, [{
      "mimeType": "text/html",
      "type": "text",
      "subtype": "html",
      "q": 1
   },{
      "mimeType": "text/csv",
      "type": "text",
      "subtype": "csv",
      "q": 1
   },{
      "mimeType": "text/x-dvi",
      "type": "text",
      "subtype": "x-dvi",
      "q": 0.8
   },{
      "mimeType": "text/plain",
      "type": "text",
      "subtype": "plain",
      "q": 0.5
   }]);
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');
   
   // Wildcard
   app.accept('*/*');
   req = buildRequest('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/json');
   response = app(req);

   assert.deepEqual(req.accepted, [{
      "mimeType": "text/html",
      "type": "text",
      "subtype": "html",
      "q": 1
   },{
      "mimeType": "application/xhtml+xml",
      "type": "application",
      "subtype": "xhtml+xml",
      "q": 1
   },{
      "mimeType": "application/json",
      "type": "application",
      "subtype": "json",
      "q": 1
   },{
      "mimeType": "application/xml",
      "type": "application",
      "subtype": "xml",
      "q": 0.9
   },{
      "mimeType": "*/*",
      "type": "*",
      "subtype": "*",
      "q": 0.8
   }]);
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Wildcard in the request and the middleare + whitespaces
   app.accept('audio/*');
   response = app(buildRequest('audio/*; q=0.2, audio/basic'));
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Wildcard in the middleware, no accept header
   app.accept('*/*');
   response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/'
   });
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Wildcard in the middleware, concrete media type in the request
   app.accept('*/html');
   response = app(buildRequest('text/html'));
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Wildcard in the middleware, non-matching with the request
   app.accept('*/html');
   response = app(buildRequest('text/plain'));
   assert.equal(response.status, 406);
   assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: */html');

   // Wildcard in the request, conrete in the middleware
   app.accept('text/html');
   response = app(buildRequest('*/*'));
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // With level
   app.accept('text/html');
   response = app(buildRequest('text/plain, application/foo, text/html, text/html;level=1'));
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // With level and preference
   app.accept('foo/bar');
   response = app(buildRequest('text/*;q=0.3, text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4'));
   assert.equal(response.status, 406);
   assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: foo/bar');

   // With level and preference and wildcard
   app.accept('foo/bar');
   req = buildRequest('text/*;q=0.3, text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4, */*;q=0.5');
   response = app(req);

   assert.deepEqual(req.accepted, [{
      "mimeType": "text/html",
      "type": "text",
      "subtype": "html",
      "q": 1,
      "level": "1"
   },{
      "mimeType": "text/html",
      "type": "text",
      "subtype": "html",
      "q": 0.7
   },{
      "mimeType": "*/*",
      "type": "*",
      "subtype": "*",
      "q": 0.5
   },{
      "mimeType": "text/html",
      "type": "text",
      "subtype": "html",
      "q": 0.4,
      "level": "2"
   },{
      "mimeType": "text/*",
      "type": "text",
      "subtype": "*",
      "q": 0.3
   }]);
   assert.equal(response.status, 200);
   assert.equal(response.body, 'ok');

   // Bad request
   app.accept('*/html');
   response = app(buildRequest('asdfasdfasdfasdf,,,,jkio/asdfasdf'));
   assert.equal(response.status, 400);
   
   // Bad request
   app.accept('*/html');
   response = app(buildRequest(' a/b , / , / '));
   assert.equal(response.status, 400);

   // Example from the documentation
   app = new Application();
   app.configure('accept', 'route');
   app.accept(['text/plain', 'text/html']);
   app.get('/', function(req) {
      if (req.accepted[0].subtype === 'html') {
         return html('<!doctype html>');
      } else {
         return text('foo');    
      }
   });

   response = app(buildRequest('text/html'));
   assert.equal(response.status, 200);
   assert.equal(response.body, '<!doctype html>');

   response = app(buildRequest('text/plain'));
   assert.equal(response.status, 200);
   assert.equal(response.body, 'foo');

   response = app(buildRequest('text/csv'));
   assert.equal(response.status, 406);
   assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: text/plain, text/html');
};

if (require.main == module) {
    require("test").run(exports);
}