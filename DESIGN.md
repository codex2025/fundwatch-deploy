# FUNDWATCH — UI/UX REDESIGN MASTER SPECIFICATION

**Project:** FundWatch — MPLADS AI Risk & Anomaly Intelligence Platform  
**Problem Statement:** SIH26102  
**Status:** Existing production-oriented prototype; this document governs a full UI/UX redesign, not a rewrite of the business logic.

---

## 0. EXECUTION CONTRACT

You are operating as a combined:

- Principal Product Designer
- Senior UX Architect
- Design Systems Engineer
- Staff Frontend Engineer
- Data Visualization Specialist
- AI Product Designer
- Enterprise Dashboard Architect
- Accessibility Engineer
- Visual QA Engineer
- SIH Grand-Finale Product Reviewer

This repository already contains a functioning FundWatch application. **Redesign the interface and user experience around the existing architecture. Do not rebuild the product from scratch and do not casually replace working backend/data/business logic.**

The existing frontend uses:

- React 19
- Vite
- Tailwind CSS 3
- Recharts
- Three.js
- Lucide React
- Firebase authentication
- Existing API clients and live-mode flows

Relevant existing surfaces/components include:

- `src/App.jsx`
- `src/components/Navbar.jsx`
- `src/components/RiskBadge.jsx`
- `src/components/SpendTimelineChart.jsx`
- `src/components/ContourHeatmap3D.jsx`
- `src/components/WorksTable.jsx`
- `src/components/WhatChangedView.jsx`
- `src/components/DatasetUploadModal.jsx`
- `src/pages/AnomalyDashboard.jsx`
- `src/pages/VisualIntelligence.jsx`
- `src/pages/AgencyDrilldown.jsx`
- `src/pages/InvestigationPanel.jsx`
- `src/pages/AuditLog.jsx`
- `src/live/LiveMode.jsx`
- `src/live/admin/CaseDetail.jsx`
- `src/live/admin/ClarificationQueue.jsx`
- `src/live/admin/ComplianceReport.jsx`
- `src/live/admin/GovernanceReport.jsx`
- `src/live/agency/AgencyPortal.jsx`
- `src/live/mp/MPPortal.jsx`
- `src/live/public/PublicTransparency.jsx`
- `src/live/shared/AuditTimeline.jsx`
- `src/live/shared/CaseStatusBadge.jsx`

Existing backend/API/data flows must remain operational unless a UX change requires a new endpoint or a small adapter.

### Absolute rules

1. Inspect the existing repository before changing code.
2. Read this entire `DESIGN.md` before implementation.
3. Inspect the current implementation and determine what can be reused.
4. Do not delete working functionality merely to simplify the redesign.
5. Do not replace real API data with mock data when real data exists.
6. Do not invent business claims, anomaly evidence, or model outputs.
7. Do not treat anomaly detection as proof of fraud.
8. Do not expose private model chain-of-thought.
9. Every important AI/risk conclusion must have visible supporting evidence or a traceable data basis.
10. The rendered browser UI—not the source code—is the final visual truth.
11. Compilation success alone is not a valid completion criterion.
12. Work in an iterative agentic loop: inspect → plan → implement → run → visually inspect → critique → fix → verify.

---

# 1. PRODUCT POSITIONING

FundWatch is **not a normal analytics dashboard**.

It is a public-finance intelligence and investigation platform for MPLADS expenditure.

Core question:

> Where is public money being spent, what looks unusual, why does it look unusual, and what should an investigator examine next?

Primary users:

- Government officials
- Auditors
- Financial investigators
- MPLADS administrators
- Policy analysts
- Monitoring authorities
- SIH judges/evaluators

The product experience must reinforce this chain:

**DATA → INTELLIGENCE → RISK → EXPLANATION → INVESTIGATION → ACTION**

The UI should make this workflow obvious without requiring a user manual.

---

# 2. VISUAL TARGET

Use the supplied dashboard references as **design-direction references only**.

Target visual qualities:

- dark enterprise workspace
- deep charcoal/near-black surfaces
- restrained lime/green brand accent
- subtle borders
- compact but readable cards
- dense information architecture
- professional left navigation
- analytical charts integrated into workflows
- contextual right rail/drawer
- strong numeric hierarchy
- premium enterprise quality
- minimal visual decoration

Think in terms of:

**financial intelligence terminal + institutional command center + modern enterprise analytics**

Do **not** copy the screenshots literally.

Do not copy exact:

- layout
- wording
- color values
- component shapes
- icons
- spacing
- charts
- branding

Use them as a visual language reference.

### Never make FundWatch look like

- generic SaaS admin template
- generic AI dashboard
- crypto dashboard
- gaming UI
- cyberpunk interface
- neon sci-fi UI
- purple AI template
- excessive glassmorphism
- gradient-heavy landing page
- rounded-card-everything design
- decoration-first dashboard

The intelligence must come from the **data relationships, analytical structure and evidence**, not decoration.

---

# 3. UX NORTH STAR

Every important screen should answer these questions in order:

1. What happened?
2. How important is it?
3. Why does it matter?
4. What evidence supports it?
5. What should I do next?

Every screen needs one primary purpose.

Avoid presenting information simply because it exists in the backend.

Prioritize information according to user decisions.

---

# 4. NEW INFORMATION ARCHITECTURE

Replace the current top-heavy navigation model with a clear intelligence workspace.

Suggested global navigation:

```text
FUNDWATCH

INTELLIGENCE
  Overview
  Anomalies
  Spending
  Agencies

INVESTIGATION
  Projects
  Cases
  Map

DATA
  Data Quality
  Audit Trail
  Reports

SYSTEM
  Live Mode
  Dataset
  Settings
```

Use clear grouping and hierarchy.

Do not overload the sidebar.

The navigation should feel like a professional investigative tool, not a list of unrelated pages.

Where possible, migrate current pages into this information architecture without breaking routes.

---

# 5. APPLICATION SHELL

Desktop target:

```text
┌──────────────┬──────────────────────────────────────────┬──────────────┐
│              │ top command/header                       │              │
│ FUNDWATCH    ├──────────────────────────────────────────┤ context      │
│              │                                          │ rail /       │
│ navigation   │             main workspace               │ selected     │
│              │                                          │ intelligence │
│              │                                          │              │
└──────────────┴──────────────────────────────────────────┴──────────────┘
```

### Sidebar

- compact
- persistent on desktop
- collapsible on smaller widths
- clear active state
- grouped navigation
- icon + text
- tooltips when collapsed

### Header

Use for:

- breadcrumb/context
- page title
- date range
- global filters
- search/command palette
- notifications
- user/session context

Avoid filling the header with decorative controls.

### Context rail

Do not keep the right rail permanently visible if the screen does not need it.

Use it contextually for:

- selected anomaly
- notifications
- activity
- investigation evidence
- quick insights

On smaller screens, convert it into a drawer.

---

# 6. DESIGN SYSTEM MIGRATION

The existing project currently uses a blue/cyan/indigo/violet visual system with gradients and glassmorphism. **Migrate the design tokens instead of hand-editing isolated components.**

Centralize all important visual values.

Create/update a token layer such as:

```text
--bg-primary
--bg-secondary
--bg-elevated
--bg-sunken

--text-primary
--text-secondary
--text-muted

--border-subtle
--border-default
--border-strong

--accent-primary
--accent-muted

--risk-critical
--risk-high
--risk-medium
--risk-low
--risk-cold

--space-1
--space-2
--space-3
--space-4
--space-5
--space-6
--space-8
--space-10

--radius-sm
--radius-md
--radius-lg

--shadow-card
```

Do not scatter arbitrary values throughout the codebase.

### Surface philosophy

Use fewer but more meaningful surfaces.

Do not put every piece of information inside a floating card.

Use:

- spacing
- typography
- subtle border contrast
- surface elevation
- alignment

to establish hierarchy.

### Radius

Use controlled, moderate radius.

Avoid excessive pills and giant rounded rectangles.

### Shadows

Use low-key elevation only where needed.

Do not use glow as a substitute for hierarchy.

---

# 7. TYPOGRAPHY

Typography must communicate enterprise seriousness.

Use a professional modern sans family and a coherent numeric style.

Requirements:

- clear display/page hierarchy
- strong but not oversized metrics
- highly readable body text
- small metadata labels
- tabular numerals for numbers where useful
- consistent font weights
- no random font changes between pages

Prefer a restrained type scale.

Do not use oversized hero typography inside data-heavy application screens.

Use monospace/tabular treatment selectively for:

- project IDs
- case IDs
- financial values
- dates
- percentages
- risk values
- technical statuses

---

# 8. COLOR SEMANTICS

Primary interface:

- near-black / charcoal
- muted neutral text
- restrained lime/green accent

Risk colors:

- Critical → red
- High → orange
- Medium → amber/yellow
- Low → green
- Informational → blue

Never let the entire application become a green screen.

Use accent colors for:

- selected state
- action
- trends
- important status
- meaningful visual emphasis

Use risk colors only where they carry meaning.

Never communicate risk by color alone.

Always pair with a label/value/icon where appropriate.

---

# 9. COMMAND CENTER / OVERVIEW

The Overview screen is the hero experience and must be redesigned first.

The first view should answer within roughly 10–15 seconds:

- how much money is monitored
- number of projects
- number of anomalies
- number of high-risk projects
- fund utilization
- where risk is concentrated
- what deserves investigation now

Recommended structure:

```text
Header / filters

KPI strip

Spending intelligence        Risk distribution

Geographic risk              Top risk agencies

Investigation queue

Recent intelligence / alerts
```

Do not create 15 equal-weight widgets.

Establish a clear visual priority.

### KPI cards

Each KPI should have:

- metric title
- primary value
- contextual comparison
- timeframe
- trend indicator where meaningful

Example:

```text
HIGH-RISK PROJECTS
184
↑ 12.4%
vs previous period
```

Avoid generic cards such as “Analytics”, “Performance”, “Overview”.

Every KPI must answer a real analytical question.

---

# 10. ANOMALY INTELLIGENCE — CORE SCREEN

This is the central differentiator.

Do not present this as a decorative table.

The ranked anomaly list is an investigative queue.

Suggested columns:

- risk score
- project
- category
- agency
- expenditure
- primary signal
- status
- time detected
- investigation state

Example structure:

```text
RISK   PROJECT      AGENCY        SIGNAL       SCORE
-----------------------------------------------------
92     MPLAD-...    Agency A      Velocity      92
87     MPLAD-...    Agency B      Cost          87
81     MPLAD-...    Agency C      Duplicate     81
```

Rows must support keyboard navigation and direct drill-down.

Use sticky headers.

Support:

- search
- filter
- sort
- pagination
- density controls
- column visibility
- selection
- expansion

---

# 11. ANOMALY EXPLANATION — MANDATORY

Never display only:

> AI detected anomaly.

Instead display a structured explanation.

Example:

```text
WHY THIS WAS FLAGGED

Spending velocity
3.7× historical baseline

Cost deviation
+56% vs peer median

Similarity
4 related projects detected

Timeline
91 days beyond comparable projects

Utilization
91% of allocation consumed
```

Then expose:

- historical baseline
- peer comparison
- source records
- timing
- related projects
- related agency pattern

Users should be able to move from claim → evidence with one interaction.

---

# 12. RISK SCORE

Risk score is an aggregation of signals, not a declaration of fraud.

UI wording must use terms such as:

- anomaly detected
- elevated risk
- unusual pattern
- requires review
- statistical deviation
- peer deviation
- potential duplicate

Avoid wording such as:

- confirmed fraud
- fraudulent agency
- corrupt project

unless backed by an explicit verified state from the existing system.

Risk display should include:

```text
92
CRITICAL

Spending velocity      94
Cost deviation         88
Duplicate similarity   76
Delay                  91
```

Where mathematically appropriate, explain how the score is composed without exposing private chain-of-thought.

---

# 13. SPENDING VELOCITY — SIGNATURE VISUAL

FundWatch should visually distinguish itself through cumulative spending analysis.

Do not show only totals.

Show current trajectory against relevant baselines.

Conceptually:

```text
spend
  │
  │                         ● current
  │                     ●
  │                  ●
  │              ●
  │          ●
  │       ●
  │    baseline ───────────────
  └──────────────────────────── time
```

The visualization should communicate:

- current cumulative expenditure
- historical baseline
- expected trajectory where available
- divergence point
- magnitude of divergence

The user should be able to answer:

> When did spending behavior become unusual?

Use Recharts or existing chart infrastructure where it makes sense.

Do not add a chart merely because the chart library is available.

---

# 14. CROSS-AGENCY BENCHMARKING

Create a clear comparative experience.

Possible dimensions:

- median project cost
- utilization rate
- completion time
- anomaly frequency
- velocity
- cost deviation
- category-specific behavior

Example:

```text
AGENCY        RISK   COST Δ   DELAY   VELOCITY
------------------------------------------------
Agency A      92     +56%     +91d    3.7×
Agency B      64     +21%     +24d    1.8×
Agency C      31     +4%      +8d     1.1×
```

Support apples-to-apples comparison:

- same work category
- similar project size
- same region where meaningful
- similar time window

Do not compare incompatible populations without communicating the scope.

---

# 15. GEOGRAPHIC INTELLIGENCE

The map must answer:

> Where is risk concentrated?

Use the existing map/visualization capabilities where practical.

Support filtering by:

- state
- district
- constituency
- work category
- risk level

Selecting a region should update relevant data panels.

Avoid decorative map overlays that have no analytical purpose.

---

# 16. PROJECT DETAIL / INVESTIGATION WORKSPACE

A project detail page must feel like an investigation workspace, not a profile card page.

Suggested order:

```text
Project identity
Risk / status

Financial overview       Risk intelligence

Spending timeline

Similar projects         Agency benchmark

Evidence / records

Investigation activity
```

Include:

- project ID
- project title
- agency
- constituency
- category
- sanctioned amount
- expenditure
- utilization
- status
- risk score
- anomaly signals
- timeline
- related projects
- source/evidence records

Preserve navigation context.

Do not make the user lose the selected anomaly or filter state when moving into details.

---

# 17. INVESTIGATION WORKFLOW

Design the product around:

```text
Detect
  ↓
Understand
  ↓
Investigate
  ↓
Record
  ↓
Resolve
```

When a user clicks a high-risk anomaly, the transition should feel immediate and contextual.

Investigation workspace should contain:

- case ID
- risk score
- primary reason
- supporting evidence
- historical baseline
- peer comparison
- timeline
- related projects
- related agencies
- analyst notes
- current status
- assignment
- audit history

Actions may include:

- Assign
- Investigate
- Add note
- Mark reviewed
- Escalate
- Resolve

Ensure actions are consistent with the existing backend authorization model.

---

# 18. AGENTIC AI UX

If the existing Copilot/AI capability remains in the project, do not turn it into a generic chat assistant.

Treat it as an **Investigation Copilot**.

It should be contextual to the current object.

When viewing a project, the assistant should have access only to permitted structured context such as:

- selected project
- detected signals
- financial history
- agency baseline
- peer benchmark
- related projects
- evidence references

Example user question:

> Why is this project high risk?

Expected user-facing response pattern:

```text
This project is classified as high risk primarily because
expenditure accelerated to 3.7× the relevant historical
baseline during the final quarter.

Two additional signals reinforce the classification:

• cost is 56% above the peer median
• completion is 91 days slower than comparable projects

[View spending evidence]
[View peer comparison]
[View related projects]
```

Do not claim facts unsupported by data.

Do not fabricate citations, records or evidence.

Do not expose hidden chain-of-thought.

---

# 19. AGENTIC SYSTEM DESIGN

Prepare the UX for an agent architecture such as:

```text
USER INTENT
    ↓
CONTEXT BUILDER
    ↓
TOOL / DATA SELECTION
    ↓
SPECIALIST AGENTS
    ↓
EVIDENCE AGGREGATION
    ↓
RISK ASSESSMENT
    ↓
USER-FACING EXPLANATION
    ↓
ACTION
```

Potential specialist agents:

- Data Quality Agent
- Anomaly Detection Agent
- Financial Analysis Agent
- Duplicate Detection Agent
- Timeline Analysis Agent
- Peer Benchmark Agent
- Geographic Risk Agent
- Evidence Agent
- Report Generation Agent
- Investigation Copilot

The UI should present **agent outputs as structured intelligence**, not as uncontrolled model prose.

---

# 20. AGENTIC UI PATTERNS

When a multi-step analysis is running, use transparent process states without exposing reasoning.

Example:

```text
ANALYSIS IN PROGRESS

✓ Loaded project records
✓ Compared historical spending
✓ Calculated peer benchmark
✓ Checked related projects
✓ Analyzed timeline
● Preparing evidence summary
```

These are safe operational status indicators.

Do not expose hidden deliberation or chain-of-thought.

When the analysis completes, summarize:

- result
- confidence/quality context if supported
- evidence references
- next action

---

# 21. EVIDENCE-FIRST DESIGN

Every important AI-generated conclusion must have an evidence path.

Use a consistent pattern:

```text
HIGH RISK

Evidence
Spending velocity: 3.7×
Peer deviation: +56%
Delay: 91 days

[View evidence]
```

Clicking evidence should navigate directly to the relevant:

- chart
- row
- record
- baseline
- comparison
- source dataset

This is a core trust feature.

---

# 22. GLOBAL SEARCH / COMMAND PALETTE

Create a serious global search experience.

Search entities such as:

- project ID
- project name
- agency
- constituency
- MP
- district
- work category
- investigation/case ID

Use categorized results.

Example:

```text
PROJECTS
MPLAD-49201

AGENCIES
XYZ Engineering Division

CONSTITUENCIES
...
```

If useful, support command-palette actions such as:

- Open project
- Open anomalies
- Create investigation
- Change filters
- Open reports

Do not create a fake command palette that performs no meaningful actions.

---

# 23. FILTER SYSTEM

Filters are a major part of investigative UX.

Global filter candidates:

- date range
- state
- district
- constituency
- agency
- category
- risk level
- project status

Display active filters clearly.

Example:

```text
State: Tamil Nadu ×
Risk: Critical ×
Category: Roads ×
```

Provide:

- clear all
- sensible defaults
- contextual filter counts
- consistent behavior across screens

Avoid filters that change data silently.

---

# 24. TABLE / REGISTRY DESIGN

Use enterprise data-table patterns.

Required behavior where appropriate:

- sticky header
- sort
- filter
- search
- pagination
- row expansion
- keyboard navigation
- density control
- column visibility
- selection
- bulk actions only where justified

Alignment:

- text → left
- numbers/currency → right
- dates → consistent
- status → compact

Avoid excessive pill styling.

Do not turn a table into dozens of miniature cards.

---

# 25. DATA QUALITY

Government data is messy. Make that part of the product.

Data Quality should show meaningful indicators such as:

- records processed
- missing values
- duplicates
- invalid dates
- inconsistent agency names
- suspicious values
- last data refresh

Example:

```text
DATA QUALITY
94%

2.1% missing
0.8% duplicates
3 naming inconsistencies
```

The UI should explain the score, not just display a percentage.

---

# 26. NOTIFICATION CENTER

Show only meaningful operational intelligence.

Categories:

- critical anomaly
- risk escalation
- data quality issue
- investigation update
- model/system alert

Avoid meaningless notifications.

---

# 27. REPORTS

Reports should feel official and auditable.

Possible report types:

- anomaly report
- agency risk report
- constituency report
- investigation report
- periodic intelligence report

Show report parameters before generation:

- data period
- active filters
- included scope
- record count
- generation timestamp

Preserve traceability to the underlying data.

---

# 28. STATUS, LOADING, EMPTY, ERROR STATES

Every significant view needs complete states.

### Loading

Prefer local skeletons over full-page blockers when possible.

### Empty

Explain why nothing is shown and what action to take.

### Error

Say what failed and how to recover.

### Success

Confirm important actions unobtrusively.

Do not use raw:

> Something went wrong.

Prefer:

> Unable to load agency risk data. The data service did not respond.
> Retry.

---

# 29. RESPONSIVE DESIGN

Primary target:

- 1440px
- 1280px
- 1024px

Also support:

- 768px
- 480px
- 390px

At narrower sizes:

- sidebar collapses
- right rail becomes drawer
- KPI grid stacks
- filters move to a filter drawer
- charts resize
- tables scroll or transform into an appropriate mobile representation

Never allow the application shell to create accidental page-level horizontal overflow.

---

# 30. ACCESSIBILITY

Target WCAG AA.

Ensure:

- sufficient contrast
- semantic HTML
- keyboard navigation
- visible focus state
- accessible labels
- tooltips that do not contain essential information only available on hover
- chart descriptions/labels where appropriate
- risk not communicated by color alone
- adequate hit areas

Respect reduced-motion preference.

---

# 31. MICROINTERACTIONS

Use restrained motion.

Good uses:

- drawer transitions
- hover states
- selection transitions
- chart transitions
- skeleton shimmer where appropriate
- state changes
- command palette open/close

Avoid:

- constant pulsing
- animated gradients
- bouncing UI
- particle backgrounds
- decorative glow everywhere
- heavy parallax

Motion communicates state and continuity—not spectacle.

---

# 32. EXISTING VISUALIZATIONS — REPOSITION, DON'T AUTOMATICALLY DELETE

The existing project contains advanced visualizations such as:

- spend timeline
- 3D contour/terrain visualization
- anomaly heatmap/visual intelligence views
- comparative analytics
- other existing charts

Do not automatically place all of them on the Overview page.

Use a hierarchy:

### Overview

Only the highest-value views:

- spending velocity
- risk distribution
- top agencies
- geographic concentration
- investigation queue

### Deep Analysis / Visual Intelligence

Advanced views such as:

- 3D anomaly terrain
- quadrant analysis
- heatmaps
- radar/agency profiles
- monopoly/concentration analytics

Advanced visuals should exist because they support a decision—not because they are technically impressive.

---

# 33. PAGE MIGRATION MAP

Map existing pages into the new experience.

Suggested conceptual mapping:

```text
AnomalyDashboard      → Overview + Anomalies
VisualIntelligence    → Spending + Deep Analysis
AgencyDrilldown       → Agencies + Agency Benchmark
InvestigationPanel    → Projects / Investigation Workspace
AuditLog              → Audit Trail
LiveMode              → System / Live Mode
DatasetUploadModal    → Dataset / Data Ingestion
```

Do not break working live-mode role flows.

Preserve Firebase authentication and authorization behavior.

Preserve public/agency/MP/admin experience boundaries.

---

# 34. FRONTEND ARCHITECTURE PRINCIPLES

Before adding a component:

1. Search for an existing reusable component.
2. Check whether the existing component can be generalized.
3. Keep UI tokens centralized.
4. Avoid page-specific clones of the same pattern.
5. Keep business logic out of purely visual primitives where practical.

Suggested structure:

```text
src/
  components/
    ui/
    layout/
    analytics/
    anomalies/
    investigation/
    data/

  pages/

  live/

  api/

  hooks/

  utils/
```

Do not perform a giant refactor unrelated to the UI unless necessary to support the redesign.

---

# 35. REDESIGN PHASES

Execute in this order.

## Phase 1 — Repository audit

Inspect:

- routes
- state flow
- API clients
- current styling
- current components
- live-mode roles
- data dependencies

Create:

`docs/REDESIGN_AUDIT.md`

Include:

- current architecture
- existing UI problems
- reusable pieces
- risky areas
- recommended migration sequence

## Phase 2 — Design system

Replace the current visual token system with the new institutional dark/green system.

## Phase 3 — Application shell

Redesign:

- sidebar
- header
- breadcrumbs
- global filters
- notification entry
- context rail/drawer

## Phase 4 — Overview

Build the new Command Center first.

## Phase 5 — Anomalies

Make anomaly analysis the core investigative experience.

## Phase 6 — Project investigation

Create deep drill-down with evidence.

## Phase 7 — Agencies

Create peer benchmarking.

## Phase 8 — Spending

Create spending velocity and trend analysis.

## Phase 9 — Map

Create geographic intelligence.

## Phase 10 — Data Quality / Audit / Reports

Redesign the supporting operational surfaces.

## Phase 11 — Live Mode

Bring admin/agency/MP/public flows into the new design system without weakening permissions or workflows.

## Phase 12 — Responsive and accessibility

Complete cross-device and keyboard/accessibility QA.

## Phase 13 — visual QA

Inspect every major page in the browser.

## Phase 14 — SIH judge test

Run the demo scenario from the final section of this document.

---

# 36. AGENTIC CODING LOOP

For every major page, follow this exact loop:

```text
INSPECT
  ↓
UNDERSTAND
  ↓
PLAN
  ↓
IMPLEMENT
  ↓
RUN
  ↓
BROWSER / VISUAL INSPECTION
  ↓
CRITIQUE
  ↓
FIX
  ↓
VERIFY
```

Do not batch enormous changes without inspecting the result.

When possible, render the page and visually evaluate it before moving on.

If a browser automation / screenshot tool is available, use it.

If it is not available, use the strongest available visual/rendered verification method rather than claiming visual QA was completed.

---

# 37. VISUAL CRITIC MODE

After each major page is implemented, temporarily act as a ruthless Principal Product Designer.

Check:

### Hierarchy

- What is the most important thing on this screen?
- Can a first-time user identify it immediately?
- Are secondary controls stealing attention?

### Density

- Is this too empty?
- Is this too dense?
- Are repeated cards creating visual noise?

### Typography

- Are numbers dominant where they should be?
- Are labels too faint?
- Are titles oversized?

### Components

- consistent radius?
- consistent spacing?
- consistent borders?
- consistent button hierarchy?

### Data visualization

- does every chart answer a question?
- are labels understandable?
- is the chart too decorative?
- can users identify the anomaly quickly?

### Trust

- are conclusions explained?
- can evidence be reached?
- does the UI avoid overstating AI certainty?

### Hackathon demo

- can a judge understand the product quickly?
- is the unique intelligence visible?
- can a judge reach an anomaly in a few interactions?

After critique, fix the highest-impact issues before continuing.

---

# 38. DESIGN REVIEW GATE

Before moving from one major phase to the next, verify:

```text
[ ] No obvious layout defects
[ ] No page-level overflow
[ ] Typography consistent
[ ] Design tokens used consistently
[ ] Primary action obvious
[ ] Risk states readable
[ ] Charts have analytical purpose
[ ] Loading/empty/error states exist
[ ] Existing API/data flow still works
[ ] Existing auth/role behavior preserved
```

---

# 39. PERFORMANCE

Do not sacrifice performance for visual polish.

Watch for:

- excessive chart rerenders
- expensive 3D scenes on every page
- large table rendering
- unnecessary state propagation
- repeated API calls
- giant component re-renders

Use appropriate lazy-loading/virtualization where justified.

Do not add animation libraries merely for visual effect.

---

# 40. CONTENT DESIGN

Use precise analytical language.

Bad:

> Wow! We found something suspicious!

Good:

> Spending velocity exceeded the relevant baseline by 3.7×.

Bad:

> AI Magic

Good:

> Anomaly Signals

Bad:

> Check this out

Good:

> Review anomaly

Bad:

> Fraud detected

Good:

> Elevated risk pattern — review required

The interface must clearly distinguish:

**signal → risk → evidence → investigation → conclusion**

---

# 41. DEMO-FIRST UX

The product must support the following smooth demo path:

```text
COMMAND CENTER
      ↓
HIGH-RISK PROJECT
      ↓
ANOMALY DETAILS
      ↓
WHY FLAGGED
      ↓
SPENDING VELOCITY
      ↓
PEER BENCHMARK
      ↓
SIMILAR PROJECTS
      ↓
INVESTIGATION
      ↓
COPILOT / ANALYSIS
      ↓
INVESTIGATION REPORT
```

This path should require minimal navigation hunting.

Preserve the selected project/anomaly context across transitions.

---

# 42. SIH JUDGE SIMULATION

After the redesign is complete, act as a judge who has never seen FundWatch before.

Use the application and answer:

### At 15 seconds

What is this product?

### At 30 seconds

What problem does it solve?

### At 60 seconds

Where is the intelligence/AI?

### At 90 seconds

Show me the highest-risk case.

### At 120 seconds

Why was it flagged?

### At 180 seconds

What evidence supports the result?

### At 240 seconds

What can an investigator do next?

Then score:

```text
Problem clarity       /10
UX                     /15
Visual design          /15
AI credibility         /15
Data visualization     /10
Investigation workflow /15
Technical maturity     /10
Innovation             /10
----------------------------
TOTAL                  /100
```

Then identify the five changes with the highest expected score improvement.

Implement those five changes.

Run the judge simulation again.

---

# 43. FINAL QUALITY BAR

FundWatch should look and behave like a mature enterprise public-finance intelligence system.

The desired qualities are:

- high analytical density
- calm visual tone
- excellent information hierarchy
- evidence-first AI UX
- strong anomaly drill-down
- meaningful data visualization
- fast investigative navigation
- trustworthy government-facing language
- reusable design system
- responsive behavior
- accessibility
- production-grade polish

The objective is not:

> “Make the dashboard prettier.”

The objective is:

> **Transform the existing FundWatch prototype into a coherent intelligence product whose interface makes its anomaly-detection and investigation capabilities immediately understandable.**

---

# 44. DEFINITION OF DONE

The redesign is complete only when all applicable items are true:

- [ ] Existing core functionality still works
- [ ] Existing routes still work or are intentionally migrated without dead ends
- [ ] Existing APIs remain compatible
- [ ] Firebase authentication/authorization preserved
- [ ] Live Mode roles preserved
- [ ] Existing anomaly/data logic preserved
- [ ] New design token system centralized
- [ ] Blue/purple gradient-heavy legacy styling removed/reworked
- [ ] New application shell implemented
- [ ] Overview redesigned
- [ ] Anomaly Intelligence redesigned
- [ ] Project Investigation redesigned
- [ ] Agency Benchmarking redesigned
- [ ] Spending Intelligence redesigned
- [ ] Geographic Intelligence redesigned
- [ ] Data Quality redesigned
- [ ] Audit/Reports redesigned
- [ ] Investigation workflow is obvious
- [ ] Copilot/agentic UX contextualized where applicable
- [ ] Major AI outputs have visible evidence pathways
- [ ] Loading states implemented
- [ ] Empty states implemented
- [ ] Error states implemented
- [ ] Responsive behavior verified
- [ ] Keyboard/accessibility reviewed
- [ ] Visual QA performed on the rendered application
- [ ] No obvious alignment/spacing defects
- [ ] No unnecessary decorative charts
- [ ] No generic AI-template appearance
- [ ] No unsupported fraud claims
- [ ] SIH judge simulation completed
- [ ] Highest-impact visual/UX defects fixed

---

# 45. START HERE

When Claude Code receives this document, do NOT immediately edit the UI.

First:

1. Inspect the repository tree.
2. Inspect the current `DESIGN.md` if another copy exists elsewhere.
3. Inspect `package.json`.
4. Inspect `App.jsx` and routing/state flow.
5. Inspect the existing page/component hierarchy.
6. Inspect `index.css` and `tailwind.config.js`.
7. Inspect API clients and the major data shapes.
8. Inspect authentication/live-mode surfaces.
9. Identify the existing visual system and contradictions.
10. Create `docs/REDESIGN_AUDIT.md`.

Then begin implementation in the phase order defined above.

Do not ask for permission for obvious design decisions. Make professional assumptions consistent with this specification.

Only stop for clarification if a genuine business-logic, data-semantics, permission, or destructive-change ambiguity cannot be resolved safely from the repository.

**The browser-rendered experience is the final authority. Do not declare completion because the code compiles.**
