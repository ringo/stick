var {Application} = require("stick");
var {htmlResponse} = require("stick/helpers");

var log = require('ringo/logging').getLogger(module.id);
var app = exports.app = Application();
app.configure("params", "upload", "render", "route");
app.render.base(module.resolve("skins"));
app.render.helpers(module.resolve("helpers"), "ringo/skin/macros");

// the main action is invoked for http://localhost:8080/
app.get("/", function(req) {
    return app.render('welcome.txt', {title: 'Demo'});
});

// additional path elements are passed to the action as arguments,
// e.g. /extra.path/2008/09
app.get("/extra_path/:year?/:month?", function(req, year, month) {
    return htmlResponse("Extra arguments:", year, month);
});

app.get("/upload", function(req) {
    return app.render('upload.txt', {
        title: "File Upload"
    });
});

app.post("/upload", function(req) {
    if (req.params.file) {
        return {
            status: 200,
            headers: {"Content-Type": req.params.file.contentType || "text/plain"},
            body: [req.params.file.value]
        };
    }
});

app.get("/testing", function(req) {
    if (req.params.runtests) {
        var test = require("ringo/engine").getRingoHome().getResource("test/most.js");
        var tests = require(test.path);
        var formatter = new (require("./helpers").HtmlTestFormatter)();
        require("test").run(tests, formatter);
        return htmlResponse(formatter);
    }
    return app.render('testing.txt', {
        title: "Unit Testing"
    });
});

app.get("/params", function(req) {
    return app.render('form.html');
});

// demo for skins, macros, filters
app.get("/skins", function(req) {
    return app.render('skins.txt', {
        title: 'Skins',
        name: 'Luisa',
        names: ['Benni', 'Emma', 'Luca', 'Selma']
    });
});

// demo for log4j logging
app.get("/logging", function(req) {
    if (req.params.info) {
        log.info("Hello world!");
    } else if (req.params.error) {
        try {
            throw new Error("something went wrong");
        } catch (e) {
            log.error(e);
        }
    } else if (req.params.profile) {
        // build and run a small profiler middleware stack
        var profiler = require('stick/middleware/profiler').middleware;
        return profiler(function() {
            return app.render('logging.txt', {
                title: "Logging &amp; Profiling"
            });
        }, {})(req);
    }
    return app.render('logging.txt', {
        title: "Logging &amp; Profiling"
    });
});

