/**
 * @fileOverview Middleware for HTTP method based local request routing.
 *
 * This installs `get`, `post`, `put`, and `del` methods in the application
 * object for routing requests with the corresponding HTTP methods. These
 * methods take a path spec as first argument and a function as second argument.
 *
 * ### Paths and Placeholders
 *
 * The path spec can consist of static parts such as `/edit` and placeholders.
 * Named placeholders are prefixed by a colon (`:`) character and match all
 * characters except for slashes (`/`) and dots (`.`). A named
 * placeholder can be marked as optional by appending a question mark (`?`).
 *
 * Unnamed placeholders are denoted by the asterisk character (`*`) and match
 * all characters including slahses and dots.
 *
 * All placeholders are passed to the action function as positional arguments
 * in the order in which they appear in the path spec. Unmatched optional
 * placeholders will be as `undefined`.
 *
 * ### Reverse Routing
 *
 * The route middleware supports generating URLs from route names and parameters
 * required by the route.
 *
 * Routes names are derived from the route's path spec by stripping
 * out all placeholders and removing a leading slash. For example, a path
 * spec `/post/:id.html` results in route name "post.html". If a path spec
 * does not contain any static part, its route name is "index".
 *
 * Passing a valid route name and the parameters required by the route to the `route.reverse`
 * method will return the URI path for the corresponding action. For example,
 * with a route spec `/post/:id.html`, calling `app.route.reverse({action: "post.html", id: 5})`
 * will return the string "/post/5.html".
 *
 * The [stick/helpers] module provides higher level helpers for reverse routing including
 * support for mounted applications. 
 *
 * @example
 * app.configure("route")
 * app.get("/", function() {...})
 * app.post("/", function(req) {...})
 * app.get("/:id.:format?", function(req, id, format) {...})
 * app.del("/:id", function(req, id) {...})
 * app.put("/:id", function(req, id) {...})
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
        // extract literal path components as route name, or "index" if none is found
        var name = "", re = /([\/\.])(\w+)/g, match;
        for (match = re.exec(path); match != null; match = re.exec(path)) {
            name += name || match[1] == "." ? match[1] + match[2] : match[2];
        }
        name = name || "index";
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
                    req.route = {bindings: {}};
                    var args = [req];
                    for (var j = 1; j < match.length; j++) {
                        if (j <= item.keys.length) {
                            req.route.bindings[item.keys[j - 1]] = match[j];
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
