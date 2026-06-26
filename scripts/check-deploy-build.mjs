#!/usr/bin/env node
/**
 * Deployment Regression Guard - Build Check Script
 * V19.3.7
 * 
 * Purpose: Prevent test pages / corrupted dist from being deployed.
 * Run automatically after `npm run build`.
 */

import fs from "fs";
import path from "path";

const DIST_INDEX = path.resolve(process.cwd(), "dist/public/index.html");
const ERRORS = [];
const WARNS = [];

console.log("🔍 [Deploy Guard] Checking build output...\n");

// ─── Check 1: dist/public/index.html must exist ───
if (!fs.existsSync(DIST_INDEX)) {
  ERRORS.push(`MISSING: ${DIST_INDEX} does not exist`);
} else {
  const content = fs.readFileSync(DIST_INDEX, "utf-8");

  // ─── Check 2: Must contain React root mount point ───
  if (!content.includes('<div id="root"></div>')) {
    ERRORS.push("MISSING: <div id=\"root\"></div> — not a React app");
  } else {
    console.log("  ✅ React mount point <div id=\"root\"></div> found");
  }

  // ─── Check 3: Must reference /assets/ (built JS/CSS) ───
  if (!content.includes("/assets/")) {
    ERRORS.push("MISSING: /assets/ references — build may be incomplete");
  } else {
    const assetMatches = content.match(/\/assets\/[^"']+/g) || [];
    console.log(`  ✅ ${assetMatches.length} asset references found (${assetMatches.join(", ")})`);
  }

  // ─── Check 4: Must NOT contain test page text ───
  const FORBIDDEN = [
    "如果看到這個頁面，部署正常",
    "如果看到這個頁面",
    "部署正常",
    "test-deploy",
    "this is a test page",
  ];
  for (const text of FORBIDDEN) {
    if (content.includes(text)) {
      ERRORS.push(`FORBIDDEN TEXT DETECTED: "${text}" — test page contamination!`);
    }
  }
  if (!ERRORS.some((e) => e.includes("FORBIDDEN"))) {
    console.log("  ✅ No test-page contamination detected");
  }

  // ─── Check 4b: Must NOT contain stale relative asset paths ───
  if (content.includes('src="./assets/')) {
    WARNS.push("Relative asset path ./assets/ detected (should be /assets/)");
  }

  // ─── Check 5: File size sanity check ───
  const stats = fs.statSync(DIST_INDEX);
  if (stats.size < 200) {
    ERRORS.push(`SUSPICIOUS SIZE: ${stats.size} bytes — likely not a real build`);
  } else {
    console.log(`  ✅ File size ${stats.size} bytes (looks reasonable)`);
  }
}

// ─── Check 6: Asset directory must exist with JS chunks ───
const ASSETS_DIR = path.resolve(process.cwd(), "dist/public/assets");
if (!fs.existsSync(ASSETS_DIR)) {
  ERRORS.push("MISSING: dist/public/assets/ directory");
} else {
  const files = fs.readdirSync(ASSETS_DIR);
  const jsFiles = files.filter((f) => f.endsWith(".js"));
  const cssFiles = files.filter((f) => f.endsWith(".css"));
  if (jsFiles.length === 0) {
    ERRORS.push("NO JS chunks found in dist/public/assets/");
  } else {
    console.log(`  ✅ ${jsFiles.length} JS chunk(s), ${cssFiles.length} CSS file(s) in assets/`);
  }
}

// ─── Summary ───
console.log("");
if (WARNS.length > 0) {
  console.log("⚠️  Warnings:");
  WARNS.forEach((w) => console.log(`   - ${w}`));
}

if (ERRORS.length > 0) {
  console.log("\n❌ [Deploy Guard] FAILED — Deployment BLOCKED:\n");
  ERRORS.forEach((e) => console.log(`   ✖ ${e}`));
  console.log("\n   Fix the issues above and rebuild.");
  console.log("   If you need to override: npm run build -- --no-check\n");
  process.exit(1);
}

console.log("✅ [Deploy Guard] ALL CHECKS PASSED — Safe to deploy.\n");
process.exit(0);
