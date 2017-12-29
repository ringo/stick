/**
 * @fileOverview Convenience module that provides access to all
 * Stick middleware using a single `require()` call.
 */

/**
 * Middleware for [Basic HTTP Authentication](./basicauth/index.html).
 * @name basicauth
 */
Object.defineProperty(exports, 'basicauth', {
    get: function() { return require('./middleware/basicauth'); }
});

/**
 * Middleware for [generating error pages](./error/index.html).
 * @name error
 */
Object.defineProperty(exports, 'error', {
    get: function() { return require('./middleware/error'); }
});

/**
 * Middleware for [ETag based conditional GET](./etag/index.html).
 * @name etag
 */
Object.defineProperty(exports, 'etag', {
    get: function() { return require('./middleware/etag'); }
});

/**
 * Middleware for [GZip compression of response bodies](./gzip/index.html).
 * @name gzip
 */
Object.defineProperty(exports, 'gzip', {
    get: function() { return require('./middleware/gzip'); }
});

/**
 * Middleware for [HTTP method overriding](./method/index.html).
 * @name method
 */
Object.defineProperty(exports, 'method', {
    get: function() { return require('./middleware/method'); }
});

/**
 * Middleware for [mounting other applications](./mount/index.html).
 * @name mount
 */
Object.defineProperty(exports, 'mount', {
    get: function() { return require('./middleware/mount'); }
});

/**
 * Middleware for [generating 404 pages](./notfound/index.html).
 * @name notfound
 */
Object.defineProperty(exports, 'notfound', {
    get: function() { return require('./middleware/notfound'); }
});

/**
 * Middleware for [request parameter parsing](./params/index.html).
 * @name params
 */
Object.defineProperty(exports, 'params', {
    get: function() { return require('./middleware/params'); }
});

/**
 * Middleware for [JavaScript code profiling](./profiler/index.html).
 * @name profiler
 */
Object.defineProperty(exports, 'profiler', {
    get: function() { return require('./middleware/profiler'); }
});

/**
 * Middleware for [template based response rendering](./render/index.html).
 * @name render
 */
Object.defineProperty(exports, 'render', {
    get: function() { return require('./middleware/render'); }
});

/**
 * Middleware for [collecting log messages per HTTP request](./requestlog/index.html).
 * @name requestlog
 */
Object.defineProperty(exports, 'requestlog', {
    get: function() { return require('./middleware/requestlog'); }
});

/**
 * Middleware for [intra-app request routing](./route/index.html).
 * @name route
 */
Object.defineProperty(exports, 'route', {
    get: function() { return require('./middleware/route'); }
});

/**
 * Middleware for [HTTP session support](./session/index.html).
 * @name session
 */
Object.defineProperty(exports, 'session', {
    get: function() { return require('./middleware/session'); }
});

/**
 * Middleware for [serving static resources](./static/index.html).
 * @name static
 */
Object.defineProperty(exports, 'static', {
    get: function() { return require('./middleware/static'); }
});

/**
 * Middleware for [file upload support](./upload/index.html).
 * @name upload
 */
Object.defineProperty(exports, 'upload', {
    get: function() { return require('./middleware/upload'); }
});

/**
 * Middleware for [cookie support](./cookie/index.html).
 * @name cookies
 */
Object.defineProperty(exports, 'cookies', {
    get: function() { return require('./middleware/cookies'); }
});

/**
 * Middleware for [CORS support](./cors/index.html).
 * @name cookies
 */
Object.defineProperty(exports, 'cors', {
    get: function() { return require('./middleware/cors'); }
});

/**
 * Middleware for [CSRF support](./csrf/index.html).
 * @name csrf
 */
Object.defineProperty(exports, 'csrf', {
    get: function() { return require('./middleware/csrf'); }
});

/**
 * Middleware for [HTTP content negotiation](./accept/index.html).
 * @name accept
 */
Object.defineProperty(exports, 'accept', {
    get: function() { return require('./middleware/accept'); }
});

/**
 * Middleware for [detecting the locale](./locale/index.html).
 * @name locale
 */
Object.defineProperty(exports, 'locale', {
    get: function() { return require('./middleware/locale'); }
});
