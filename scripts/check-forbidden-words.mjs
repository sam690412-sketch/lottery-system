#!/usr/bin/env node
/**
 * check-forbidden-words.mjs  (V26-C)
 *
 * 禁用字檢查工具。純 Node 內建(fs/path),不依賴外部套件、不修改任何程式。
 *
 * 掃描範圍:src/**\/*.{ts,tsx,json}、public/**\/*.{html,json}
 * 排除:node_modules、dist、build、.git(及常見產物資料夾)
 * 白名單:任一行含註解標記 `forbidden-ok` 即略過該行。
 * 結果:發現禁用字 → 列出(檔案/行號/命中字/該行內容)並 process.exit(1);
 *       未發現 → 輸出 PASS 並 process.exit(0)。
 *
 * 用法:node scripts/check-forbidden-words.mjs
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// 禁用字(彩券不當宣稱)
const FORBIDDEN = [
  '中獎率',
  '命中率',
  '必中',
  '保證中獎',
  '提高中獎率',
  '提高中獎',
  '預測中獎',
  '預測',
];

const WHITELIST_MARK = 'forbidden-ok';
const EXCLUDE_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.next', 'coverage', 'out']);

// 掃描範圍:資料夾 + 允許副檔名
const SCAN_TARGETS = [
  { dir: 'src', exts: ['.ts', '.tsx', '.json'] },
  { dir: 'public', exts: ['.html', '.json'] },
];

/** 遞迴收集符合副檔名的檔案,排除 EXCLUDE_DIRS。 */
function walk(dir, exts, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return; // 資料夾不存在 → 略過
  }
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (EXCLUDE_DIRS.has(entry.name)) continue;
      walk(path.join(dir, entry.name), exts, acc);
    } else if (entry.isFile() && exts.includes(path.extname(entry.name))) {
      acc.push(path.join(dir, entry.name));
    }
  }
}

const files = [];
for (const { dir, exts } of SCAN_TARGETS) {
  walk(path.join(ROOT, dir), exts, files);
}

const hits = [];
for (const file of files) {
  let content;
  try {
    content = fs.readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const lines = content.split(/\r?\n/);
  lines.forEach((line, idx) => {
    if (line.includes(WHITELIST_MARK)) return; // 白名單略過該行
    const found = [...new Set(FORBIDDEN.filter((w) => line.includes(w)))];
    if (found.length > 0) {
      hits.push({
        file: path.relative(ROOT, file),
        line: idx + 1,
        words: found,
        text: line.trim(),
      });
    }
  });
}

if (hits.length > 0) {
  console.error(`\n❌ 發現禁用字 ${hits.length} 處:\n`);
  for (const h of hits) {
    console.error(`  ${h.file}:${h.line}  [${h.words.join(', ')}]`);
    console.error(`    ${h.text}`);
  }
  console.error(
    `\n共 ${hits.length} 處。請移除這些字眼,或在該行加上註解 \`${WHITELIST_MARK}\` 以白名單略過(僅限正當用途)。`,
  );
  process.exit(1);
} else {
  console.log(`✅ PASS:已掃描 ${files.length} 個檔(src/public),未發現禁用字。`);
  process.exit(0);
}
