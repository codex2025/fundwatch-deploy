# FUNDWATCH — REDESIGN AUDIT (Phase 1)

**Scope:** `new-fundwatch/` — React 19 + Vite frontend, FastAPI backend, offline detector pipeline.
**Governing spec:** `DESIGN.md` (UI/UX Redesign Master Specification).
**Audit date:** 2026-09-12
**Status:** Audit only. No production UI was modified in this phase.
**Git:** branch `main`, working tree clean apart from untracked `DESIGN.md`. Last commit `35e0489`.

---

## 0. HOW THIS AUDIT WAS PRODUCED

This is an evidence-led audit, not a code read-through. Three sources were used:

1. **Static inspection** of every frontend source file, both API clients, all backend routers, the detector engine and the processed data artefacts.
2. **Live API probing** of the real FundWatch backend, started on port `8001` for this audit.
3. **Rendered browser inspection** via headless Chromium (Playwright) at 1440 / 1024 / 768 / 390 px, against both the degraded and healthy backend states.

Screenshots and probe output live in the session scratchpad. Every defect below was observed in the rendered UI or in an API response — none are inferred from source alone.

### Environment note — port 8000 is occupied by a different project

The frontend hardcodes its default API base to `http://localhost:8000`. On this machine that port is held by an **unrelated** application:

```
PID 10028  python -m uvicorn backend.app.main:app --port 8000
service:   "MPLADS AI Risk Intelligence API"  (SIH26102)
paths:     /api/projects, /api/mps, /api/predict, /api/analytics/*
```

This is **not** the FundWatch backend (`FundWatch Intelligence API v2.0.0`, paths `/api/stats`, `/api/anomalies`, `/api/agencies`, `/api/cases`). That process was left running and untouched.

Consequence: **the app as it currently runs on `localhost:5175` is in permanent silent fallback mode.** Every call to `/api/stats` and `/api/anomalies` 404s, the `catch` block swallows it, and the UI renders from the static `public/data/anomalies.json` snapshot. This masquerades as a working app and is the single most misleading thing about the current state — see §3.1.

For audit purposes the real backend was run on `:8001` and browser traffic was rewritten `8000 → 8001` to observe the healthy state. **Both states are broken, in different ways.**

---

## 1. CURRENT ARCHITECTURE

### 1.1 Frontend stack

| Concern | Current implementation |
|---|---|
| Framework | React 19.2, Vite 8.3 |
| Styling | Tailwind CSS 3.4 (`darkMode: 'class'`), plus a `@layer components` block in `index.css` |
| Charts | Recharts 2.15 |
| 3D | Three.js 0.186 (raw, imperative, no react-three-fiber) |
| Icons | lucide-react 1.45 |
| Auth | Firebase Web SDK 12 (`firebase/auth` only) |
| **Routing** | **None.** No `react-router`. |
| State | Local `useState` in `App.jsx`, prop-drilled |

### 1.2 Navigation model — there are no routes

This is the most consequential architectural fact in the repository.

`App.jsx` holds `const [activeTab, setActiveTab] = useState('dashboard')` and renders one of six components by string comparison. There is **no URL, no history, no deep link, no browser back**. `Navbar` mutates the same string.

```
App.jsx  ──activeTab──▶ 'dashboard'      → AnomalyDashboard
                        'visuals'        → VisualIntelligence
                        'drilldown'      → AgencyDrilldown
                        'investigation'  → InvestigationPanel
                        'audit'          → AuditLog
                        'live'           → LiveMode  (own AuthProvider + own sub-tabs)
```

Implications for the redesign:

- DESIGN.md §33 says "do not break working routes." **There are no routes to break.** The migration is unusually low-risk on this axis and we can introduce real URLs freely.
- DESIGN.md §16 and §41 require preserving selected-anomaly/filter context across transitions. Today context survives only because everything lives in one component's state — it will *not* survive a naive router retrofit unless selection is lifted into URL params or a context provider. **This is the main architectural risk of the redesign.**
- Live Mode nests a *second*, independent tab system inside `LiveMode.jsx` (`queue` / `compliance` / `governance` / `audit`) plus a third level (`selectedCaseId` → `CaseDetail`). Three uncoordinated navigation systems.

### 1.3 Data flow

```
detector/run_detector.py  (offline, one-shot)
        │  writes
        ▼
data/processed/{anomalies.json, scored_panel.json, clean_works.csv, cases.json, audit_log.json}
        │  loaded once into memory (lru_cache)
        ▼
backend/db.py  Store
        │
        ├── routers/anomalies.py   /api/stats, /api/anomalies, /api/aliases      (public)
        ├── routers/agencies.py    /api/agencies[/{id}[/works]]                  (public)
        ├── routers/investigate.py /api/investigate/{anomaly_id}                 (public, POST)
        ├── routers/dataset.py     /api/upload-dataset, /api/charts/*            (public)
        ├── routers/cases.py       /api/cases*, /api/compliance, /api/governance (role-gated)
        ├── routers/audit.py       /api/audit                                    (admin only)
        └── routers/public.py      /api/public/summary                           (any authed)
                │
                ▼
frontend/src/api/client.js     — unauthenticated, try-API-then-fall-back-to-static
frontend/src/api/liveClient.js — Firebase bearer token, throws on failure
```

Two API clients with **opposite failure philosophies**. `client.js` silently degrades and never tells the UI. `liveClient.js` throws and the UI shows an error. The silent one covers the entire public product surface.

### 1.4 Authentication and roles — the part that works

This is the healthiest subsystem in the repository and must be preserved intact.

- `firebase.js` — client config (public API key, correctly commented as non-secret).
- `live/auth/AuthContext.jsx` — `onIdTokenChanged`, exposes `{user, role, agencyId, state}`; role read from **custom claims**, defaulting to `public`.
- `backend/auth.py` — verifies the Firebase ID token against Google's public certs (`verify_firebase_token`), derives role/scope from claims, **trusts no client-supplied identity field**. `require_roles(...)` dependency factory.
- Role matrix as enforced today:

| Endpoint | admin | mp | agency | public |
|---|:-:|:-:|:-:|:-:|
| `GET /api/cases`, `/api/cases/{id}` | ✅ | ✅ | ✅ | ❌ |
| `POST /api/cases/generate` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /cases/{id}/notice` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /cases/{id}/response` | ❌ | ❌ | ✅ | ❌ |
| `PATCH /cases/{id}/verify` | ❌ | ✅ | ❌ | ❌ |
| `PATCH /cases/{id}/resolve` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/compliance`, `/api/governance` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/audit` | ✅ | ❌ | ❌ | ❌ |
| `GET /api/public/summary` | ✅ | ✅ | ✅ | ✅ |

  Row-level scoping (`_scope_cases`, `_assert_case_in_scope`) additionally restricts agencies to their own `agency_id` and MPs to their own `state`.

**Verified working in browser:** Live Mode renders the sign-in gate correctly and does not leak case data pre-auth.

**Redesign rule: this layer is off-limits.** Restyle `Login.jsx` and the role portals; do not touch `AuthContext`, `auth.py`, or any `require_roles` call.

### 1.5 Design token layer (current)

Tokens exist in two places and disagree with each other and with DESIGN.md:

- `tailwind.config.js` — `brand.*` (sky-blue ramp `#0284c7`), `risk.{critical,high,medium,low,cold}`, `surface.{DEFAULT,raised,sunken,border,borderHover}`, `boxShadow.{card,glow,glow-violet}`, `backgroundImage.brand-gradient` (sky → indigo → violet).
- `src/index.css` — `@layer components` with `.glass-card`, `.glass-pill`, `.btn-*`, `.stat-tile`, `.nav-pill*`, plus a `body` background of two radial gradients (sky + violet).

`risk.*` is the one token group already aligned with DESIGN.md §8 and can be carried forward. Everything else is the blue/indigo/violet system the spec asks us to replace.

**The `.glass-card` / `.btn-*` / `.nav-pill*` class layer is the single highest-leverage asset in this repo.** 38 `glass-card` usages across 26 components. Redefining those classes re-skins most of the app without touching JSX. See §4.1.

---

## 2. EXISTING UI PROBLEMS — RENDERED EVIDENCE

Ordered by severity. Every item was observed in a browser, not inferred.

### 2.1 BLOCKER — Fabricated analysis presented as real output

**`ContourHeatmap3D.jsx` is 100% synthetic.** It is rendered on Visual Intelligence under the heading *"Multidimensional Anomaly Density Terrain (X, Y, Z)"* with an axis legend claiming X = Cost Deviation, Y = Risk Density, Z = Execution Velocity.

It accepts `dataPoints` (fed `scatterData.points` at `VisualIntelligence.jsx:581`) and **never reads it**. The prop appears exactly once, in the destructuring on line 5. The surface is three hardcoded Gaussians plus sine/cosine noise:

```js
// ContourHeatmap3D.jsx:116-122
const p1 = 8.5 * Math.exp(-((x - 4.5) ** 2 + (z - 4.5) ** 2) / 12.0);  // labelled "Ghost Bills"
const p2 = 6.8 * Math.exp(-((x - 5.0) ** 2 + (z + 4.0) ** 2) / 14.0);  // labelled "Cost Outliers"
const p3 = 5.2 * Math.exp(-((x + 4.0) ** 2 + (z - 3.5) ** 2) / 10.0);  // labelled "Velocity Dumping"
const baseline = 0.8 * Math.sin(x * 0.4) * Math.cos(z * 0.4) + 1.2;
```

The three peaks are *named after fraud typologies*. A judge or auditor reading this screen is being shown a decorative shape and told it is evidence. This violates DESIGN.md absolute rules **#5, #6 and #9** simultaneously, and it is the single biggest credibility liability in the product.

**Not a styling fix.** Either bind it to real data or remove it. Recommendation in §6.

### 2.2 BLOCKER — "Photo Verified" is unconditionally true

`WorksTable.jsx:99` reads `work.has_image_proof` and renders a blue *"Photo Verified"* badge with the tooltip *"Field photo proof verified on MPLADS portal."*

`data/clean_pipeline.py:159` computes the column — but it is **dropped before writing** `clean_works.csv` (confirmed: the CSV header has no such column). `backend/routers/agencies.py:124` then does:

```python
"has_image_proof": bool(w.get("has_image_proof", True))   # ← defaults True
```

**Every work in the product claims verified photographic proof that does not exist.** Confirmed in the browser: all five works on the Kalahandi drilldown show "Photo Verified". This is a fabricated evidentiary claim in an audit tool.

### 2.3 BLOCKER — Accusatory language unsupported by the data

The product routinely labels statistical outliers with criminal-conduct terms. Observed on screen:

| Rendered text | Location | Problem |
|---|---|---|
| "Visual Anomaly & **Fraud** Intelligence Hub" | VisualIntelligence h1 | Detection ≠ fraud |
| "**Cartel** & Ghost Velocity" / "Cartel & Ghost Quadrant (Q1)" | VI quadrant legend + KPI | Cartel is a criminal finding |
| "**Ghost Bills** Only (≤3d)" / "Highlight Ghost Bills" | VI filter button | "Ghost" asserts non-existence of work |
| "Contractor **Monopoly** & Cumulative Risk" | VI chart 5B | Market-abuse assertion from a spend share |
| "**Monopoly** Concentration — 34.2% controlled by top single agency" | VI KPI | Same |
| "Cartel & Ghost Velocity — **Extreme Overprice** + ≤3d finish" | VI Q1 card | Asserts overpricing as fact |

DESIGN.md §12 and §40 prohibit exactly this vocabulary. Notably, the **backend already gets this right** — `case_engine` notices end with *"This notice reflects a statistical deviation only. It is not a finding of wrongdoing."* The UI undoes the backend's care. This is a content-design fix, cheap and high-value.

### 2.4 CRITICAL — Raw unrounded floats rendered as headline metrics

Against the healthy backend, the flagship numbers render like this:

| Screen | Rendered value |
|---|---|
| Registry, Velocity Surge column | `8.94435415865669x` |
| Registry, sub-label | `27.9271293712295 MAD-Z` |
| Drilldown KPI "Robust Modified Z-Score" | `27.9271293712295 MAD` — wraps to two lines |
| Drilldown KPI "Peer Comparison" | `8.40242653430349x` |
| Drilldown "What Changed" | `8.94435415865669x Acceleration` |
| Copilot Brief stat grid | `8.94435415865669x normal pace`, `8.40242653430349x state-category median` |

Root cause: `detector/run_detector.py` writes full float precision to `anomalies.json`; `routers/anomalies.py` passes it through `safe()` which only sanitises NaN/Inf; the frontend interpolates `{vel}x` with no formatter. The `formatINR` helper exists (duplicated four times) but there is **no ratio/score formatter at all**.

Interestingly the Copilot prose *is* correctly formatted (`8.9x`, `27.9 MAD`) because `llm_client.py` uses `:.1f`. So the same page shows `8.9x` in the narrative and `8.94435415865669x` in the stat tile directly beneath it.

### 2.5 CRITICAL — `Med: ₹NaN` on every row in the current running state

In fallback mode (which is how the app runs right now) the registry's Monthly Spend column renders:

```
₹1.96 Cr
Med: ₹NaN
```

on all 56 visible rows. Cause: **API/fallback shape divergence.**

| Field | Backend `/api/anomalies` | Static `public/data/anomalies.json` |
|---|---|---|
| median | `historical_median_monthly_inr` | `historical_median_monthly` |
| signals | nested `signals: {velocity_ratio, modified_z_score, …}` | **flat** `velocity_ratio`, `modified_z_score` |
| `risk_tier` | derived server-side | **absent** |
| `primary_flag_reason` | synthesised | **absent** |

The UI reads only the backend shape. In fallback: median → `NaN`, velocity → default `1.0` on every row, MAD-Z → `0`, the flag-reason line vanishes. **The Velocity Surge column — the product's signature signal — reads a flat `1x` for all 56 rows**, and nothing anywhere tells the user the data is degraded.

This is the direct product of `client.js`'s design: every fetcher is `try { API } catch { static/hardcoded }`, and several fetchers return **invented** data on failure (`fetchStats` returns a hardcoded 4265/86/₹3.37B object; `fetchAgencyDetail` returns three fabricated month rows; `fetchAliasAuditMap` returns two fictional agency aliases). The app cannot distinguish "backend down" from "backend fine", and neither can the user.

### 2.6 CRITICAL — Visual Intelligence renders five empty cards with no empty state

At 1440px against the currently-running (wrong) backend, Visual Intelligence shows:

- Chart 1 Histogram — **blank**
- Chart 2 Quadrant Crosshair — axes drawn, **zero points**
- Chart 3 Calendar Heatmap — **entirely empty grey grid**, all 12 months
- Chart 5A Spider Radar — a degenerate single line
- Chart 5B Pareto Waterfall — **blank**
- Only the 3D terrain renders — and per §2.1 it is fake, so **the one thing that looks alive is the one thing that isn't real**

No spinner, no empty state, no error. Each fetcher in `client.js` catches and returns `{risk_bins: [], points: [], …}`, which Recharts renders as an empty frame. DESIGN.md §28 requires loading/empty/error states on every significant view; there are effectively none.

### 2.7 HIGH — `/api/charts/radar-profiler` returns HTTP 500 (genuine backend bug)

Against the *healthy* backend, four of five chart endpoints return data. The fifth crashes:

```
KeyError: 'peer_cost_ratio'
GET /api/charts/radar-profiler → 500 Internal Server Error
```

`routers/dataset.py:355-357` reads `peer_cost_ratio` and `velocity_spike_ratio`, but `detector/autolabel.py:201` emits `peer_ratio` and no velocity column at all. The radar chart has therefore **never worked**. The frontend's catch block hides the 500 completely.

### 2.8 HIGH — Top-3 contributing works all show ₹0

On Agency Drilldown → "What Changed This Month?" → Capital Concentration, all three works render `₹0`, while the works table immediately below shows ₹50.24 L / ₹44.79 L / ₹41.05 L for the same works.

`WhatChangedView.jsx:91` reads `w.amount || w.sanction_amount || 0`. The API field is **`amount_inr`**. One-word bug, sitting in the middle of the primary evidence panel.

### 2.9 HIGH — Page-level horizontal overflow at 1024px

`scrollWidth 1077` vs `clientWidth 1024` — a 53px overflow at one of DESIGN.md's three *primary* target widths (§29 forbids this explicitly).

Culprit isolated: the Navbar right-action cluster `div.flex.items-center.gap-2.shrink-0` (Live Mode + Upload Dataset, right edge 1077px). The desktop tab row is `hidden lg:flex` and `lg` = 1024px, so at exactly 1024 the full tab row switches on while the action buttons are still present and `shrink-0`. 390px, 768px and 1440px are clean.

### 2.10 HIGH — Contradictory and misleading KPIs

- Navbar badge reads **1926** next to "Ranked Registry"; the table header on the same screen reads **56 cases**. Both are labelled anomalies.
- `/api/stats` returns `total_anomalies_flagged: 1926`. That is `len(store.anomalies)` — and `run_detector.py:91` defines that file as *every agency-month with sufficient history*, not flagged rows. **1926 of 2097 rows are not anomalies; they are simply scored.** The headline "Flagged Surges & Outliers" number is inflated ~34×.
- `/api/stats` returns `states_covered: ["Kerala","Odisha","Punjab"]` (3), while the dashboard KPI hardcodes the caption **"100% Normalized across 5 states"**.
- `high_risk_count` is 6 from the API, but the dashboard computes its own "(N Critical)" client-side and shows 6 — two independent definitions of the same thing.
- "Implementing Agencies 86" carries the hardcoded caption "Fuzzy-matched from 161 raw variants" — unverifiable from any response.

### 2.11 MEDIUM — Risk tier thresholds disagree in three places

| Source | Critical | High | Medium | Low |
|---|---|---|---|---|
| `detector/risk_score.py` | ≥86 "Critical Red Flag" | ≥70 "High Suspicion" | ≥40 "Moderate" | <40 |
| `backend/routers/anomalies.py` | ≥80 "Critical" | ≥65 "High" | ≥45 "Medium" | <45 |
| `frontend/RiskBadge.jsx` | ≥80 | ≥65 | ≥45 | else |

The detector's own classification is discarded by the API layer. A project scoring 82 is "High Suspicion" to the engine and "Critical" to the UI. Risk banding must be defined once.

### 2.12 MEDIUM — Broken/empty field bindings visible on screen

- `district` and `constituency` are **absent from `anomalies.json`**; `routers/anomalies.py` defaults them to `""`. Rendered result: every registry row reads **`, Odisha`** (leading comma), and the drilldown header reads **`, Odisha ()`**.
- `primary_flag_reason` is absent too, so the backend synthesises `f"Risk Score {score}/100"`. The italic "primary signal" line under each agency therefore reads **"Risk Score 100.0/100"** — a tautology occupying the slot DESIGN.md §10 reserves for the primary signal.
- `top_signal` (`"iqr_ratio"`) *is* present and is exactly the field that slot wants. It is never displayed.

### 2.13 MEDIUM — Chart label collision and a dead signature visual

On the Spend Timeline, the two reference-line labels overlap at the right edge: `IQR Upper Fence (Q3+1.5IQR): ₹35.3` collides with `Baseline Median: ₹19.4`.

More importantly the chart fails its purpose. Monthly spend bars and the cumulative running total share one Y axis. Cumulative reaches ~₹6 Cr while typical monthly spend is ~₹19 L, so **every bar is flattened to near-invisibility** and the "divergence point" DESIGN.md §13 asks for cannot be seen. The signature visual currently communicates nothing.

Also on this screen: a stray console error `<path> attribute d: Expected moveto path command ('M' or 'm'), "Z"` — a Recharts path emitted with an empty series.

### 2.14 MEDIUM — Accessibility gaps

Measured at 1024px on the default screen:

| Check | Result |
|---|---|
| `<th scope>` attributes | **0** across all tables |
| `[aria-label]` elements | **1** out of 127 focusable elements |
| `<h1>` count | 1 ✅ |
| `<main>` landmark | present ✅ |
| `<img>` without alt | 0 ✅ |
| `svg[aria-hidden]` | 191/191 ✅ |
| `prefers-reduced-motion` | honoured in `index.css` ✅ |

The two real failures: **icon-only buttons have no accessible name** (the eye/"view drilldown" button repeats 56 times as an unlabelled button), and **no table header semantics**. Additionally, risk is communicated by colour+number but the tier word is suppressed in the table (`showLabel={false}`), leaving colour as the only tier cue — DESIGN.md §30 forbids this.

Sortable `<th>`s are `<th onClick>` with no `role`, `tabIndex` or `aria-sort`: **table sorting is entirely unreachable by keyboard.**

### 2.15 MEDIUM — Visual system contradicts the target

Counted across `src/**/*.jsx`: **17** gradient utilities, **11** `backdrop-blur`, **47** `rounded-2xl/3xl/full`, **141** hardcoded sky/indigo/violet/purple/blue/cyan colour-class usages (worst offender `VisualIntelligence.jsx` at 32).

Rendered effect matches every item on DESIGN.md §2's "never look like" list: sky→violet gradient logo, gradient nav pills, gradient primary buttons, glassmorphic cards everywhere, glow shadows on risk badges, a violet-glowing "Live Mode" button, and full-width rounded pills. `RiskBadge` even applies `animate-pulse-subtle` to critical rows — constant pulsing, explicitly banned by §31.

The registry repeats a gradient "Copilot" pill on **every one of 56 rows**, making the per-row call-to-action the loudest element on a screen whose job is ranking.

### 2.16 LOW — Performance and structure

- **Three.js is imported eagerly.** `ContourHeatmap3D` is a static import in `VisualIntelligence.jsx:18`; with no route-splitting and no `React.lazy`, all of Three.js ships in the initial bundle for users who never open that tab.
- **No pagination or virtualisation.** The registry renders every filtered row (56 now, 1926 at `min_score=0`) as full DOM.
- `formatINR` is **duplicated in five files** with three different rounding behaviours (`.toFixed(1)` vs `.toFixed(2)` for Lakhs).
- Chart colours are baked into **backend** responses (`"color": "#10b981"` in `/api/charts/histogram`) — design tokens living in the API layer.
- `fetchOutlierMatrix`, `fetchMonopolyTreemap`, `fetchVelocityTimeline`, `fetchPeerHeatmap`, `fetchGhostQuadrant` are dead stubs returning `[]`.
- `backend/routers/anomalies.py:47` references `pd.Series(...)` but **pandas is never imported in that module**. Because Python evaluates `df.get`'s default eagerly, **any `/api/anomalies?search=…` request raises `NameError`** whenever the `district` column is missing — which it always is. Server-side search is dead.

### 2.17 FLAG FOR OWNER — S4 velocity is fed the peer ratio

`detector/autolabel.py:179`:

```python
s4, s4_reason = compute_s4_velocity_ghost_score(cost, delta_days=delta_d, velocity_ratio=peer_ratio)
```

`compute_s4_velocity_ghost_score` expects a *velocity* ratio (spend vs the agency's own temporal baseline). It is being handed `peer_ratio` (cost vs peer median) — the same quantity S3 already scores. As written, the composite score weights peer deviation at 0.25 (S3) **+ 0.20 (S4) = 0.45**, and the "Spending Velocity" dimension does not measure velocity.

This is **business logic, not UI**. DESIGN.md forbids casually changing it, so **no change was made**. Raising it because the redesign will put "Spending Velocity" on screen as the signature signal (§13), and that label should be accurate. Needs an owner decision.

---

## 3. WHAT IS REUSABLE

### 3.1 Reuse as-is (do not touch)

| Asset | Why |
|---|---|
| `backend/auth.py`, `live/auth/AuthContext.jsx`, `firebase.js` | Correct token verification, claims-based roles, no client-trusted identity |
| `require_roles` gating + `_scope_cases` / `_assert_case_in_scope` | Complete, correct role matrix (§1.4) |
| `detector/risk_score.py` (S1–S4 math) | Documented, tested (`detector/tests/test_signals.py`), defensible |
| `backend/case_store.py` + audit-log writes | Append-only audit trail with actor/role/action |
| `copilot/grounding.py`, `prompt_template.py`, `llm_client.py` template fallback | Genuinely grounded: every number traced to the payload, forbidden-word screening, deterministic no-API-key path |
| `/api/cases*` state machine | notice → response → verify → resolve maps directly onto DESIGN.md §17 |

### 3.2 Reuse with restyle (structure is fine, skin is wrong)

| Component | Keep | Change |
|---|---|---|
| `RiskBadge.jsx` | Tier thresholds, cold-start handling, size variants | Remove glow + `animate-pulse-subtle`; stop hiding the tier word; reduce radius |
| `SpendTimelineChart.jsx` | Recharts composition, reference lines, tooltip data | Dual Y-axis or separate cumulative pane (§2.13); fix label collision; retokenise colours |
| `WorksTable.jsx` | Search, category filter, totals footer | Fix `amount_inr`; **remove the fabricated Photo Verified badge**; add `<th scope>`; right-align currency |
| `WhatChangedView.jsx` | Baseline-vs-actual decomposition — conceptually the best panel in the app | Fix the `₹0` bug; retokenise; this becomes the core of the §11 "Why flagged" panel |
| `DatasetUploadModal.jsx` | Upload flow, progress, error surfacing | Restyle |
| `live/shared/CaseStatusBadge.jsx`, `AuditTimeline.jsx` | Status vocabulary, chronology | Retokenise |
| `live/**` portals (admin/mp/agency/public) | All role logic and workflows | Shell + token migration only |

### 3.3 The `index.css` component layer is the migration lever

`.glass-card` (38 usages), `.btn-primary/secondary/ghost/danger/success`, `.stat-tile`, `.stat-value`, `.nav-pill*`, `.input-field`, `.page-title`, `.section-label`, `.page-eyebrow`.

Because these are centralised, **Phase 2 can retheme the majority of the application by rewriting `index.css` and `tailwind.config.js` alone** — near-zero risk to business logic and instantly visible. The 141 inline colour usages are the residue to clean up per-page in later phases.

> The comment already in `index.css` — *"upgrading this one class re-skins every screen that uses it"* — is correct, and it is the reason this redesign is tractable.

### 3.4 Rebuild

| Thing | Why |
|---|---|
| `Navbar.jsx` | Flat 5-tab bar; DESIGN.md §4/§5 require a grouped sidebar + header shell. Also the source of the 1024px overflow. |
| `App.jsx` navigation | String-switch → real routes with preserved selection context |
| `ContourHeatmap3D.jsx` | Fabricated (§2.1) |
| `client.js` fallback strategy | Silent degradation + invented data must become explicit, surfaced states |
| Visual Intelligence page composition | Five empty cards, fraud vocabulary, decorative 3D |

---

## 4. RISKY AREAS

Ranked by (likelihood × blast radius).

### R1 — Losing selection context when routing is introduced — HIGH / HIGH
`selectedAnomaly` lives in `App.jsx` and survives tab switches only because nothing unmounts. DESIGN.md §41's demo path (Command Center → anomaly → why flagged → velocity → benchmark → investigation) depends entirely on it. A naive router retrofit silently breaks the demo.
*Mitigation:* introduce routing and a selection context **in the same commit**; encode anomaly/agency id in the URL; re-verify the §41 path in-browser before proceeding.

### R2 — Breaking Live Mode role boundaries during restyle — LOW / CRITICAL
`LiveMode.jsx` renders portals by `role`. A refactor that lifts these into the new shell could accidentally widen access.
*Mitigation:* never alter `role ===` conditions or `require_roles`. After Phase 11, re-verify the §1.4 matrix by signing in as each role.

### R3 — The static-fallback shape divergence — HIGH / HIGH
Already causing `₹NaN` and dead velocity (§2.5). Any redesign that reads new fields will compound it, and **the deployed Vercel build hits this path whenever the backend is cold**.
*Mitigation:* normalise at the client boundary — one `normalizeAnomaly()` that accepts both shapes and emits one canonical model — **before** any page rewrite. Then surface a visible "showing cached snapshot" state instead of pretending.

### R4 — Fabricated data and accusatory language surviving into the demo — MEDIUM / CRITICAL
§2.1, §2.2, §2.3. These are the items most likely to be caught by an SIH judge and are fatal to credibility in a government-facing tool.
*Mitigation:* fix in Phase 2 alongside tokens. They are cheap (delete/rename/rebind) and should not wait for their page's turn.

### R5 — Vercel deployment only ships the backend — MEDIUM / MEDIUM
`vercel.json` routes `/(.*)` → `backend/main.py`; there is no frontend build step. Combined with `render.yaml` (backend on Render) the intended topology is ambiguous, and `VITE_API_URL` is not set in either `.env.local` (both contain only `VERCEL_OIDC_TOKEN`). The hardcoded `localhost:8000` default therefore ships to production.
*Mitigation:* out of scope for UI phases, but must be settled before any demo. Flagging, not fixing.

### R6 — Three.js in the initial bundle — MEDIUM / LOW
Eager import (§2.16). If the 3D view is kept in any form it must be `React.lazy`.

### R7 — Registry rendering 1926 rows — MEDIUM / MEDIUM
Only survivable today because `minRiskScore` defaults to 30. DESIGN.md §10 wants density controls and pagination, which will expose this.
*Mitigation:* pagination in Phase 5; virtualise only if measurement justifies it.

### R8 — `_active_custom_df` is process-global — LOW / MEDIUM
`routers/dataset.py:17` caches the uploaded dataset in a module global with no per-user scoping, and `get_current_works_df()` memoises the *default* dataset into the same slot. One user's upload replaces every user's charts, and there is no reset path. Pre-existing; flagging because Phase 10 touches Dataset UX.

---

## 5. RECOMMENDED MIGRATION SEQUENCE

Aligned to DESIGN.md §35, reordered where this codebase demands it. **Two changes from the spec's default order**, both justified by findings above.

### Phase 2 — Design system + integrity fixes ⟵ *expanded*
Tokens, plus the fabrication/language defects. These are content and data-binding fixes that do not depend on any page redesign, and leaving them until their page's turn risks them surviving into the demo (R4).

1. Rewrite `tailwind.config.js` + `index.css` to the institutional charcoal/lime system (§6). Keep `risk.*`.
2. Delete the sky→violet gradients, glass blur, glow shadows, `animate-pulse-subtle`.
3. **Remove `ContourHeatmap3D`** from the page (§2.1).
4. **Remove the "Photo Verified" badge** until a real `has_image_proof` column ships (§2.2).
5. **Rename fraud/cartel/ghost/monopoly copy** to statistical language (§2.3).
6. Add shared `formatRatio` / `formatScore` / single `formatINR` in `utils/` — kills §2.4 across all screens at once.
7. Define risk bands **once** and reconcile the three sources (§2.11).

*Gate:* app still renders on every tab; no gradient/glass utilities remain in `index.css`.

### Phase 2.5 — API normalisation layer ⟵ *new, inserted*
Not in DESIGN.md, but R3 blocks everything downstream.

1. `api/normalize.js` — accept both nested and flat anomaly shapes; emit one canonical model.
2. Replace invented fallbacks in `client.js` with explicit `{data, source: 'live'|'snapshot', error}`.
3. Fix the `amount_inr` binding (§2.8) and the `pandas` import in `routers/anomalies.py` (§2.16).
4. Fix `radar-profiler`'s column names (§2.7).
5. Surface `top_signal` instead of the tautological `primary_flag_reason` (§2.12).

*Gate:* `Med: ₹NaN` gone; velocity correct in both live and snapshot modes; a visible banner when on snapshot.

### Phase 3 — Application shell
Sidebar + header per §4/§5, real routing, **selection context preserved (R1)**, 1024px overflow fixed (§2.9), command palette entry point.

*Gate:* no page-level horizontal overflow at 390/768/1024/1280/1440; browser back works; selected anomaly survives every navigation.

### Phase 4 — Overview / Command Center
KPI strip with honest metrics (§2.10 — fix the 1926 inflation and the "5 states" caption), spending intelligence, risk distribution, top agencies, investigation queue.

### Phase 5 — Anomaly Intelligence
Registry → investigative queue. Risk / project / agency / signal / score columns, sticky header, keyboard navigation, `aria-sort`, pagination, density control, per-row action de-emphasised (§2.15).

### Phase 6 — Project / Investigation workspace
"Why flagged" panel built on the repaired `WhatChangedView`; evidence links from every claim; score composition from S1–S4.

### Phase 7 — Agencies / peer benchmarking

### Phase 8 — Spending intelligence
Rebuild the velocity chart properly (§2.13) — this is the signature visual and it is currently mute.

### Phase 9 — Geographic intelligence
Note: `district` / `constituency` are **not in `anomalies.json`** (§2.12). They exist in `clean_works.csv` and `scored_agency_month.csv`. Either widen the detector output or join server-side — **decide before starting Phase 9**, since a map keyed on empty strings cannot work.

### Phase 10 — Data Quality / Audit / Reports
Data Quality is a genuine opportunity: the alias-matching pipeline (161 raw → 86 canonical agencies) is real, interesting, and currently buried behind the "Audit Map" tab.

### Phase 11 — Live Mode
Shell + tokens only. **Re-verify the §1.4 role matrix per role afterwards (R2).**

### Phases 12–14 — Responsive / a11y, visual QA, judge simulation
Fold in §2.14: `<th scope>`, accessible names on icon buttons, keyboard-operable sorting, tier label never colour-only.

---

## 6. OPEN DECISIONS FOR THE OWNER

Proceeding with the stated assumption in each case; flagging because they are the only items where the repository cannot settle the question.

| # | Question | Assumption being made |
|---|---|---|
| D1 | **3D terrain** — bind to real data or drop? | **Drop from Overview/VI in Phase 2.** A real 3D density surface over (cost deviation, velocity, risk) is buildable from `/api/charts/quadrant-scatter`, but it is not an answer to any §3 question and §32 says advanced visuals must support a decision. Available to reinstate as a bound component in Phase 8 if wanted. |
| D2 | **S4 fed `peer_ratio`** (§2.17) | **No change.** Business logic; needs an owner call. UI will not claim S4 measures temporal velocity until resolved. |
| D3 | **`total_anomalies_flagged: 1926`** | Treat as "agency-months scored"; derive the flagged count from a threshold and label both honestly. |
| D4 | **`district`/`constituency` missing** | Join server-side from `scored_agency_month.csv` rather than re-running the detector — smaller blast radius. Confirm before Phase 9. |
| D5 | **Port 8000 conflict / `VITE_API_URL`** | Left alone this session. Needs settling before any live demo (R5). |

---

## 7. PHASE 1 EXIT CHECKLIST

- [x] Routes, state flow and navigation model inspected — **no router exists**
- [x] Both API clients and all 7 backend routers mapped
- [x] Current styling system catalogued and quantified
- [x] All 26 components assessed for reuse
- [x] Live-mode roles and the full authorisation matrix documented and browser-verified
- [x] Data dependencies traced detector → processed files → API → UI
- [x] Application run and **visually inspected in a real browser** at 4 widths, in both degraded and healthy backend states
- [x] Defects evidenced from rendered output and live API responses, not source inference
- [x] Reusable assets, risk register and migration sequence produced
- [x] **No production UI modified**

**Phase 1 complete. Ready to begin Phase 2 (design system + integrity fixes) on a feature branch.**
