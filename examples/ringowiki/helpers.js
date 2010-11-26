var {app} = require('./actions');
var {Page} = require('./model');
var {Markdown} = require('ringo/markdown');
var {linkTo, urlFor} = require('stick/helpers');
var strings = require('ringo/utils/strings');

export(
    'markdown_filter',
    'navigation_macro',
    'linkTo_macro',
    'urlFor_macro'
);

function markdown_filter(content) {
    var markdown = new Markdown({
        lookupLink: function(id) {
            if (!strings.startsWith(id, "/") && !strings.isUrl(id.isUrl)) {
                return ["/" + encodeURIComponent(id),
                        "link to wiki page"];
            }
            return null;
        },
        openTag: function(tag, buffer) {
            buffer.append('<').append(tag);
            if (tag == "pre") {
                buffer.append(' class="sh_javascript"');
            }
            buffer.append('>');
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