/**
 * @fileoverview This module provides middleware for HTTP sessions.
 *
 * It adds a `session` property to the request object that allows to store
 * arbitrary data on on a per-visitor basis.
 *
 * The default session implementation is based on Java Servlet sessions.
 * This can be overridden by setting the `app.session.impl` property to an
 * alternative session constructor.
 *
 *     app.session.impl = MySession;
 *
 * The session constructor will be called
 * with the request object as only argument when the session is first accessed.
 */

/**
 * This middleware provides support for anonymous user sessions.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function session(next, app) {

    // make session implementation configurable
    app.session = {
        impl: ServletSession
    };

    return function session(req) {

        var _session;

        /**
         * A session object for the current request. If no session exists
         * a new one will be created.
         * @see ServletSession
         * @name request.session
         */
        Object.defineProperty(req, "session", {
            get: function() {
                if (!_session)
                    _session = new app.session.impl(req);
                return _session;
            }
        });

        return next(req);
    };
};


/**
 * An HTTP session object based on top of servlet sessions.
 * Properties of the session's data object are persisted
 * between requests of the same client.
 * @param request a JSGI or servlet request object
 */
var ServletSession = exports.ServletSession = function(request) {

    var data;
    var servletRequest = request instanceof javax.servlet.ServletRequest ?
            request : request.env.servletRequest;

    function getSession() {
        return servletRequest.getSession();
    }

    /**
     * A container for things to store in this session between requests.
     */
    Object.defineProperty(this, "data", {
        get: function() {
            if (!data) {
                // session.data is a JavaAdapter that directly proxies property access
                // to the attributes in the servlet session object.
                data = new JavaAdapter(org.mozilla.javascript.NativeObject, {
                    put: function(name, start, value) {
                        getSession().setAttribute(name, value);
                    },
                    get: function(name, start) {
                        return getSession().getAttribute(name);
                    }
                });
            }
            return data;
        }
    });

    /**
     * True if this session was created in the current request.
     * This can be useful to find out if the client has cookies disabled
     * for cookie-based sessions.
     */
    Object.defineProperty(this, "isNew", {
        get: function() {
            return getSession().isNew();
        }
    })

};
