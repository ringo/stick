

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
         * @see Session
         * @name Request.instance.session
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
