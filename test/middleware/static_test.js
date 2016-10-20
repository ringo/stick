const fs = require("fs");
const system = require("system");
const assert = require("assert");

var {Application} = require("../../lib/stick");
var {static} = require("../../lib/middleware");

const bodyAsString = function(body, charset) {
   if (body && typeof body.forEach == "function") {
      var output = new java.io.ByteArrayOutputStream();
      var writer = function(part) {
         if (!(part instanceof Binary)) {
            part = part.toByteString(charset);
         }
         output.write(part);
      };
      body.forEach(writer);
      if (typeof body.close == "function") {
         body.close(writer);
      }

      return output.toString(charset);
   } else {
      throw new Error("Response body doesn't implement forEach: " + body);
   }
};

const bodyAsByteArray = function(body) {
   if (body && typeof body.forEach == "function") {
      var output = new java.io.ByteArrayOutputStream();
      var writer = function(part) {
         if (!(part instanceof Binary)) {
            part = part.toByteString(charset);
         }
         output.write(part);
      };
      body.forEach(writer);
      if (typeof body.close == "function") {
         body.close(writer);
      }

      return ByteArray.wrap(output.toByteArray());
   } else {
      throw new Error("Response body doesn't implement forEach: " + body);
   }
};

exports.testStaticFile = function() {
   var app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic");

   let response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.equal(response.headers["Cache-Control"], "max-age=0");
};

exports.testMaxAge = function() {
   let app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      maxAge: 1000
   });

   let response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.equal(response.headers["Cache-Control"], "max-age=1000");

   app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic");

   response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.equal(response.headers["Cache-Control"], "max-age=0");
};

exports.testLastModified = function() {
   var app = new Application();
   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      lastModified: false
   });

   let response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.isUndefined(response.headers["Last-Modified"]);

   app = new Application();
   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic");

   response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.isNotUndefined(response.headers["Last-Modified"]);

   let lastModified = fs.lastModified(fs.join(module.resolve("./fixtures"), "index.html"));
   let sdf = new java.text.SimpleDateFormat("E, d MMM yyyy HH:mm:ss z", java.util.Locale.US);
   sdf.setTimeZone(java.util.TimeZone.getTimeZone("GMT"));
   assert.equal(response.headers["Last-Modified"], sdf.format(lastModified));
};

exports.testSetHeaders = function() {
   let app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      setHeaders: function() {
         return {
            "x-foo": "bar",
            "x-seestadt-cafe": "united in cycling",
            "Cache-Control": "max-age=123456"
         }
      }
   });

   let response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "gzip"
      },
      env: {},
      pathInfo: '/customStatic/'
   });

   assert.equal(response.status, 200);
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(response.headers["Content-Encoding"], "gzip");
   assert.equal(response.headers["Cache-Control"], "max-age=123456");
   assert.equal(response.headers["x-foo"], "bar");
   assert.equal(response.headers["x-seestadt-cafe"], "united in cycling");
};

exports.testDotfiles = function() {
   let app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      "dotfiles": "allow"
   });

   let response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "gzip"
      },
      env: {},
      pathInfo: '/customStatic/.DotfileExample'
   });

   assert.equal(response.status, 200);
   assert.equal(response.headers["Content-Type"], "text/plain");

   // DENY
   app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      "dotfiles": "deny"
   });

   response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "gzip"
      },
      env: {},
      pathInfo: '/customStatic/.DotfileExample'
   });

   assert.equal(response.status, 403);
   assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");

   // IGNORE
   app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      "dotfiles": "IgNoRe"
   });

   response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "gzip"
      },
      env: {},
      pathInfo: '/customStatic/.DotfileExample'
   });

   assert.equal(response.status, 404);
   assert.equal(response.headers["content-type"], "text/plain; charset=utf-8");
};

exports.testPrecompressedStaticFile = function() {
   let app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {});

   let response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "gzip"
      },
      env: {},
      pathInfo: '/customStatic/'
   });

   assert.equal(response.status, 200);
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(response.headers["Content-Encoding"], "gzip");
   assert.equal(response.headers["Cache-Control"], "max-age=0");

   response = app({
      method: 'GET',
      headers: {
         "accept-encoding": "GzIp"
      },
      env: {},
      pathInfo: '/customStatic/'
   });

   assert.equal(response.status, 200);
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(response.headers["Content-Encoding"], "gzip");
   assert.equal(response.headers["Cache-Control"], "max-age=0");

   const ba = new ByteArray([0x1F, 0x8B, 0x08, 0x08, 0x81, 0xF1, 0xD6, 0x56, 0x00, 0x03, 0x69, 0x6E, 0x64, 0x65, 0x78,
      0x2E, 0x68, 0x74, 0x6D, 0x6C, 0x00, 0xB3, 0x51, 0x74, 0xF1, 0x77, 0x0E, 0x89, 0x0C, 0x70,
      0x55, 0xC8, 0x28, 0xC9, 0xCD, 0xB1, 0x03, 0x00, 0x2B, 0x29, 0x0D, 0x51, 0x0F, 0x00, 0x00, 0x00]);
   assert.isTrue(java.util.Arrays.equals(bodyAsByteArray(response.body).unwrap(), ba.unwrap()), "gzipped content not equal!")

   response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/foo.html'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html><foo></foo>");
   assert.equal(response.headers["Cache-Control"], "max-age=0");
};

exports.testDeactivatedPrecompression = function() {
   var app = new Application();

   app.configure("static");
   app.static(module.resolve("./fixtures"), "index.html", "/customStatic", {
      servePrecompressed: false
   });

   let response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html>");
   assert.equal(response.headers["Cache-Control"], "max-age=0");

   response = app({
      method: 'GET',
      headers: {},
      env: {},
      pathInfo: '/customStatic/foo.html'
   });
   assert.equal(response.headers["Content-Type"], "text/html");
   assert.equal(bodyAsString(response.body, "utf-8"), "<!DOCTYPE html><foo></foo>");
   assert.equal(response.headers["Cache-Control"], "max-age=0");
};

if (require.main === module) {
   require("system").exit(require("test").run(module.id));
}