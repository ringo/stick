var system = require("system");
var assert = require("assert");
var io = require("io");
var binary = require("binary");
var {text} = require("ringo/jsgi/response");

var {Application} = require("../../lib/stick");
var {route, session, params, locale, cookies} = require("../../lib/middleware");

var MockCookie = function(name, value) {
    this.name = name;
    this.value = value;
};
MockCookie.prototype.getName = function() {
    return this.name;
};
MockCookie.prototype.getValue = function() {
    return this.value;
};

var mockRequest = function(method, path, opts) {
    opts || (opts = {});
    return {
        "method": method || "GET",
        "host": opts.host || "localhost",
        "port": opts.port || 80,
        "scheme": opts.scheme || "http",
        "pathInfo": path || "/",
        "env": opts.env || {},
        "headers": opts.headers || {},
        "postParams": opts.postParams || {},
        "queryParams": opts.queryParams || {},
        "remoteAddress": opts.remoteAddress || "",
        "input": opts.input || undefined,
        "queryString": opts.queryString
    };
};

var mockEnv = function(data, isSecure) {
    return {
        "servletRequest": {
            "getSession": function() {
                return {
                    getAttribute: function(name) {
                        if (data.hasOwnProperty(name)) {
                            return data[name];
                        }
                        return null;
                    },
                    setAttribute: function(name, value) {
                        data[name] = value;
                    },
                    isNew: function() {
                        return true;
                    },
                    getCreationTime: function() {
                        if (!data.creationTime) {
                            data.creationTime = new Date().getTime();
                        }
                        return data.creationTime;
                    },
                    getMaxInactiveInterval: function() {
                        return data.interval || -1;
                    },
                    setMaxInactiveInterval: function(interval) {
                        data.interval = interval;
                    },
                    getLastAccessedTime: function() {
                        return new Date().getTime();
                    },
                    invalidate: function() {

                    }
                };
            },
            "isSecure": function() {
                return isSecure === true;
            },
            "getCharacterEncoding": function() {
                return "UTF-8";
            },
            "getCookies": function () {
                return data.cookies;
            }
        }
    };
};

exports.testHttpHeadersNoSupportedLocales = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.post('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "accept-language": "de-DE;q=0.8,fr-FR;q=0.4",
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"locale\": \"fr-FR\"}", "UTF-8")),
        env: mockEnv(sessionData)
    }));
};

exports.testHttpHeadersNoMatchToSupportedLocales = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US","fr-FR","es-ES","ja-JP"],
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should use the default Locale
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        headers: {
            "accept-language": "de-DE;q=0.8,ru-RU;q=0.4"
        },
        env: mockEnv(sessionData)
    }));
};

exports.testHttpHeadersMatchWithinSupportedLocales = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US","fr-FR","es-ES","ja-JP"],
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // first one in the list that is in the supported locales list
        assert.equal(request.session.data.locale, "es-ES");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        headers: {
            "accept-language": "es-ES;q=0.8,fr-FR;q=0.4"
        },
        env: mockEnv(sessionData)
    }));
};

exports.testHttpHeadersMatchWithinSupportedLocalesByLanguageOnly = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US","fr-FR","es-ES","ja-JP"],
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // match by language only ignoring the region part
        // because some browsers like Opera only use the language code
        // instead of the full locale
        assert.equal(request.session.data.locale, "es-ES");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        headers: {
            "accept-language": "es;q=0.8,fr;q=0.4"
        },
        env: mockEnv(sessionData)
    }));
};

exports.testByDomain = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // only have the language code available
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "de.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainFullLocale = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // has both the language and region code, but we should make
        // sure the locale comes out in correct BCP-47 form
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "de_de.mycompany.com",
        env: mockEnv(sessionData)
    }));
};


exports.testByDomainIgnoreNonISOCodes = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // xy is not a valid ISO 639-2 language code, so it should be
        // ignored. Use the default instead.
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "xy.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainOnlyTakeTwoLetterCodes = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // dex is not a valid 2-letter ISO 639-2 language code, so it
        // should be ignored. Use the default instead.
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "dex.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainRegex = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US",
        domainregex: "^(\\w\\w).mycompany.com",
        domainmatchgroup: 1
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // valid ISO code, so it should be extracted
        assert.equal(request.session.data.locale, "fr");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "fr.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainRegexNonISO = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US",
        domainregex: "^(\\w\\w).mycompany.com",
        domainmatchgroup: 1
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // not a valid ISO code, so fall back to the default
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "xy.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainRegexWithSupportedLocalesList = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US", "fr-FR", "de-DE", "nl-NL", "es-ES", "ja-JP"],
        defaultLocale: "en-US",
        domainregex: "^(\\w\\w).mycompany.com",
        domainmatchgroup: 1
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should map to the full locale in the supported locales list.
        assert.equal(request.session.data.locale, "es-ES");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "es.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByDomainRegexNoMatchInSupportedLocales = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US", "fr-FR", "de-DE", "nl-NL", "es-ES", "ja-JP"],
        defaultLocale: "en-US",
        domainregex: "^(\\w\\w).mycompany.com",
        domainmatchgroup: 1
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // not on the supported locales list, so fall back to the default
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "ru.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByPathRegex = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US",
        pathregex: "^/(\\w\\w)/",
        pathmatchgroup: 1
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // valid ISO code, so it should be extracted
        assert.equal(request.session.data.locale, "fr");
        return text("ok");
    });

    app(mockRequest("GET", "/fr/good", {
        host: "www.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByPathRegexNonISO = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US",
        pathregex: "^/(\\w\\w)/",
        pathmatchgroup: 1
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // not a valid ISO code, so fall back to the default
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/xy/good", {
        host: "www.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByPathRegexWithSupportedLocalesList = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US", "fr-FR", "de-DE", "nl-NL", "es-ES", "ja-JP"],
        defaultLocale: "en-US",
        pathregex: "^/(\\w\\w)/",
        pathmatchgroup: 1
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // should map to the full locale in the supported locales list.
        assert.equal(request.session.data.locale, "es-ES");
        return text("ok");
    });

    app(mockRequest("GET", "/es/good", {
        host: "www.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByPathRegexNoMatchInSupportedLocales = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: ["en-US", "fr-FR", "de-DE", "nl-NL", "es-ES", "ja-JP"],
        defaultLocale: "en-US",
        pathregex: "^/(\\w\\w)/",
        pathmatchgroup: 1
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // not on the supported locales list, so fall back to the default
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/ru/good", {
        host: "www.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testByURLPath = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // only have the language code available
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("GET", "/de/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testByURLPathFullLocale = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // has both the language and region code, but we should make
        // sure the locale comes out in correct BCP-47 form
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/de_de/good", {
        env: mockEnv(sessionData)
    }));
};


exports.testByURLPathIgnoreNonISOCodes = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/:slug/good', function(request, slug) {
        // xy is not a valid ISO 639-2 language code, so it should be
        // ignored. Use the default instead.
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/xy/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testByURLPathOnlyTakeTwoLetterCodes = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/:slug/good', function(request) {
        // dex is not a valid 2-letter ISO 639-2 language code, so it
        // should be ignored. Use the default instead.
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/dex/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testParamsGetFullLocale = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        queryString: "lang=de-DE",
        env: mockEnv(sessionData)
    }));
};

exports.testParamsGetPartialLocale = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        queryString: "lang=de",
        env: mockEnv(sessionData)
    }));
};

exports.testParamsGet2 = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        queryString: "language=de",
        env: mockEnv(sessionData)
    }));
};

exports.testParamsGet3 = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        queryString: "locale=de",
        env: mockEnv(sessionData)
    }));
};

exports.testParamsGetNonISOCode = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        queryString: "lang=xy",
        env: mockEnv(sessionData)
    }));
};

exports.testParamsPost = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.post('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"lang\": \"de\"}", "UTF-8")),
        env: mockEnv(sessionData)
    }));
};

exports.testParamsPostFullLocale = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.post('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"lang\": \"de-DE\"}", "UTF-8")),
        env: mockEnv(sessionData)
    }));
};

exports.testParamsPost2 = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.post('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"language\": \"de\"}", "UTF-8")),
        env: mockEnv(sessionData)
    }));
};

exports.testParamsPost3 = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.post('/good', function(request) {
        // should take the first one
        assert.equal(request.session.data.locale, "de");
        return text("ok");
    });

    app(mockRequest("POST", "/good", {
        headers: {
            "content-type": "application/json"
        },
        input: new io.MemoryStream(new binary.ByteString("{\"locale\": \"de\"}", "UTF-8")),
        env: mockEnv(sessionData)
    }));
};

exports.testCookie = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('cookies');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {
        // simulate request cookies by putting them in the session data where
        // the mock env can pick them up
        cookies: [new MockCookie("locale", "de-DE")]
    };

    app.get('/good', function(request) {
        // should take the locale cookie's value
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testSession = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('cookies');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {
        locale: "fr-FR",
    };

    app.get('/good', function(request) {
        // should take the value already in the session
        assert.equal(request.session.data.locale, "fr-FR");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testSessionTakesPrecedenceOverCookies = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('cookies');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {
        locale: "fr-FR",
        // simulate request cookies by putting them in the session data where
        // the mock env can pick them up
        cookies: [new MockCookie("locale", "de-DE")]
    };

    app.get('/good', function(request) {
        // should take the value already in the session
        assert.equal(request.session.data.locale, "fr-FR");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testCookieTakesPrecedenceOverQueryStrings = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('cookies');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {
        // simulate request cookies by putting them in the session data where
        // the mock env can pick them up
        cookies: [new MockCookie("locale", "de-DE")]
    };

    app.get('/good', function(request) {
        // should take the locale cookie over the query string parameter
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData),
        queryString: "locale=fr-FR"
    }));
};

exports.testQueryStringsTakesPrecedenceOverHTTPAcceptHeaders = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the query string parameter over the http headers
        assert.equal(request.session.data.locale, "fr-FR");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        headers: {
            "accept-language": "de-DE;q=0.8,ja-JP;q=0.4",
            "content-type": "application/json"
        },
        env: mockEnv(sessionData),
        queryString: "locale=fr-FR"
    }));
};

exports.testHTTPAcceptHeadersTakePrecedenceOverURLPatterns = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the http headers over the url patterns
        assert.equal(request.session.data.locale, "de-DE");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "ko.mycompany.com",
        headers: {
            "accept-language": "de-DE;q=0.8,ja-JP;q=0.4",
            "content-type": "application/json"
        },
        env: mockEnv(sessionData)
    }));
};

exports.testURLPatternsTakePrecedenceOverDefault = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the http headers over the url patterns
        assert.equal(request.session.data.locale, "ko");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        host: "ko.mycompany.com",
        env: mockEnv(sessionData)
    }));
};

exports.testDefaultTakePrecedenceOverNothing = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null,
        defaultLocale: "en-US"
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the http headers over the url patterns
        assert.equal(request.session.data.locale, "en-US");
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData)
    }));
};

exports.testNoLocaleAtAll = function() {
    var app = new Application();
    app.configure('route');
    app.configure('locale');
    app.configure('params');
    app.configure('session');

    app.i18n({
        supportedLocales: null
    });

    var sessionData = {};

    app.get('/good', function(request) {
        // should take the http headers over the url patterns
        assert.isNull(request.session.data.locale);
        return text("ok");
    });

    app(mockRequest("GET", "/good", {
        env: mockEnv(sessionData)
    }));
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}