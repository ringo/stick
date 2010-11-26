var {app} = require('./actions');
var {Page} = require('./model');
var {Markdown} = require('ringo/markdown');
var {linkTo, urlFor} = require('stick/helpers');
var strings = require('ringo/utils/strings');

export(
    'markdown_filter',
    'navigation_macro',
    'linkTo_macro',
    'urlFor_macro',
    'url_macro'
);

function markdown_filter(content) {
    var markdown = new Markdown({
        lookupLink: function(id) {
            if (!strings.startsWith(id, "/") && !strings.isUrl(id.isUrl)) {
                return [urlFor(app, {name: id, action: "index"}),
                        "link to wiki page"];
            }
            return null;
        }
    });
    return markdown.process(content);
}

function navigation_macro(tag) {
    var page = Page.byName("navigation");
    if (page) {
        return render('./skins/navigation.txt', {
            content: page.getRevision().body
        });
    }
    return '';
}

function linkTo_macro(tag) {
    return linkTo(app, tag.namedParameters, tag.parameters[0]);
}

function urlFor_macro(tag) {
    return urlFor(app, tag.namedParameters);
}

function url_macro(tag) {
    return app.base + tag.parameters[0];
}