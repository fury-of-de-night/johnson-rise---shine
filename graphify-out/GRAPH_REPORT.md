# Graph Report - Business  (2026-09-21)

## Corpus Check
- 44 files · ~26,970 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 162 nodes · 178 edges · 26 communities (12 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b8c490ae`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- request.tsx
- package.json
- compilerOptions
- Johnson Rise & Shine — Landscaping Services (Guyana)
- Landscaping Build — Johnson Rise & Shine
- react
- security.ts
- devDependencies
- Security Audit Checklist — Johnson Rise & Shine
- dependencies
- src/components/WhatsAppFloatButton.tsx
- form-autosave.ts
- 001_service_requests.sql
- 002_audit_logs.sql
- 003_services_ref.sql
- 004_admin_users.sql
- 005_pending_service_requests.sql
- 006_rate_limits.sql
- next-env.d.ts
- supabase-config.md
- submit-service-request/index.ts

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 15 edges
2. `Johnson Rise & Shine — Landscaping Services (Guyana)` - 11 edges
3. `Landscaping Build — Johnson Rise & Shine` - 7 edges
4. `Footer()` - 6 edges
5. `Header()` - 6 edges
6. `react` - 6 edges
7. `Security Audit Checklist — Johnson Rise & Shine` - 6 edges
8. `scripts` - 5 edges
9. `WhatsAppFloatButton()` - 4 edges
10. `generateWhatsAppLink()` - 4 edges

## Surprising Connections (you probably didn't know these)
- `RequestForm()` --calls--> `sanitizeXss()`  [EXTRACTED]
  components/RequestForm.tsx → src/lib/security.ts
- `RequestPage()` --calls--> `isDisposableEmail()`  [EXTRACTED]
  pages/request.tsx → src/lib/disposable-blocklist.ts
- `WhatsAppFloatButton()` --calls--> `generateWhatsAppLink()`  [EXTRACTED]
  src/components/WhatsAppFloatButton.tsx → src/lib/whatsapp.ts

## Import Cycles
- None detected.

## Communities (26 total, 9 thin omitted)

### Community 0 - "request.tsx"
Cohesion: 0.13
Nodes (13): Footer(), Header(), links, HeroSection(), ServiceCard(), WhatsAppFloatButton(), services, RequestPage() (+5 more)

### Community 1 - "package.json"
Cohesion: 0.10
Nodes (19): name, private, scripts, build, dev, lint, start, version (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.11
Nodes (17): compilerOptions, allowJs, baseUrl, esModuleInterop, incremental, isolatedModules, jsx, lib (+9 more)

### Community 3 - "Johnson Rise & Shine — Landscaping Services (Guyana)"
Cohesion: 0.17
Nodes (11): Admin Access, Compliance, Deployment, Johnson Rise & Shine — Landscaping Services (Guyana), Postman Collection, Project Structure, Quick Start, Security Measures Implemented (+3 more)

### Community 4 - "Landscaping Build — Johnson Rise & Shine"
Cohesion: 0.20
Nodes (8): 🔍 Recent Learnings, Key specs captured, Landscaping Build — Johnson Rise & Shine, Next action, Request (user input 2026-09-14), Security checklist (from prompt), Status Update — 2026-09-14 (all agents complete), Subagent plan (per user request)

### Community 5 - "react"
Cohesion: 0.28
Nodes (3): CookieBanner(), react, supabase

### Community 6 - "security.ts"
Cohesion: 0.28
Nodes (4): RequestForm(), services, rateStore, sanitizeXss()

### Community 7 - "devDependencies"
Cohesion: 0.29
Nodes (7): devDependencies, autoprefixer, postcss, tailwindcss, @types/node, @types/react, typescript

### Community 8 - "Security Audit Checklist — Johnson Rise & Shine"
Cohesion: 0.29
Nodes (6): Files Verified (No Secrets Embedded), Mandatory Checks (from user spec), Remaining / User Action Required, Security Audit Checklist — Johnson Rise & Shine, Token / Auth Verification, WhatsApp / Data Compliance

### Community 9 - "dependencies"
Cohesion: 0.33
Nodes (6): dependencies, next, react, react-dom, @supabase/supabase-js, zod

### Community 10 - "src/components/WhatsAppFloatButton.tsx"
Cohesion: 0.80
Nodes (3): WhatsAppFloatButton(), generateWhatsAppLink(), openWhatsAppInNewTab()

### Community 11 - "form-autosave.ts"
Cohesion: 0.50
Nodes (3): LandscapingRequest, loadFormData(), saveFormData()

## Knowledge Gaps
- **82 isolated node(s):** `links`, `services`, `public.service_requests`, `public.audit_logs`, `public.services_ref` (+77 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 111 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react` to `request.tsx`, `package.json`, `security.ts`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `links`, `services`, `public.service_requests` to the rest of the system?**
  _82 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `request.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13227513227513227 - nodes in this community are weakly interconnected._
- **Should `package.json` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._