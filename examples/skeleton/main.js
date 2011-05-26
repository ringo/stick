// Script to run app from command line

if (require.main === module) {
    require("ringo/httpserver").main(module.directory);
}
