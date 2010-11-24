
exports.middleware = function method(next, app) {

    app.method = {
        key: "_method"
    };

    return function method(req) {
        if (req.method === "POST") {
            if (!req.params) {
                throw new Error("method middleware requires params middleware");
            }
            var key = app.method.key;
            if (req.params[key]) {
                req.method = req.params[key].toUpperCase();
            }
        }
        return next(req);
    }
};