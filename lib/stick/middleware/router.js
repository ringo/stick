
exports.middleware = function router(next, app) {

    var routes = {
        "GET": [],
        "POST": [],
        "PUT": [],
        "DELETE": []
    };

    function addRoute(method, path, fn) {
        var pattern = path instanceof RegExp ? path : normalizePath(path);
        routes[method].push({pattern: pattern, fn: fn});
        return this;
    }

    app.get = addRoute.bind(app, "GET");
    app.post = addRoute.bind(app, "POST");
    app.put = addRoute.bind(app, "PUT");
    app.del = addRoute.bind(app, "DELETE");

    return function router(req) {
        var method = req.method;
        if (method === "HEAD") method = "GET";

        var list = routes[method];
        if (Array.isArray(list)) {
            for (var i = 0, l = list.length; i < l; i++) {
                var item = list[i];
                var match = item.pattern.exec(req.pathInfo);
                if (match) {
                    var args = [req];
                    for (var j = 1; j < match.length; j++) {
                        args[args.length] = match[j];
                    }
                    return item.fn.apply(null, args);
                }
            }
        }

        return next(app);
    };
};

// This function was gratefully stolen (and then simplified) from connect
function normalizePath(path) {
    path = path
        .concat('/?')
        .replace(/\/\(/g, '(?:/')
        .replace(/(\/)?(\.)?:\w+(\?)?/g, function(_, slash, format, optional) {
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