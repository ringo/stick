// a simple web app
var {Application} = require("stick");

var app = exports.app = Application(action);

function action(req) {
    var context = {
        title: 'Modules',
        path: req.scriptName + req.pathInfo
    };
    return app.render('modules.txt', context);
}