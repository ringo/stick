/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */

/** Middleware for [Basic HTTP Authentication](./basicauth/index.html). */
exports.basicauth   = require("./middleware/basicauth").middleware;
/** Middleware for [generating error pages](./error/index.html). */
exports.error       = require("./middleware/error").middleware;
/** Middleware for [ETag based conditional GET](./etag/index.html). */
exports.etag        = require("./middleware/etag").middleware;
/** Middleware for [GZip compression of response bodies](./gzip/index.html). */
exports.gzip        = require("./middleware/gzip").middleware;
/** Middleware for [HTTP method overriding](./method/index.html). */
exports.method      = require("./middleware/method").middleware;
/** Middleware for [mounting other applications](./mount/index.html). */
exports.mount       = require("./middleware/mount").middleware;
/** Middleware for [generating 404 pages](./notfound/index.html). */
exports.notfound    = require("./middleware/notfound").middleware;
/** Middleware for [request parameter parsing](./params/index.html). */
exports.params      = require("./middleware/params").middleware;
/** Middleware for [JavaScript code profiling](./profiler/index.html). */
exports.profiler    = require("./middleware/profiler").middleware;
/** Middleware for [appending log messages to the HTTP response](./responselog/index.html). */
exports.responselog = require("./middleware/responselog").middleware;
/** Middleware for [intra-app request routing](./router/index.html). */
exports.router      = require("./middleware/router").middleware;
/** Middleware for [HTTP session support](./session/index.html). */
exports.session     = require("./middleware/session").middleware;
/** Middleware for [skin based templating](./skin/index.html). */
exports.skin        = require("./middleware/skin").middleware;
/** Middleware for [serving static resources](./static/index.html). */
exports.static      = require("./middleware/static").middleware;
/** Middleware for [file upload support](./upload/index.html). */
exports.upload      = require("./middleware/upload").middleware;

