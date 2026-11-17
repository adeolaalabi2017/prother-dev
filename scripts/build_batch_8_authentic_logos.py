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

# 1. LangGraph
langgraph_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/langgraph.svg")
langgraph_path = re.search(r'<path[^>]*>', langgraph_raw).group(0)
langgraph_path = re.sub(r'fill="[^"]*"', '', langgraph_path)
langgraph_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>LangGraph</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#00D2A0">
    {langgraph_path}</path>
  </g>
</svg>'''

# 2. Luma AI
luma_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/luma-color.svg")
# Extract paths and defs
luma_paths = "".join(re.findall(r'<path.*?</path>', luma_raw))
luma_defs = re.search(r'<defs>.*?</defs>', luma_raw, re.DOTALL).group(0)
luma_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Luma AI</title>
  {luma_defs}
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {luma_paths}
  </g>
</svg>'''

# 3. Ideogram
ideogram_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/ideogram.svg")
ideogram_path = re.search(r'<path.*?</path>', ideogram_raw).group(0)
ideogram_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Ideogram</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {ideogram_path}
  </g>
</svg>'''

# 4. CopilotKit
copilot_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/copilotkit-color.svg")
copilot_paths = "".join(re.findall(r'<path.*?</path>', copilot_raw))
copilot_defs = re.search(r'<defs>.*?</defs>', copilot_raw, re.DOTALL).group(0)
copilot_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>CopilotKit</title>
  {copilot_defs}
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {copilot_paths}
  </g>
</svg>'''

# 5. Recraft
recraft_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/recraft.svg")
recraft_paths = "".join(re.findall(r'<path.*?</path>', recraft_raw))
recraft_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Recraft</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#0055FF">
    {recraft_paths}
  </g>
</svg>'''

# 6. Replit
replit_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/replit-color.svg")
replit_path = re.search(r'<path.*?</path>', replit_raw).group(0)
replit_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Replit</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {replit_path}
  </g>
</svg>'''

# 7. Baseten
baseten_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/baseten.svg")
baseten_path = re.search(r'<path.*?</path>', baseten_raw).group(0)
baseten_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Baseten</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#00D284">
    {baseten_path}
  </g>
</svg>'''

# 8. Coze
coze_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/coze.svg")
coze_path = re.search(r'<path.*?</path>', coze_raw).group(0)
coze_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Coze</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#4D53E8">
    {coze_path}
  </g>
</svg>'''

# 9. Fish Audio
fish_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/fishaudio.svg")
fish_paths = "".join(re.findall(r'<path.*?</path>', fish_raw))
fish_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Fish Audio</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#00E5FF">
    {fish_paths}
  </g>
</svg>'''

# 10. Anyscale
anyscale_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/anyscale-color.svg")
anyscale_paths = "".join(re.findall(r'<path.*?</path>', anyscale_raw))
anyscale_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Anyscale</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {anyscale_paths}
  </g>
</svg>'''

logos = {
    "langgraph": langgraph_svg,
    "luma-ai": luma_svg,
    "ideogram": ideogram_svg,
    "copilotkit": copilot_svg,
    "recraft": recraft_svg,
    "replit": replit_svg,
    "baseten": baseten_svg,
    "coze": coze_svg,
    "fish-audio": fish_svg,
    "anyscale": anyscale_svg,
}

for slug, svg_content in logos.items():
    # Validate XML
    ET.fromstring(svg_content)
    
    # Assert no dashes
    assert "—" not in svg_content and "–" not in svg_content
    
    out_path = os.path.join(LOGOS_DIR, f"{slug}.svg")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg_content.strip() + "\n")
    print(f"Generated {slug}.svg ({len(svg_content)} bytes)")

print("All 10 authentic Batch 8 SVGs successfully generated and validated!")
