var system = require("system");
var assert = require("assert");

var {Application} = require("../../lib/stick");
var {route} = require("../../lib/middleware");

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
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}