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

# 1. Kling AI
kling_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/kling.svg")
kling_paths = "".join(re.findall(r'<path.*?</path>', kling_raw))
kling_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Kling AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {kling_paths}
  </g>
</svg>'''

# 2. Fireworks AI
fireworks_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/fireworks-color.svg")
fireworks_paths = "".join(re.findall(r'<path.*?</path>', fireworks_raw))
fireworks_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Fireworks AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {fireworks_paths}
  </g>
</svg>'''

# 3. Udio
udio_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/udio.svg")
udio_paths = "".join(re.findall(r'<path.*?</path>', udio_raw))
udio_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Udio</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {udio_paths}
  </g>
</svg>'''

# 4. Pika
pika_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/pika.svg")
pika_paths = "".join(re.findall(r'<path.*?</path>', pika_raw))
pika_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Pika</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {pika_paths}
  </g>
</svg>'''

# 5. SambaNova
sambanova_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/sambanova-color.svg")
sambanova_paths = "".join(re.findall(r'<path.*?</path>', sambanova_raw))
sambanova_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>SambaNova</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {sambanova_paths}
  </g>
</svg>'''

# 6. Tripo 3D
tripo_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/tripo-color.svg")
tripo_paths = "".join(re.findall(r'<path.*?</path>', tripo_raw))
tripo_defs_match = re.search(r'<defs>.*?</defs>', tripo_raw, re.DOTALL)
tripo_defs = tripo_defs_match.group(0) if tripo_defs_match else ""
tripo_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Tripo 3D</title>
  {tripo_defs}
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {tripo_paths}
  </g>
</svg>'''

# 7. Meshy
meshy_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/meshy-color.svg")
meshy_paths = "".join(re.findall(r'<path.*?</path>', meshy_raw))
meshy_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Meshy</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {meshy_paths}
  </g>
</svg>'''

# 8. Hedra
hedra_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/hedra.svg")
hedra_paths = "".join(re.findall(r'<path.*?</path>', hedra_raw))
hedra_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Hedra</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {hedra_paths}
  </g>
</svg>'''

# 9. FastGPT
fastgpt_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/fastgpt-color.svg")
fastgpt_paths = "".join(re.findall(r'<path.*?</path>', fastgpt_raw))
fastgpt_defs_match = re.search(r'<defs>.*?</defs>', fastgpt_raw, re.DOTALL)
fastgpt_defs = fastgpt_defs_match.group(0) if fastgpt_defs_match else ""
fastgpt_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>FastGPT</title>
  {fastgpt_defs}
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {fastgpt_paths}
  </g>
</svg>'''

# 10. MetaGPT
metagpt_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/metagpt.svg")
metagpt_paths = "".join(re.findall(r'<path.*?</path>', metagpt_raw))
metagpt_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>MetaGPT</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#3875FF">
    {metagpt_paths}
  </g>
</svg>'''

logos = {
    "kling-ai": kling_svg,
    "fireworks-ai": fireworks_svg,
    "udio": udio_svg,
    "pika": pika_svg,
    "sambanova": sambanova_svg,
    "tripo3d": tripo_svg,
    "meshy": meshy_svg,
    "hedra": hedra_svg,
    "fastgpt": fastgpt_svg,
    "metagpt": metagpt_svg,
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
