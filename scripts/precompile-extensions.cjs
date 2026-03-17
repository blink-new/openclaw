#!/usr/bin/env node

// Pre-compile extension .ts files to .js using Node's built-in TypeScript
// strip-types transform (Node 22.6+). Each .ts file gets a sibling .js
// with types stripped. Updates package.json entries from .ts → .js so
// Jiti loads plain JS at runtime instead of compiling TypeScript.

const { stripTypeScriptTypes } = require("node:module");
const fs = require("node:fs");
const path = require("node:path");

const extDir = path.join(process.cwd(), "extensions");
if (!fs.existsSync(extDir)) { process.exit(0); }

function walk(dir, out) {
  for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, f.name);
    if (f.isDirectory()) walk(full, out);
    else if (f.name.endsWith(".ts") && !f.name.endsWith(".d.ts")) out.push(full);
  }
}

let total = 0;
for (const ext of fs.readdirSync(extDir)) {
  const extPath = path.join(extDir, ext);
  const pkgPath = path.join(extPath, "package.json");
  if (!fs.existsSync(pkgPath)) continue;

  const tsFiles = [];
  const srcDir = path.join(extPath, "src");
  if (fs.existsSync(srcDir)) walk(srcDir, tsFiles);
  const indexTs = path.join(extPath, "index.ts");
  if (fs.existsSync(indexTs)) tsFiles.push(indexTs);
  if (tsFiles.length === 0) continue;

  let compiled = 0;
  for (const tsFile of tsFiles) {
    const source = fs.readFileSync(tsFile, "utf8");
    const jsFile = tsFile.replace(/\.ts$/, ".js");
    try {
      const js = stripTypeScriptTypes(source, { mode: "transform" });
      fs.writeFileSync(jsFile, js);
      compiled++;
    } catch (e) {
      // Type-only files or syntax errors — skip, Jiti will handle them
    }
  }

    for (const tsFile of tsFiles) {
      const jsFile = tsFile.replace(/\.ts$/, ".js");
      if (fs.existsSync(jsFile)) fs.unlinkSync(tsFile);
    }

    const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
    if (pkg.openclaw && pkg.openclaw.extensions) {
      pkg.openclaw.extensions = pkg.openclaw.extensions.map(function(e) { return e.replace(/\.ts$/, ".js"); });
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }
    console.log("Pre-compiled: " + ext + " (" + compiled + "/" + tsFiles.length + " files)");
  total += compiled;
}
console.log("Total: " + total + " files pre-compiled");
