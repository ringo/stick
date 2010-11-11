# Stick

Stick is a modular JSGI middleware composition layer and application framework.
It is currently developed to work with [RingoJS](http://ringojs.org/).

Stick provides an `Application` object that can be used to compose web
applications out of JSGI middleware components. Middleware can in turn
define methods or properties on the application object to make itself
configurable to the outside world.

For example, consider the following simplistic request logger middleware:

    function Logger(next, app) {

        // flag can be used switch logging on and off
        app.enableLogging = false;

        // the actual middleware function, called with each request
        return function(req) {
            if (app.enableLogging)
                print("Serving request: " + req);
            return next(req);
        };
    }

To use this middleware, your code would look something like this:

    var app = new Application();
    // ... configure other middleware
    app.configure(Logger);
    app.enableLogging = true;

Stick currently only provides the bare bones Application object, but the
plan is to bundle some middleware useful for building real web sites.