var {Application, Mount} = require("../lib/stick");
var assert = require("assert");


exports.testMiddleware = function() {
    function mw1(next, app) {
        return function mw1(req) { return next(req) + next(req) }
    }
    function mw2(next, app) {
        return function mw2(req) { return next(req.toUpperCase()).toUpperCase() }
    }
    function mw3(next, app) {
        return function mw3(req) { return req === "FOO" ?
                "bar" : "unexpected req: " + req }
    }
    function p1(next, app) {
        return function p1(req) { return next(req) + "_" }
    }
    function p2(next, app) {
        return function p2(req) { return "_" + next(req) }
    }
    var app = new Application(mw1, mw2, mw3);
    assert.equal(app("foo"), "BARBAR");
    app = new Application();
    app.configure([mw1, mw2, mw3]);
    assert.equal(app("foo"), "BARBAR");
    app.configure("development", mw1);
    app.configure("production", [p1, p2]);
    assert.equal(app("foo"), "BARBAR");
    assert.equal(app("foo", "development"), "BARBARBARBAR");
    assert.equal(app("foo", "production"), "_BARBAR_");
}

exports.testMount = function() {
    function testMount(app) {
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
    var app = new Application(Mount);
    testMount(app);
    app = new Application();
    app.configure(Mount);
    testMount(app);
    app = new Application();
    app.configure([Mount]);
    testMount(app);
}

if (require.main == module) {
    require("test").run(exports);
}
