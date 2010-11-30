// a simple web app
var {Application} = require("stick");

var app = exports.app = Application(action);
app.configure("render");
app.render.base(module.resolve("skins"));
app.render.helpers(module.resolve("helpers"), "ringo/skin/macros");

function action(req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return app.render('modules.txt', context);
}