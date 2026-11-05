const assert = require("assert");
const system = require("system");

const {Server} = require("ringo/httpserver");
const response = require("ringo/jsgi/response");
const {request} = require("ringo/httpclient");

const {Application} = require("../../lib/stick");

require('ringo/logging').setConfig(getResource("./fixtures/httptest_log4j.properties"));

// Basic test configuration
let server;
const host = "127.0.0.1";
const port = "8282";
const baseUri = "http://" + host + ":" + port + "/";

// HTTP client callbacks
let success = function() {};
let error = function() { assert.fail("Error callback invoked by client."); };

/**
 * setUp pre every test
 */
exports.setUp = function() {
    const config = {
        host: host,
        port: port
    };

    const consumer = function(next, app) {
        return function(req) {
            // consume the request body and parse it in the servlet
            let map = req.env.servletRequest.getParameterMap();

            return next(req);
        }
    };

    const app = new Application();
    app.configure(consumer, "params", "route");

    app.post("/testConsumed", function (req) {
        // Access post params, otherwise parser will not be invoked
        req.postParams;

        assert.ok(typeof req.postParams === "object");
        assert.deepEqual(req.postParams, {
            "Name": "Jonathan Doe",
            "Age": "23",
            "Formula": "a + b == 13%!"
        });

        return response.ok().json({});
    });

    server = new Server(config);
    server.getDefaultContext().serveApplication(app);
    server.start();
};

/**
 * tearDown after each test
 */
exports.tearDown = function() {
    server.stop();
    server.destroy();
    server = null;
};

exports.testPostParamsParsingAfterConsumedInputStream = function () {
    request({
        url: baseUri + "testConsumed",
        method: "POST",
        headers: {},
        contentType: "application/x-www-form-urlencoded",
        data: new ByteString("Name=Jonathan+Doe&Age=23&Formula=a+%2B+b+%3D%3D+13%25%21", "UTF-8"),
        success: success,
        error: error
    });
};

if (require.main == module.id) {
    system.exit(require("test").run(module.id));
}
