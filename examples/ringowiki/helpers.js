var {Markdown} = require('ringo/markdown');
var {Page} = require('./model');
var strings = require('ringo/utils/strings');
var render = require('ringo/skin').render;

export(
    'markdown_filter',
    'navigation_macro'
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
