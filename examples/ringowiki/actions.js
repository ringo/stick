var dates = require('ringo/utils/dates');
var strings = require('ringo/utils/strings');
var {Response} = require('ringo/webapp/response');
var {Page} = require('./model');
var helpers = require('./helpers');
var {Application} = require("stick");

var app = exports.app = Application();
app.configure("params", "render", "route");
app.render.base(module.resolve("skins"));
app.render.helpers(helpers, "ringo/skin/macros", "ringo/skin/filters");

app.get("/list", function(req) {
    return app.render('list.html', {
            pages: Page.all().sort(strings.Sorter('name'))
    });
});

app.get("/recent", function(req) {
    var limit = req.params.limit || 50;
    var changes = [];

    // Retrieve all changes.
    for each (var page in Page.all()) {
        for (var version in page.revisions) {
            changes.push({
                page: page,
                version: version,
                created: new Date(page.revisions[version].created)});
        }
    }

    // Sort them reverse chronologically.
    changes.sort(function (a, b) a.created > b.created ? -1 : 1);

    // Group changes by day.
    // @@ We probably should not manually do the grouping here, but rather use
    // a nice grouping function in some library somewhere.
    var days = [];
    var oldDay;
    for each (var change in changes.slice(0, limit)) {
        var curDay = dates.format(change.created, 'yyyy-MM-dd');
        if (curDay != oldDay) {
            days.push({title: curDay, changes: []});
            oldDay = curDay;
        }
        days[days.length - 1].changes.push(change);
    }
    return app.render('recent.html', { days: days });
});

app.get("/:name?", function(req, name) {
    name = name || 'home';
    var page = Page.byName(name);
    if (page) {
        var skin, title;
        if (name.toLowerCase() == 'home') {
            skin = 'index.html';
        } else {
            skin = 'page.html';
            title = page.name;
        }
        page.body = page.getRevision(req.params.version).body;
        return app.render(skin, {
            page: page,
            title: title,
            headline: title,
            version: version,
            basePath: req.scriptName
        });
    } else {
        return app.render('new.html', {
            name: name.replace(/_/g, ' ')
        });
    }
});

app.post("/:name?", function(req, name) {
    name = name || 'home';
    var page = new Page();
    page.updateFrom(req.params);
    page.save();
    return Response.redirect(req.scriptName + "/" + encodeURIComponent(name));
});

app.get("/:name/edit", function(req, name) {
    var page = Page.byName(name);
    page.body = page.getRevision(req.params.version).body;
    req.session.data.honeyPotName = "phonenumber_" + parseInt(Math.random() * 1000);
    return app.render('edit.html', {
        page: page,
        honeyPotName: req.session.data.honeyPotName,
    });
});

app.post("/:name/edit", function(req, name) {
    if (!req.session.data.honeyPotName || req.params[req.session.data.honeyPotName]) {
        throw "Bot detected. <h1>If you are not a bot complain in our mailinglist.</h1>";
    }
    var page = Page.byName(name);
    page.updateFrom(req.params);
    page.save();
    return Response.redirect(req.scriptName + "/" + encodeURIComponent(name));
});

