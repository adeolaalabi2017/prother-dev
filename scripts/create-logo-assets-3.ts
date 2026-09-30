import fs from "fs";
import path from "path";

const LOGO_DIR = path.join(process.cwd(), "public/logos");
if (!fs.existsSync(LOGO_DIR)) {
  fs.mkdirSync(LOGO_DIR, { recursive: true });
}

// Crisp vector SVGs with dark rounded plate backdrops per AGENTS.md standards

const vorfluxSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#090D14"/>
  <path d="M8 10L16 23L24 10H19.5L16 16.2L12.5 10H8Z" fill="#38BDF8"/>
  <path d="M13.5 10L16 14.2L18.5 10H13.5Z" fill="#6366F1"/>
</svg>`;

const warpSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0D0E12"/>
  <path d="M7 10.5C7 9.67 7.67 9 8.5 9H17.5C21.64 9 25 12.36 25 16.5C25 20.64 21.64 24 17.5 24H8.5C7.67 24 7 23.33 7 22.5V10.5Z" fill="#181920"/>
  <path d="M10 12L17.5 16.5L10 21V12Z" fill="#22C55E"/>
  <path d="M16.5 12H20.5C22.43 12 24 13.57 24 15.5C24 17.43 22.43 19 20.5 19H16.5V12Z" fill="#10B981" opacity="0.8"/>
</svg>`;

const zedSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#18181B"/>
  <path d="M8 9.5H24V12.5L13 20H24V23H8V20L19 12.5H8V9.5Z" fill="#F43F5E"/>
</svg>`;

const clineSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0F172A"/>
  <circle cx="16" cy="16" r="10" fill="#1E293B" stroke="#38BDF8" stroke-width="1.5"/>
  <path d="M12 14.5L15 17.5L20 12.5" stroke="#38BDF8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="21" cy="10" r="2.5" fill="#F43F5E"/>
</svg>`;

const hyperbrowserSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <rect width="32" height="32" rx="7" fill="#0B0E14"/>
  <rect x="7" y="8" width="18" height="16" rx="3" fill="#1E2638" stroke="#60A5FA" stroke-width="1.2"/>
  <circle cx="10" cy="11" r="1" fill="#F87171"/>
  <circle cx="13" cy="11" r="1" fill="#FBBF24"/>
  <circle cx="16" cy="11" r="1" fill="#34D399"/>
  <path d="M11 17L15 14V20L11 17Z" fill="#60A5FA"/>
  <path d="M17 19H21" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
</svg>`;

fs.writeFileSync(path.join(LOGO_DIR, "vorflux.svg"), vorfluxSvg);
fs.writeFileSync(path.join(LOGO_DIR, "warp.svg"), warpSvg);
fs.writeFileSync(path.join(LOGO_DIR, "zed.svg"), zedSvg);
fs.writeFileSync(path.join(LOGO_DIR, "cline.svg"), clineSvg);
fs.writeFileSync(path.join(LOGO_DIR, "hyperbrowser.svg"), hyperbrowserSvg);

if (!fs.existsSync(path.join(LOGO_DIR, "pi-aside.png")) && fs.existsSync(path.join(LOGO_DIR, "aside.png"))) {
  fs.copyFileSync(path.join(LOGO_DIR, "aside.png"), path.join(LOGO_DIR, "pi-aside.png"));
}

console.log("✓ Vector logo SVGs created successfully!");
