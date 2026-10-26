import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = path.join(process.cwd(), "public", "journal", "kimi-k3-1-pro");
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Common styles & fonts
const BASE_DEFS = `
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#070A10" />
    </linearGradient>
    <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" stop-opacity="0.7" />
      <stop offset="100%" stop-color="#0F172A" stop-opacity="0.85" />
    </linearGradient>
    <linearGradient id="highlightCard" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0C2542" stop-opacity="0.85" />
      <stop offset="100%" stop-color="#06162A" stop-opacity="0.9" />
    </linearGradient>
    <linearGradient id="cyanBlue" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0284C7" />
      <stop offset="100%" stop-color="#38BDF8" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#059669" />
      <stop offset="100%" stop-color="#34D399" />
    </linearGradient>
    <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#FBBF24" />
    </linearGradient>
    <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="100%" stop-color="#A78BFA" />
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="8" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>
  <style>
    .title { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 800; fill: #F8FAFC; }
    .subtitle { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 500; fill: #94A3B8; }
    .label { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 600; fill: #E2E8F0; }
    .meta { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 400; fill: #64748B; }
    .badge { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; font-size: 13px; }
    .th { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; font-size: 14px; fill: #94A3B8; }
    .td { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 500; font-size: 14px; fill: #CBD5E1; }
    .td-bold { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; font-size: 14px; fill: #F8FAFC; }
    .td-highlight { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-weight: 700; font-size: 14px; fill: #38BDF8; }
  </style>
`;

// Slide 1: Architecture Stack
const slide1Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  ${BASE_DEFS}
  <rect width="1600" height="900" fill="url(#bgGrad)" />
  <path d="M 100 180 L 1500 180 M 100 820 L 1500 820" stroke="#1E293B" stroke-width="1" stroke-dasharray="4 6" />

  <g transform="translate(100, 70)">
    <rect x="0" y="0" width="165" height="28" rx="14" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1" />
    <text x="82" y="19" text-anchor="middle" class="badge" fill="#38BDF8">SYSTEM ARCHITECTURE</text>
    <text x="0" y="65" class="title" font-size="40">Kimi K3.1 Pro Architectural Blueprint</text>
    <text x="0" y="96" class="subtitle" font-size="19">3T-Class Multimodal Reasoning Engine with Stable LatentMoE &amp; Kimi Delta Attention</text>
  </g>

  <g transform="translate(1050, 75)">
    <rect x="0" y="0" width="135" height="58" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="67" y="24" text-anchor="middle" class="label" font-size="12" fill="#94A3B8">TOTAL PARAMS</text>
    <text x="67" y="48" text-anchor="middle" class="title" font-size="20" fill="#38BDF8">~2.8 Trillion</text>

    <rect x="150" y="0" width="135" height="58" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="217" y="24" text-anchor="middle" class="label" font-size="12" fill="#94A3B8">ACTIVE PARAMS</text>
    <text x="217" y="48" text-anchor="middle" class="title" font-size="20" fill="#34D399">104 Billion</text>

    <rect x="300" y="0" width="145" height="58" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1" />
    <text x="372" y="24" text-anchor="middle" class="label" font-size="12" fill="#94A3B8">CONTEXT WINDOW</text>
    <text x="372" y="48" text-anchor="middle" class="title" font-size="20" fill="#A78BFA">1M Tokens</text>
  </g>

  <g transform="translate(100, 210)">
    <rect width="1400" height="150" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <rect x="25" y="25" width="40" height="40" rx="10" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1" />
    <text x="45" y="50" text-anchor="middle" class="title" font-size="20" fill="#38BDF8">01</text>
    <text x="80" y="42" class="title" font-size="22">Native Multimodal Ingestion Layer</text>
    <text x="80" y="65" class="subtitle" font-size="15">Handles concurrent high-resolution vision, audio, text, video streams, and full software repositories</text>

    <g transform="translate(80, 90)">
      <rect x="0" y="0" width="260" height="36" rx="8" fill="#0B132B" stroke="#1E293B" />
      <text x="130" y="23" text-anchor="middle" class="label" font-size="13">1,000,000 Token Native Context</text>

      <rect x="275" y="0" width="220" height="36" rx="8" fill="#0B132B" stroke="#1E293B" />
      <text x="385" y="23" text-anchor="middle" class="label" font-size="13">Multi-Repo File Synchronization</text>

      <rect x="510" y="0" width="240" height="36" rx="8" fill="#0B132B" stroke="#1E293B" />
      <text x="630" y="23" text-anchor="middle" class="label" font-size="13">Cross-Modal Unified Embedding</text>

      <rect x="765" y="0" width="250" height="36" rx="8" fill="#0B132B" stroke="#1E293B" />
      <text x="890" y="23" text-anchor="middle" class="label" font-size="13">Continuous Streaming KV Pipeline</text>
    </g>
  </g>

  <path d="M 800 360 L 800 395" stroke="#38BDF8" stroke-width="2" stroke-dasharray="4 4" />
  <polygon points="800,400 795,392 805,392" fill="#38BDF8" />

  <g transform="translate(100, 405)">
    <rect width="1400" height="175" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <rect x="25" y="25" width="40" height="40" rx="10" fill="#059669" fill-opacity="0.2" stroke="#34D399" stroke-width="1" />
    <text x="45" y="50" text-anchor="middle" class="title" font-size="20" fill="#34D399">02</text>
    <text x="80" y="42" class="title" font-size="22">Memory &amp; Attention Scaling Framework</text>
    <text x="80" y="65" class="subtitle" font-size="15">Proprietary algorithmic mechanisms engineered to eliminate KV cache bloat and signal degradation</text>

    <g transform="translate(80, 85)">
      <rect x="0" y="0" width="620" height="70" rx="10" fill="#09101E" stroke="#1E293B" />
      <text x="20" y="28" class="title" font-size="16" fill="#38BDF8">Kimi Delta Attention (KDA)</text>
      <text x="20" y="52" class="subtitle" font-size="13">Dynamic delta-compression on KV cache; drops redundant tokens while preserving long-term temporal dependencies.</text>

      <rect x="640" y="0" width="620" height="70" rx="10" fill="#09101E" stroke="#1E293B" />
      <text x="660" y="28" class="title" font-size="16" fill="#34D399">Attention Residuals (AttnRes)</text>
      <text x="660" y="52" class="subtitle" font-size="13">Gradient highway stabilization preventing representational fade across 100+ deep transformer layers.</text>
    </g>
  </g>

  <path d="M 800 580 L 800 615" stroke="#34D399" stroke-width="2" stroke-dasharray="4 4" />
  <polygon points="800,620 795,612 805,612" fill="#34D399" />

  <g transform="translate(100, 625)">
    <rect width="1400" height="175" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
    <rect x="25" y="25" width="40" height="40" rx="10" fill="#7C3AED" fill-opacity="0.2" stroke="#A78BFA" stroke-width="1" />
    <text x="45" y="50" text-anchor="middle" class="title" font-size="20" fill="#A78BFA">03</text>
    <text x="80" y="42" class="title" font-size="22">Stable LatentMoE Execution Engine</text>
    <text x="80" y="65" class="subtitle" font-size="15">Ultra-sparse routing delivering frontier intelligence with practical compute consumption</text>

    <g transform="translate(80, 85)">
      <rect x="0" y="0" width="400" height="70" rx="10" fill="#09101E" stroke="#1E293B" />
      <text x="20" y="28" class="title" font-size="15" fill="#A78BFA">896 Micro-Experts</text>
      <text x="20" y="52" class="subtitle" font-size="13">Extreme specialization with minimal parameter cross-talk</text>

      <rect x="420" y="0" width="400" height="70" rx="10" fill="#09101E" stroke="#1E293B" />
      <text x="440" y="28" class="title" font-size="15" fill="#38BDF8">Top-16 Expert Dynamic Routing</text>
      <text x="440" y="52" class="subtitle" font-size="13">104B active parameters activated per individual token</text>

      <rect x="840" y="0" width="420" height="70" rx="10" fill="#09101E" stroke="#1E293B" />
      <text x="860" y="28" class="title" font-size="15" fill="#34D399">Highspeed Inference Optimization</text>
      <text x="860" y="52" class="subtitle" font-size="13">2x to 3x token generation rate in highspeed companion mode</text>
    </g>
  </g>

  <g transform="translate(100, 840)">
    <text x="0" y="20" class="meta" font-size="14">PROTHER JOURNAL | TECHNICAL ANALYSIS DEEP DIVE: KIMI K3.1 PRO</text>
    <text x="1400" y="20" text-anchor="end" class="meta" font-size="14">MOONSHOT AI ARCHITECTURE SPECIFICATION</text>
  </g>
</svg>
`;

// Slide 2: Terminal-Bench Leaderboard
const slide2Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  ${BASE_DEFS}
  <rect width="1600" height="900" fill="url(#bgGrad)" />

  <g transform="translate(100, 65)">
    <rect x="0" y="0" width="185" height="28" rx="14" fill="#059669" fill-opacity="0.2" stroke="#34D399" stroke-width="1" />
    <text x="92" y="19" text-anchor="middle" class="badge" fill="#34D399">BENCHMARK LEADERBOARD</text>
    <text x="0" y="65" class="title" font-size="40">Terminal-Bench 4.0: Autonomous Systems Mastery</text>
    <text x="0" y="96" class="subtitle" font-size="19">Independent evaluation by Artificial Analysis in headless Linux container environments</text>
  </g>

  <g transform="translate(1250, 75)">
    <rect x="0" y="0" width="250" height="65" rx="14" fill="#0284C7" fill-opacity="0.15" stroke="#38BDF8" stroke-width="1.5" />
    <text x="125" y="26" text-anchor="middle" class="badge" fill="#38BDF8">WORLD RANKING</text>
    <text x="125" y="52" text-anchor="middle" class="title" font-size="24" fill="#F8FAFC">#1 Worldwide</text>
  </g>

  <g transform="translate(100, 195)">
    <rect width="1400" height="620" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />

    <g transform="translate(50, 40)">
      <text x="0" y="24" class="title" font-size="18" fill="#F8FAFC">Kimi K3.1 Pro (Moonshot AI)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#059669" fill-opacity="0.2" stroke="#34D399" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="badge" fill="#34D399">RANK #1</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="470" height="24" rx="6" fill="url(#cyanBlue)" />
      <text x="960" y="24" class="title" font-size="19" fill="#38BDF8">67.2%</text>
    </g>

    <g transform="translate(50, 115)">
      <text x="0" y="24" class="label" font-size="17" fill="#CBD5E1">Claude Opus 5.5 (Anthropic)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#94A3B8">RANK #2</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="465" height="24" rx="6" fill="#64748B" />
      <text x="960" y="24" class="label" font-size="18" fill="#E2E8F0">66.4%</text>
    </g>

    <g transform="translate(50, 190)">
      <text x="0" y="24" class="label" font-size="17" fill="#CBD5E1">Claude Sonnet 5.5 (Anthropic)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#94A3B8">RANK #3</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="449" height="24" rx="6" fill="#64748B" />
      <text x="960" y="24" class="label" font-size="18" fill="#E2E8F0">64.1%</text>
    </g>

    <g transform="translate(50, 265)">
      <text x="0" y="24" class="label" font-size="17" fill="#CBD5E1">GPT-6 Astra (OpenAI)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#94A3B8">RANK #4</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="407" height="24" rx="6" fill="#475569" />
      <text x="960" y="24" class="label" font-size="18" fill="#CBD5E1">58.2%</text>
    </g>

    <g transform="translate(50, 340)">
      <text x="0" y="24" class="label" font-size="17" fill="#CBD5E1">DeepSeek-V4.1 (DeepSeek)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#94A3B8">RANK #5</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="384" height="24" rx="6" fill="#475569" />
      <text x="960" y="24" class="label" font-size="18" fill="#CBD5E1">54.8%</text>
    </g>

    <g transform="translate(50, 415)">
      <text x="0" y="24" class="label" font-size="17" fill="#CBD5E1">Llama 4 (405B) (Meta AI)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#475569" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#94A3B8">RANK #6</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="338" height="24" rx="6" fill="#334155" />
      <text x="960" y="24" class="label" font-size="18" fill="#94A3B8">48.3%</text>
    </g>

    <g transform="translate(50, 490)">
      <text x="0" y="24" class="meta" font-size="16" fill="#94A3B8">Kimi K3 (Baseline Predecessor)</text>
      <rect x="360" y="4" width="85" height="26" rx="6" fill="#1E293B" stroke="#334155" stroke-width="1" />
      <text x="402" y="21" text-anchor="middle" class="meta" font-size="12" fill="#64748B">PRIOR GEN</text>
      <rect x="470" y="6" width="700" height="24" rx="6" fill="#0B132B" />
      <rect x="470" y="6" width="88" height="24" rx="6" fill="#1E293B" stroke="#334155" />
      <text x="960" y="24" class="meta" font-size="16" fill="#64748B">12.6% (Leap: +54.6%)</text>
    </g>

    <g transform="translate(50, 565)">
      <text x="0" y="20" class="meta" font-size="13">Evaluation Criteria: Multi-turn bash execution, file patch validation, dependency resolution, and runtime debugging under isolated constraints.</text>
    </g>
  </g>

  <g transform="translate(100, 840)">
    <text x="0" y="20" class="meta" font-size="14">PROTHER JOURNAL | BENCHMARK HARNESS SCORECARD</text>
    <text x="1400" y="20" text-anchor="end" class="meta" font-size="14">DATA SOURCE: ARTIFICIAL ANALYSIS &amp; MOONSHOT AI</text>
  </g>
</svg>
`;

// Slide 3: Deployment Matrix
const slide3Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  ${BASE_DEFS}
  <rect width="1600" height="900" fill="url(#bgGrad)" />

  <g transform="translate(100, 65)">
    <rect x="0" y="0" width="175" height="28" rx="14" fill="#7C3AED" fill-opacity="0.2" stroke="#A78BFA" stroke-width="1" />
    <text x="87" y="19" text-anchor="middle" class="badge" fill="#A78BFA">COMPUTE &amp; INFRASTRUCTURE</text>
    <text x="0" y="65" class="title" font-size="40">Kimi K3.1 Pro Deployment Feasibility Matrix</text>
    <text x="0" y="96" class="subtitle" font-size="19">Operational trade-offs across managed endpoints, quantized clusters, and full-scale supercomputing tiers</text>
  </g>

  <g transform="translate(100, 200)">
    <g transform="translate(0, 0)">
      <rect width="440" height="600" rx="16" fill="url(#cardGrad)" stroke="#38BDF8" stroke-width="2" />
      <g transform="translate(30, 35)">
        <rect x="0" y="0" width="120" height="26" rx="13" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1" />
        <text x="60" y="18" text-anchor="middle" class="badge" fill="#38BDF8">TIER 01</text>
        <text x="0" y="65" class="title" font-size="24">Managed Cloud API</text>
        <text x="0" y="90" class="subtitle" font-size="14">Via OpenRouter &amp; Kimi Platform</text>
        <line x1="0" y1="110" x2="380" y2="110" stroke="#334155" stroke-width="1" />
        <text x="0" y="145" class="label" font-size="13" fill="#94A3B8">TOKEN PRICING</text>
        <text x="0" y="172" class="title" font-size="22" fill="#38BDF8">$2.00 / $10.00</text>
        <text x="0" y="192" class="meta" font-size="12">Per 1M Input / Output Tokens</text>
        <text x="0" y="235" class="label" font-size="13" fill="#94A3B8">HARDWARE OVERHEAD</text>
        <text x="0" y="260" class="title" font-size="20" fill="#34D399">Zero Local Compute</text>
        <text x="0" y="280" class="meta" font-size="12">Fully managed autoscaling endpoint</text>
        <text x="0" y="325" class="label" font-size="13" fill="#94A3B8">GENERATION SPEED</text>
        <text x="0" y="350" class="title" font-size="20" fill="#F8FAFC">Standard &amp; Highspeed</text>
        <text x="0" y="370" class="meta" font-size="12">2x to 3x token generation on Highspeed</text>
        <rect x="0" y="410" width="380" height="110" rx="12" fill="#09101E" stroke="#1E293B" />
        <text x="20" y="440" class="label" font-size="14" fill="#38BDF8">Recommended Target:</text>
        <text x="20" y="465" class="subtitle" font-size="13">Individual builders, startup applications,</text>
        <text x="20" y="488" class="subtitle" font-size="13">and rapid agentic prototyping workflows.</text>
      </g>
    </g>

    <g transform="translate(480, 0)">
      <rect width="440" height="600" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
      <g transform="translate(30, 35)">
        <rect x="0" y="0" width="120" height="26" rx="13" fill="#059669" fill-opacity="0.2" stroke="#34D399" stroke-width="1" />
        <text x="60" y="18" text-anchor="middle" class="badge" fill="#34D399">TIER 02</text>
        <text x="0" y="65" class="title" font-size="24">Quantized Cluster</text>
        <text x="0" y="90" class="subtitle" font-size="14">FP8 / INT4 Quantized Deployment</text>
        <line x1="0" y1="110" x2="380" y2="110" stroke="#334155" stroke-width="1" />
        <text x="0" y="145" class="label" font-size="13" fill="#94A3B8">VRAM CONSUMPTION</text>
        <text x="0" y="172" class="title" font-size="22" fill="#34D399">~1.5 TB to 2.8 TB</text>
        <text x="0" y="192" class="meta" font-size="12">Compressed KV cache &amp; weight states</text>
        <text x="0" y="235" class="label" font-size="13" fill="#94A3B8">INFRASTRUCTURE REQUIREMENT</text>
        <text x="0" y="260" class="title" font-size="20" fill="#F8FAFC">16x - 32x H100 / H200</text>
        <text x="0" y="280" class="meta" font-size="12">Multi-node HGX with InfiniBand fabric</text>
        <text x="0" y="325" class="label" font-size="13" fill="#94A3B8">DATA SOVEREIGNTY</text>
        <text x="0" y="350" class="title" font-size="20" fill="#F8FAFC">100% Private VPC</text>
        <text x="0" y="370" class="meta" font-size="12">Zero external telemetry leakage</text>
        <rect x="0" y="410" width="380" height="110" rx="12" fill="#09101E" stroke="#1E293B" />
        <text x="20" y="440" class="label" font-size="14" fill="#34D399">Recommended Target:</text>
        <text x="20" y="465" class="subtitle" font-size="13">Regulated enterprise environments,</text>
        <text x="20" y="488" class="subtitle" font-size="13">confidential financial &amp; health pipelines.</text>
      </g>
    </g>

    <g transform="translate(960, 0)">
      <rect width="440" height="600" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />
      <g transform="translate(30, 35)">
        <rect x="0" y="0" width="120" height="26" rx="13" fill="#7C3AED" fill-opacity="0.2" stroke="#A78BFA" stroke-width="1" />
        <text x="60" y="18" text-anchor="middle" class="badge" fill="#A78BFA">TIER 03</text>
        <text x="0" y="65" class="title" font-size="24">Unquantized BF16 / FP16</text>
        <text x="0" y="90" class="subtitle" font-size="14">Full Precision Foundation Tier</text>
        <line x1="0" y1="110" x2="380" y2="110" stroke="#334155" stroke-width="1" />
        <text x="0" y="145" class="label" font-size="13" fill="#94A3B8">VRAM CONSUMPTION</text>
        <text x="0" y="172" class="title" font-size="22" fill="#A78BFA">~5.6 Terabytes</text>
        <text x="0" y="192" class="meta" font-size="12">Full model weights without lossy rounding</text>
        <text x="0" y="235" class="label" font-size="13" fill="#94A3B8">INFRASTRUCTURE REQUIREMENT</text>
        <text x="0" y="260" class="title" font-size="20" fill="#F8FAFC">64x+ H100 / GH200 Nodes</text>
        <text x="0" y="280" class="meta" font-size="12">Supercomputing tensor-parallel topology</text>
        <text x="0" y="325" class="label" font-size="13" fill="#94A3B8">RESEARCH FIDELITY</text>
        <text x="0" y="350" class="title" font-size="20" fill="#F8FAFC">Bit-for-Bit Lossless</text>
        <text x="0" y="370" class="meta" font-size="12">Ideal for fine-tuning &amp; model distillation</text>
        <rect x="0" y="410" width="380" height="110" rx="12" fill="#09101E" stroke="#1E293B" />
        <text x="20" y="440" class="label" font-size="14" fill="#A78BFA">Recommended Target:</text>
        <text x="20" y="465" class="subtitle" font-size="13">AI research institutions, national labs,</text>
        <text x="20" y="488" class="subtitle" font-size="13">and foundation model distillation teams.</text>
      </g>
    </g>
  </g>

  <g transform="translate(100, 840)">
    <text x="0" y="20" class="meta" font-size="14">PROTHER JOURNAL | INFRASTRUCTURE CAPACITY AUDIT</text>
    <text x="1400" y="20" text-anchor="end" class="meta" font-size="14">HARDWARE PROFILING: NVIDIA H100/H200/GH200</text>
  </g>
</svg>
`;

// Slide 4: Global Rankings Table (Rendered as Image)
const slide4Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">
  ${BASE_DEFS}
  <rect width="1600" height="900" fill="url(#bgGrad)" />

  <g transform="translate(100, 65)">
    <rect x="0" y="0" width="235" height="28" rx="14" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1" />
    <text x="117" y="19" text-anchor="middle" class="badge" fill="#38BDF8">GLOBAL RANKINGS &amp; TIERS</text>
    <text x="0" y="65" class="title" font-size="40">Kimi K3.1 Pro Global Standings Overview</text>
    <text x="0" y="96" class="subtitle" font-size="19">Performance relative to closed and open foundation models across independent benchmarks</text>
  </g>

  <!-- Table Container -->
  <g transform="translate(100, 190)">
    <rect width="1400" height="630" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />

    <!-- Table Header Row -->
    <g transform="translate(40, 30)">
      <rect width="1320" height="48" rx="8" fill="#0B132B" stroke="#1E293B" />
      <text x="30" y="30" class="th">EVALUATION DOMAIN</text>
      <text x="340" y="30" class="th">GLOBAL RANK</text>
      <text x="560" y="30" class="th">PRIMARY BENCHMARK &amp; SCORE</text>
      <text x="960" y="30" class="th">COMPETITIVE CONTEXT</text>
    </g>

    <!-- Row 1: All Frontier Models -->
    <g transform="translate(40, 100)">
      <rect width="1320" height="110" rx="12" fill="#131D31" stroke="#334155" stroke-width="1" />
      <text x="30" y="45" class="td-bold" font-size="16">All Frontier Models</text>
      <text x="30" y="72" class="meta" font-size="13">Closed &amp; Open Systems</text>

      <rect x="340" y="28" width="140" height="36" rx="8" fill="#1E293B" stroke="#475569" />
      <text x="410" y="52" text-anchor="middle" class="title" font-size="16" fill="#F8FAFC">#4 Worldwide</text>

      <text x="560" y="45" class="td-highlight" font-size="16">Artificial Analysis Index (55.1)</text>
      <text x="560" y="72" class="meta" font-size="13">Aggregated composite intelligence score</text>

      <text x="960" y="42" class="td" font-size="14">Outperforms GPT-6 Astra (54.2) and Gemini 4</text>
      <text x="960" y="66" class="td" font-size="14">Argon; trails Claude Opus 5.5 and Sonnet 5.5.</text>
    </g>

    <!-- Row 2: Terminal & Tool Autonomy -->
    <g transform="translate(40, 225)">
      <rect width="1320" height="110" rx="12" fill="url(#highlightCard)" stroke="#38BDF8" stroke-width="1.5" />
      <text x="30" y="45" class="td-bold" font-size="16">Terminal &amp; Tool Autonomy</text>
      <text x="30" y="72" class="meta" font-size="13">Autonomous Systems Control</text>

      <rect x="340" y="28" width="140" height="36" rx="8" fill="#059669" fill-opacity="0.25" stroke="#34D399" stroke-width="1.2" />
      <text x="410" y="52" text-anchor="middle" class="title" font-size="16" fill="#34D399">#1 Worldwide</text>

      <text x="560" y="45" class="td-highlight" font-size="16">Terminal-Bench 4.0 (67.2%)</text>
      <text x="560" y="72" class="meta" font-size="13">Headless Linux multi-turn problem solving</text>

      <text x="960" y="42" class="td" font-size="14">Highest score recorded on independent evaluations;</text>
      <text x="960" y="66" class="td" font-size="14">surpasses Claude Opus 5.5 (66.4%) and GPT-6 Astra.</text>
    </g>

    <!-- Row 3: Long-Horizon Software Engineering -->
    <g transform="translate(40, 350)">
      <rect width="1320" height="110" rx="12" fill="url(#highlightCard)" stroke="#38BDF8" stroke-width="1.5" />
      <text x="30" y="45" class="td-bold" font-size="16">Long-Horizon Software Eng.</text>
      <text x="30" y="72" class="meta" font-size="13">Multi-File Repository Refactoring</text>

      <rect x="340" y="28" width="140" height="36" rx="8" fill="#059669" fill-opacity="0.25" stroke="#34D399" stroke-width="1.2" />
      <text x="410" y="52" text-anchor="middle" class="title" font-size="16" fill="#34D399">#1 Worldwide</text>

      <text x="560" y="45" class="td-highlight" font-size="16">SWE Marathon (51.7)</text>
      <text x="560" y="72" class="meta" font-size="13">Persistent debugging and patch validation</text>

      <text x="960" y="42" class="td" font-size="14">Outpaces Claude Opus 5.5 (46.3) and Sonnet 5.5</text>
      <text x="960" y="66" class="td" font-size="14">(48.0) across massive multi-repository tasks.</text>
    </g>

    <!-- Row 4: Open-Weights Category -->
    <g transform="translate(40, 475)">
      <rect width="1320" height="110" rx="12" fill="#131D31" stroke="#334155" stroke-width="1" />
      <text x="30" y="45" class="td-bold" font-size="16">Open-Weights Ecosystem</text>
      <text x="30" y="72" class="meta" font-size="13">Publicly Distributable Weights</text>

      <rect x="340" y="28" width="140" height="36" rx="8" fill="#7C3AED" fill-opacity="0.25" stroke="#A78BFA" stroke-width="1.2" />
      <text x="410" y="52" text-anchor="middle" class="title" font-size="16" fill="#A78BFA">#1 Worldwide</text>

      <text x="560" y="45" class="td-highlight" font-size="16">Open-Weights Composite Index</text>
      <text x="560" y="72" class="meta" font-size="13">Lead open architecture across coding &amp; agentics</text>

      <text x="960" y="42" class="td" font-size="14">Claims #1 ranking in open weights upon public</text>
      <text x="960" y="66" class="td" font-size="14">release, exceeding DeepSeek-V4.1 and Llama 4.</text>
    </g>
  </g>

  <g transform="translate(100, 845)">
    <text x="0" y="20" class="meta" font-size="14">PROTHER JOURNAL | GLOBAL BENCHMARK MATRIX</text>
    <text x="1400" y="20" text-anchor="end" class="meta" font-size="14">VERIFIED DATA: ARTIFICIAL ANALYSIS &amp; MOONSHOT AI</text>
  </g>
</svg>
`;

// Slide 5: Comprehensive Comparison Matrix (Rendered as Image)
const slide5Svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1020" width="1600" height="1020">
  ${BASE_DEFS}
  <rect width="1600" height="1020" fill="url(#bgGrad)" />

  <!-- Header -->
  <g transform="translate(100, 50)">
    <rect x="0" y="0" width="235" height="28" rx="14" fill="#0284C7" fill-opacity="0.2" stroke="#38BDF8" stroke-width="1" />
    <text x="117" y="19" text-anchor="middle" class="badge" fill="#38BDF8">FRONTIER COMPARISON MATRIX</text>
    <text x="0" y="65" class="title" font-size="38">Kimi K3.1 Pro vs. Leading Frontier Models</text>
    <text x="0" y="94" class="subtitle" font-size="17">Architectural, contextual, capability, and economic breakdown across frontier systems</text>
  </g>

  <!-- Table Container -->
  <g transform="translate(100, 165)">
    <rect width="1400" height="800" rx="16" fill="url(#cardGrad)" stroke="#334155" stroke-width="1.5" />

    <!-- Highlight column background for Kimi K3.1 Pro -->
    <rect x="290" y="20" width="250" height="760" rx="12" fill="url(#highlightCard)" stroke="#38BDF8" stroke-width="2" />

    <!-- Table Header Row -->
    <g transform="translate(20, 30)">
      <text x="30" y="32" class="th" font-size="14">METRIC / SPEC</text>

      <!-- Kimi Column Header -->
      <g transform="translate(270, 0)">
        <rect x="10" y="6" width="230" height="42" rx="8" fill="#0284C7" fill-opacity="0.3" stroke="#38BDF8" stroke-width="1" />
        <text x="125" y="32" text-anchor="middle" class="title" font-size="16" fill="#38BDF8">Kimi K3.1 Pro</text>
      </g>

      <text x="560" y="32" class="th" font-size="14">Claude Opus 5.5</text>
      <text x="780" y="32" class="th" font-size="14">GPT-6 Astra</text>
      <text x="1000" y="32" class="th" font-size="14">DeepSeek-V4.1</text>
      <text x="1210" y="32" class="th" font-size="14">Llama 4 (405B)</text>
    </g>

    <line x1="20" y1="90" x2="1380" y2="90" stroke="#334155" stroke-width="1" />

    <!-- Row Helper Function -->
    ${[
      { label: "Developer / Lab", kimi: "Moonshot AI", opus: "Anthropic", gpt: "OpenAI", deepseek: "DeepSeek", llama: "Meta AI" },
      { label: "Model Architecture", kimi: "Sparse LatentMoE", opus: "Proprietary MoE", gpt: "Dense / MoE", deepseek: "Sparse MoE", llama: "Dense / Hybrid" },
      { label: "Total Parameters", kimi: "~2.8 Trillion", opus: "Undisclosed", gpt: "Undisclosed", deepseek: "~671 Billion", llama: "405 Billion" },
      { label: "Active Parameters", kimi: "104 Billion", opus: "Undisclosed", gpt: "Undisclosed", deepseek: "~37 Billion", llama: "405 Billion" },
      { label: "Context Window", kimi: "1,000,000 tokens", opus: "200,000 tokens", gpt: "1,000,000 tokens", deepseek: "128,000 tokens", llama: "128,000 tokens" },
      { label: "Artificial Analysis Index", kimi: "55.1 (#4 Global)", opus: "58.2 (#1 Global)", gpt: "54.2 (#5 Global)", deepseek: "51.4 (#8 Global)", llama: "48.7 (#12 Global)" },
      { label: "Terminal-Bench 4.0", kimi: "67.2% (#1 Global)", opus: "66.4%", gpt: "58.2%", deepseek: "54.8%", llama: "48.3%" },
      { label: "SWE Marathon Score", kimi: "51.7 (#1 Global)", opus: "46.3", gpt: "43.1", deepseek: "41.5", llama: "38.2" },
      { label: "Open Weights Policy", kimi: "Yes (Scheduled)", opus: "No (Closed API)", gpt: "No (Closed API)", deepseek: "Yes (Available)", llama: "Yes (Available)" },
      { label: "API Cost (Input/1M)", kimi: "$2.00", opus: "$15.00", gpt: "$5.00", deepseek: "$0.27", llama: "Self-hosted" },
      { label: "API Cost (Output/1M)", kimi: "$10.00", opus: "$75.00", gpt: "$20.00", deepseek: "$1.10", llama: "Self-hosted" },
    ].map((r, i) => {
      const y = 135 + i * 58;
      return `
      <g transform="translate(20, ${y})">
        <text x="30" y="0" class="td-bold" font-size="13">${r.label}</text>
        <text x="395" y="0" text-anchor="middle" class="td-highlight" font-size="14">${r.kimi}</text>
        <text x="560" y="0" class="td" font-size="13">${r.opus}</text>
        <text x="780" y="0" class="td" font-size="13">${r.gpt}</text>
        <text x="1000" y="0" class="td" font-size="13">${r.deepseek}</text>
        <text x="1210" y="0" class="td" font-size="13">${r.llama}</text>
        ${i < 10 ? `<line x1="10" y1="20" x2="1350" y2="20" stroke="#1E293B" stroke-width="1" />` : ""}
      </g>
      `;
    }).join("")}

  </g>

  <g transform="translate(100, 985)">
    <text x="0" y="15" class="meta" font-size="13">PROTHER JOURNAL | CROSS-MODEL TECHNICAL AUDIT</text>
    <text x="1400" y="15" text-anchor="end" class="meta" font-size="13">ALL DATA ACCURATE TO OCTOBER 2026 BENCHMARKS</text>
  </g>
</svg>
`;

async function main() {
  console.log("Generating visual slides and image tables for Kimi K3.1 Pro...");

  const slides = [
    { name: "architecture-stack", svg: slide1Svg, width: 1600, height: 900 },
    { name: "terminal-bench", svg: slide2Svg, width: 1600, height: 900 },
    { name: "deployment-matrix", svg: slide3Svg, width: 1600, height: 900 },
    { name: "rankings-table", svg: slide4Svg, width: 1600, height: 900 },
    { name: "comparison-matrix", svg: slide5Svg, width: 1600, height: 1020 },
  ];

  for (const s of slides) {
    const svgPath = path.join(OUTPUT_DIR, `${s.name}.svg`);
    const pngPath = path.join(OUTPUT_DIR, `${s.name}.png`);

    fs.writeFileSync(svgPath, s.svg, "utf-8");
    console.log(`✓ Saved SVG: ${svgPath}`);

    // Render PNG via sharp
    await sharp(Buffer.from(s.svg))
      .png({ quality: 95, compressionLevel: 8 })
      .toFile(pngPath);
    console.log(`✓ Rendered PNG (${s.width}x${s.height}): ${pngPath}`);
  }

  console.log("\nAll visual slides & image tables successfully generated!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
