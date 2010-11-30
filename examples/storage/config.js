// to use Google app engine store replace the two lines below with:
// exports.store = require('ringo/storage/googlestore');
var Store = require('ringo/storage/filestore').Store;
exports.store = new Store('db');

exports.app = require("./main").app;
