var {Application} = require("../lib/stick");
var assert = require("assert");


exports.testMiddleware = function() {
    function mw1(app) {
        return function(req) { return app(req) + app(req) }
    }
    function mw2(app) {
        return function(req) { return app(req.toUpperCase()).toUpperCase() }
    }
    function mw3(app) {
        return function(req) { return req === "FOO" ?
                "BAR" : "unexpected req: " + req }
    }
    var app = new Application(mw1, mw2, mw3);
    assert.equal(app("foo"), "BARBAR");
}

exports.testMount = function() {
    var app = new Application();
    app.mount("/foo", function() { return "/foo" });
    app.mount({host: "foo.com"}, function() { return "foo.com" });
    app.mount({host: "bar.org", path: "/baz"}, function() { return "bar.org/baz" });
    assert.equal(app({headers: {host: "bar.com"}, pathInfo: "/foo"}), "/foo");
    assert.equal(app({headers: {host: "foo.com"}, pathInfo: "/foo"}), "/foo");
    assert.equal(app({headers: {host: "foo.com"}, pathInfo: "/"}), "foo.com");
    assert.equal(app({headers: {host: "bar.org"}, pathInfo: "/baz"}), "bar.org/baz");
    assert.throws(function() {
        app({headers: {host: "bing.org"}, pathInfo: "/"});
    }, Error);
}

if (require.main == module) {
    require("test").run(exports);
}
