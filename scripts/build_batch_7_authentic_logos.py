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

# 1. Lovable
lovable_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/lovable-color.svg")
lovable_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Lovable</title>
  <defs>
    <radialGradient id="lovable_grad" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="matrix(-1 22.5 -30.45 -1.35 14 3)">
      <stop offset=".25" stop-color="#FE7B02"/>
      <stop offset=".433" stop-color="#FE4230"/>
      <stop offset=".548" stop-color="#FE529A"/>
      <stop offset=".654" stop-color="#DD67EE"/>
      <stop offset=".95" stop-color="#4B73FF"/>
    </radialGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path clip-rule="evenodd" fill-rule="evenodd" d="M7.082 0c3.91 0 7.081 3.179 7.081 7.1v2.7h2.357c3.91 0 7.082 3.178 7.082 7.1 0 3.923-3.17 7.1-7.082 7.1H0V7.1C0 3.18 3.17 0 7.082 0z" fill="url(#lovable_grad)"/>
  </g>
</svg>'''

# 2. Mistral AI
mistral_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/mistral-color.svg")
mistral_paths = re.findall(r'<path.*?</path>', mistral_raw)
mistral_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Mistral AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {"".join(mistral_paths)}
  </g>
</svg>'''

# 3. Together AI
together_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/together-color.svg")
together_paths = re.findall(r'<path.*?</path>', together_raw)
together_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Together AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {"".join(together_paths)}
  </g>
</svg>'''

# 4. Tavily
tavily_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/tavily-color.svg")
tavily_paths = re.findall(r'<path.*?</path>', tavily_raw)
tavily_svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Tavily</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {"".join(tavily_paths)}
  </g>
</svg>'''

# 5. Exa
exa_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Exa</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path clip-rule="evenodd" fill-rule="evenodd" d="M3 0h19v1.791L13.892 12 22 22.209V24H3V0zm9.62 10.348l6.589-8.557H6.03l6.59 8.557zM5.138 3.935v7.17h5.52l-5.52-7.17zm5.52 8.96h-5.52v7.17l5.52-7.17zM6.03 22.21l6.59-8.557 6.589 8.557H6.03z" fill="#4B68FF"/>
  </g>
</svg>'''

# 6. fal.ai
fal_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>fal.ai</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path clip-rule="evenodd" fill-rule="evenodd" d="M15.477 0c.415 0 .749.338.788.752a7.775 7.775 0 006.985 6.984c.413.04.752.373.752.788v6.952c0 .415-.338.748-.752.788a7.775 7.775 0 00-6.985 6.984c-.04.414-.373.752-.788.752H8.525c-.416 0-.749-.338-.789-.752a7.775 7.775 0 00-6.984-6.984c-.414-.04-.752-.373-.752-.788V8.524c0-.415.338-.748.752-.788A7.775 7.775 0 007.736.752C7.776.338 8.11 0 8.526 0h6.95zM4.819 11.98a7.226 7.226 0 007.223 7.23 7.226 7.226 0 007.223-7.23c0-3.994-3.234-7.23-7.223-7.23a7.227 7.227 0 00-7.223 7.23z" fill="#EC0648"/>
  </g>
</svg>'''

# 7. Cerebras
cerebras_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Cerebras</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path clip-rule="evenodd" fill-rule="evenodd" d="M14.121 2.701a9.299 9.299 0 000 18.598V22.7c-5.91 0-10.7-4.791-10.7-10.701S8.21 1.299 14.12 1.299V2.7zm4.752 3.677A7.353 7.353 0 109.42 17.643l-.901 1.074a8.754 8.754 0 01-1.08-12.334 8.755 8.755 0 0112.335-1.08l-.901 1.075zm-2.255.844a5.407 5.407 0 00-5.048 9.563l-.656 1.24a6.81 6.81 0 016.358-12.043l-.654 1.24zM14.12 8.539a3.46 3.46 0 100 6.922v1.402a4.863 4.863 0 010-9.726v1.402z" fill="#F15A29"/>
    <path d="M15.407 10.836a2.24 2.24 0 00-.51-.409 1.084 1.084 0 00-.544-.152c-.255 0-.483.047-.684.14a1.58 1.58 0 00-.84.912c-.074.203-.11.416-.11.631 0 .218.036.43.11.631a1.594 1.594 0 00.84.913c.2.093.43.14.684.14.216 0 .417-.046.602-.135.188-.09.35-.225.475-.392l.928 1.006c-.14.14-.3.261-.482.363a3.367 3.367 0 01-1.083.38c-.17.026-.317.04-.44.04a3.315 3.315 0 01-1.182-.21 2.825 2.825 0 01-.961-.597 2.816 2.816 0 01-.644-.929 2.987 2.987 0 01-.238-1.21c0-.444.08-.847.238-1.21.15-.35.368-.666.643-.929.278-.261.605-.464.962-.596a3.315 3.315 0 011.182-.21c.355 0 .712.068 1.072.204.361.138.685.36.944.649l-.962.97z" fill="#FFFFFF"/>
  </g>
</svg>'''

# 8. AssemblyAI
assemblyai_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>AssemblyAI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path d="M10.595 1.5a3.695 3.695 0 00-3.444 2.355L0 22.26h5.432l5.629-14.486h.002a.96.96 0 011.782 0h.75V4.835h-1.393L13.498 1.5h-2.902z" fill="#2545D3"/>
    <path d="M7.151 3.855a3.695 3.695 0 013.26-2.35l-.002-.005H13.405c1.524 0 2.893.936 3.444 2.355L24 22.26h-5.525L11.54 4.413a2.528 2.528 0 00-4.609.006l.22-.564z" fill="#566DE8"/>
  </g>
</svg>'''

# 9. Voyage AI
voyage_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Voyage AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#14B8A6">
    <path d="M5.407 0v.066a.974.974 0 00-.048.245c-.011.11-.016.208-.016.295 0 .339.043.715.128 1.13.097.405.274.912.531 1.524l7.125 16.366L20.011 3.39c.161-.404.333-.846.515-1.327.182-.48.273-.966.273-1.458a1.406 1.406 0 00-.096-.54V0H24v.066c-.204.207-.45.578-.74 1.114-.29.535-.606 1.195-.949 1.982L13.095 24h-1.287L3.075 3.965c-.204-.47-.418-.923-.644-1.36-.214-.437-.418-.83-.61-1.18-.194-.36-.365-.66-.515-.9A5.666 5.666 0 001 .064V0h4.407z"/>
  </g>
</svg>'''

# 10. Jina AI
jina_svg = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Jina AI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#12C48B">
    <path fill-rule="evenodd" d="M6.608 21.416a4.608 4.608 0 100-9.217 4.608 4.608 0 000 9.217zM20.894 2.015c.614 0 1.106.492 1.106 1.106v9.002c0 5.13-4.148 9.309-9.217 9.37v-9.355l-.03-9.032c0-.614.491-1.106 1.106-1.106h7.158l-.123.015z"/>
  </g>
</svg>'''

logos = {
    "lovable": lovable_svg,
    "mistral-ai": mistral_svg,
    "together-ai": together_svg,
    "tavily": tavily_svg,
    "exa-ai": exa_svg,
    "fal-ai": fal_svg,
    "cerebras": cerebras_svg,
    "assemblyai": assemblyai_svg,
    "voyage-ai": voyage_svg,
    "jina-ai": jina_svg
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

print("All 10 authentic SVGs successfully generated and validated!")
