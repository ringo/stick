var system = require("system");
var assert = require("assert");

var {Application} = require("../lib/stick");
var {mount,route} = require("../lib/middleware")
var {urlFor} = require("../lib/helpers");

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

// Middlewares
exports.testAccept = require("./middleware/accept_test");
exports.testCors = require("./middleware/cors_test");
exports.testCsrf = require("./middleware/csrf_test");
exports.testMount = require("./middleware/mount_test");
exports.testParams = require("./middleware/params_test");
exports.testRoute = require("./middleware/route_test");
exports.testLocale = require("./middleware/locale_test");

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
