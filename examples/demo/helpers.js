var {Markdown} = require('ringo/markdown');
var {Buffer} = require('ringo/buffer');
var mustache = require('./mustache-commonjs');
var response = require('ringo/jsgi/response');
var files = require('ringo/utils/files');

exports.render = function(template, context) {
    var base = getResource('./templates/base.html').content;
    var content = getResource(module.resolve(template)).content;
    context.markdown = markdown;
    context.base = require('./actions').app.base;
    context.content = mustache.to_html(content, context);
    return response.html(mustache.to_html(base, context));
};

function markdown(text) {
    var markdown = new Markdown({
        openTag: function(tag, buffer) {
            if (tag === "pre") {
                buffer.append("<pre class='code'>");
            } else {
                this.super$openTag(tag, buffer);
            }
        }
    });
    return markdown.process(text);
}

/**
 * A test output formatter for displaying ringo/unittest results in a web page
 */
exports.HtmlTestFormatter = function() {
    var buffer = new Buffer();
    var result = "";
    var path = [];

    this.writeHeader = function() {
    };

    this.enterScope = function(name) {
        path.push(name)
        buffer.writeln("<h3>Running \"", path.join("/"), "\"</h3>");
    };

    this.exitScope = function(name) {
        path.pop();
    };

    this.writeTestStart = function(name) {
        buffer.write("<div style='clear: both;'>Running ", name, "...");
    };

    this.writeTestPassed = function(time) {
        buffer.writeln(" <div style='float: right; background: #2b2; color: white; padding: 2px;'>PASSED</div>",
                " (" + time + " ms)</div>");
    };

    this.writeTestFailed = function(exception) {
        buffer.write(" <div style='float: right; background: red; color: white; padding: 2px;'>FAILED</div> ");
        buffer.write("<pre style='font-weight: bold;'>");
        exception.message.split(/\n/).forEach(function(line) {
            buffer.writeln("  ", line);
        });
        if (exception.stackTrace != null) {
            exception.stackTrace.forEach(function(line) {
                buffer.writeln("  ", line);
            });
        }
        buffer.write("</pre></div>");
    };

    this.writeSummary = function(summary) {
        if (summary.testsRun > 0) {
            result = new Buffer();
            result.writeln("<h2>Executed ", summary.testsRun, " tests in ", summary.time, " ms</h2>");
            result.writeln("<h3>Passed ", summary.passed + "; ", "Failed ", summary.failures + "; ", "Errors ", summary.errors + ";</h3>");
        } else {
            result = "<h2>No tests found</h2>";
        }
    };

    this.toString = function() {
        return result  + buffer.toString();
    }
};
