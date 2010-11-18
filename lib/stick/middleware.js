/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */
exports.basicauth = require("./middleware/basicauth").middleware;
exports.error = require("./middleware/error").middleware;
exports.etag = require("./middleware/etag").middleware;
exports.gzip = require("./middleware/gzip").middleware;
exports.notfound = require("./middleware/notfound").middleware;
exports.mount = require("./middleware/mount").middleware;
exports.responselog = require("./middleware/responselog").middleware;
exports.static = require("./middleware/static").middleware;