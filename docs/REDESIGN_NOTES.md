# FUNDWATCH — REDESIGN IMPLEMENTATION NOTES

Companion to [`REDESIGN_AUDIT.md`](./REDESIGN_AUDIT.md), which catalogued the pre-redesign state.
This records what was built, what was deliberately removed, and what remains open.

---

## 1. WHAT CHANGED

### Design system (`tailwind.config.js`, `src/index.css`)

The blue/indigo/violet gradient system is gone. Tokens now live in exactly one place — CSS
custom properties on `:root`, surfaced to Tailwind through `theme.extend`. No component
hardcodes a colour.

| Before | After |
|---|---|
| `brand.*` sky→violet ramp, `brand-gradient` | `--accent-primary: #b9e84a` (restrained lime), used for action and selection only |
| `#0c1120` / glassmorphic translucent cards | `--bg-primary: #0a0b0d` flat charcoal, one `.panel` primitive |
| `rounded-2xl` / `rounded-full` everywhere (47 uses) | `--radius-sm/md/lg` = 3/5/8px |
| `shadow-glow`, `shadow-glow-violet` | `--shadow-card/raised/overlay`, no glow |
| Two radial gradient washes on `body` | Flat ground |
| `animate-pulse-subtle` on critical risk badges | Removed — motion is for state change, not emphasis |

Risk colours were the one group already correct and were carried forward, now used
**exclusively** for risk semantics and always paired with a numeric score and band label.

### Application shell — real routing for the first time

The app previously had **no router**: `App.jsx` held `activeTab` state and switched on a
string. There were no URLs, no deep links, and no browser back.

- `react-router-dom` added. Every surface has an address; `/investigation/agy_0053__2019-03`
  deep-links to a specific record.
- **`WorkspaceContext` was introduced specifically to mitigate audit risk R1.** Selection and
  filters now live above the router outlet, so carrying one anomaly from the command centre
  through to the brief survives navigation — the demo path in DESIGN.md §41 would otherwise
  have broken the moment routing was added.
- Sidebar with grouped IA (Intelligence / Investigation / Data / System), collapsible on
  desktop, drawer on mobile.
- Header carries breadcrumb, connection state, global search and the active filter row.
- Command palette (Ctrl/Cmd-K) — every result performs a real action.

### Honest data handling (`src/api/normalize.js`, `src/api/client.js`)

The audit's most damaging finding was silent degradation. `client.js` caught every failure and
substituted **invented** values; the UI could not tell a healthy backend from a dead one, and
neither could the user.

- `normalize.js` accepts both the live API shape (nested `signals`,
  `historical_median_monthly_inr`) and the static snapshot shape (flat, `historical_median_monthly`)
  and emits one canonical model. This is what killed the `Med: ₹NaN` on every row and the dead
  `1×` velocity column.
- Every fetcher now returns `{ data, source: 'live' | 'snapshot', error }`.
- Fabricated fallbacks removed: the hardcoded stats object, the three invented month rows in
  `fetchAgencyDetail`, the two fictional agency aliases. Where a value genuinely cannot be
  derived, it is `null` and renders as `—`.
- The header shows a **"Snapshot data"** chip when running against the shipped snapshot.

### Formatting — one source of truth (`src/utils/format.js`)

Five copies of `formatINR` with three different rounding behaviours, and no ratio formatter at
all, produced headline metrics like `8.94435415865669x` and `27.9271293712295 MAD`. One module
now owns currency, ratios, scores, deviations, percentages, dates and locations.

`formatAxisINR` additionally adapts precision so adjacent chart ticks cannot collapse to the
same label (1.5 Cr and 2.4 Cr both rendering "₹2 Cr").

### Risk semantics — one definition (`src/utils/risk.js`)

Three disagreeing band definitions existed (detector at 86/70/40, API at 80/65/45, `RiskBadge`
at 80/65/45). The **detector's** thresholds are now authoritative, because that is where the
composite is computed and documented.

More consequentially, `signalSubScore()` mirrors the piecewise scoring curves in
`detector/risk_score.py`. This matters for ranking: a naive "multiples of its threshold" metric
is not comparable across signals — `iqr_ratio` is measured in IQR units above a fence and
routinely reaches 20+, so it dominated every comparison and the first build of this redesign
reported *"distribution spread"* as the primary signal on **literally every row**. Normalising
through the engine's own curves makes the four dimensions commensurable, and the
"How this score is composed" table now shows real sub-scores, weights and point contributions
that sum to the displayed score.

### Screens

| Route | Purpose |
|---|---|
| `/` | Command centre — KPI strip, investigation queue (largest element on the page), risk distribution, geographic concentration, agencies by peak risk |
| `/anomalies` | Ranked investigative queue: sortable, keyboard-navigable, paginated, density control, CSV export |
| `/investigation/:id` | Evidence workspace — why flagged → trajectory → source records, with an analytical brief in the context rail |
| `/agencies` | Peer benchmarking, with explicit scope disclosure |
| `/spending` | Portfolio timing and per-agency trajectory |
| `/geography` | State-level risk concentration |
| `/data-quality` | Field completeness and agency-name reconciliation |
| `/deep-analysis` | Distribution, deviation and concentration views |
| `/dataset` | Ingestion, stating what happens before it happens |
| `/live`, `/cases`, `/audit` | Live Mode role portals |

### Accessibility

| Check | Before | After |
|---|---|---|
| `<th scope>` | 0 | 8 of 8 |
| `aria-sort` on sortable headers | 0 | 6 |
| Buttons with no accessible name | 126 of 127 | 0 of 17 |
| Keyboard-operable table sorting | No (`th onClick`) | Yes (real `<button>`) |
| Keyboard row navigation | No | ↑/↓/Home/End/Enter |
| Risk by colour alone | Yes (`showLabel={false}`) | No — score + band label always present |

`prefers-reduced-motion` is honoured, including suppression of skeleton shimmer.

### Responsive

Page-level horizontal overflow verified **clean at 390 / 480 / 768 / 1024 / 1280 / 1440** across
all eight routes. The 1024px navbar overflow from the audit is gone with the navbar itself;
`.panel` now carries `overflow-hidden` and `min-width: 0` so no table or control row can push
the page wider than the viewport.

---

## 2. WHAT WAS REMOVED, AND WHY

These are the audit's three blockers. All were integrity problems, not styling problems.

### 2.1 The 3D "anomaly density terrain" — deleted

`ContourHeatmap3D.jsx` accepted a `dataPoints` prop and **never referenced it**. The surface was
three hardcoded Gaussians plus sine/cosine noise, and the peaks were *named after fraud
typologies* ("Ghost Bills", "Cost Outliers", "Velocity Dumping"). It was presented under an axis
legend claiming to plot cost deviation against velocity and risk density.

Deleting it also removed `three` from the dependency tree (previously eagerly imported, so it
shipped in the initial bundle for every user).

### 2.2 "Photo Verified" — removed

`clean_pipeline.py` computes `has_image_proof` but drops it before writing `clean_works.csv`, and
`routers/agencies.py` defaulted it to `True`. **Every work in the product claimed photographic
proof that does not exist.** The badge is gone and the API now returns `None` when the column is
genuinely absent. The works table shows the real `status` field instead.

### 2.3 Accusatory vocabulary — rewritten

"Fraud Intelligence Hub", "Cartel & Ghost Quadrant", "Contractor Monopoly", "Ghost Bills",
"Extreme Overprice" — all applied to ordinary statistical outliers. The backend already got this
right (`case_engine` notices end *"This notice reflects a statistical deviation only. It is not a
finding of wrongdoing."*); the UI was undoing that care. Language throughout now describes what
was measured, not what it supposedly proves.

### 2.4 Radar profiler — not surfaced

`/api/charts/radar-profiler` raised `KeyError: 'peer_cost_ratio'` on every request (the column is
`peer_ratio`). The backend bug is fixed, but the chart is not reinstated: it added no question
the other views do not already answer.

---

## 3. BACKEND CHANGES

Deliberately minimal — three defect fixes, no behavioural redesign.

| File | Fix |
|---|---|
| `routers/anomalies.py` | `pd.Series` was referenced without importing pandas. Because Python evaluates `df.get`'s default eagerly, **every** `?search=` request raised `NameError`. Replaced with a pandas-free column guard. |
| `routers/dataset.py` | Radar profiler read `peer_cost_ratio` / `velocity_spike_ratio`; `autolabel.py` emits `peer_ratio`. Endpoint returned 500 on every call. |
| `routers/agencies.py` | `has_image_proof` no longer defaults to `True` (see §2.2). |

**Untouched:** `auth.py`, `case_store.py`, the detector engine, every `require_roles` call, and
the entire copilot grounding layer.

---

## 4. PRESERVED

- **Firebase authentication** — `AuthContext`, token verification against Google's public certs,
  claims-based roles. Restyled `Login.jsx` only.
- **The full role matrix** (admin / mp / agency / public), including row-level scoping via
  `_scope_cases` and `_assert_case_in_scope`.
- **The case state machine** — draft → approve/edit/reject → agency response → MP verification →
  admin resolution, with every action written to the audit trail.
- **The detector** — S1–S4 signal maths and composite weighting are unchanged. The frontend
  mirrors the scoring curves for display; it does not recompute or override the stored score.
- **The copilot's grounding guarantees** — deterministic template fallback, forbidden-word
  screening, every figure traceable to the payload.

---

## 5. STILL OPEN

Carried forward from the audit. None are blocked by the redesign; each needs an owner decision.

| # | Item | Status |
|---|---|---|
| D2 | `autolabel.py:179` passes `peer_ratio` into the S4 **velocity** scorer, so peer deviation is weighted 0.25 (S3) + 0.20 (S4) and "Spending Velocity" does not measure velocity | **Not changed** — business logic. The UI labels S4 as the engine defines it; if this is a bug, the fix belongs in the detector. |
| D4 | `district` / `constituency` are dropped before `anomalies.json` is written | Geography works at state level and says so. District drill-down needs the detector to carry the columns through. |
| D5 | `vercel.json` routes everything to the backend with no frontend build step; `VITE_API_URL` is unset, so `localhost:8000` ships to production | Deployment config, untouched. **Must be settled before a live demo.** |
| R8 | `routers/dataset.py` caches uploaded datasets in a process-global with no per-user scoping | Pre-existing. One user's upload replaces every user's charts. |
| — | Main bundle is 786 kB (220 kB gzipped), dominated by Recharts | Deep Analysis and Live Mode are already split out. Further splitting would need per-chart lazy loading. |

---

## 6. VERIFICATION PERFORMED

Rendered-browser verification via headless Chromium, against the live FastAPI backend.

- All 9 routes render with **zero console errors and zero page errors**.
- No page-level horizontal overflow at 6 breakpoints × 8 routes.
- Deep link `/investigation/agy_0053__2019-03` resolves and selects correctly.
- Keyboard navigation: row focus → ArrowDown → Enter routes to the correct record.
- Signal differentiation confirmed on a mid-risk record (sub-scores 100 / 78 / 40 / 24 across
  the four dimensions, rather than every row reporting the same primary signal).
- Score composition verified to sum to the displayed score.
- Production build succeeds.

Live Mode role flows were verified to the sign-in gate. **Signing in as each of the four roles
and re-checking the permission matrix end-to-end still needs to be done against real Firebase
accounts** — that requires credentials this session does not hold.
