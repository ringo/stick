const assert = require("assert");
const {Headers} = require("ringo/utils/http");
const fs = require("fs");
const {Arrays} = java.util;
const response = require("ringo/jsgi/response");
const {MemoryStream} = require("io");

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

exports.testBinaryStreamResponse = function() {
    const file = module.resolve("./fixtures/ringo-drums.png");
    const app = new Application();
    app.configure("etag", "route");
    app.get("/", function() {
        return response.stream(fs.open(file, {binary: true}), "image/png");
    });
    const result = app({
        method: 'GET',
        headers: {},
        env: {},
        pathInfo: '/'
    });
    const headers = Headers(result.headers);
    assert.equal(headers.get("content-type"), "image/png");
    assert.equal(headers.get("etag"), "0C15DE3FBC9D7A7B936F98147CD7FDCB");
    const body = new MemoryStream();
    result.body.forEach(part => body.write(part));
    assert.isTrue(Arrays.equals(body.content, fs.read(file, {binary: true})));
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
