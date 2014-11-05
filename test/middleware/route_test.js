var system = require("system");
var assert = require("assert");

var {Application} = require("../../lib/stick");
var {route, mount} = require("../../lib/middleware");
var {urlFor} = require("../../lib/helpers");

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

exports.testUrlForRoute = function() {
    var app = new Application();
    app.configure(route);
    app.get("/:param", function() {});
    app.get("/foo", function() {});
    app.get("/foo/:param", function() {});
    app.get("/bar/foo", function() {});
    app.get("/bar/:param", function() {});
    app.get("/baz/:param/qux", function() {});
    app.get("/baz/:param.html", function() {});
    assert.strictEqual(urlFor(app, {"param": "foo"}), "/foo");
    assert.strictEqual(urlFor(app, {"action": "index", "param": "foo"}), "/foo");
    // additional bindigs are added as query parameters
    assert.strictEqual(urlFor(app, {"action": "foo", "bar": "baz"}), "/foo?bar=baz");
    // non-matching route name - additional bindings are added too
    assert.strictEqual(urlFor(app, {"action": "nonexisting", "bar": "baz"}),
        "/_nonexisting_(unknown_route)?bar=baz");
    // note: `/foo` and `/foo/:param` routes have the same literal name, so
    // only the first one defined is known by route middleware
    assert.strictEqual(urlFor(app, {"action": "foo", "param": 123}), "/foo?param=123");
    assert.strictEqual(urlFor(app, {"action": "bar/foo"}), "/bar/foo");
    assert.strictEqual(urlFor(app, {"action": "bar", "param": "baz"}), "/bar/baz");
    assert.strictEqual(urlFor(app, {"action": "baz/qux", "param": 123}), "/baz/123/qux");
    assert.strictEqual(urlFor(app, {"action": "baz.html", "param": 123}), "/baz/123.html");

    var mountApp = new Application();
    mountApp.configure(mount);
    mountApp.mount("/test", app);
    assert.strictEqual(urlFor(app, {"param": "foo"}), "/test/foo");
    assert.strictEqual(urlFor(app, {"action": "index", "param": "bar"}), "/test/bar");
    assert.strictEqual(urlFor(app, {"action": "nonexisting", "bar": "baz"}),
        "/test/_nonexisting_(unknown_route)?bar=baz");
    assert.strictEqual(urlFor(app, {"action": "bar", "param": 123}), "/test/bar/123");
    assert.strictEqual(urlFor(app, {"action": "baz.html", "param": 123}), "/test/baz/123.html");
};

exports.testUrlForNamedRoute = function() {
    var app = new Application();
    app.configure(route);
    app.get("/:param", function() {}, "param");
    app.get("/foo", function() {}, "fooindex");
    app.get("/foo/:id", function() {}, "foodetail");
    app.get("/bar/:id", function() {}, "bardetail");
    app.get("/bar/:id.:format", function() {}, "bardetailformat");
    assert.strictEqual(urlFor(app, {"action": "param", "param": "test"}), "/test");
    assert.strictEqual(urlFor(app, {"action": "fooindex"}), "/foo");
    assert.strictEqual(urlFor(app, {"action": "foodetail", "id": 123}), "/foo/123");
    assert.strictEqual(urlFor(app, {"action": "bardetail", "id": 123}), "/bar/123");
    assert.strictEqual(urlFor(app, {"action": "bardetailformat", "id": 123, "format": "html"}),
        "/bar/123.html");
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}