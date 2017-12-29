/**
 * @fileOverview Middleware for collecting log messages issued during execution
 * of the current request.
 *
 * This adds a `requestlog` property to the application object with an `items`
 * property. During execution of a request `items` contains an array containing
 * all the log messages issued for the request. Log messages are represented
 * as arrays in the format `[time, level, name, message]`.
 *
 * During request execution, the `requestlog` property also defines a
 * property called `start` containing the time the execution started.
 *
 * By default, messages are appended to the response if its Content-Type is
 * `text/html`. This can be controlled using the `app.requestlog.append`
 * boolean flag.
 */

const numbers = require('ringo/utils/numbers');
const strings = require('ringo/utils/strings');
const Buffer = require('ringo/buffer').Buffer;
const logging = require('ringo/logging');
const {Headers, ResponseFilter} = require('ringo/utils/http');

const {Thread} = java.lang;
const {ConcurrentHashMap} = java.util.concurrent;

const threadMap = new ConcurrentHashMap();

function collect() {
    const obj = threadMap.get(Thread.currentThread());
    if (obj && obj.items) {
        const args = Array.slice(arguments);
        args.unshift(new Date()); // inject date
        obj.items.push(args);
    }
}

logging.on("trace", collect.bind(undefined, "trace"));
logging.on("debug", collect.bind(undefined, "debug"));
logging.on("info", collect.bind(undefined, "info"));
logging.on("warn", collect.bind(undefined, "warn"));
logging.on("error", collect.bind(undefined, "error"));

function RequestLog() {
    this.enable = true;
    this.append = true;
}

Object.defineProperties(RequestLog.prototype, {
    items: {
        get: function() {
            const obj = threadMap.get(Thread.currentThread());
            return obj && obj.items ? obj.items : null;
        },
        enumerable: true
    },
    start: {
        get: function() {
            const obj = threadMap.get(Thread.currentThread());
            return obj && obj.start ? obj.start : null;
        },
        enumerable: true
    },
});

/**
 * Middleware for collecting log messages issued during execution of the current
 * request.
 *
 * @param {Function} next the wrapped middleware chain
 * @param {Object} app the Stick Application object
 * @returns {Function} a JSGI middleware function
 */
exports.middleware = function requestlog(next, app) {

    app.requestlog = new RequestLog();

    return function requestlog(request) {

        if (!app.requestlog.enable) {
            return next(request);
        }

        let items = [],
            start = Date.now(),
            thread = Thread.currentThread(),
            response;

        try {
            const contained = threadMap.containsKey(thread);
            if (!contained) {
                threadMap.put(thread, {
                            items: items,
                            start: start
                        });
            }
            response = next(request);
        } finally {
            if (!contained) threadMap.remove(thread);
        }

        if (app.requestlog.append) {
            const {status, headers, body} = response;

            // only do this for ordinary HTML responses
            const contentType = Headers(headers).get("content-type");
            if (status !== 200 && status < 400 || !contentType
                    || !strings.startsWith(contentType, "text/html")) {
                return response;
            }

            if (items.length > 0) {
                response.body = new ResponseFilter(body, function(part) {
                    if (typeof part !== "string" || part.lastIndexOf("</body>") === -1) {
                        return part;
                    }
                    return appendMessages(part, items, start);
                });
            }
        }

        return response;
    };
};

function appendMessages(part, items, start) {
    const buffer = new Buffer();
    for (let i = 0; i < items.length; i++) {
        appendMessage(buffer, items[i], start);
    }
    const insert = part.lastIndexOf("</body>");
    return part.substring(0, insert) + buffer + part.substring(insert);
}

function appendMessage(buffer, item, start) {
    const [time, level, name, message] = item;
    const multiline = message
            && (message.trim().indexOf('\n') > 0 || message.indexOf('\r')> 0);
    const bgcolor = colors[level] || '#fff';
    buffer.write("<div class='ringo-debug-line' style='background:", bgcolor,
                 "; color: black; border-top: 1px solid black; clear: both;'>");
    const timePassed = numbers.format(time - start, "00000");
    const formatted = strings.format("{} [{}] {}: {}", timePassed, level, name, message);
    if (multiline) {
        buffer.write("<pre>", formatted, "</pre>");
    } else {
        buffer.write(formatted);
    }
    buffer.writeln("</div>");
}

const colors = {
    trace: '#fff',
    debug: '#fff',
    info: '#ff6',
    warn: '#ff0',
    error: '#f90',
    fatal: '#f30'
};
