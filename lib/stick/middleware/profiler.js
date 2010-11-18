/**
 * @fileOverview Profiler middleware.
 */

var engine = require('ringo/engine');
var Profiler = require('ringo/profiler').Profiler;
var Buffer = require('ringo/buffer').Buffer;
var log = require('ringo/logging').getLogger(module.id);

/**
 * Register a request listener that automatically sets rhino optimization
 * level to -1 and adds a profiler.
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function profiler(next, app) {

    app.profiler = {
        // limit frames shown in the profiler
        maxFrames: 30
    };

    return function profiler(request) {
        if (engine.getOptimizationLevel() > -1) {
            // restart evaluation in interpreter mode. Shared modules
            // will still be optimized, so issue a warning
            log.warn("Changing optimization level mid-flight results in incomplete profiling output.",
                     "Run with optimization level -1 for accurate profiling.");
            if (typeof request.reset === "function") {
                request.reset();
            }
            engine.setOptimizationLevel(-1);
            throw {retry: true};
        }
        var profiler = new Profiler();
        profiler.attach();

        // get the response passing the request on to the middleware chain
        try {
            return next(request);
        } finally {
            log.info("\n" + profiler.formatResult(app.profiler.maxFrames));
        }
    }
};
