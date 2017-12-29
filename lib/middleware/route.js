/**
 * @fileOverview Middleware for HTTP method based local request routing.
 *
 * This installs `get`, `post`, `put`, `del` and `options` methods in the application
 * object for routing requests with the corresponding HTTP methods. These
 * methods take a path spec as first argument and a function as second argument.
 *
 * ### Paths and Placeholders
 *
 * The path spec can consist of static parts and placeholders.
 * Named placeholders are prefixed by `:` (colon) and match all
 * characters except for `/` (slash) and `.` (dot). A named
 * placeholder can be marked as optional by appending `?` (question mark).
 * Unnamed placeholders are denoted by the asterisk character `*` and match
 * all characters including slashes and dots.
 *
 * In the following example, ":id" is a named placeholder:
 *
 *     "/post/:id"
 *
 * All placeholders are passed to the action function as positional arguments
 * following the request object in the order in which they appear in the path spec.
 * Unmatched optional placeholders will be `undefined`.
 *
 *     app.get("/post/:id", function(req, id) {...});
 *
 * ### Reverse Routing
 *
 * The route middleware supports generating URLs from route names and parameters
 * required by the route.
 *
 * Routes names can either be defined explicitly by passing the route name
 * as third argument, or are derived from the route's path spec by stripping
 * out all placeholders and removing a leading slash. For example, a path
 * spec `/post/:id.html` results in route name "post.html". If a path spec
 * does not contain any static part, its route name is "index".
 *
 * Passing a valid route name and the parameters required by the route to the `route.reverse`
 * method will return the URI path for the corresponding action. For example,
 * with a route spec `/post/:id.html`, calling `app.route.reverse({action: "post.html", id: 5})`
 * will return the string "/post/5.html".
 *
 * The [stick/helpers][helpers] module provides higher level helpers for reverse
 * routing including support for mounted applications.
 *
 * @example
 * app.configure("route")
 * app.get("/", function() {...})
 * app.get("/", function() {...}, "index")
 * app.post("/", function(req) {...})
 * app.get("/:id.:format?", function(req, id, format) {...})
 * app.del("/:id", function(req, id) {...})
 * app.put("/:id", function(req, id) {...})
 */

const {urlEncode} = require("ringo/utils/http");

/**
 * Middleware for HTTP method based local request routing.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function route(next, app) {

    const routes = {},
        reverse = {};

    function addRoute(method, path, fn, name) {
        const keys = [];
        const spec = {keys: keys, fn: fn};
        spec.pattern = path instanceof RegExp ? path : normalizePath(path, keys);
        spec.weight = calcWeight(path);
        routes[method].push(spec);

        // register name -> route lookup
        const rev = {path: path, keys: keys};
        if (typeof(name) !== "string" || name.length < 1) {
            // extract literal path components as route name, or "index"
            // if none is found
            name = "";
            const re = /([\/\.])(\w+)/g;
            let match;
            for (match = re.exec(path); match != null; match = re.exec(path)) {
                name += name || match[1] === "." ? match[1] + match[2] : match[2];
            }
        }
        name = spec.name = name || "index";
        if (!reverse[name]) {
            reverse[name] = rev;
        }

        // Routes must be added in a sorted manner so the most specific route is first.
        routes[method].sort(function(r1, r2) {
            return r2.weight - r1.weight;
        });

        return this;
    }

    /**
     * Create a weight value such that paths that are more specific, have a higher value than less
     * specific paths. Some examples:
     *     /foo > /:a
     *     /foo/bar > /foo
     *     /foo/:a > /foo
     *     /foo/:a/bar/:b  >  /foo/:a/:b/bar
     *
     * So, the number of path elements are important (more path elements indicates a more specific
     * path), and the number and order of parameters is important.
     *
     * The algorithm I am using substitutes a 1 for every non-param path element, and a 0 for every
     * parameter path element. The result is a binary string which is converted to a decimal weight.
     *
     *     /foo/:a/bar/:b  >  /foo/:a/:b/bar
     *               1010  >  1001
     *
     * @param path
     */
    function calcWeight(path) {
        let result = 0;
        let step = 1;
        // trim leading and trailing slashes
        path = path.replace(/^\/+|\/+$/g, '');
        const elements = path.split('/').reverse();
        elements.forEach(function(elem, index) {
            let value = /^:/.test(elem) ? 0 : step;
            result = result + value;
            step = step * 2;
        });
        return result;
    }

    app.route = {
        use: function() {
            Array.forEach(arguments, function(method) {
                method = method.toUpperCase();
                const name = method === "DELETE" ? "del" : method.toLowerCase();
                app[name] = addRoute.bind(app, method);
                if (!routes[method]) {
                    routes[method] = [];
                }
            })
        },

        reverse: function(bindings) {
            const req = app.request;
            const defaultBindings = req && req.env.bindings || {};

            const name = bindings.action || defaultBindings.action || "index";
            delete bindings.action;

            const route = reverse[name];
            if (!route) {
                return "/_" + name + "_(unknown_route)";
            }

            let path = route.path,
                keys = route.keys;

            for (let i = 0, l = keys.length; i < l; i++) {
                let key = keys[i];
                let re = new RegExp("([\\.\\/])?:" + key + "(\\?)?");
                path = path.replace(re, function(match, pre, optional) {
                    let part = bindings[key] || defaultBindings[key];
                    delete bindings[key];
                    return part ? pre + part :
                            (optional ? "" : pre + "_" + key + "_(undefined)");
                });
            }

            return path;
        }

    };

    // Preconfigure standard HTTP methods
    app.route.use("get", "post", "put", "delete", "options");

    // This was gratefully and repeatedly stolen from connect
    function normalizePath(path, keys) {
        if (path instanceof RegExp) return path;
        path = path
            .concat('/?')
            .replace(/\/\(/g, '(?:/')
            .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g,
               function(_, slash, format, key, capture, optional){
                  keys.push(key);
                  slash = slash || '';
                  return ''
                    + (optional ? '' : slash)
                    + '(?:'
                    + (optional ? slash : '')
                    + (format || '') + (capture || '([^/]+?)') + ')'
                    + (optional || '');
        })
        .replace(/([\/.])/g, '\\$1')
        .replace(/\*/g, '(.+)');
        return new RegExp('^' + path + '$', 'i');
    }

    return function route(req) {
        let method = req.method;
        if (method === "HEAD") method = "GET";

        const list = routes[method];
        if (Array.isArray(list)) {
            for (let i = 0, l = list.length; i < l; i++) {
                let item = list[i];
                let match = item.pattern.exec(req.pathInfo);
                if (match) {
                    req.env.bindings = {
                        action: item.name
                    };
                    let args = [req];
                    for (let j = 1; j < match.length; j++) {
                        if (j <= item.keys.length) {
                            req.env.bindings[item.keys[j - 1]] = match[j];
                        }
                        args[args.length] = match[j];
                    }
                    return item.fn.apply(null, args);
                }
            }
        }

        return next(req);
    };
};
