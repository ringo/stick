#!/usr/bin/env ringo

// start server if run as main script
if (require.main === module) {
    require("stick/server").main(module.id);
}
