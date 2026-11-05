const binary = require("binary");
const assert = require("assert");
const {text} = require("ringo/jsgi/response");
const {Random, Arrays} = java.util;
const {GZIPOutputStream} = java.util.zip;
const {MemoryStream} = require("io");
const {ByteArrayOutputStream} = java.io;

const {Application} = require("../../lib/stick");
const {gzip, route} = require("../../lib/middleware");

const compress = (bytes) => {
    let inStream, outStream, byteArrayOutputStream;
    try {
        inStream = new MemoryStream(bytes);
        byteArrayOutputStream = new ByteArrayOutputStream();
        outStream = new GZIPOutputStream(byteArrayOutputStream);
        inStream.copy(outStream);
        outStream.finish();
        return binary.ByteArray.wrap(byteArrayOutputStream.toByteArray());
    } finally {
        outStream && outStream.close();
        inStream && inStream.close();
    }
};

const testBytes = new binary.ByteArray(50000);
(new Random()).nextBytes(testBytes.unwrap());
const TEST_STRING = testBytes.decodeToString();
const BIN_RESULT = compress(binary.toByteArray(TEST_STRING));

const bodyAsByteArray = function(body) {
   if (body && typeof body.forEach == "function") {
      const output = new ByteArrayOutputStream();
      const writer = function(part) {
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
        Arrays.equals(
            bodyAsByteArray(res.body).unwrap(),
            BIN_RESULT.unwrap()
        )
    );
};

if (require.main === module) {
    require("system").exit(require("test").run(module.id));
}
