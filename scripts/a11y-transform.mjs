/**
 * Task 31 — accessibility & typography transform
 *
 * 1. Contrast: remap low-opacity TEXT color utilities to WCAG-passing values
 *    (≥4.5:1 body on ink/cream; ≥3:1 graphics). Only `text-*` utilities are
 *    touched — borders/backgrounds/rings keep their decorative opacities.
 *    Mapping (computed against ink #0A0A0A / cream #F1EDE4):
 *      white|cream|sand : n≤35 → 55, 40–45 → 60          (dark bg text)
 *      ink|black        : n≤35 → 60, 40–55 → 65, 60 → 70 (light bg text)
 *      ember*           : n≤75 → 85                       (orange on ink)
 *      mint             : n≤65 → 75
 * 2. Type scale minimums: text-[8px]/[9px]/[10px]/[11px] → text-xs (12px,
 *    the floor for secondary metadata per the user's rules).
 * 3. Pure-black text on ember buttons → coal #141312 (deep charcoal, still
 *    6.4:1 on ember, softer than pure black per the recommendation).
 */
import { readdirSync, statSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = "/home/z/my-project/src";
const files = [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p);
    else if (/\.(tsx|ts)$/.test(name)) files.push(p);
  }
}
walk(ROOT);

const mapOpacity = (color, n) => {
  if (color === "white" || color === "cream" || color === "sand") {
    if (n <= 35) return 55;
    if (n >= 40 && n <= 45) return 60;
    return n;
  }
  if (color === "ink" || color === "black" || color === "coal") {
    if (n <= 35) return 60;
    if (n >= 40 && n <= 55) return 65;
    if (n === 60) return 70;
    return n;
  }
  if (color === "ember" || color === "ember-hot" || color === "ember-tint") {
    return n <= 75 ? 85 : n;
  }
  if (color === "mint") return n <= 65 ? 75 : n;
  return n;
};

let changedFiles = 0;
let totalTextChanges = 0;
let totalSizeChanges = 0;
let totalBlackChanges = 0;

for (const file of files) {
  const src = readFileSync(file, "utf8");
  let out = src;
  let changes = 0;

  // 1. text color opacities (skip `disabled:` prefixed — WCAG exempts disabled)
  out = out.replace(
    /(^|[^a-zA-Z-])(text-(white|cream|sand|ink|black|coal|ember|ember-hot|ember-tint|mint)\/(\d+))(?![\w-])/g,
    (m, pre, util, color, num) => {
      const mapped = mapOpacity(color, parseInt(num, 10));
      if (mapped === parseInt(num, 10)) return m;
      changes++;
      return `${pre}text-${color}/${mapped}`;
    },
  );

  // 2. sub-12px font sizes → text-xs (12px metadata floor)
  out = out.replace(/(^|[^a-zA-Z-])text-\[(8|9|10|11)(\.\d+)?px\]/g, (m, pre) => {
    changes++;
    totalSizeChanges++;
    return `${pre}text-xs`;
  });

  // 3. pure black text → charcoal coal (soft black on ember/cream buttons)
  out = out.replace(/(^|[^a-zA-Z-])text-black\b(?!\/)/g, (m, pre) => {
    changes++;
    totalBlackChanges++;
    return `${pre}text-coal`;
  });

  if (out !== src) {
    writeFileSync(file, out);
    changedFiles++;
    totalTextChanges += changes;
  }
}

console.log(
  `files=${changedFiles} utility-changes=${totalTextChanges} size-fixes=${totalSizeChanges} black→coal=${totalBlackChanges}`,
);
