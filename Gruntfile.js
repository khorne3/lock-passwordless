"use strict";

var fs = require("fs");
var pkg = require("./package");

var minor_version = pkg.version.replace(/\.(\d)*$/, "");
var major_version = pkg.version.replace(/\.(\d)*\.(\d)*$/, "");
var path = require("path");

function rename_release (v) {
  return function (d, f) {
    var dest = path.join(d, f.replace(/(\.min)?\.js$/, "-"+ v + "$1.js"));
    return dest;
  };
}

module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    aws_s3: {
      options: {
        accessKeyId:     process.env.S3_KEY,
        secretAccessKey: process.env.S3_SECRET,
        bucket:          process.env.S3_BUCKET,
        region:          process.env.S3_REGION,
        uploadConcurrency: 5,
        params: {
          CacheControl: "public, max-age=300"
        },
        // debug: true <<< use this option to test changes
      },
      clean: {
        files: [
          {action: "delete", dest: "js/lock-passwordless-" + pkg.version + ".js"},
          {action: "delete", dest: "js/lock-passwordless-" + pkg.version + ".min.js"},
          {action: "delete", dest: "js/lock-passwordless-" + major_version + ".js"},
          {action: "delete", dest: "js/lock-passwordless-" + major_version + ".min.js"},
          {action: "delete", dest: "js/lock-passwordless-" + minor_version + ".js"},
          {action: "delete", dest: "js/lock-passwordless-" + minor_version + ".min.js"}
        ]
      },
      publish: {
        files: [
          {
            expand: true,
            cwd:    "release/",
            src:    ["**"],
            dest:   "js/"
          }
        ]
      }
    },
    browserify: {
      options: {
        browserifyOptions: {
          extensions: ".jsx"
        }
      },
      dev: {
        options: {
          watch: true,
          keepAlive: true
        },
        src: "src/browser.js",
        dest: "build/auth0-lock-passwordless.js"
      },
      build: {
        src: "src/browser.js",
        dest: "build/auth0-lock-passwordless.js"
      }
    },
    clean: {
      build: ["build/", "release/"],
      dev: ["build/"]
    },
    connect: {
      dev: {
        options: {
          hostname: "*",
          base: [".", "build"],
          port: 3000
        }
      },
    },
    copy: {
      release: {
        files: [
          {expand: true, flatten: true, src: "build/*", dest: "release/", rename: rename_release(pkg.version)},
          {expand: true, flatten: true, src: "build/*", dest: "release/", rename: rename_release(minor_version)},
          {expand: true, flatten: true, src: "build/*", dest: "release/", rename: rename_release(major_version)}
        ]
      }
    },
    env: {
      build: {
        NODE_ENV: "production"
      }
    },
    http: {
      purge_js:           {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + pkg.version + ".js",       method: "DELETE"}},
      purge_js_min:       {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + pkg.version + ".min.js",   method: "DELETE"}},
      purge_major_js:     {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + major_version + ".js",     method: "DELETE"}},
      purge_major_js_min: {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + major_version + ".min.js", method: "DELETE"}},
      purge_minor_js:     {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + minor_version + ".js",     method: "DELETE"}},
      purge_minor_js_min: {options: {url: process.env.CDN_ROOT + "/js/lock-passwordless" + minor_version + ".min.js", method: "DELETE"} }
    },
    uglify: {
      build: {
        src: "build/auth0-lock-passwordless.js",
        dest: "build/auth0-lock-passwordless.min.js"
      }
    }
  });

  grunt.loadNpmTasks("grunt-aws-s3");
  grunt.loadNpmTasks("grunt-browserify");
  grunt.loadNpmTasks("grunt-contrib-clean");
  grunt.loadNpmTasks("grunt-contrib-connect");
  grunt.loadNpmTasks("grunt-contrib-copy");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-env");
  grunt.loadNpmTasks("grunt-http");


  grunt.registerTask("build", ["clean:build", "env:build", "browserify:build", "uglify:build"]);
  grunt.registerTask("dev", ["clean:dev", "connect:dev", "browserify:dev"]);
  grunt.registerTask("purge_cdn", ["http:purge_js", "http:purge_js_min", "http:purge_major_js", "http:purge_major_js_min", "http:purge_minor_js", "http:purge_minor_js_min"]);
  grunt.registerTask("cdn", ["build", "copy:release", "aws_s3:clean", "aws_s3:publish", "purge_cdn"]);

};