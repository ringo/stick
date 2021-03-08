const assert = require("assert");
const {Headers} = require("ringo/utils/http");

const {Application} = require("../../lib/stick");

const testMiddleware = function(next) {
    return function testDigest(request) {
        const res = next(request);
        res.body.digest = function() {
            return "1234567890";
        };
        return res;
    }
};

exports.testBasicMD5 = function() {
    const app = new Application();

    app.configure("etag", testMiddleware, "static");
    app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
        servePrecompressed: false
    });

    const response = app({
        method: 'GET',
        headers: {},
        env: {},
        pathInfo: '/customStatic/'
    });
    const headers = Headers(response.headers);
    assert.equal(headers.get("content-type"), "text/html");
    assert.equal(headers.get("cache-control"), "max-age=0");
    assert.equal(headers.get("etag"), "1234567890");
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
