import * as fs from "node:fs";
import * as path from "node:path";

const LOGOS_DIR = path.resolve(process.cwd(), "public/logos");

// 1. OpenHands
const rawOpenHands = fs.readFileSync("/tmp/logos_raw/openhands.svg", "utf8");
// Extract inner paths
const openHandsPaths = rawOpenHands.replace(/<\?xml.*?\?>/g, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
const openHandsSvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  <g transform="translate(14, 30) scale(0.675)">
    ${openHandsPaths}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "openhands.svg"), openHandsSvg.trim() + "\n");

// 2. Firecrawl
const rawFirecrawl = fs.readFileSync("/tmp/logos_raw/firecrawl.svg", "utf8");
const firecrawlPaths = rawFirecrawl.replace(/<\?xml.*?\?>/g, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
const firecrawlSvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  <g transform="translate(35.25, 22.6) scale(1.15)">
    ${firecrawlPaths}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "firecrawl.svg"), firecrawlSvg.trim() + "\n");

// 3. ComfyUI
const rawComfyUI = fs.readFileSync("/tmp/logos_raw/comfyui.svg", "utf8");
const comfyUIPaths = rawComfyUI.replace(/<\?xml.*?\?>/g, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").replace(/fill="currentColor"/g, 'fill="#FFFFFF"').trim();
const comfyUISvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0D0E12"/>
  <g transform="translate(14, 50) scale(0.58)">
    ${comfyUIPaths}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "comfyui.svg"), comfyUISvg.trim() + "\n");

// 4. Continue
const rawContinue = fs.readFileSync("/tmp/logos_raw/continue.svg", "utf8");
const continueContent = rawContinue.replace(/<\?xml.*?\?>/g, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
const continueSvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  <g transform="translate(18, 18) scale(0.3066)">
    ${continueContent}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "continue.svg"), continueSvg.trim() + "\n");

// 5. CrewAI
const rawCrewAI = fs.readFileSync("/tmp/logos_raw/crewai.svg", "utf8");
// The CrewAI path has transform="translate(0.000000,48.000000) scale(0.100000,-0.100000)"
const crewAIContent = `<g transform="translate(20, 20) scale(1.833)">
  <g transform="translate(0, 48) scale(0.1, -0.1)" fill="#FF4B4B" stroke="none">
    <path d="M252 469 c-103 -22 -213 -172 -214 -294 -1 -107 60 -168 168 -167 130 1 276 133 234 211 -13 25 -27 26 -52 4 -31 -27 -32 -6 -4 56 34 77 33 103 -6 146 -38 40 -78 55 -126 44z m103 -40 c44 -39 46 -82 9 -163 -27 -60 -42 -68 -74 -36 -24 24 -26 67 -5 117 22 51 19 60 -11 32 -72 -65 -125 -189 -105 -242 9 -23 16 -27 53 -27 54 0 122 33 154 76 34 44 54 44 54 1 0 -75 -125 -167 -225 -167 -121 0 -181 92 -145 222 17 58 86 153 137 187 63 42 110 42 158 0z"/>
  </g>
</g>`;
const crewAISvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  ${crewAIContent}
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "crewai.svg"), crewAISvg.trim() + "\n");

// 6. Mem0
const rawMem0 = fs.readFileSync("/tmp/logos_raw/mem0.svg", "utf8");
const mem0Content = rawMem0.replace(/<\?xml.*?\?>/g, "").replace(/<svg[^>]*>/, "").replace(/<\/svg>/, "").trim();
const mem0Svg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  <g transform="translate(18, 18) scale(0.92)">
    ${mem0Content}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "mem0.svg"), mem0Svg.trim() + "\n");

// 7. Dify
const rawDify = fs.readFileSync("/tmp/logos_raw/dify.svg", "utf8");
// Replace fill="black" with fill="white" for dark background plate
const difyClean = rawDify
  .replace(/<\?xml.*?\?>/g, "")
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "")
  .replace(/fill="black"/g, 'fill="#FFFFFF"')
  .trim();
const difySvg = `<svg width="128" height="128" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" rx="28" fill="#0B1015"/>
  <g transform="translate(14.8, 41.5) scale(2.05)">
    ${difyClean}
  </g>
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "dify.svg"), difySvg.trim() + "\n");

// 8. LlamaIndex
const rawLlama = fs.readFileSync("/tmp/logos_raw/llamaindex.svg", "utf8");
// Standardize to 128x128
const llamaClean = rawLlama
  .replace(/<\?xml.*?\?>/g, "")
  .replace(/<svg[^>]*>/, "")
  .replace(/<\/svg>/, "")
  .trim();
const llamaSvg = `<svg width="128" height="128" viewBox="0 0 1920 1920" fill="none" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  ${llamaClean}
</svg>`;
fs.writeFileSync(path.join(LOGOS_DIR, "llamaindex.svg"), llamaSvg.trim() + "\n");

console.log("All 8 vector SVG logos created successfully under public/logos/!");
