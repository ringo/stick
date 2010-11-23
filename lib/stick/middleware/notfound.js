/**
 * @fileOverview Middleware for simple Not-Found pages.
 */

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
            var template = getResource(app.notfound.skin);
            var body = template.content.replace(/\{\{\s*(\w+)\s*\}\}/g, function(match, group) {
                switch(group) {
                    case "title":
                        return app.notfound.title || "Not Found";
                    case "body":
                        return app.notfound.body || "<p>The requested URL <b>"
                                + request.scriptName + request.pathInfo
                                + "</b> was not found on the server.</p>";
                    default:
                        return "";
                }
            });
            return {
                status: 404,
                headers: {"Content-Type": "text/html"},
                body: [body]
            };
        }
    };
};
