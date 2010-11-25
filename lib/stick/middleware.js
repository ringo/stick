/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */
[
    "basicauth",
    "error",
    "etag",
    "gzip",
    "method",
    "mount",
    "notfound",
    "params",
    "profiler",
    "responselog",
    "router",
    "session",
    "skin",
    "static",
    "upload"
].forEach(function(name) {
    exports[name] = require("./middleware/" + name).middleware;
});

