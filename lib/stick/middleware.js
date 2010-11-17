/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */
exports.basicauth = require("./middleware/basicauth").middleware;
exports.error = require("./middleware/error").middleware;
exports.notfound = require("./middleware/notfound").middleware;
exports.mount = require("./middleware/mount").middleware;