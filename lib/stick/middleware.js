/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */

/** Middleware for [Basic HTTP Authentication](./basicauth/index.html). */
exports.basicauth   = require("./middleware/basicauth");
/** Middleware for [generating error pages](./error/index.html). */
exports.error       = require("./middleware/error");
/** Middleware for [ETag based conditional GET](./etag/index.html). */
exports.etag        = require("./middleware/etag");
/** Middleware for [GZip compression of response bodies](./gzip/index.html). */
exports.gzip        = require("./middleware/gzip");
/** Middleware for [HTTP method overriding](./method/index.html). */
exports.method      = require("./middleware/method");
/** Middleware for [mounting other applications](./mount/index.html). */
exports.mount       = require("./middleware/mount");
/** Middleware for [generating 404 pages](./notfound/index.html). */
exports.notfound    = require("./middleware/notfound");
/** Middleware for [request parameter parsing](./params/index.html). */
exports.params      = require("./middleware/params");
/** Middleware for [JavaScript code profiling](./profiler/index.html). */
exports.profiler    = require("./middleware/profiler");
/** Middleware for [appending log messages to the HTTP response](./responselog/index.html). */
exports.responselog = require("./middleware/responselog");
/** Middleware for [intra-app request routing](./router/index.html). */
exports.router      = require("./middleware/router");
/** Middleware for [HTTP session support](./session/index.html). */
exports.session     = require("./middleware/session");
/** Middleware for [skin based templating](./skin/index.html). */
exports.skin        = require("./middleware/skin");
/** Middleware for [serving static resources](./static/index.html). */
exports.static      = require("./middleware/static");
/** Middleware for [file upload support](./upload/index.html). */
exports.upload      = require("./middleware/upload");

