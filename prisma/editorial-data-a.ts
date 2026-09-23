/**
 * Editorial batch A (Task 35, task id 35-content-a).
 * 22 entries in required order: adobe-firefly through midjourney.
 * Pricing fact-checked against vendor pages as of 2025, cross-read with
 * the Tool rows in db/custom.db. No em or en dashes anywhere.
 */
import type { EditorialEntry } from "./editorial-types";

export const ENTRIES_A: EditorialEntry[] = [
  {
    slug: "adobe-firefly",
    longDescription:
      "Firefly is Adobe's family of generative models for images, video, vectors, and design effects, trained on licensed Adobe Stock and public-domain content so commercial use is the default posture: enterprise customers receive IP indemnification for outputs. The models surface where designers already work, powering Generative Fill and Generative Expand in Photoshop, Text to Vector and Generative Recolor in Illustrator, and matching features in Adobe Express and Premiere Pro.\n\nA standalone Firefly web app handles text-to-image and text-to-video generation with style and structure references, and every output can carry Content Credentials metadata that records how it was made. Generation runs on a credit system: each output consumes generative credits from a monthly allowance set by your plan, and paid Creative Cloud subscriptions include credits alongside Firefly-specific tiers.\n\nFirefly suits working designers and enterprises that must answer questions about training data provenance. It is the least legally fraught route to generative imagery in client deliverables, though raw stylization still trails Midjourney and other dedicated art tools.",
    useCases: [
      {
        title: "Fill and extend photos in Photoshop",
        body: "Select an area, describe what should appear, and Generative Fill blends matching light and perspective in place, non-destructively.",
      },
      {
        title: "Generate client-safe imagery at scale",
        body: "Use style references and the web app to produce on-brand variations, with Content Credentials metadata recording each output's origin.",
      },
      {
        title: "Create editable vectors from a prompt",
        body: "Text to Vector in Illustrator turns descriptions into editable SVG-style artwork for icons, scenes, and patterns.",
      },
      {
        title: "Storyboard concepts before production",
        body: "Draft scene mockups and moodboards in minutes, then iterate in the Creative Cloud apps where the final work happens.",
      },
    ],
    pros: [
      "Trained on licensed and public-domain content, so commercial use is the default posture",
      "Enterprise customers receive IP indemnification for outputs",
      "Generative Fill and similar tools live inside Photoshop and Illustrator, no tab switching",
      "Content Credentials metadata records how each output was made",
    ],
    cons: [
      "Generative credits are consumed per output, and heavy users hit plan limits",
      "Stylization and photorealism trail dedicated rivals like Midjourney",
      "The newest models often require the newest plan tiers and app versions",
      "Video generation is newer and shorter-form than dedicated video tools",
    ],
    alternatives: ["midjourney", "runway"],
    pricing: {
      model: "freemium",
      startingPrice: "$9.99 per month",
      note: "Free tier includes limited monthly generative credits; Firefly Standard and Pro add larger allowances and premium models.",
    },
  },
  {
    slug: "amazon-rekognition",
    longDescription:
      "Rekognition is AWS's managed computer vision service. Its image APIs cover label and scene detection, text extraction, face detection, analysis, comparison, and search within stored collections, plus celebrity recognition and safety-equipment (PPE) detection. Custom Labels trains domain-specific models on your own examples without writing model code.\n\nVideo APIs extend the same ideas to stored and streaming footage: person and object tracking, face detection, text and celebrity detection, and content moderation, consumed through Kinesis Video Streams or batch jobs against S3. Everything is invoked through SDKs, the AWS CLI, or the console, with IAM policies for access control and Lambda for event-driven pipelines.\n\nRekognition fits teams already on AWS that want perception features without model operations. Costs follow usage per image or per minute of video, a free tier covers many features for the first year, and biometric use cases carry real privacy and legal obligations.",
    useCases: [
      {
        title: "Moderate user-generated content",
        body: "Screen uploads for explicit or violent imagery automatically and route violations to review queues before they ever go public.",
      },
      {
        title: "Verify identities with face search",
        body: "Compare a selfie against an ID photo or stored collection and add liveness checks to stop simple spoofing during onboarding.",
      },
      {
        title: "Extract text from images in pipelines",
        body: "Run OCR over S3-stored scans, signs, and documents through Lambda triggers and feed the results to search or storage.",
      },
      {
        title: "Detect missing safety gear on site",
        body: "Use PPE detection on camera footage to flag workers without helmets or vests and log events for safety reporting.",
      },
    ],
    pros: [
      "Fully managed: no servers, models, or GPU fleets to run",
      "Deep integration with S3, Lambda, IAM, and Kinesis Video Streams",
      "Custom Labels trains domain-specific models without ML expertise",
      "Per-use pricing with a free tier covering many features for a year",
    ],
    cons: [
      "Value is tied to AWS; porting away means rebuilding integrations",
      "Niche or domain-specific imagery often needs Custom Labels to compete",
      "Face search creates biometric privacy obligations under laws like BIPA",
      "Video analysis costs accumulate quickly at high volume",
    ],
    alternatives: ["google-cloud-vision", "clarifai"],
    pricing: {
      model: "paid",
      startingPrice: "Pay as you go",
      note: "Per image and per video minute; many features carry a free tier for the first 12 months of a new AWS account.",
    },
  },
  {
    slug: "bardeen",
    longDescription:
      "Bardeen is a browser-first automation tool built as an extension for Chromium-based browsers such as Chrome and Edge. Playbooks chain together scrapers, app actions, and AI steps, and run from a keyboard shortcut, a button, or contextual triggers rather than a separate dashboard. Because execution happens inside the active tab, it works on sites that expose no public API.\n\nThe scraper builder lets you click elements on a page to define structured extraction of lists and tables, which then flow to Notion, Airtable, HubSpot, Google Sheets, Slack, and other connectors. AI steps summarize pages, draft text, and fill forms, and the natural-language builder assembles a playable automation from a plain description.\n\nBardeen suits sales, recruiting, and research work: prospecting lists, CRM data entry, and repetitive form filling. The free plan carries monthly credit limits, and anything beyond browser-scoped tasks still needs a broader automation platform.",
    useCases: [
      {
        title: "Scrape leads straight into your CRM",
        body: "Mark fields on a directory or LinkedIn page, run the scraper, and push structured rows into HubSpot or Airtable in one shortcut.",
      },
      {
        title: "Autofill repetitive web forms",
        body: "Record a playbook once and let a keystroke fill job applications, internal tools, and signup flows with your data.",
      },
      {
        title: "Summarize and file any page",
        body: "Send the active tab to an AI step for a summary, then save it to Notion or Slack without leaving the browser.",
      },
      {
        title: "Automate meeting follow-ups",
        body: "Trigger a playbook after calls to fetch transcripts, draft recaps, and post them to the right channel automatically.",
      },
    ],
    pros: [
      "Runs inside the browser where the actual work happens",
      "Click-to-build scrapers extract structured data without code",
      "Natural-language builder turns a description into a working playbook",
      "Genuinely useful free plan for personal automation",
    ],
    cons: [
      "Browser-bound: it cannot touch desktop apps or server-side jobs",
      "Free-plan credits limit heavy scraping and AI steps",
      "Complex branching logic is easier in full automation platforms",
      "Site redesigns can silently break scrapers until you rebuild them",
    ],
    alternatives: ["zapier", "relay-app"],
    pricing: {
      model: "freemium",
      startingPrice: "Free",
      note: "Free plan includes monthly credits; paid tiers add more runs, advanced AI steps, and team features.",
    },
  },
  {
    slug: "character-ai",
    longDescription:
      "Character.AI is a platform for chatting with user-created AI personas. Anyone can define a character with a description, a greeting, and example dialogue, and millions exist: tutors, language partners, game masters, and fictional figures of every stripe. Personalities hold up over long conversations, which is the platform's defining trait.\n\nIt is built for entertainment, roleplay, and creative practice rather than productivity: characters stay in character and will confidently invent facts. Beyond text there are voice calls and full mobile apps on iOS and Android, and the c.ai+ subscription removes waiting queues, speeds responses, and grants early access to new features.\n\nUse it to rehearse interviews, practice languages, playtest dialogue, or talk to something with a consistent personality. Do not treat it as a source of truth, and expect message limits and moderation on the free tier.",
    useCases: [
      {
        title: "Practice a language with a patient partner",
        body: "Set a character to converse only in your target language, correct your mistakes, and adjust speed as you improve.",
      },
      {
        title: "Interview historical or fictional figures",
        body: "Roleplay Q&A sessions with personas of your making to explore a topic or a character's point of view.",
      },
      {
        title: "Playtest dialogue before you draft",
        body: "Writers stress-test a character's voice and reactions in chat, then carry the surviving lines into scripts or stories.",
      },
      {
        title: "Build a companion persona from scratch",
        body: "Define a greeting, description, and example lines, then refine the personality as conversations reveal rough edges.",
      },
    ],
    pros: [
      "Huge community library of characters across every niche",
      "Personalities stay coherent over long conversations",
      "Voice calls and mobile apps make chats feel live",
      "Free to use with reasonable daily limits",
    ],
    cons: [
      "Characters stay in role and will confidently invent facts",
      "Free tier hits message limits and queues at peak times",
      "Moderation can interrupt creative writing workflows",
      "Memory resets across sessions, breaking long-running stories",
    ],
    alternatives: ["poe", "pi"],
    pricing: {
      model: "freemium",
      startingPrice: "$9.99 per month",
      note: "Free tier has message limits and peak-time queues; c.ai+ at $9.99 per month speeds responses and unlocks early features.",
    },
  },
  {
    slug: "chatgpt",
    longDescription:
      "ChatGPT is OpenAI's general-purpose assistant, the product that made conversational AI mainstream in late 2022. It drafts and edits text, writes and debugs code, analyzes uploaded files with a Python runtime, generates images, browses the web, and holds voice conversations. Memory keeps context between sessions, and Canvas provides a side-by-side surface for editing documents and code.\n\nThe GPT Store hosts custom assistants built without code, and the platform connects to Google Drive and Microsoft 365 for work grounded in your own files. Advanced modes handle multi-step research and agentic tasks. Team and Enterprise plans add admin controls, SSO, and defaults that exclude workspace data from model training.\n\nChatGPT is the sensible default for individuals and organizations that want one assistant for everything. The free tier carries usage caps on the stronger models, Plus costs $20 per month, Pro costs $200 per month for the highest limits, and outputs still warrant verification on anything consequential.",
    useCases: [
      {
        title: "Draft and rewrite documents fast",
        body: "Paste a rough draft, ask for tone and structure edits, and iterate in Canvas side by side until it ships.",
      },
      {
        title: "Analyze spreadsheets and files",
        body: "Upload a CSV or report and get summaries, charts, and a Python-backed analysis you can follow and re-run.",
      },
      {
        title: "Build a custom GPT for repeat work",
        body: "Encode your instructions and files once, then share the assistant with your team or publish it on the GPT Store.",
      },
      {
        title: "Research with browsing and deep research",
        body: "Ask multi-step questions, let it read sources across the web, and receive a cited briefing you can check.",
      },
    ],
    pros: [
      "Broadest feature set: voice, vision, files, browsing, and agents",
      "GPT Store and integrations create a deep ecosystem",
      "Python-backed file analysis handles real data work",
      "Strong free tier for casual, everyday use",
    ],
    cons: [
      "Stronger models are rate-limited on free and Plus tiers",
      "Confident errors on niche facts still require verification",
      "Pro tier at $200 per month is hard to justify for individuals",
      "Chats can be used for training unless you opt out or use Team plans",
    ],
    alternatives: ["claude", "gemini"],
    pricing: {
      model: "freemium",
      startingPrice: "$20 per month",
      note: "Free tier with usage caps; Plus $20 per month, Pro $200 per month; Team and Enterprise add admin and no-training defaults.",
    },
  },
  {
    slug: "clarifai",
    longDescription:
      "Clarifai, founded in 2013, is one of the longest-running AI platforms, now spanning vision, language, and audio. It hosts pre-trained models for recognition, OCR, content moderation, and face detection, and lets you train, evaluate, and version custom models on your own data through a dashboard or API.\n\nDeployment flexibility is the differentiator: inference runs in Clarifai's cloud, in your own data center, at the edge, or fully air-gapped, which is why deployments appear in defense, retail, and media. The platform also covers data labeling, workflow orchestration, and usage monitoring, so one vendor can serve the path from annotation to production.\n\nThe Community plan is free with monthly operation limits, making it easy to test models before committing; paid usage-based plans and enterprise contracts sit above it. Expect some legacy complexity in the interface and budget time for onboarding.",
    useCases: [
      {
        title: "Moderate images and video at scale",
        body: "Apply pre-trained NSFW and brand-safety models to uploads and flag borderline content for human review.",
      },
      {
        title: "Train custom visual classifiers",
        body: "Upload labeled examples, train in the dashboard, and compare models on your data before deploying to production.",
      },
      {
        title: "Deploy recognition in restricted networks",
        body: "Run inference on-prem or air-gapped where cloud APIs are not allowed, keeping sensitive media inside your walls.",
      },
      {
        title: "Search media libraries by content",
        body: "Index archives with recognition models so editors find shots by what they show, not by filename or manual tags.",
      },
    ],
    pros: [
      "Longest production track record among independent vision platforms",
      "Deploys in cloud, on-prem, edge, or air-gapped environments",
      "Covers labeling, training, evaluation, and hosting in one platform",
      "Community plan is free to test before committing",
    ],
    cons: [
      "Interface and docs carry a decade of legacy complexity",
      "Usage-based costs are hard to forecast at scale",
      "Smaller community and ecosystem than newer ML hubs",
      "Top-tier features and support sit behind enterprise contracts",
    ],
    alternatives: ["google-cloud-vision", "roboflow"],
    pricing: {
      model: "freemium",
      startingPrice: "Free",
      note: "Community plan is free with monthly operation limits; paid usage-based plans and custom enterprise contracts sit above it.",
    },
  },
  {
    slug: "claude",
    longDescription:
      "Claude is Anthropic's assistant, built around long-context work: a session can reason over roughly 200,000 tokens of documents or code, with larger context available on higher tiers. Projects collect files and standing instructions so recurring work starts with the right context, and Artifacts render live previews of code, documents, and small apps beside the conversation.\n\nIt is consistently strong at writing quality and instruction following, and refusals tend to explain themselves rather than stonewall. Model Context Protocol, an Anthropic-originated standard, connects Claude to external tools and data sources, and the API supports tool use, batch processing, and streaming for developers.\n\nPlans include a genuinely usable free tier, Pro at $20 per month, Max from $100 per month for heavy users, and Team and Enterprise options with admin controls. Claude suits writers, analysts, and engineers whose work involves long or sensitive material and who care about tone.",
    useCases: [
      {
        title: "Reason over long documents end to end",
        body: "Drop a 200-page report or a full codebase into context and ask targeted questions without chunking it by hand.",
      },
      {
        title: "Produce polished long-form writing",
        body: "Brief tone, audience, and structure once; Claude holds the instructions through multi-thousand-word drafts.",
      },
      {
        title: "Prototype tools with Artifacts",
        body: "Ask for a small app or dashboard and interact with a live preview next to the chat, then keep refining it.",
      },
      {
        title: "Connect Claude to your own tools",
        body: "Use MCP servers to let Claude query your databases, repos, and internal APIs with your permissions.",
      },
    ],
    pros: [
      "Handles very long documents and codebases in one context",
      "Writing quality and instruction following are consistently strong",
      "Artifacts and Projects structure real work, not just chat",
      "Refusals explain themselves rather than stonewalling",
    ],
    cons: [
      "Usage limits can interrupt long sessions on the Pro tier",
      "Safety filters sometimes block benign requests",
      "No native image generation",
      "Heaviest limits require Max plans at $100 to $200 per month",
    ],
    alternatives: ["chatgpt", "gemini"],
    pricing: {
      model: "freemium",
      startingPrice: "$20 per month",
      note: "Free tier has session caps; Pro $20 per month, Max from $100 per month; Team and Enterprise add admin controls.",
    },
  },
  {
    slug: "datarobot",
    longDescription:
      "DataRobot is the enterprise platform that industrialized AutoML. Feed it tabular data and it generates ranked candidate models, surfaces feature importance and residual insights, then deploys the chosen model behind APIs with monitoring for drift, accuracy decay, and data quality. A model registry, approval workflows, and audit trails wrap the lifecycle in governance.\n\nThe platform has extended the same discipline to generative AI: playgrounds for comparing LLMs, evaluation suites, guardrails, and agent tooling, all reporting into the same governance layer. Work happens through a visual interface or a Python SDK, and connectors reach Snowflake, Databricks, and mainstream data warehouses.\n\nDataRobot targets regulated enterprises in banking, insurance, and healthcare that must document how models behave. There is no self-serve pricing: contracts are custom, implementations take months, and getting full value requires real data engineering on the customer side.",
    useCases: [
      {
        title: "Forecast churn and demand from tabular data",
        body: "Point AutoML at your warehouse tables and get ranked candidate models with feature drivers, ready to deploy.",
      },
      {
        title: "Monitor deployed models for drift",
        body: "Track accuracy decay and data quality in production and get alerts before silent failures reach the business.",
      },
      {
        title: "Stand up governed generative AI",
        body: "Compare LLMs in a playground, add guardrails and evaluations, and route everything through one governance layer.",
      },
      {
        title: "Document models for compliance",
        body: "Generate audit trails, approvals, and registry records that satisfy risk and regulatory reviews in banking or insurance.",
      },
    ],
    pros: [
      "Mature AutoML with strong automated feature engineering",
      "Drift and accuracy monitoring is best in class",
      "Governance, registry, and audit trails built for regulated industries",
      "Both no-code visual flows and a Python SDK",
    ],
    cons: [
      "Custom enterprise pricing only, no self-serve option",
      "Oversized for small teams and simple problems",
      "Data preparation still depends on your own engineering",
      "Time to value is measured in months, not days",
    ],
    alternatives: ["h2o-ai", "salesforce-einstein"],
    pricing: {
      model: "paid",
      startingPrice: "Custom enterprise pricing",
      note: "No published self-serve rates; pricing is custom per enterprise deployment, typically annual contracts.",
    },
  },
  {
    slug: "deepl",
    longDescription:
      "DeepL is a neural machine translation service from Cologne that has repeatedly topped blind comparisons in European language pairs, preserving tone, register, and idiom where older systems flatten them. It covers dozens of languages, offers formal and informal register options where languages distinguish them, and supports shared glossaries that enforce consistent terminology for product and domain terms.\n\nDocuments translate with formatting intact across PDF, Word, and PowerPoint, and Write mode rewrites your own prose directly in the target language. Delivery spans a web translator, desktop and mobile apps, browser extensions, Office add-ins, and a character-metered API with a free monthly tier.\n\nDeepL suits professional translators, support teams, and product localization. Pro plans state that translated texts are not retained, which matters for confidential material. Its European strength does not fully carry into Asian language pairs, and language coverage is narrower than Google Translate.",
    useCases: [
      {
        title: "Translate documents with layout intact",
        body: "Drop in a PDF or Word file and receive a translated version that keeps headings, tables, and images in place.",
      },
      {
        title: "Enforce terminology with glossaries",
        body: "Define approved translations for product and domain terms once, and every translation follows them consistently.",
      },
      {
        title: "Localize support replies live",
        body: "Use the browser extension or API to read and answer tickets in the customer's language without leaving the helpdesk.",
      },
      {
        title: "Rewrite prose in the target language",
        body: "Draft in your strongest language and let Write mode produce natural phrasing directly in the destination language.",
      },
    ],
    pros: [
      "Translation quality in European languages leads blind tests",
      "Glossaries and register options keep output professional",
      "Document translation preserves formatting and layout",
      "Pro plans state texts are not retained, aiding confidentiality",
    ],
    cons: [
      "Supports fewer languages than Google Translate",
      "Asian language pairs trail its European strength",
      "Free web use is capped by a monthly character allowance",
      "Per-character API pricing surprises high-volume users",
    ],
    alternatives: ["grammarly", "quillbot"],
    pricing: {
      model: "freemium",
      startingPrice: "$8.74 per month",
      note: "Free web translator with monthly character cap; Starter around $8.74 per month; API free tier covers 500,000 characters monthly.",
    },
  },
  {
    slug: "elevenlabs",
    longDescription:
      "ElevenLabs is the current benchmark for lifelike text to speech. Its models produce expressive narration in more than 30 languages, and two cloning paths coexist: instant cloning from a short sample and professional cloning that requires a recorded consent statement, with verification checks that make the platform a reference point for voice compliance.\n\nSpeech-to-speech lets a performer drive delivery and emotion with their own voice while the output sounds like the target voice. The dubbing studio translates videos while preserving the original speaker's voice, and a streaming API with low latency powers audiobooks, game dialogue, and real-time voice agents.\n\nThe free tier amounts to roughly ten minutes of audio per month; Starter begins at $5 per month, and paid tiers scale credits, cloning quality, and commercial rights. Long-form production consumes credits quickly, and clone quality depends heavily on the source recording.",
    useCases: [
      {
        title: "Narrate audiobooks and articles",
        body: "Feed long-form text into Projects, assign voices per chapter, and export production audio with consistent delivery.",
      },
      {
        title: "Clone your voice for content at scale",
        body: "Record a consented sample once, then generate new scripts in your voice for videos, podcasts, and updates.",
      },
      {
        title: "Dub videos without losing the speaker",
        body: "Translate footage into other languages while the original speaker's voice carries through, lip-sync handled by the studio.",
      },
      {
        title: "Voice apps and game characters",
        body: "Call the streaming API for low-latency speech in agents, tools, and interactive media with stable voice identities.",
      },
    ],
    pros: [
      "Voice realism is the category benchmark",
      "Consent-verified cloning sets the compliance standard",
      "Dubbing preserves the original speaker's voice across languages",
      "Streaming API supports real-time, low-latency use",
    ],
    cons: [
      "Credit allowances on low tiers cover only minutes of audio",
      "Clone quality depends heavily on the source recording",
      "Commercial use requires paid tiers",
      "Long-form production gets expensive fast",
    ],
    alternatives: ["heygen", "synthesia"],
    pricing: {
      model: "freemium",
      startingPrice: "$5 per month",
      note: "Free tier is about 10 minutes of audio monthly; Starter $5 per month; paid plans scale credits, cloning, and commercial rights.",
    },
  },
  {
    slug: "gemini",
    longDescription:
      "Gemini is Google's flagship assistant, natively multimodal across text, images, audio, and video. It answers with grounding in Google Search, supports very long context windows on its advanced tiers, and runs voice conversations through Gemini Live on mobile. Deep extensions put it inside Gmail, Docs, Sheets, and Android itself.\n\nGoogle AI Pro, at $19.99 per month, bundles higher model limits, generative media tools, and 2 TB of storage; a $249.99 AI Ultra tier targets heavy users of the newest video models. A functional free tier covers everyday chat, and Workspace customers get business variants with admin governance.\n\nGemini is the strongest choice when your work already lives in Google's ecosystem: drafting in Docs, triaging Gmail, or reasoning over files in Drive. Answer quality varies more across task types than its closest rivals, and free consumer activity can be reviewed for product improvement unless settings are changed.",
    useCases: [
      {
        title: "Draft and summarize inside Workspace",
        body: "Rewrite emails in Gmail, generate Docs content, and turn Sheets data into insights without leaving the tab.",
      },
      {
        title: "Reason across huge contexts",
        body: "Feed long transcripts, codebases, or document sets into the extended context window and query them as one.",
      },
      {
        title: "Talk tasks through with Gemini Live",
        body: "Use voice on mobile to brainstorm, rehearse, or get help while sharing what your camera sees.",
      },
      {
        title: "Analyze video and images natively",
        body: "Ask questions about recordings, screenshots, and photos directly; no separate vision pipeline required.",
      },
    ],
    pros: [
      "Deepest integration with Gmail, Docs, Sheets, and Android",
      "Native multimodal input, including video understanding",
      "Very long context windows on advanced tiers",
      "Google AI Pro bundles storage and Workspace extras",
    ],
    cons: [
      "The best features sit behind Pro and Ultra subscriptions",
      "Quality varies more across task types than close rivals",
      "Free consumer chats may be reviewed unless settings are changed",
      "Workspace-bound users get the most; others see less advantage",
    ],
    alternatives: ["chatgpt", "perplexity"],
    pricing: {
      model: "freemium",
      startingPrice: "$19.99 per month",
      note: "Free tier on web and mobile; Google AI Pro $19.99 per month with 2 TB storage; AI Ultra $249.99 per month.",
    },
  },
  {
    slug: "google-cloud-vision",
    longDescription:
      "Cloud Vision is Google Cloud's set of pretrained image analysis APIs: label and scene detection, OCR in dozens of languages including handwriting, face and landmark detection, logo recognition, explicit-content moderation, and visual product search for retail catalogs. It runs as REST or gRPC services with client libraries for the major languages, reading images from Cloud Storage or request payloads.\n\nGoogle has migrated much of its newer vision work into the Vertex AI stack, but Cloud Vision remains the pragmatic way to get perception features tomorrow rather than train a custom model next quarter. Pricing is per 1,000 units per feature, and the first 1,000 units each month are free for most features.\n\nIt suits teams that need dependable general-purpose detection without model operations. There is little control over the underlying models, custom training pushes you toward Vertex AI, and high-volume or face-related workloads carry cost and biometric compliance considerations.",
    useCases: [
      {
        title: "OCR scans, signs, and handwriting",
        body: "Call the text detection API on stored images and return structured text in dozens of languages to your pipeline.",
      },
      {
        title: "Auto-tag your image libraries",
        body: "Run label detection across Cloud Storage assets to power search, routing, and governance of media collections.",
      },
      {
        title: "Block unsafe uploads before review",
        body: "Apply SafeSearch and explicit-content detection to user uploads and quarantine violations automatically.",
      },
      {
        title: "Match products with visual search",
        body: "Index a retail catalog and let Product Search return matching items from customer photos or reference shots.",
      },
    ],
    pros: [
      "Broad mature feature set, from OCR to product search",
      "First 1,000 units per feature each month are free",
      "Simple REST and gRPC integration with official libraries",
      "No model training needed for most everyday tasks",
    ],
    cons: [
      "No control over the underlying models",
      "Custom training pushes you to the separate Vertex AI stack",
      "GCP lock-in and per-unit costs need active monitoring",
      "Face features carry biometric compliance duties",
    ],
    alternatives: ["amazon-rekognition", "clarifai"],
    pricing: {
      model: "paid",
      startingPrice: "Pay as you go",
      note: "Per 1,000 units per feature; the first 1,000 units each month are free for most features.",
    },
  },
  {
    slug: "grammarly",
    longDescription:
      "Grammarly is a writing layer that follows you across surfaces: browser extensions, a desktop app, mobile keyboards, and native integrations with Word, Outlook, and Google Docs. Beyond grammar, spelling, and punctuation it detects tone, offers full-sentence rewrites, and drafts replies and documents from prompts in place.\n\nTeam features add shared style guides, brand tones, snippets, and a plagiarism checker, with an analytics dashboard for administrators. The company has broadened into adjacent productivity territory through acquisitions, but the assistant itself remains a focused correction and drafting tool rather than a general chatbot.\n\nA free plan covers everyday corrections, Pro runs $12 per month billed annually ($30 month to month), and Enterprise adds centralized management. Grammarly suits students, customer-facing teams, and anyone whose writing is reviewed by others; expect occasional suggestions that misread technical or creative prose.",
    useCases: [
      {
        title: "Fix grammar everywhere you write",
        body: "Install the extension once and get corrections in email, docs, CRM fields, and social posts as you type.",
      },
      {
        title: "Match tone before you hit send",
        body: "Check how a message reads to its audience and apply rewrites that soften, sharpen, or formalize it.",
      },
      {
        title: "Enforce one voice across a team",
        body: "Business plans share style guides, brand tones, and snippets so every writer starts from the same rules.",
      },
      {
        title: "Draft replies in context",
        body: "Generate responses to emails and threads from short prompts, then edit the output inline.",
      },
    ],
    pros: [
      "Follows you across browsers, Office, Google Docs, and mobile",
      "Tone detection catches how messages actually land",
      "Team style guides and brand tones keep writing consistent",
      "Free tier covers everyday corrections well",
    ],
    cons: [
      "Rewrites and tone controls sit behind the Pro subscription",
      "Suggestions occasionally misread technical or creative prose",
      "Extension footprint is noticeable on some heavy sites",
      "Enterprise analytics require real deployment buy-in",
    ],
    alternatives: ["quillbot", "notion-ai"],
    pricing: {
      model: "freemium",
      startingPrice: "$12 per month",
      note: "Free plan covers core corrections; Pro is $12 per month billed annually, $30 month to month; Enterprise is custom.",
    },
  },
  {
    slug: "h2o-ai",
    longDescription:
      "H2O.ai pairs one of the most battle-tested open-source machine learning stacks, H2O-3, with newer generative tooling. H2O-3 provides distributed algorithms, AutoML leaderboards, and built-in explainability for tabular problems, callable from Python and R, and it has long been a fixture in banking and insurance model stacks.\n\nh2oGPT extends the company into private document intelligence: retrieval and question answering across large PDF corpora using open LLMs, deployable fully on-premises or air-gapped. Driverless AI, the commercial flagship, automates feature engineering and model building with enterprise support attached.\n\nThe open-source core is free to self-host, which makes H2O attractive where data cannot leave the building and budgets exclude per-seat SaaS. The tradeoffs are interfaces that feel dated next to newer platforms, a need for genuine data science skill, and enterprise features licensed separately.",
    useCases: [
      {
        title: "Build scored models with AutoML",
        body: "Run AutoML on tabular data to get leaderboards, tuned ensembles, and built-in explanations for each prediction.",
      },
      {
        title: "Ask questions across private documents",
        body: "Use h2oGPT to query large PDF corpora on-prem or air-gapped, with no data leaving your infrastructure.",
      },
      {
        title: "Scale training across clusters",
        body: "Distribute classical ML workloads across nodes with H2O-3, callable from Python or R.",
      },
      {
        title: "Own your ML stack outright",
        body: "Self-host the open-source core under an open license and add enterprise support only where it pays for itself.",
      },
    ],
    pros: [
      "Battle-tested open-source core, free to self-host",
      "AutoML and explainability built in from day one",
      "h2oGPT serves LLMs fully on-prem or air-gapped",
      "Credible in both classical ML and generative deployments",
    ],
    cons: [
      "Interfaces feel dated compared with newer platforms",
      "Driverless AI and enterprise support are costly add-ons",
      "Assumes genuine data science expertise to get full value",
      "Community docs skew toward expert users",
    ],
    alternatives: ["datarobot", "hugging-face"],
    pricing: {
      model: "open_source",
      startingPrice: "Free (open source)",
      note: "H2O-3 and h2oGPT are free open source; Driverless AI and enterprise support are licensed separately.",
    },
  },
  {
    slug: "hex",
    longDescription:
      "Hex is a collaborative data notebook that combines SQL, Python, and no-code cells in a single canvas, where cells reference each other's outputs instead of copy-pasted glue code. Finished notebooks publish as interactive apps with dropdowns and filters, so stakeholders consume an analysis without touching the underlying cells.\n\nHex Magic, the built-in AI toolkit, autocompletes SQL with awareness of your live schema, fixes errors, and generates transformation code from natural language. Native connections cover Snowflake, BigQuery, Databricks, Postgres, and Redshift, with version control support for team workflows.\n\nIt fits analytics and data science teams that ship findings to non-technical audiences. A free Community workspace covers individuals; the Team plan is $36 per editor per month, and viewers are free, which keeps sharing cheap. Very large notebooks get unwieldy, and editor seats cost more than generic notebook tooling.",
    useCases: [
      {
        title: "Turn notebooks into stakeholder apps",
        body: "Publish an analysis with dropdowns and filters so product and business teams self-serve answers.",
      },
      {
        title: "Write SQL with schema-aware AI",
        body: "Magic autocompletes against your live tables and fixes broken queries before they waste a run.",
      },
      {
        title: "Mix SQL and Python without glue code",
        body: "Query in SQL, transform in Python, and chart in no-code cells that all reference each other's outputs.",
      },
      {
        title: "Collaborate on live analyses",
        body: "Work multiplayer in one notebook, leave comments on cells, and keep everything in version control.",
      },
    ],
    pros: [
      "SQL, Python, and no-code cells share one canvas",
      "Published apps make analyses self-serve for stakeholders",
      "Magic AI is schema-aware, not generic autocomplete",
      "Viewers are free, so sharing widely is cheap",
    ],
    cons: [
      "Editor seats cost more than generic notebook tools",
      "Very large notebooks get slow and hard to navigate",
      "SSO and audit features sit in the Enterprise tier",
      "Still assumes SQL or Python literacy for real work",
    ],
    alternatives: ["polymer", "tableau-pulse"],
    pricing: {
      model: "freemium",
      startingPrice: "$36 per editor per month",
      note: "Free Community workspace for individuals; Team is $36 per editor per month; viewers and consumers are free.",
    },
  },
  {
    slug: "heygen",
    longDescription:
      "HeyGen turns a short consent recording into a reusable digital twin: your face and cloned voice then present any script you type, in over 175 languages, with lip-synced translation of existing footage. Templates, brand kits, and a stock avatar library speed up production, and a streaming API renders interactive avatars for real-time use.\n\nThe economics are straightforward: one presenter scales across product updates, course modules, ads, and localized variants without studio time. An interactive avatar mode covers onboarding and support flows embedded in products, and API usage is metered separately from subscription plans.\n\nThe free plan permits only a few short watermarked videos monthly, and the Creator plan runs $29 per month. Output quality is strong, but close-ups can still edge into uncanny territory, rendering queues lengthen at peak times, and per-minute costs climb quickly at volume.",
    useCases: [
      {
        title: "Localize one video into dozens of languages",
        body: "Upload a talking-head clip, pick target languages, and get lip-synced translations that keep the original voice.",
      },
      {
        title: "Produce training videos without a studio",
        body: "Type or paste scripts and let your avatar present course modules, onboarding, and policy updates on demand.",
      },
      {
        title: "Scale a presenter across campaigns",
        body: "Create a digital twin once, then generate ad and social variants in minutes instead of booking new shoots.",
      },
      {
        title: "Embed a real-time avatar in your product",
        body: "Use the streaming API to add an interactive avatar for onboarding, support, or sales conversations.",
      },
    ],
    pros: [
      "Face and voice cloning with a clear consent flow",
      "Translates talking-head video into 175-plus languages with lip sync",
      "Streaming avatar API enables real-time product use",
      "Templates and brand kits speed up polished output",
    ],
    cons: [
      "Free plan is minimal and watermarks output",
      "Close-up avatars can still land in the uncanny valley",
      "Per-minute costs climb quickly at production volume",
      "Rendering queues lengthen during peak demand",
    ],
    alternatives: ["synthesia", "elevenlabs"],
    pricing: {
      model: "freemium",
      startingPrice: "$29 per month",
      note: "Free plan allows a few short watermarked videos monthly; Creator is $29 per month; API usage is metered separately.",
    },
  },
  {
    slug: "hugging-face",
    longDescription:
      "Hugging Face is the public infrastructure of open machine learning: a hub hosting more than a million models and datasets, the transformers library that became the field's standard interface, and Spaces for hosting Gradio and Streamlit demos. Model cards record intended use, licenses, and training details, which keeps provenance visible.\n\nBeyond the hub, the company offers Serverless Inference APIs, dedicated Inference Endpoints, and an Enterprise Hub with SSO and audit features. Nearly every major lab and research organization publishes weights there, so new models tend to surface on Hugging Face before anywhere else.\n\nPublic repositories are free, Pro is $9 per month with inference credits and private options, and heavier serving bills by usage. It suits ML engineers and researchers who want the widest model selection; free inference is rate limited, and model quality varies card by card, so evaluation is on you.",
    useCases: [
      {
        title: "Find the right model for a task",
        body: "Filter the hub by task, license, and downloads, then read model cards and community tests before committing.",
      },
      {
        title: "Demo models with a public Space",
        body: "Wrap a model in a Gradio app, host it free, and share a link stakeholders can try in a browser.",
      },
      {
        title: "Fine-tune open weights on your data",
        body: "Combine transformers, datasets, and PEFT to adapt a model, then push the result back to the hub.",
      },
      {
        title: "Serve models behind managed endpoints",
        body: "Deploy to Inference Endpoints for autoscaled production serving without running your own GPU fleet.",
      },
    ],
    pros: [
      "Largest collection of open models and datasets anywhere",
      "transformers is the de facto standard ML library",
      "Free public hosting for models, datasets, and demos",
      "Model cards keep licensing and provenance visible",
    ],
    cons: [
      "Free serverless inference is rate limited and often slow",
      "Model quality varies wildly; evaluation is on you",
      "Spaces resources are modest unless you pay",
      "Enterprise features and private serving add real cost",
    ],
    alternatives: ["ollama", "replicate"],
    pricing: {
      model: "freemium",
      startingPrice: "Free",
      note: "Hub is free for public repos; Pro is $9 per month; Serverless inference and Inference Endpoints bill by usage.",
    },
  },
  {
    slug: "intercom-fin",
    longDescription:
      "Fin is Intercom's AI support agent. It answers customer questions from your existing help center content, can take actions in backend systems through Model Context Protocol tools such as issuing refunds or changing subscriptions, and hands off to human agents with the full conversation and a summary attached.\n\nPricing is per resolution at $0.99, so cost tracks problems actually solved rather than seats occupied. Fin works inside Intercom's Messenger and helpdesk, draws knowledge from your current articles, and reports which conversations it resolved versus escalated.\n\nIt suits SaaS support teams with a solid knowledge base and steady ticket volume. Accuracy is capped by documentation quality, wrong resolutions still cost money, monitoring is part of the job, and meaningful value assumes committing to the Intercom platform itself.",
    useCases: [
      {
        title: "Resolve tier-1 tickets automatically",
        body: "Point Fin at your help center and let it answer routine questions around the clock, escalating only what needs a human.",
      },
      {
        title: "Let the agent take real actions",
        body: "Connect MCP tools so Fin can process refunds, update subscriptions, or check order status inside your systems.",
      },
      {
        title: "Hand off with full context",
        body: "Escalations arrive with the transcript, a summary, and the customer's history so agents never start cold.",
      },
      {
        title: "Close knowledge gaps continuously",
        body: "Review conversations Fin could not resolve and turn them into the next batch of help center articles.",
      },
    ],
    pros: [
      "$0.99 per resolution aligns cost with problems actually solved",
      "Takes backend actions via MCP, not just canned replies",
      "Human handoffs arrive with transcript and summary",
      "Starts from help center content you already have",
    ],
    cons: [
      "Accuracy is capped by your documentation quality",
      "Per-resolution fees add up at high ticket volumes",
      "Full value assumes committing to the Intercom platform",
      "Wrong resolutions still cost money and need monitoring",
    ],
    alternatives: ["salesforce-einstein", "uipath"],
    pricing: {
      model: "paid",
      startingPrice: "$0.99 per resolution",
      note: "Billed per resolution; requires an Intercom subscription, and add-ons like agent copilots cost extra.",
    },
  },
  {
    slug: "label-studio",
    longDescription:
      "Label Studio is the open-source standard for data annotation, covering images, video, audio, text, and time series under one configurable interface. Labeling configs, written in a compact XML-like syntax, define exactly what annotators see and produce, from bounding boxes and polygons to named entities and audio regions.\n\nAn ML backend hooks your own model into the loop for pre-labeling, so humans correct suggestions instead of starting from scratch. Exports cover standard formats including COCO, YOLO, and plain JSON, and a Python SDK plus REST API drive programmatic project management.\n\nThe Community edition is free to self-host under an open license, which is why teams with sensitive data or custom pipelines standardize on it. The interface is less polished than commercial tools, enterprise features such as SSO, RBAC, and analytics are paid, and self-hosting means you own upgrades and scaling.",
    useCases: [
      {
        title: "Label images for detection and segmentation",
        body: "Configure boxes, polygons, and keypoints in one interface and export to COCO or YOLO when you are done.",
      },
      {
        title: "Pre-label with your own model",
        body: "Attach an ML backend so the model suggests annotations and annotators correct instead of drawing from scratch.",
      },
      {
        title: "Run structured review workflows",
        body: "Assign roles, require agreement, and route rejected items back for fixes before anything reaches training.",
      },
      {
        title: "Annotate audio and text too",
        body: "Handle transcription, audio regions, and entity tagging in the same tool as your vision projects.",
      },
    ],
    pros: [
      "Free to self-host; data never leaves your infrastructure",
      "Covers image, video, audio, and text in one tool",
      "ML-assisted pre-labeling cuts annotation time sharply",
      "Exports to COCO, YOLO, and other standard formats",
    ],
    cons: [
      "UI polish trails commercial annotation tools",
      "SSO, analytics, and RBAC sit in the paid Enterprise edition",
      "Self-hosting means owning upgrades, backups, and scaling",
      "Complex labeling configs have a real learning curve",
    ],
    alternatives: ["roboflow", "clarifai"],
    pricing: {
      model: "open_source",
      startingPrice: "Free (self-hosted)",
      note: "Community edition is free to self-host; Enterprise adds SSO, RBAC, analytics, and support for a fee.",
    },
  },
  {
    slug: "langchain",
    longDescription:
      "LangChain is the most widely adopted open-source framework for building LLM applications, in Python and JavaScript. It standardizes the plumbing: a common interface over model providers, prompt templates, output parsers, document loaders, vector store integrations, retrievers, and agent runtimes, so prototypes do not hard-wire a single vendor.\n\nLangGraph, its companion library, models agents as stateful graphs with checkpoints, retries, and human-in-the-loop steps, which is how production agent workflows survive failures. LangSmith, a separate service, adds tracing, datasets, and evaluation so prompts and runs can be inspected and scored.\n\nThe frameworks are MIT licensed and free; LangSmith is priced per seat or by usage above a free developer tier. LangChain suits teams moving a prototype toward a product, though its abstractions churn quickly, upgrades can break code, and debugging is easier with LangSmith than without.",
    useCases: [
      {
        title: "Build retrieval-augmented assistants",
        body: "Wire loaders, splitters, vector stores, and retrievers into a chat pipeline that answers from your documents.",
      },
      {
        title: "Orchestrate reliable agents",
        body: "Use LangGraph for stateful graphs with checkpoints, retries, and human approval steps inside long-running tasks.",
      },
      {
        title: "Swap model providers in one line",
        body: "Code against a single interface, then move between OpenAI, Anthropic, and local models without rewrites.",
      },
      {
        title: "Trace and evaluate with LangSmith",
        body: "Inspect every prompt, tool call, and latency in a run, then score outputs against datasets before shipping.",
      },
    ],
    pros: [
      "Broadest integration catalog in LLM tooling",
      "LangGraph handles stateful, resumable agent workflows well",
      "Model-agnostic: swap providers through one interface",
      "Open source with fast-moving, active development",
    ],
    cons: [
      "APIs churn fast and upgrades can break working code",
      "Abstractions can hide what the model actually receives",
      "Debugging complex chains is harder than plain code",
      "Best observability requires the separate LangSmith service",
    ],
    alternatives: ["make", "n8n"],
    pricing: {
      model: "open_source",
      startingPrice: "Free (open source)",
      note: "LangChain and LangGraph are MIT licensed; LangSmith is free at small scale, then per-seat or usage-based.",
    },
  },
  {
    slug: "make",
    longDescription:
      "Make, formerly Integromat, renders automations as a visual data-flow canvas. Modules connect left to right, and the model supports branching routers, iterators, aggregators, variables, and error handlers with retries and fallback routes, which lets one scenario express logic that linear task-based tools cannot.\n\nA deep library of app integrations covers the mainstream SaaS world, and generic HTTP, webhook, and JSON modules connect anything else with an API. AI modules call models inside scenarios, and an assistant drafts automations from a description. Scenarios run on schedules, webhooks, or on demand.\n\nPricing is per operation, with 1,000 free monthly operations and Core plans from $9 per month billed annually, which rewards complex scenarios where task-based rivals get expensive. The canvas has a real learning curve, and a single run can consume many operations, so monitoring matters.",
    useCases: [
      {
        title: "Route leads with conditional logic",
        body: "Branch scenarios by region, size, or score and assign owners, scores, and tasks across your stack automatically.",
      },
      {
        title: "Reshape data between apps",
        body: "Use iterators, aggregators, and functions to transform payloads mid-flow so systems fit together without code.",
      },
      {
        title: "Add AI steps to any workflow",
        body: "Drop OpenAI or Claude modules into a scenario to summarize, classify, or draft as part of the run.",
      },
      {
        title: "Build failure-safe automations",
        body: "Add error handlers, retries, and fallback routes so a broken step queues work instead of losing it.",
      },
    ],
    pros: [
      "Visual canvas supports branching, loops, and error handling",
      "Operations pricing beats per-task pricing on complex flows",
      "1,000 free monthly operations for small scenarios",
      "HTTP and webhook modules connect to anything with an API",
    ],
    cons: [
      "Steeper learning curve than simpler automation tools",
      "One scenario run can burn dozens of operations",
      "Ops consumption needs active monitoring to avoid plan overruns",
      "Large canvases become fiddly to debug and document",
    ],
    alternatives: ["zapier", "n8n"],
    pricing: {
      model: "freemium",
      startingPrice: "$9 per month",
      note: "Free plan gives 1,000 operations monthly; Core starts at $9 per month billed annually, with higher operation limits above.",
    },
  },
  {
    slug: "midjourney",
    longDescription:
      "Midjourney is an independent research lab whose image model remains the aesthetic benchmark in AI generation: lighting, composition, and painterly texture that read as art direction rather than interpolation. Style references, character consistency tools, and personalization profiles let you steer a recognizable look across many images.\n\nA full web editor now handles generation, region variation, panning, and upscaling without Discord, though the Discord bot remains part of its culture, and an image-to-video model animates stills into short clips. There is no official API for embedding generation in products.\n\nPlans start at $10 per month with limited fast generations; the $30 Standard tier adds unlimited relaxed generations, and higher tiers add stealth mode and more parallel work. There is no free tier, text inside images stays weak, and content filters block some legitimate briefs.",
    useCases: [
      {
        title: "Explore art direction in minutes",
        body: "Generate four-option grids from a prompt, remix the strongest, and converge on a look before any production spend.",
      },
      {
        title: "Keep characters consistent across images",
        body: "Use character and style references so the same face, outfit, and palette survive scene after scene.",
      },
      {
        title: "Develop a signature visual style",
        body: "Save personalization and style references to steer every generation toward a recognizable brand look.",
      },
      {
        title: "Animate stills into short clips",
        body: "Take a finished image into the video model on the web app and produce short motion clips for social.",
      },
    ],
    pros: [
      "Aesthetic quality is the benchmark: lighting and composition out of the box",
      "Style and character references keep a look consistent",
      "Web editor now covers the full workflow without Discord",
      "Standard tier includes unlimited relaxed generations",
    ],
    cons: [
      "No official API for embedding in products",
      "No free tier; the $10 plan has limited fast generations",
      "Text rendering inside images stays weak",
      "Content filters block some legitimate commercial briefs",
    ],
    alternatives: ["adobe-firefly", "runway"],
    pricing: {
      model: "paid",
      startingPrice: "$10 per month",
      note: "No free tier; Basic $10 per month with limited Fast hours, Standard $30 adds unlimited Relax generations.",
    },
  },
];
