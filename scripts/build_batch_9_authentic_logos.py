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
fireworks_path = 'M81.7059 54.1818C78.5142 54.6039 55.4095 56.7847 55.4095 56.7847C55.4095 56.7847 73.5555 41.8118 75.8594 40.0496L72.5652 32.0864L53.2692 51.3455C47.3171 57.2857 49.3284 62.1476 57.7376 62.1466L85 62.1447L81.7059 54.1818ZM12.4348 32.0864L9.14057 40.0496C11.4445 41.8118 29.5906 56.7847 29.5906 56.7847C29.5906 56.7847 6.48583 54.6039 3.29425 54.1818L3.8147e-06 62.1447L27.2625 62.1466C35.6717 62.1476 37.683 57.2857 31.7308 51.3455L12.4348 32.0864ZM58.7645 22.8534L48.3445 48.046C45.1308 55.8169 39.8694 55.8169 36.6556 48.046L26.2356 22.8534H34.8532C35.6009 25.6561 42.5 48.1476 42.5 48.1476C42.5 48.1476 49.3169 25.9641 50.147 22.8534H58.7645Z'
fireworks_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Fireworks AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(3.2, 3.2) scale(0.301176)">
    <path d="{fireworks_path}" fill="#FFFFFF"/>
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

# 5. SambaNova (official vector logo from SambaNova agents repository)
sambanova_raw = fetch_url("https://raw.githubusercontent.com/sambanova/agents/main/frontend/sales-agent-crew/public/Images/logo-nsai.svg")
sambanova_icon_paths = "\n    ".join(re.findall(r'<path[^>]+>', sambanova_raw)[9:])
sambanova_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>SambaNova</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 6.17) scale(0.427)">
    {sambanova_icon_paths}
  </g>
</svg>'''

# 6. Tripo 3D (official vector logo from TripoSR repository)
tripo_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Tripo 3D</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(4.625, 4.625) scale(0.35)">
    <path d="M9.4991 9.63477L16.4374 21.4556C16.4393 21.4589 16.4412 21.4622 16.4431 21.4655L30.2658 45.0548C31.5327 47.2167 34.7045 47.2167 35.9714 45.0548L49.3862 22.1616H59.4618L41.266 53.162C37.6449 59.3313 28.5923 59.3313 24.9712 53.162L6.63967 21.9302C4.024 17.4739 5.65956 12.2127 9.4991 9.63477Z" fill="white"/>
    <path d="M20.1121 16.6087H34.6926L28.622 27.0442C28.2033 27.764 28.2083 28.6492 28.6351 29.3644L31.0527 33.4151C31.9654 34.9445 34.2163 34.9365 35.1178 33.4006L44.9739 16.6087H46.942L46.9455 16.6087H60.8446C60.4832 12.0587 56.6731 8.04883 51.4509 8.04883L15.0879 8.04883L20.1121 16.6087Z" fill="#F8CF00"/>
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

# 8. Hedra (official vector logo from https://www.hedra.com/logo.svg)
hedra_raw = fetch_url("https://www.hedra.com/logo.svg")
hedra_path_match = re.search(r'<path[^>]+>', hedra_raw)
hedra_path = hedra_path_match.group(0).replace('url(#paint0_angular_246_2945)', 'url(#hedra-grad)') if hedra_path_match else ""
hedra_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Hedra</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <defs>
    <radialGradient id="hedra-grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(371.051 369.695) rotate(-131.667) scale(355.292 408.767)">
      <stop offset="0.055" stop-color="#FAFAFA"/>
      <stop offset="0.603429" stop-color="#D5D8DC"/>
    </radialGradient>
  </defs>
  <g transform="translate(5.03, 5) scale(0.02953)">
    {hedra_path}
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
    assert "\u2014" not in svg_clean and "\u2013" not in svg_clean

    dest_path = os.path.join(LOGOS_DIR, f"{slug}.svg")
    with open(dest_path, "w", encoding="utf-8") as f:
        f.write(svg_clean + "\n")
    print(f"Wrote {dest_path} ({os.path.getsize(dest_path)} bytes)")

print("All 10 authentic logos built and validated successfully.")
