/**
 * @fileoverview This module provides middleware to find the user's locale
 */
var strings = require("ringo/utils/strings");
var response = require("ringo/jsgi/response");
var http = require("ringo/utils/http");

var sess = require("./session.js");

var iso639Codes = [
    "ab", "aa", "af", "ak", "sq", "am", "ar", "an", "hy", "as", "av", "ae", "ay", "az", "bm",
    "ba", "eu", "be", "bn", "bh", "bi", "bs", "br", "bg", "my", "ca", "ch", "ce", "ny", "zh",
    "cv", "kw", "co", "cr", "hr", "cs", "da", "dv", "nl", "dz", "en", "eo", "et", "ee", "fo",
    "fj", "fi", "fr", "ff", "gl", "ka", "de", "el", "gn", "gu", "ht", "ha", "he", "hz", "hi",
    "ho", "hu", "ia", "id", "ie", "ga", "ig", "ik", "io", "is", "it", "iu", "ja", "jv", "kl",
    "kn", "kr", "ks", "kk", "km", "ki", "rw", "ky", "kv", "kg", "ko", "ku", "kj", "la", "lb",
    "lg", "li", "ln", "lo", "lt", "lu", "lv", "gv", "mk", "mg", "ms", "ml", "mt", "mi", "mr",
    "mh", "mn", "na", "nv", "nb", "nd", "ne", "ng", "nn", "no", "ii", "nr", "oc", "oj", "cu",
    "om", "or", "os", "pa", "pi", "fa", "pl", "ps", "pt", "qu", "rm", "rn", "ro", "ru", "sa",
    "sc", "sd", "se", "sm", "sg", "sr", "gd", "sn", "si", "sk", "sl", "so", "st", "az", "es",
    "su", "sw", "ss", "sv", "ta", "te", "tg", "th", "ti", "bo", "tk", "tl", "tn", "to", "tr",
    "ts", "tt", "tw", "ty", "ug", "uk", "ur", "uz", "ve", "vi", "vo", "wa", "cy", "wo", "fy",
    "xh", "yi", "yo", "za", "zu"
];

var Locale = function Locale(spec) {
    var bits = spec.split(/[-_]/g);
    if (bits.length) {
        this.language = bits[0];
        if (bits.length > 2) {
            this.region = bits[2].toUpperCase();
            this.script = bits[1].charAt(0).toUpperCase() + bits[1].slice(1).toLowerCase();
        } else {
            this.region = bits[1] && bits[1].toUpperCase();
        }
    }
    // normalize the spec
    bits = [this.language];
    if (this.script) bits.push(this.script);
    if (this.region) bits.push(this.region);
    this.spec = bits.join("-");
};
Locale.prototype.match = function (otherLocale) {
    if (otherLocale.language !== this.language ) {
        // no match
        return false;
    }

    if (!otherLocale.region) {
        return true;
    }
    if (this.region && this.region !== otherLocale.region) {
        return false;
    }

    if (!otherLocale.script) {
        return true;
    }

    if (this.script && this.script !== otherLocale.script) {
        return false;
    }

    return true;
};

var urlConventions = [
    {
        field: "host",
        re: new RegExp("^(\\w\\w([\\-_]\\w\\w(\\w\\w[\\-_]\\w\\w)?)?)\\."),
        matchgroup: 1
    },
    {
        field: "pathInfo",
        re: new RegExp("^/(\\w\\w([\\-_]\\w\\w(\\w\\w[\\-_]\\w\\w)?)?)/"),
        matchgroup: 1
    }
];

/**
 * This middleware gleans the locale based on various methods and puts it into
 * the session. The goal is
 * to get the exact locale that the user wants to use. However, this is not
 * always possible, and there are a number of reasons why. This may
 * include that user is not be logged in, or that the user's preferred locale
 * is not supported by the current site, for example. Based on this, we order
 * the methods of obtaining the
 * locale according to how close they come to getting what the user actually
 * wants.
 *
 * The order is this:
 *
 * <ol>
 * <li> The user's actual preference. If you insert the locale into the session
 * when the user logs in to your site based on the user's database entry,
 * you will get the user's exact preference. If the locale is already set into
 * the session, this middleware will not change it. It is up to your app to
 * manage user authentication and user preferences.
 * <li> User's locale cookie for your site. If you use the cookies middleware
 * and cookies are available on the request, this middleware will examine them
 * to find the locale cookie and use it. If the locale cookie is not set, but
 * the session response already has a locale, this middleware will set the
 * locale cookie for use next time.
 * <li> Query parameters. If the URL or the POST data contain an explicit
 * lang, language, or locale parameter, use that
 * <li> Accept-Language HTTP header. This middleware will examine the HTTP
 * headers to see if there is a Accept-Language header. If found, it will run
 * through the user's preferred languages in order against the list of locales
 * that your site supports. If one matches, the locale set into the session.
 * See the discussion below on how to set the list of locales that your
 * site supports. If no list of supported locales is specified, this middleware
 * will configure the first language it finds in the header.
 * <li> URL conventions. If your site uses simple conventions, this middleware can automatically
 * extract the locale. The conventions that it looks for are:
 *     <ul>
 *     <li>http://&lt;localename&gt;.mysite.com/
 *     <li>http://www.mysite.com/&lt;localename&gt;/*
 *     <li>http://www.mysite.com/path?lang=&lt;localename&gt;
 *     <li>http://www.mysite.com/path?language=&lt;localename&gt;
 *     <li>http://www.mysite.com/path?locale=&lt;localename&gt;
 *     </ul>
 * If your site uses a different convention, and that convention is simple and
 * regular enough
 * that the locale can be extracted from the URL using a regular expression, your app
 * may specify that regular expression. See the discussion below on on how to
 * set up this regular expression.
 * <li> Geolocation/IP to country lookup. This middleware does not do this, as it
 * requires a paid back-end service to handle the requests.
 * <li> Site default from configuration. The default can be set from the a
 * configuration file or the command-line arguments. This is the fallback
 * locale if none of the above found a locale. See the description below on
 * how to set the default.
 * <li> Last resort is the template source language. In this case, the locale
 * in the session is set to "null" and the templates should not be translated
 * at all.
 * </ol>
 *
 * To configure this middleware, the application instance is decorated
 * with a function called "i18n" when it is configured. This function
 * should be called and pass in an object that contains the
 * settings. The properties in i18n can be any of:
 *
 * <ul>
 * <li>supportedLocales - an array of locale specifiers that follow the BCP-47
 * convention. These locales should be as fully specified as possible with
 * language, script, and region.
 * <li>defaultLocale - a single locale specifier that follows the BCP-47 convention
 * <li>domainregex - The regular expression to match against domain names to find the locale
 * <li>domainmatchgroup - grouping within the domain regular expression that contains the locale
 * <li>pathregex - The regular expression to match against the path to find the locale
 * <li>pathmatchgroup - grouping within the path regular expression that contains the locale
 * </ul>
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 *
 * @example
 * var {Application} = require('stick');
 * var app = exports.app = new Application();
 *
 * app.configure('route');
 * app.configure('locale');
 * app.configure('cookies');
 * app.configure('params');
 * app.configure('session');
 *
 * app.i18n({
 *     // might want to get this list from the configuration
 *     // so you can change it once for all your app server instances
 *     supportedLocales: [
 *         "en-US",
 *         "fr-FR",
 *         "it-IT",
 *         "de-DE",
 *         "es-ES",
 *         "pt-BR",
 *         "ja-JP",
 *         "ko-KR",
 *         "zh-Hans-CN",
 *         "zh-Hant-TW"
 *     ],
 *     defaultLocale: "en-US",   // get this from your configuration
 *     domainregex: "^(\w\w).mycompany.com",
 *     domainmatchgroup: 1 // this means that first parenthesized group contains the language/locale
 *     pathregex: "^/(\w\w)/.*",
 *     pathmatchgroup: 1 // this means that first parenthesized group contains the language/locale
 * });
 */
exports.middleware = function locale(next, app) {
    var config = {
        supportedLocales: [],
        defaultLocale: null,   // get this from your configuration
        domainregex: null,
        domainmatchgroup: 0,
        pathregex: null,
        pathmatchgroup: 0
    };

    app.i18n = function(conf) {
        for (var key in conf) {
            if (config[key] !== undefined) {
                if (key === "supportedLocales" && conf[key]) {
                    conf[key].forEach(function (spec) {
                        config[key].push(new Locale(spec));
                    });
                } else {
                    config[key] = conf[key];
                }
            } else {
                throw new Error("Unknown i18n config option '" + key + '"');
            }
        }
    };

    function validateLocale(spec) {
        if (spec) {
            var loc = new Locale(spec);
            if (iso639Codes.indexOf(loc.language) > -1) {
                if (config.supportedLocales && config.supportedLocales.length > 0) {
                    for (var i = 0; i < config.supportedLocales.length; i++) {
                        if (config.supportedLocales[i].match(loc)) return config.supportedLocales[i].spec;
                    }
                } else {
                    return loc.spec;
                }
            }
        }
        return undefined;
    }

    function doit(req, locale) {
        req.session.data.locale = locale;
        http.setCookie("locale", locale, 1000);
        return next(req);
    }

    return function loc(req) {
        var locale;

        try {
            // console.log("locale middleware: req is " + inspect(req));
            if (req && req.session && !req.session.data.locale) {
                // 2. By Cookie
                if (req.cookies) {
                    locale = req.cookies["locale"];
                    if (locale) {
                        req.session.data.locale = locale;
                        return next(req);
                    }
                }
    
                // 3. By URL using explicit query parameters
                if (req.params) {
                    // use the Locale object to force the parts into proper ISO codes and reassemble the spec
                    locale = validateLocale(req.params.lang || req.params.language || req.params.locale);
                    if (locale) return doit(req, locale);
                }
    
                // 4. By HTTP header
                if (req.headers && req.headers["accept-language"]) {
                    var acceptLanguages = req.headers["accept-language"];
                    var languages = acceptLanguages.split(",");
                    languages.some(function (lang) {
                        var bits = lang.split(";");
                        var spec = bits.length > 1 ? bits[0] : lang;
                        spec = validateLocale(spec);
                        if (spec) {
                            locale = spec;
                            return true;
                        }
                        return false;
                    });
                    if (locale) return doit(req, locale);
                }
    
                // 5.1 By URL using the caller-supplied regular expression
                if (config.domainregex) {
                    var re = new RegExp(config.domainregex);
                    var result = re.exec(req.host);
                    if (result !== null) {
                        var spec = validateLocale(result[config.domainmatchgroup]);
                        if (spec) return doit(req, spec);
                    }
                }
    
                if (config.pathregex) {
                    var re = new RegExp(config.pathregex);
                    var result = re.exec(req.pathInfo);
                    if (result !== null) {
                        spec = validateLocale(result[config.pathmatchgroup]);
                        if (spec) return doit(req, spec);
                    }
                }
    
                // 5.2 By URL using regular conventions
                for (var i = 0; i < urlConventions.length; i++) {
                    var result = urlConventions[i].re.exec(req[urlConventions[i].field]);
                    if (result) {
                        var spec = validateLocale(result[urlConventions[i].matchgroup]);
                        if (spec) return doit(req, spec);
                    }
                }
    
                // 6. By Configuration
                if (config && config.defaultLocale) return doit(req, config.defaultLocale);
            }
        } catch (e) {
        	// if something went wrong with the session or you did not put in the session or
        	// params middleware, this code might fail. Just ignore it and continue with the
        	// default or with no locale.
        	
        	if (config && config.defaultLocale) return doit(req, config.defaultLocale);
        }

        return next(req);
    };
};