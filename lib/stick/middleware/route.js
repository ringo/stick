/**
 * @fileOverview Middleware for HTTP method based local request routing.
 */

/**
 * Middleware for HTTP method based local request routing.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function route(next, app) {

    var routes = {},
        reverse = {};

    function addRoute(method, path, fn) {
        var keys = [];
        var pattern = path instanceof RegExp ? path : normalizePath(path, keys);
        routes[method].push({pattern: pattern, keys: keys, fn: fn});
        return this;
    }

    app.route = {
        use: function() {
            var methods = Array.forEach(arguments, function(method) {
                method = method.toUpperCase();
                var name = method === "DELETE" ? "del" : method.toLowerCase();
                app[name] = addRoute.bind(app, method);
                if (!routes[method]) {
                    routes[method] = [];
                }
            })
        },

        reverse: function(parts) {
            var name = parts.action || "index";
            var route = reverse[name];
            if (!route) {
                return "/_" + name + "_(unknown_route)";
            }
            var path = route.path,
                keys = route.keys;
            for (var i = 0, l = keys.length; i < l; i++) {
                var key = keys[i];
                var re = new RegExp(":" + key + "(\\?)?");
                path = path.replace(re, function(match, optional) {
                    return parts[key] || (optional ? "" : "_" + key + "_(undefined)");
                });
            }
            return path;
        }

    };

    // Preconfigure standard HTTP methods
    app.route.use("get", "post", "put", "delete");

    // This function was stolen from connect and then mutilated for reverse routing support
    function normalizePath(path, keys) {
        var rev = {path: path, keys: keys};
        // use the first literal path component as route name, or "index" if none is found
        var name = path.match(/\/(\w+)/);
        name = name ? name[1] : "index";
        if (!reverse[name]) {
            reverse[name] = rev;
        }
        // convert path to regex
        path = path
            .concat('/?')
            .replace(/\/\(/g, '(?:/')
            .replace(/(\/)?(\.)?:(\w+)(\?)?/g, function(_, slash, format, key, optional){
                keys.push(key);
                slash = slash || '';
                return ''
                    + (optional ? '' : slash)
                    + '(?:'
                    + (optional ? slash : '')
                    + (format || '') + '([^/.]+))'
                    + (optional || '');
            })
            .replace(/([\/.])/g, '\\$1')
            .replace(/\*/g, '(.+)');
        return new RegExp('^' + path + '$', 'i');
    }

    return function route(req) {
        var method = req.method;
        if (method === "HEAD") method = "GET";

        var list = routes[method];
        if (Array.isArray(list)) {
            for (var i = 0, l = list.length; i < l; i++) {
                var item = list[i];
                var match = item.pattern.exec(req.pathInfo);
                if (match) {
                    req.env.route = {};
                    var args = [req];
                    for (var j = 1; j < match.length; j++) {
                        if (j <= item.keys.length) {
                            req.env.route[item.keys[j - 1]] = match[j];
                        }
                        args[args.length] = match[j];
                    }
                    return item.fn.apply(null, args);
                }
            }
        }

        return next(app);
    };
};
