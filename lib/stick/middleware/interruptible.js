/**
 * @fileOverview Provide support for generator actions yielding promises
 * with the promise results being fed back into the generator until
 * it yields a JSGI response.
 *
 * See <http://blog.ometer.com/2010/11/28/a-sequential-actor-like-api-for-server-side-javascript/>
 * for background.
 */

var {defer} = require("ringo/promise");

exports.middleware = function(next, app) {

    app.interruptible = {
        timeout: 30000
    };

    return function(req) {
        var res = next(req);
        if (res && typeof res.next === "function") {
            var p = res.next();
            if (p && typeof p.then === "function") {
                var deferred = defer();
                var handlePromise = function(p) {
                    p.then(function(value) {
                        var v = res.send(value);
                        if (v && typeof v.then === "function") {
                            handlePromise(v);
                        } else {
                            deferred.resolve(v)
                        }
                    }, function(error) {
                        deferred.resolve(error, true);
                        res.throw(error);
                    });
                };
                handlePromise(p);
                deferred.promise.timeout = app.interruptible.timeout;
                return deferred.promise;
            } else {
                return p;
            }
        }
        return res;
    };
};