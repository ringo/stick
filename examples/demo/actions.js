var {Application, middleware} = require("stick");
var response = require("ringo/jsgi/response");
var {render} = require("./helpers");

var log = require('ringo/logging').getLogger(module.id);
var app = exports.app = Application();
app.configure("params", "upload", "route");

app.get("*.xyz", function(req, path) {
    return response.html(path);
});

// the main action is invoked for http://localhost:8080/
app.get("/", function(req) {
    return render('templates/welcome.txt', {title: 'Demo'});
});

// additional path elements are passed to the action as arguments,
// e.g. /extra.path/2008/09
app.get("/extrapath/:year?/:month?", function(req, year, month) {
    return response.html("Extra arguments:", year, month);
});

app.get("/upload", function(req) {
    return render('templates/upload.txt', {
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
        return response.html(formatter);
    }
    return render('templates/testing.txt', {
        title: "Unit Testing"
    });
});

// demo for skins, macros, filters
app.get("/skins", function(req) {
    return render('templates/skins.txt', {
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
        var profiler = middleware.profiler.middleware;
        return profiler(function() {
            return render('templates/logging.txt', {
                title: "Logging &amp; Profiling"
            });
        }, {})(req);
    }
    return render('templates/logging.txt', {
        title: "Logging &amp; Profiling"
    });
});

