const binary = require("binary");
const assert = require("assert");
const {text} = require("ringo/jsgi/response");

const {Application} = require("../../lib/stick");
const {gzip, route} = require("../../lib/middleware");

const TEST_STRING = "a simple string".repeat(1000);
const BIN_RESULT = new binary.ByteArray([
    31, 139, 8, 0, 0, 0, 0, 0, 0, 0, 237, 199, 65, 9, 0, 32, 16, 0, 176, 42, 87, 205, 135, 200, 129, 138, 168, 253,
    177, 128, 17, 182, 223, 74, 156, 28, 171, 215, 56, 119, 231, 108, 69, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85,
    85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 85, 245, 215, 7, 179, 94, 205, 158, 152, 58, 0, 0
]);

const bodyAsByteArray = function(body) {
   if (body && typeof body.forEach == "function") {
      var output = new java.io.ByteArrayOutputStream();
      var writer = function(part) {
         if (!(part instanceof binary.Binary)) {
            part = binary.toByteString(part, charset);
         }
         output.write(part);
      };
      body.forEach(writer);
      if (typeof body.close == "function") {
         body.close(writer);
      }

      return binary.ByteArray.wrap(output.toByteArray());
   } else {
      throw new Error("Response body doesn't implement forEach: " + body);
   }
};

exports.testGzip = function() {
    const app = new Application();

    app.configure(gzip, route);
    app.get("/test", function() { return text(TEST_STRING) });

    let res = app({
        method: "GET",
        headers: {},
        env: {},
        pathInfo: "/test"
    });
    
    assert.equal(res.status, 200);
    assert.equal(res.body, TEST_STRING);

    res = app({
        method: "GET",
        headers: {
            "accept-encoding": "gzip, deflate"
        },
        env: {},
        pathInfo: '/test'
    });

    assert.equal(res.status, 200);
    assert.isTrue(
        java.util.Arrays.equals(
            bodyAsByteArray(res.body).unwrap(),
            BIN_RESULT.unwrap()
        )
    );
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
