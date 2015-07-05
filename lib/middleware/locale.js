/**
 * @fileoverview This module provides middleware to find the user's locale
 */
var strings = require("ringo/utils/strings");
var response = require("ringo/jsgi/response");
var http = require("ringo/utils/http");

var inspect = require("/home/edwin/src/transcircapp/src/webapp/WEB-INF/app/core/inspect");

var urlConventions = [
	{
		re: new RegExp("^\w+://(\w\w([\-_]\w\w(\w\w[\-_]\w\w)?)?)\."),
		matchgroup: 1
	},
	{
		re: new RegExp("^\w+://[^/]+/(\w\w)/"),
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
 * <li> Last resort is the template source language. In this case, no locale
 * is set at all into the session.
 * </ol>
 * 
 * To configure this middleware, the application instance is decorated
 * with a function called "i18n" when it is configured. This function
 * should be called and pass in an object that contains the
 * settings. The properties in i18n can be any of:
 * 
 * <ul>
 * <li>supportedLocales - an array of locale specifiers that follow the BCP-47 
 * convention
 * <li>defaultLocale - a single locale specifier that follows the BCP-47 convention
 * <li>urlregexp - The regular expression to match against URLs to find the locale
 * <li>matchgroup - grouping within the regular expression that contains the locale
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
 *     urlregexp: "^https?://www.mycompany.com/a/b/(\w\w)/",
 *     matchgroup: 1 // this means that first parenthesized group contains the language/locale
 * });
 */
exports.middleware = function accept(next, app) {
	var config = {
		supportedLocales: [],
		defaultLocale: "en-US",   // get this from your configuration
		urlregexp: null,
		matchgroup: 0
	};
	
    app.i18n = function(conf) {
        for (var key in conf) {
            if (config[key] !== undefined) {
                config[key] = conf[key];
            } else {
                throw new Error("Unknown i18n config option '" + key + '"');
            }
        }
    };
	
    return function loc(req) {
    	var locale;
    	
    	console.log("locale middleware: req is " + inspect(req));
    	
    	if (req.session && !req.session.data.locale) {
    		// 2. By Cookie
    		if (req.cookies) {
        		locale = req.cookies["locale"];
        		if (locale) {
        			req.session.setAttribute("locale", locale);
        			return next(req);
        		}
    		}
    		
    		// 3. By HTTP header
    		if (req.headers) {
    			var acceptLanguages = req.headers["accept-language"];
    			var languages = acceptLanguages.split(",");
    			languages.some(function (lang) {
    				var bits = lang.split(";");
    				var language = bits.length > 1 ? bits[0] : lang;
    				if (app.i18n && app.i18n.supportedLanguages) {
    					if (app.i18n.supportedLanguages.indexOf(language) > -1) {
    						locale = language;
    						return true;
    					}
    				} else {
    					locale = language;
    					return true;
    				}
    				return false;
    			});
        		if (locale) {
        			req.session.setAttribute("locale", locale);
        			http.setCookie("locale", locale, 1000);
        			return next(req);
        		}
    		}
    		
    		// 4.1 By URL using the caller-supplied regular expression
    		if (app.i18n && app.i18n.urlregexp) {
    			var re = new RegExp(app.i18n.urlregexp);
    			var result = re.exec(req.url);
    			if (result !== null) {
    				locale = result[app.i18n.matchgroup];
    				if (locale) {
            			req.session.setAttribute("locale", locale);
            			http.setCookie("locale", locale, 1000);
            			return next(req);
    				}
    			}
    		}
    		
    		// 4.2 By URL using regular conventions
    		for (var i = 0; i < urlConventions.length; i++) {
    			var result = urlConventions[i].re.exec(req.url);
    			if (result) {
    				locale = result[urlConventions[i].matchgroup];
    				if (locale) {
            			req.session.setAttribute("locale", locale);
            			http.setCookie("locale", locale, 1000);
            			return next(req);
    				}
    			}
    		}
    		
    		// 4.3 By URL using query parameters
    		if (req.params) {
    			locale = req.params.lang || req.params.language || req.params.locale;
				if (locale) {
        			req.session.setAttribute("locale", locale);
        			http.setCookie("locale", locale, 1000);
        			return next(req);
				}
    		}
    		
    		// 5. By Configuration
    		if (app.i18n && app.i18n.defaultLocale) {
    			req.session.setAttribute("locale", app.i18n.defaultLocale);
    			http.setCookie("locale", locale, 1000);
    			return next(req);
    		}
    	}
    	
    	return next(req);
    };
};