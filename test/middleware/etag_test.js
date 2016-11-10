const fs = require("fs");
const system = require("system");
const assert = require("assert");

const {Application} = require("../../lib/stick");
const {etag} = require("../../lib/middleware");

const testMiddleware = function(next) {
    return function testDigest(request) {
        var res = next(request);
        res.body.digest = function() {
            return "1234567890";
        };
        return res;
    }
};

exports.testBasicMD5 = function() {
    var app = new Application();

    app.configure("etag", testMiddleware, "static");
    app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
        servePrecompressed: false
    });

    let response = app({
        method: 'GET',
        headers: {},
        env: {},
        pathInfo: '/customStatic/'
    });
    assert.equal(response.headers["Content-Type"], "text/html");
    assert.equal(response.headers["Cache-Control"], "max-age=0");
    assert.equal(response.headers["ETag"], "\"1234567890\"");
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
