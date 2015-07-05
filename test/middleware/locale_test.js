var system = require("system");
var assert = require("assert");
var io = require("io");
var binary = require("binary");

var {Application} = require("../../lib/stick");
var {route, session, params, locale, cookies} = require("../../lib/middleware");

var inspect = require("/home/edwin/src/transcircapp/src/webapp/WEB-INF/app/core/inspect");

var mockRequest = exports.mockRequest = function(method, path, opts) {
    return {
        "method": method || "GET",
        "host": opts && opts.host || "localhost",
        "port": opts && opts.port || 80,
        "scheme": opts && opts.scheme || "http",
        "pathInfo": path || "/",
        "env": opts && opts.env || {
            servletRequest: {
                getCharacterEncoding: function() { return "UTF-8"; },
            }
        },
        "headers": opts && opts.headers || {}
        //,        "input": opts && opts.input || new io.MemoryStream(new binary.ByteString(""))
    };
};

exports.testHttpHeaders = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
//    app.configure('params');
//    app.configure('cookies');
    app.configure('session');
    
    app.i18n({
    	supportedLocales: null,
    	defaultLocale: "en-US"
    });

    app.post('/good', function(request) {
    	console.log("request.session is " + inspect(request));
    	assert.equal("de-DE", request.session.getAttribute("locale"));
    });

    var response = app(mockRequest("POST", "/good", {
        headers: {
            "accept-language": "de-DE;q=0.8,fr-FR;q=0.4"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"locale\": \"fr-FR\"}", "UTF-8"))
    }));

    assert.equal(response.status, 200);
    assert.equal(response.body, 'ok');
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}