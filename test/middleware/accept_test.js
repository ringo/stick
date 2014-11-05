var system = require("system");
var assert = require("assert");

var {Application} = require("../../lib/stick");
var {route} = require("../../lib/middleware");

exports.testAccept = function() {
    var {text, html} = require('ringo/jsgi/response');
    var app = new Application();

    app.configure('accept', 'route');

    var responseBody = 'ok';
    app.get('/', function() { return text(responseBody)} );

    // helper function to build a request object
    var buildRequest = function(acceptHeader) {
        return {
            method: 'GET',
            headers: {
                'accept': acceptHeader
            },
            env: {},
            pathInfo: '/'
        };
    };

    // Content characteristic not available - app wide
    app.accept(['text/html', 'application/xhtml+xml']);
    var response = app(buildRequest('application/json'));
    assert.equal(response.status, 406);
    assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: text/html, application/xhtml+xml');

    // No matching characteristic
    app.accept([]);
    response = app(buildRequest('application/json'));
    assert.equal(response.status, 406);
    assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: ');

    // Matching characteristic, including quality
    app.accept(['text/html', 'application/json']);
    var req = buildRequest('application/json');
    response = app(req);

    assert.deepEqual(req.accepted, [{
        "mimeType": "application/json",
        "type": "application",
        "subType": "json",
        "q": 1
    }])
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Matching characteristic, including multiple qualities
    app.accept(['text/html', 'application/json']);
    var req = buildRequest('text/plain; q=0.5, text/html, text/csv, text/x-dvi; q=0.8');
    response = app(req);

    assert.deepEqual(req.accepted, [{
        "mimeType": "text/html",
        "type": "text",
        "subType": "html",
        "q": 1
    },{
        "mimeType": "text/csv",
        "type": "text",
        "subType": "csv",
        "q": 1
    },{
        "mimeType": "text/x-dvi",
        "type": "text",
        "subType": "x-dvi",
        "q": 0.8
    },{
        "mimeType": "text/plain",
        "type": "text",
        "subType": "plain",
        "q": 0.5
    }]);
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Wildcard
    app.accept('*/*');
    req = buildRequest('text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8,application/json');
    response = app(req);

    assert.deepEqual(req.accepted, [{
        "mimeType": "text/html",
        "type": "text",
        "subType": "html",
        "q": 1
    },{
        "mimeType": "application/xhtml+xml",
        "type": "application",
        "subType": "xhtml+xml",
        "q": 1
    },{
        "mimeType": "application/json",
        "type": "application",
        "subType": "json",
        "q": 1
    },{
        "mimeType": "application/xml",
        "type": "application",
        "subType": "xml",
        "q": 0.9
    },{
        "mimeType": "*/*",
        "type": "*",
        "subType": "*",
        "q": 0.8
    }]);
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Wildcard in the request and the middleare + whitespaces
    app.accept('audio/*');
    response = app(buildRequest('audio/*; q=0.2, audio/basic'));
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Wildcard in the middleware, no accept header
    app.accept('*/*');
    response = app({
        method: 'GET',
        headers: {},
        env: {},
        pathInfo: '/'
    });
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Wildcard in the middleware, concrete media type in the request
    app.accept('*/html');
    response = app(buildRequest('text/html'));
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Wildcard in the middleware, non-matching with the request
    app.accept('*/html');
    response = app(buildRequest('text/plain'));
    assert.equal(response.status, 406);
    assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: */html');

    // Wildcard in the request, conrete in the middleware
    app.accept('text/html');
    response = app(buildRequest('*/*'));
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // With level
    app.accept('text/html');
    response = app(buildRequest('text/plain, application/foo, text/html, text/html;level=1'));
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // With level and preference
    app.accept('foo/bar');
    response = app(buildRequest('text/*;q=0.3, text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4'));
    assert.equal(response.status, 406);
    assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: foo/bar');

    // With level and preference and wildcard
    app.accept('foo/bar');
    req = buildRequest('text/*;q=0.3, text/html;q=0.7, text/html;level=1, text/html;level=2;q=0.4, */*;q=0.5');
    response = app(req);

    assert.deepEqual(req.accepted, [{
        "mimeType": "text/html",
        "type": "text",
        "subType": "html",
        "q": 1,
        "level": "1"
    },{
        "mimeType": "text/html",
        "type": "text",
        "subType": "html",
        "q": 0.7
    },{
        "mimeType": "*/*",
        "type": "*",
        "subType": "*",
        "q": 0.5
    },{
        "mimeType": "text/html",
        "type": "text",
        "subType": "html",
        "q": 0.4,
        "level": "2"
    },{
        "mimeType": "text/*",
        "type": "text",
        "subType": "*",
        "q": 0.3
    }]);
    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');

    // Bad request
    app.accept('*/html');
    response = app(buildRequest('asdfasdfasdfasdf,,,,jkio/asdfasdf'));
    assert.equal(response.status, 400);

    // Bad request
    app.accept('*/html');
    response = app(buildRequest(' a/b , / , / '));
    assert.equal(response.status, 400);

    // Example from the documentation
    app = new Application();
    app.configure('accept', 'route');
    app.accept(['text/plain', 'text/html']);
    app.get('/', function(req) {
        if (req.accepted[0].subType === 'html') {
            return html('<!doctype html>');
        } else {
            return text('foo');
        }
    });

    response = app(buildRequest('text/html'));
    assert.equal(response.status, 200);
    assert.equal(response.body, '<!doctype html>');

    response = app(buildRequest('text/plain'));
    assert.equal(response.status, 200);
    assert.equal(response.body, 'foo');

    response = app(buildRequest('text/csv'));
    assert.equal(response.status, 406);
    assert.equal(response.body, 'Not Acceptable. Available entity content characteristics: text/plain, text/html');
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}