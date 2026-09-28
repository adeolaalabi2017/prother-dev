# Contributing to Prother

Thank you for your interest in contributing to Prother! Prother is an open platform built to bring honest discovery, transparent pricing, and rigorous technical standards to the AI tools landscape.

---

## Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment for everyone. Please be respectful, constructive, and considerate when interacting with other contributors, reviewing pull requests, or participating in the community forums.

---

## Ways to Contribute

There are several ways you can help improve Prother:
1. **Submit or Update AI Tools:** Help keep directory listings accurate, verify pricing models, and flag discontinued features or broken links.
2. **Improve UI/UX & Accessibility:** Enhance responsiveness, fix color contrast issues, optimize keyboard navigation, and polish micro-interactions.
3. **Write for The Journal:** Contribute high-quality technical breakdowns, model evaluations, or taxonomy guides.
4. **Fix Bugs & Expand Features:** Submit code improvements, resolve issues, or enhance performance across edge deployments.

---

## Local Development Workflow

### 1. Requirements

- [Bun](https://bun.sh/) (v1.1+ recommended) or Node.js (v20+)
- Git
- A [Convex](https://www.convex.dev/) account for the reactive backend

### 2. Setup

```bash
# Fork & clone the repo
git clone https://github.com/<your-username>/prother-dev.git
cd prother-dev

# Install dependencies
bun install

# Configure your environment
cp .env.example .env.local

# Run Convex dev server in one terminal
bun run convex:dev

# Run Next.js dev server in another terminal
bun run dev
```

### 3. Branching & Commit Conventions

- Create a feature branch off `main`:
  ```bash
  git checkout -b feature/your-feature-name
  # or
  git checkout -b fix/issue-description
  ```
- Use clear, conventional commit messages:
  - `feat: add filter by open-source license`
  - `fix: resolve light mode contrast in category cards`
  - `docs: update deployment troubleshooting guide`
  - `perf: optimize command palette query latency`

---

## Code Quality Standards

Before opening a pull request, ensure your code satisfies these quality bars:

```bash
# 1. Run ESLint across all directories
bun run lint

# 2. Verify TypeScript types
bunx tsc --noEmit -p tsconfig.json

# 3. Test production build
bun run build
```

### Design & Architecture Guidelines

- **Tailwind Tokens:** Use the design tokens declared in `globals.css` (`bg-ink`, `text-ember`, `bg-coal`, `text-cream`). Avoid hardcoding arbitrary hex colors unless strictly necessary.
- **Edge Compatibility:** Keep all runtime code compatible with Cloudflare Workers (no Node-only native filesystem bindings like `fs` or native C++ modules in edge request paths).
- **Accessibility:** Ensure interactive elements have accessible names, proper focus rings (`:focus-visible`), and pass WCAG AA contrast standards.
- **Components:** Place shared shadcn primitives in `src/components/ui/` and domain-specific features in `src/components/prother/`.

---

## Pull Request Process

1. Push your branch to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
2. Open a Pull Request against the `main` branch.
3. Fill out the PR template completely, noting:
   - Summary of changes
   - Motivation and context
   - Screenshots or recordings for visual / UI changes
   - Verification steps taken
4. Automated GitHub Actions CI will run linting, typechecking, and production build checks.
5. Address any review feedback promptly.

---

## Submitting New AI Tools

If you are submitting a tool to the directory rather than code:
- You can submit directly on the site via the [Submission Wizard](https://prother.dev/submit).
- All listings must clear the **6 Standards (S1–S6)**:
  - Live and accessible now
  - AI is core to the workflow
  - Transparent documentation and pricing
  - Zero deceptive claims
  - Terms of Service compliant
  - Standard English technical description

Thank you for helping make Prother the standard for AI tool discovery!
