const fs = require("fs");
const system = require("system");
const assert = require("assert");
const {Headers} = require("ringo/utils/http");

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
    let headers = Headers(response.headers);
    assert.equal(headers.get("content-type"), "text/html");
    assert.equal(headers.get("cache-control"), "max-age=0");
    assert.equal(headers.get("etag"), "\"1234567890\"");
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
