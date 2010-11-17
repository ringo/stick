/**
 * @fileOverview Middleware for simple Not-Found pages.
 */
var {Response} = require('ringo/webapp/response');

/**
 * Stick middleware for simple 404-Not-Found pages.
 * @example
 * <pre>app.configure(notfound);
 * app.notfound.skin = "templates/404.html";</pre>
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function notfound(next, app) {

    app.notfound = {
        skin: module.resolve('notfound.html')
    };

    return function notfound(request) {
        try {
            return next(request);
        } catch (e if e.notfound) {
            var res = Response.skin(app.notfound.skin, {
                title: "Not Found",
                body: "<p>The requested URL <b>" + request.scriptName
                        + request.pathInfo + "</b> was not found on the server.</p>"
            });
            res.status = 404;
            res.contentType = 'text/html';
            return res;
        }
    };
};
