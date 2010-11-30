// a simple web app
var {Application} = require("stick");

var app = exports.app = Application(function (req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return app.render('modules.txt', context);
});
app.configure("render");
app.render.base(module.resolve("skins"));
app.render.helpers(module.resolve("helpers"), "ringo/skin/macros");
