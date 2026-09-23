/**
 * Task 31 — interactive controls ≥14px: bump `text-xs` → `text-sm` inside
 * the opening tags of interactive elements (button, Button, Link, a, input,
 * textarea, SelectTrigger). Metadata text outside these tags is untouched.
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const files = [];
function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.tsx$/.test(n)) files.push(p);
  }
}
walk("/home/z/my-project/src");

const INTERACTIVE = /<(button|Button|Link|a|input|textarea|SelectTrigger)\b/;
let total = 0;

for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  let changed = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!INTERACTIVE.test(lines[i])) continue;
    let j = i;
    let chunk = lines[i];
    while (!/>\s*$/.test(chunk.trimEnd()) && j - i < 8 && j < lines.length - 1) {
      j++;
      chunk = lines[j];
    }
    for (let k = i; k <= j; k++) {
      if (/\btext-xs\b/.test(lines[k])) {
        lines[k] = lines[k].replace(/\btext-xs\b/g, "text-sm");
        changed++;
      }
    }
    i = j;
  }
  if (changed) {
    writeFileSync(f, lines.join("\n"));
    total += changed;
    console.log(`${f.replace("/home/z/my-project/", "")}: ${changed} lines`);
  }
}
console.log("total lines bumped:", total);
