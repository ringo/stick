# Stick

Stick is an extensible HTTP server framework for [RingoJS](http://ringojs.org/) to create modular web applications composed out of "plugins" (also known as "JSGI middleware functions").

## Overview

Compose web applications out of plugins:

    var {Application} = require("stick");

    var app = exports.app = Application();
    app.configure("notfound", "error", "static", "params", "mount");
    app.static(module.resolve("htdocs"));
    app.mount("/", require("./views"));

Currently Stick comes with the following middleware modules:

 * basicauth    - basic HTTP authentication
 * continuation - generator-based async requests
 * error        - generating error pages
 * etag         - ETag based conditional GET
 * gzip         - GZip content encoding
 * method       - HTTP method overriding
 * mount        - mounting other applications
 * notfound     - generating 404 pages
 * params       - form data parsing
 * profiler     - JavaScript profiling
 * render       - mustache.js templates
 * requestlog   - collecting per-request log messages
 * route        - Sinatra-like request routing
 * session      - session support
 * static       - serving static files
 * upload       - handling file uploads

Stick provides an `Application` object that can be used to compose web
applications out of JSGI middleware components. Middleware can in turn
define methods or properties on the application object to make itself
configurable to the outside world.

Check out the demo applications and documentation to learn more.

## Running

Use the ringo package manager to install Stick:

    $ rp install stick

To start the stick demo application run the `ringo` command with the 
`demo.js` script in the stick directory:

    $ ringo examples/demo.js

Then point your browser to <http://localhost:8080/>.

## License

Stick is distributed under the MIT license.
