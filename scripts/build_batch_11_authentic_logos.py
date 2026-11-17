import os
import urllib.request
import re
import xml.etree.ElementTree as ET

LOGOS_DIR = os.path.abspath("public/logos")
os.makedirs(LOGOS_DIR, exist_ok=True)

def fetch_url(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.read().decode("utf-8")

# 1. Clipdrop
clipdrop_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/clipdrop.svg")
clipdrop_paths = "".join(re.findall(r'<path.*?</path>', clipdrop_raw))
clipdrop_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Clipdrop</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {clipdrop_paths}
  </g>
</svg>'''

# 2. Bria AI
bria_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/briaai-color.svg")
bria_paths = "".join(re.findall(r'<path.*?</path>', bria_raw))
bria_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Bria AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {bria_paths}
  </g>
</svg>'''

# 3. AI21 Labs
ai21_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/ai21.svg")
ai21_paths = "".join(re.findall(r'<path.*?</path>', ai21_raw))
ai21_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>AI21 Labs</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {ai21_paths}
  </g>
</svg>'''

# 4. Baichuan AI
baichuan_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/baichuan-color.svg")
baichuan_paths = "".join(re.findall(r'<path.*?</path>', baichuan_raw))
baichuan_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Baichuan AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {baichuan_paths}
  </g>
</svg>'''

# 5. Moonshot AI
moonshot_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/moonshot.svg")
moonshot_paths = "".join(re.findall(r'<path.*?</path>', moonshot_raw))
moonshot_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Moonshot AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {moonshot_paths}
  </g>
</svg>'''

# 6. Zhipu AI (Z.ai official stylized Z mark)
zhipu_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Zhipu AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5.8, 5.8) scale(0.85)">
    <path clip-rule="evenodd" d="M12.105 2L9.927 4.953H.653L2.83 2h9.276zM23.254 19.048L21.078 22h-9.242l2.174-2.952h9.244zM24 2L9.264 22H0L14.736 2H24z" fill="#FFFFFF" fill-rule="evenodd"/>
  </g>
</svg>'''

# 7. Claude Code
claudecode_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/claudecode-color.svg")
claudecode_paths = "".join(re.findall(r'<path.*?</path>', claudecode_raw))
claudecode_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Claude Code</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {claudecode_paths}
  </g>
</svg>'''

# 8. Roo Code
roocode_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/roocode.svg")
roocode_paths = "".join(re.findall(r'<path.*?</path>', roocode_raw))
roocode_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Roo Code</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {roocode_paths}
  </g>
</svg>'''

# 9. Vectorizer.ai
vectorizer_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/vectorizerai.svg")
vectorizer_paths = "".join(re.findall(r'<path.*?</path>', vectorizer_raw))
vectorizer_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Vectorizer.ai</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FF6A00">
    {vectorizer_paths}
  </g>
</svg>'''

# 10. SiliconCloud
siliconcloud_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/siliconcloud-color.svg")
siliconcloud_paths = "".join(re.findall(r'<path.*?</path>', siliconcloud_raw))
siliconcloud_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>SiliconCloud</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {siliconcloud_paths}
  </g>
</svg>'''

logos = {
    "clipdrop": clipdrop_svg,
    "bria-ai": bria_svg,
    "ai21-labs": ai21_svg,
    "baichuan-ai": baichuan_svg,
    "moonshot-ai": moonshot_svg,
    "zhipu-ai": zhipu_svg,
    "claude-code": claudecode_svg,
    "roo-code": roocode_svg,
    "vectorizer-ai": vectorizer_svg,
    "siliconcloud": siliconcloud_svg,
}

for slug, svg_content in logos.items():
    svg_clean = "\n".join(line for line in svg_content.strip().split("\n") if line.strip())
    # Validate XML
    try:
        ET.fromstring(svg_clean)
    except Exception as e:
        print(f"Error parsing {slug}: {e}")
        raise e
    
    # Invariant checks: no em/en dashes
    assert "—" not in svg_clean and "–" not in svg_clean

    dest_path = os.path.join(LOGOS_DIR, f"{slug}.svg")
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(svg_clean + "\n")
    print(f"Wrote {dest_path} ({os.path.getsize(dest_path)} bytes)")

print("All 10 authentic logos built and validated successfully.")
