/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */
exports.error = require("./middleware/error").middleware;
exports.mount = require("./middleware/mount").middleware;