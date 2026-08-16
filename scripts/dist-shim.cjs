// Next.js builds into .next; some deploy checks look for a dist/ folder.
// This shim creates a minimal dist/ marker after a successful build.
const fs = require("fs");
const path = require("path");

const dist = path.join(process.cwd(), "dist");
fs.mkdirSync(dist, { recursive: true });
fs.writeFileSync(
  path.join(dist, "index.html"),
  "<!doctype html><meta http-equiv=\"refresh\" content=\"0;url=/\"><title>PW MARCO</title>"
);
fs.writeFileSync(
  path.join(dist, "build-info.json"),
  JSON.stringify({ framework: "next", output: ".next", builtAt: new Date().toISOString() }, null, 2)
);
console.log("dist/ marker written (real output in .next/)");
