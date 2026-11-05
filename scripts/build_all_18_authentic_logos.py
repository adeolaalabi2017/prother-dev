import urllib.request
import re
import os
import xml.etree.ElementTree as ET

def fetch_url(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req) as resp:
        return resp.read().decode("utf-8")

logos = {}

print("1. Fetching v0...")
v0_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/v0.svg")
v0_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", v0_raw).group(1)
logos["v0"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>v0</title>
  <rect width="32" height="32" rx="6" fill="#000000"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    <path clip-rule="evenodd" fill-rule="evenodd" d="{v0_path}"/>
  </g>
</svg>'''

print("2. Fetching phind...")
phind_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/phind.svg")
phind_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", phind_raw).group(1)
logos["phind"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Phind</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    <path d="{phind_path}"/>
  </g>
</svg>'''

print("3. Fetching cohere...")
cohere_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/cohere-color.svg")
cohere_paths = re.findall(r"<path[^>]*d=\"([^\"]+)\"[^>]*fill=\"([^\"]+)\"", cohere_raw)
cohere_inner = "\n    ".join([f'<path d="{p}" fill="{f}"/>' for p, f in cohere_paths])
logos["cohere"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Cohere</title>
  <rect width="32" height="32" rx="6" fill="#101915"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {cohere_inner}
  </g>
</svg>'''

print("4. Fetching dify...")
dify_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/dify-color.svg")
dify_paths = re.findall(r"<path[^>]*d=\"([^\"]+)\"", dify_raw)
dify_inner = "\n    ".join([f'<path d="{p}" fill="#155EEF"/>' for p in dify_paths])
logos["dify"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Dify</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {dify_inner}
  </g>
</svg>'''

print("5. Fetching firecrawl...")
firecrawl_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/firecrawl-color.svg")
firecrawl_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", firecrawl_raw).group(1)
logos["firecrawl"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Firecrawl</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FF4D00">
    <path d="{firecrawl_path}"/>
  </g>
</svg>'''

print("6. Fetching krea-ai...")
krea_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/krea.svg")
krea_paths = re.findall(r"<path[^>]*d=\"([^\"]+)\"", krea_raw)
krea_inner = "\n    ".join([f'<path d="{p}"/>' for p in krea_paths])
logos["krea-ai"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Krea</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FFFFFF">
    {krea_inner}
  </g>
</svg>'''

print("7. Fetching langsmith...")
langsmith_raw = fetch_url("https://smith.langchain.com/favicon.svg")
logos["langsmith"] = langsmith_raw

print("8. Fetching llamaindex...")
llamaindex_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/llamaindex-color.svg")
llama_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", llamaindex_raw).group(1)
logos["llamaindex"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>LlamaIndex</title>
  <defs>
    <linearGradient id="llama_grad" x1="4.021" y1="2.02" x2="24.613" y2="19.277" gradientUnits="userSpaceOnUse">
      <stop offset="0.062" stop-color="#F6DCD9"/>
      <stop offset="0.326" stop-color="#FFA5EA"/>
      <stop offset="0.589" stop-color="#45DFF8"/>
      <stop offset="1.0" stop-color="#BC8DEB"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    <path d="{llama_path}" fill="url(#llama_grad)"/>
  </g>
</svg>'''

print("9. Fetching openhands...")
openhands_raw = fetch_url("https://www.all-hands.dev/assets/webflow/brand/openhands-logo-mobile-on-dark.svg")
# Extract all paths from openhands_raw
openhands_paths = re.findall(r"<path[^>]+/>", openhands_raw)
openhands_inner = "\n    ".join(openhands_paths)
logos["openhands"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>OpenHands</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(4, 8) scale(0.5333)">
    {openhands_inner}
  </g>
</svg>'''

print("10. Fetching comfyui...")
comfyui_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/comfyui-color.svg")
comfyui_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", comfyui_raw).group(1)
logos["comfyui"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>ComfyUI</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#F0FF41">
    <path d="{comfyui_path}"/>
  </g>
</svg>'''

print("11. Fetching crewai...")
crewai_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/crewai-color.svg")
crewai_paths = re.findall(r"<path[^>]*d=\"([^\"]+)\"[^>]*fill=\"([^\"]+)\"", crewai_raw)
crewai_inner = "\n    ".join([f'<path d="{p}" fill="{f}"/>' for p, f in crewai_paths])
logos["crewai"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>CrewAI</title>
  <rect width="32" height="32" rx="6" fill="#FF5A50"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {crewai_inner}
  </g>
</svg>'''

print("12. Fetching gradio...")
gradio_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/gradio-color.svg")
gradio_paths = re.findall(r"<path[^>]*d=\"([^\"]+)\"[^>]*fill=\"([^\"]+)\"", gradio_raw)
gradio_defs = re.search(r"<defs>(.*?)</defs>", gradio_raw, re.DOTALL).group(1)
gradio_inner = "\n    ".join([f'<path clip-rule="evenodd" fill-rule="evenodd" d="{p}" fill="{f}"/>' for p, f in gradio_paths])
logos["gradio"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Gradio</title>
  <defs>
    {gradio_defs}
  </defs>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)">
    {gradio_inner}
  </g>
</svg>'''

print("13. Fetching wandb...")
wandb_raw = fetch_url("https://raw.githubusercontent.com/lobehub/lobe-icons/master/packages/static-svg/icons/wandb-color.svg")
wandb_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", wandb_raw).group(1)
logos["wandb"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Weights &amp; Biases</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5, 5) scale(0.9167)" fill="#FCBC32">
    <path d="{wandb_path}"/>
  </g>
</svg>'''

print("14. Fetching bolt-new...")
bolt_raw = fetch_url("https://raw.githubusercontent.com/stackblitz/bolt.new/main/public/logo.svg")
bolt_hex = re.search(r"<path[^>]*fill=\"url\(#b\)\"[^>]*d=\"([^\"]+)\"", bolt_raw).group(1)
bolt_b = re.search(r"<path[^>]*fill=\"#fff\"[^>]*d=\"([^\"]+)\"", bolt_raw).group(1)
logos["bolt-new"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Bolt.new</title>
  <defs>
    <linearGradient id="bolt_grad" x1="47.5" y1="0" x2="47.5" y2="82.409" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2B5CFF"/>
      <stop offset="1" stop-color="#1A3799"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(4, 5.5) scale(0.2526)">
    <path fill="url(#bolt_grad)" d="{bolt_hex}"/>
    <path fill="#ffffff" fill-rule="evenodd" clip-rule="evenodd" d="{bolt_b}"/>
  </g>
</svg>'''

print("15. Fetching chroma...")
logos["chroma"] = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Chroma</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <mask id="chroma_mask" maskUnits="userSpaceOnUse" x="0" y="0" width="3.88" height="2.59">
    <path d="M3.87692 0H0V2.58462H3.87692V0Z" fill="white"/>
  </mask>
  <g transform="translate(5, 8.67) scale(5.6746)" mask="url(#chroma_mask)">
    <path d="M1.29231 0C0.578585 0 0 0.578585 0 1.29231C0 2.00603 0.578585 2.58462 1.29231 2.58462C2.00603 2.58462 2.58462 2.00603 2.58462 1.29231C2.58462 0.578585 2.00603 0 1.29231 0Z" fill="#327EFF"/>
    <path d="M2.58462 0C1.8709 0 1.29231 0.578585 1.29231 1.29231C1.29231 2.00603 1.8709 2.58462 2.58462 2.58462C3.29834 2.58462 3.87693 2.00603 3.87693 1.29231C3.87693 0.578585 3.29834 0 2.58462 0Z" fill="#FFDE2D"/>
    <path d="M1.29231 1.29231C1.29231 0.578585 1.8709 0 2.58462 0V1.29231H1.29231ZM2.58462 1.29231C2.58462 2.00603 2.00604 2.58462 1.29231 2.58462V1.29231H2.58462Z" fill="#FF6446"/>
  </g>
</svg>'''

print("16. Fetching weaviate...")
weaviate_raw = fetch_url("https://raw.githubusercontent.com/weaviate/weaviate-io/main/static/img/site/weaviate-pin-blue.svg")
weaviate_g = re.search(r"<g clip-path=\"url\(#clip0_8049_707\)\">(.*?)</g>", weaviate_raw, re.DOTALL).group(1).strip()
weaviate_defs = re.search(r"<defs>(.*?)</defs>", weaviate_raw, re.DOTALL).group(1).strip()
# Remove clipPath from defs
weaviate_defs = re.sub(r"<clipPath.*?</clipPath>", "", weaviate_defs, flags=re.DOTALL).strip()
logos["weaviate"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Weaviate</title>
  <defs>
    {weaviate_defs}
  </defs>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(16, 16) scale(0.34375) translate(-60, -60.5)">
    {weaviate_g}
  </g>
</svg>'''

print("17. Fetching continue...")
continue_raw = fetch_url("https://raw.githubusercontent.com/continuedev/continue/main/docs/logo/dark.svg")
continue_path = re.search(r"<path[^>]*d=\"([^\"]+)\"", continue_raw).group(1)
logos["continue"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Continue</title>
  <rect width="32" height="32" rx="6" fill="#0B1015"/>
  <g transform="translate(5.16, 6) scale(0.8333)" fill="#FFFFFF">
    <path d="{continue_path}"/>
  </g>
</svg>'''

print("18. Fetching mem0...")
mem0_raw = fetch_url("https://raw.githubusercontent.com/mem0ai/mem0/main/docs/logo/favicon.svg")
mem0_g = re.search(r"<g fill=\"#09090B\" clip-path=\"url\(#a\)\">(.*?)</g>", mem0_raw, re.DOTALL).group(1).strip()
logos["mem0"] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <title>Mem0</title>
  <rect width="32" height="32" rx="6" fill="#CBB2FF"/>
  <g transform="scale(0.32)" fill="#09090B">
    {mem0_g}
  </g>
</svg>'''

print(f"Total logos generated: {len(logos)}")
for slug, content in logos.items():
    # Verify XML validity
    try:
        ET.fromstring(content)
    except Exception as e:
        print(f"ERROR validating XML for {slug}: {e}")
        exit(1)
    
    out_path = f"public/logos/{slug}.svg"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(content.strip() + "\n")
    print(f"Saved {out_path} ({len(content)} bytes)")

print("All 18 logos successfully built and validated!")
