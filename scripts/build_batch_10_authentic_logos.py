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

# 1. Civitai
civitai_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/civitai.svg")
civitai_paths = "".join(re.findall(r'<path.*?</path>', civitai_raw))
civitai_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Civitai</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {civitai_paths}
  </g>
</svg>'''

# 2. Black Forest Labs
bfl_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/bfl.svg")
bfl_paths = "".join(re.findall(r'<path.*?</path>', bfl_raw))
bfl_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Black Forest Labs</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {bfl_paths}
  </g>
</svg>'''

# 3. PydanticAI
pydantic_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/pydanticai.svg")
pydantic_paths = "".join(re.findall(r'<path.*?</path>', pydantic_raw))
pydantic_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>PydanticAI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#E92063">
    {pydantic_paths}
  </g>
</svg>'''

# 4. Hailuo AI
hailuo_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/hailuo.svg")
hailuo_paths = "".join(re.findall(r'<path.*?</path>', hailuo_raw))
hailuo_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Hailuo AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {hailuo_paths}
  </g>
</svg>'''

# 5. Haiper
haiper_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/haiper.svg")
haiper_paths = "".join(re.findall(r'<path.*?</path>', haiper_raw))
haiper_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Haiper</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {haiper_paths}
  </g>
</svg>'''

# 6. Phidata
phidata_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/phidata.svg")
phidata_paths = "".join(re.findall(r'<path.*?</path>', phidata_raw))
phidata_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Phidata</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#5699DB">
    {phidata_paths}
  </g>
</svg>'''

# 7. DeepInfra
deepinfra_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/deepinfra-color.svg")
deepinfra_paths = "".join(re.findall(r'<path.*?</path>', deepinfra_raw))
deepinfra_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>DeepInfra</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {deepinfra_paths}
  </g>
</svg>'''

# 8. Hyperbolic
hyperbolic_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/hyperbolic-color.svg")
hyperbolic_paths = "".join(re.findall(r'<path.*?</path>', hyperbolic_raw))
hyperbolic_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Hyperbolic</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {hyperbolic_paths}
  </g>
</svg>'''

# 9. Novita AI
novita_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/novita-color.svg")
novita_paths = "".join(re.findall(r'<path.*?</path>', novita_raw))
novita_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Novita AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {novita_paths}
  </g>
</svg>'''

# 10. Lepton AI
lepton_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/leptonai.svg")
lepton_paths = "".join(re.findall(r'<path.*?</path>', lepton_raw))
lepton_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Lepton AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {lepton_paths}
  </g>
</svg>'''

logos = {
    "civitai": civitai_svg,
    "black-forest-labs": bfl_svg,
    "pydantic-ai": pydantic_svg,
    "hailuo-ai": hailuo_svg,
    "haiper": haiper_svg,
    "phidata": phidata_svg,
    "deepinfra": deepinfra_svg,
    "hyperbolic": hyperbolic_svg,
    "novita-ai": novita_svg,
    "lepton-ai": lepton_svg,
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
