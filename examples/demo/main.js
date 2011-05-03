// start server if run as main script
if (require.main === module) {
    require("ringo/httpserver").main(module.resolve("config"));
}

