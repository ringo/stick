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
    assert.isUndefined(response.headers['access-control-allow-origin'])
    assert.equal(response.body[0], responseBody);

    // invalid origin
    var response = app({
        method: 'GET',
        headers: {origin: 'http://example2.com'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin'])
    assert.equal(response.body[0], responseBody);

    // valid origin
    var response = app({
        method: 'GET',
        headers: {origin: 'http://example.com'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.body, responseBody);

    // case sensitive (!)
    var response = app({
        method: 'GET',
        headers: {origin: 'http://exAmpLe.Com'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);
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
    assert.equal(response.headers['access-control-allow-origin'], '*');
    assert.equal(response.headers['access-control-expose-headers'], 'X-FooBar');
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

    // no origin
    var response;

    assert.throws(function() {
        app({
            method: 'OPTIONS',
            headers: {'access-control-request-method': 'POST'},
            env: {},
            pathInfo: '/'
        });
    });

    // invalid origin
    var response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example2.com', 'access-control-request-method': 'POST'},
        env: {},
        pathInfo: '/'
    });
    assert.isUndefined(response.headers['access-control-allow-origin']);

    // invalid method
    var response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example.com', 'access-control-request-method': 'DELETE'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-methods'], 'POST');

    // valid preflight
    var response = app({
        method: 'OPTIONS',
        headers: {origin: 'http://example.com', 'access-control-request-method': 'POST'},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-methods'], 'POST');

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
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-headers'], 'X-FooBar');

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
    assert.equal(response.headers['access-control-allow-origin'], 'http://example.com');
    assert.equal(response.headers['access-control-allow-headers'], 'X-FooBar');
    assert.equal(response.headers['access-control-max-age'], '1728000');
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
