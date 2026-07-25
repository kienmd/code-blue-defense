# Health-Tech Era Tech Tree — research + proposal

Status: DESIGN PROPOSAL (not implemented). Research snapshot: July 2026.
Scope: replaces/extends the current 3-item AGENTIC AI shop (`UPGRADE_TYPES` in
`js/constants.js`) with an era-based progression that teaches the player how
real hospital technology evolved — from paper charts to agentic AI.

## Design goals

1. **The game introduces the player to the real health-tech industry.** Every
   upgrade is a real product category; buying it pops a 1–2 line 8-bit info
   card explaining what that tech does in actual hospitals.
2. **The progression mirrors history**: everyone starts on PAPER CHARTS, then
   digitizes (EHR), then connects (e-prescribing, telehealth, scheduling),
   then automates (labs, imaging AI, patient flow, revenue cycle), then goes
   agentic (ambient scribes, AI triage, autonomous routing). The existing
   three AI upgrades survive as the top tier.
3. **Legally safe parody.** In-game names are CATEGORY names in 8-bit style
   ("EHR TERMINAL", "TELEHEALTH KIOSK"). Real companies appear only in a
   flavor line — "as pioneered by Epic, Oracle Health" — on the info card.
   No logos, no company-branded rooms, no claims about specific products.
4. **All effects expressed in existing constants** (`diagSeconds`,
   `treatRate`, `stressPerSec`, `DECAY_MULT`, `WRONG_ROOM_MULT`, payout
   multipliers, the labRouter auto-assign) so the balance table in
   `js/constants.js` stays the single audit point.

---

## Research snapshot: the 2026 health-tech landscape

Which real categories exist, who leads them, and which game knob each one
naturally maps onto. (Sources: KLAS rankings, Menlo/Bessemer 2026 market
reports, vendor comparisons and press, July 2026.)

| Real category | 2026 leaders (examples) | Market signal | Natural game knob |
|---|---|---|---|
| EHR (electronic health record) | Epic (~42% US acute-care share), Oracle Health (Cerner), athenahealth, MEDITECH | Epic launched native "AI Charting" Feb 2026; athenahealth shipped free athenaAmbient | Removes the paper handicap: lost charts, slow diagnosis |
| Ambient AI documentation | Microsoft Nuance DAX/Dragon Copilot (~33% share), Abridge (~30%, $5.3B val., Best in KLAS), Ambience Healthcare, Suki | ~$600M revenue 2025, 2.4x YoY; 92% of health systems piloting or deployed; saves 1–2 clinician-hours/day | `stressPerSec` down, `treatRate` up (the existing Scribe) |
| AI triage / symptom checkers | Ada Health (best published triage safety), K Health, Infermedica, Buoy | Ada's 2026 CUF study: appropriate-care rate 29.8% → 64.4% pre-visit; 68% of patients now ask AI tools first | Passive lobby diagnosis without staff; `UNDIAGNOSED_MULT` relief |
| Telehealth | Teladoc, Amwell, MDLIVE, K Health (hybrid) | Consolidated post-COVID category; the "digital front door" | Diverts low-acuity arrivals out of the waiting room |
| E-prescribing / pharmacy | Surescripts (network rails; 18-sec median med prior-auth), CoverMyMeds, Mark Cuban Cost Plus Drugs (SwiftyRx; 2026 Humana/CenterWell deal) | Cost Plus carries 2,300+ drugs at transparent markup | Pharmacy room `treatRate` up; cheaper meds = payout bump on bacteria |
| Prior-auth / revenue cycle | Waystar (Auth Accelerate: ~85% auto-approval), Cohere Health (12M auths/yr, 90% auto-approved), Availity, Akasa | PA automation is the #2 agentic-AI workflow after documentation | Discharge `payout` multiplier (the existing Prior-Auth Agent) |
| Scheduling / patient flow | Zocdoc (consumer booking), Qventus, LeanTaaS (hospital capacity/OR optimization) | "Patient flow orchestration" is a named enterprise category | Arrival smoothing; `DECAY_MULT.waiting`; walk/elevator speed |
| Remote monitoring / wearables | Dexcom (CGM; 2026 FDA digital-health pilot), Apple Watch, Philips, Masimo, Biofourmis (hospital-at-home) | Hospital-at-home programs institutionalized post-2023 | Slower deterioration for waiting patients (earlier warning) |
| Medical imaging AI | Aidoc (~2,000 hospitals, 31+ FDA clearances, aiOS), Viz.ai (2,000+ hospitals, stroke/PE care coordination, 50+ clearances), Qure.ai | Viz.ai's healthcare business turned profitable 2025; Aidoc "First Read" got FDA Breakthrough June 2026 | Instant flagging of high-acuity patients (trauma/cardiac) |
| Lab / diagnostics | Labcorp (first US lab on Roche's fully automated cobas Mass Spec, Q1 2026), Quest Diagnostics | Sample-to-answer automation reaching routine practice | `diagSeconds` cut for all staff |

Categories that map weakly onto current mechanics (deliberately excluded from
the tree, listed for honesty): clinical evidence search (OpenEvidence, Glass
Health — no "look something up" verb in game), patient-facing agents
(Hippocratic AI — overlaps AI triage), genomics/pathology AI (Tempus, PathAI
— no oncology pathogen).

---

## Era 0 — PAPER CHARTS (the starting handicap)

Every run starts here. No purchase; it is the default state and the tutorial
teaches its pain. Three handicaps, all implemented as global modifiers:

| Handicap | Effect (existing constants) | What it teaches |
|---|---|---|
| Deciphering handwriting | all staff `diagSeconds` x1.6 (nurse 3s→4.8s, doctor 2s→3.2s) | Paper intake is slow; charts must be physically found and read |
| Pajama-time paperwork | all staff `stressPerSec` x1.25 | Pre-digital documentation burden fell on clinicians after hours |
| LOST CHART | every 10s, each *diagnosed patient still waiting in the lobby* has a 10% chance to revert to undiagnosed ("?" germ reappears + 8-bit "CHART LOST!" jingle) | Paper records get misplaced; work gets redone. This is THE motivator to buy the EHR |
| (optional 4th) Billing leakage | discharge `payout` x0.9 | Paper claims leak revenue; sets up the revenue-cycle upsell in Era 3 |

Recommended: ship the first three; hold billing leakage as a difficulty
option. The LOST CHART chime should be mildly infuriating by design.

> **GATING REVISED:** era unlocks are now DECADE-GATED per `docs/ERAS.md`
> (the run advances 1950s → 2030s, one decade per shift; techs appear in the
> shop when their real-world decade arrives). The "own any 2 to advance"
> rule below is retired; era tiers remain as shop section labels. The only
> purchase dependency kept: software techs (Era 2+) require EHR TERMINAL.

## Era 1 — DIGITAL BACKBONE

One purchase. Unlocks in the **2000s** (shift 6); prerequisite for all later
software techs.

### EHR TERMINAL — cost $250 — unique, hospital-wide
- **Teaches:** Electronic Health Records — the digital chart every other
  health-tech product plugs into.
- **Flavor line:** *"as pioneered by Epic, Oracle Health"*
- **Effect:** removes ALL Era-0 handicaps (diag x1.6 → x1.0, stress x1.25 →
  x1.0, LOST CHART disabled). **Recommended honest tradeoff:** staff
  `stressPerSec` x1.1 while the EHR is installed ("so many clicks…"),
  removed the moment that staff member gets an AMBIENT SCRIBE. This is the
  true historical arc — EHRs fixed lost information but added click burden,
  and ambient AI is the industry's answer to that burden — and it makes the
  Era-4 scribe purchase feel earned rather than stacked.
- **Info card:** "ELECTRONIC HEALTH RECORDS put every patient's chart in one
  digital place — no more lost paper. ~96% of US hospitals run one; Epic
  alone holds ~42% of acute care."

## Era 2 — CONNECTED HOSPITAL (requires EHR TERMINAL)

Per-category purchases, buy any subset. Decade unlocks: E-PRESCRIBE HUB in
the 2000s; TELEHEALTH KIOSK and PATIENT PORTAL in the 2010s.

### E-PRESCRIBE HUB — cost $150 — unique
- **Teaches:** e-prescribing rails + transparent-cost pharmacy.
- **Flavor:** *"as pioneered by Surescripts, Mark Cuban Cost Plus Drugs"*
- **Effect:** Pharmacy rooms `treatRate` x1.3 (scripts arrive instantly,
  right dose, no fax); bacteria `payout` +$20 (cheaper meds, better margin).
- **Info card:** "E-PRESCRIBING sends prescriptions straight from the chart
  to the pharmacy — no fax, no handwriting errors. Discount pharmacies now
  publish drug cost + a flat markup."

### TELEHEALTH KIOSK — cost $250 — unique, sits on the lobby
- **Teaches:** virtual care / the digital front door.
- **Flavor:** *"as pioneered by Teladoc, Amwell"*
- **Effect:** each arriving **flu** patient (the low-acuity swarm) has a 30%
  chance to be treated remotely: skips the lobby entirely, pays out x0.6
  after a 6s "on call…" animation at the kiosk. Waiting-room pressure valve.
- **Info card:** "TELEHEALTH treats low-acuity cases by video so they never
  hit your waiting room. Post-2020 it became a permanent front door for
  primary and urgent care."

### PATIENT PORTAL — cost $200 — unique
- **Teaches:** online scheduling / patient access.
- **Flavor:** *"as pioneered by Zocdoc"*
- **Effect:** arrival smoothing — spawn jitter within a shift is evened out
  (no double-spawn bursts), and `DECAY_MULT.waiting` 1.3 → 1.2 (patients
  arrive prepared, checked-in, less anxious).
- **Info card:** "ONLINE SCHEDULING lets patients book, check in and fill
  forms before arriving — smoothing the lobby rush that used to slam the
  front desk at 9 AM."

## Era 3 — DATA & AUTOMATION (unlocks in the 2010s, shift 7)

All five items arrive with the 2010s; REVCYCLE BOT waits for the 2020s.

### LAB AUTOLINE — cost $300 — unique
- **Teaches:** automated laboratory diagnostics.
- **Flavor:** *"as pioneered by Labcorp, Quest Diagnostics"*
- **Effect:** all staff `diagSeconds` x0.5 (nurse 3s→1.5s, doctor 2s→1s).
- **Info card:** "MODERN LABS run sample-to-answer automation — robots prep,
  analyze and report bloodwork with no manual steps. Faster answers, faster
  triage."

### IMAGING AI — cost $350 — unique
- **Teaches:** AI radiology triage / care coordination.
- **Flavor:** *"as pioneered by Aidoc, Viz.ai"*
- **Effect:** **trauma** and **cardiac** patients are auto-diagnosed the
  instant they arrive (their scan is pre-read; red "FLAGGED" badge), and
  Surgery + Cardiology rooms `treatRate` x1.2 (the care team is activated
  before the patient reaches the bed).
- **Info card:** "IMAGING AI reads scans the moment they finish and pages
  the specialist before a human ever opens the file — turning door-to-
  treatment from hours into minutes for strokes and bleeds."

### FLOW COMMAND — cost $300 — unique
- **Teaches:** hospital operations / capacity optimization.
- **Flavor:** *"as pioneered by Qventus, LeanTaaS"*
- **Effect:** `WALK_SPEED` and `ELEV_SPEED` x1.25 (porters and elevators
  choreographed), and beds free instantly on discharge (no lingering
  occupancy frame) — the "bed turnover" fantasy.
- **Info card:** "PATIENT-FLOW AI predicts tomorrow's bed crunch today —
  orchestrating discharges, transport and OR schedules so beds never sit
  empty while the lobby overflows."

### REVCYCLE BOT — cost $250 — unique, sits on the exit door
- **Teaches:** revenue-cycle automation (claims, coding, denials).
- **Flavor:** *"as pioneered by Waystar"*
- **Effect:** discharge `payout` x1.15 (clean claims, fewer denials). Stacks
  multiplicatively with the Era-4 PRIOR-AUTH AGENT (x1.15 · x1.25 ≈ x1.44
  total — intended endgame economy spike).
- **Info card:** "REVENUE-CYCLE AUTOMATION scrubs and submits insurance
  claims the moment care is documented. Hospitals lose billions to denials;
  bots win those appeals."

### WARD WEARABLES — cost $200 — unique
- **Teaches:** remote patient monitoring / wearables.
- **Flavor:** *"as pioneered by Dexcom, Apple Watch"*
- **Effect:** `DECAY_MULT.waiting` 1.3 → 1.0 (replaces PATIENT PORTAL's 1.2
  if both owned; take the better) — continuous monitoring means waiting
  patients deteriorate no faster than walking ones, because trouble is
  caught early.
- **Info card:** "REMOTE MONITORING streams vitals from wearable sensors —
  glucose, heart rhythm, oxygen — so deterioration is caught hours earlier,
  even outside hospital walls."

## Era 4 — AGENTIC AI (unlocks in the 2020s, shifts 8–9)

The existing shop, re-homed as the summit of the tree. Existing mechanics
carry over untouched; costs/effects unchanged except where noted.

### AMBIENT SCRIBE — cost $150 — per staff member, repeatable *(existing `scribe`)*
- **Teaches:** ambient AI clinical documentation.
- **Flavor:** *"as pioneered by Abridge, Microsoft Nuance DAX"*
- **Effect:** unchanged — that staff member `stressPerSec` x0.5, `treatRate`
  x1.3. Additionally removes the EHR "click burden" x1.1 for that staffer.
- **Info card:** "AMBIENT AI SCRIBES listen to the visit and write the note
  before the doctor leaves the room — saving 1–2 hours of typing per day.
  The fastest-adopted AI in medicine: 9 in 10 health systems are rolling
  one out."

### AI TRIAGE KIOSK — cost $250 — unique, sits on the lobby
- **Teaches:** AI symptom checkers / self-triage.
- **Flavor:** *"as pioneered by Ada Health, K Health"*
- **Effect:** passive diagnosis — every 6 seconds, one undiagnosed waiter in
  the lobby self-triages (becomes diagnosed) with no staff involved. Frees
  the lobby nurse for treatment duty. (New, replaces nothing; fills the gap
  between manual diagnosis and the full auto-router below.)
- **Info card:** "AI SYMPTOM CHECKERS interview patients in plain language
  and route them to the right level of care — in one 2026 study, the share
  of patients arriving at the appropriate care setting more than doubled."

### AGENTIC ROUTER — cost $400 — unique, sits on the lobby *(existing `labRouter`, renamed; 2030s finale — unlocks shift 10)*
- **Teaches:** autonomous care orchestration — the multi-agent endgame.
- **Flavor:** *"the frontier: agentic AI orchestration"*
- **Effect:** unchanged — instant AI diagnosis of every arrival + auto-assign
  to a free matching bed every second. Still the LLM seam: patient manifests
  go through `simulateAgenticDecision()` in `js/agentic.js` (live Claude
  call or deterministic fallback). Price raised $300 → $400 because the AI
  TRIAGE KIOSK now covers part of its old value.
- **Info card:** "AGENTIC AI doesn't just answer — it acts: reading intake,
  ordering the workup and booking the bed, with humans supervising. This is
  where the industry is heading next."

### PRIOR-AUTH AGENT — cost $200 — unique, sits on the exit door *(existing `priorAuth`)*
- **Teaches:** AI prior authorization.
- **Flavor:** *"as pioneered by Cohere Health, Waystar"*
- **Effect:** unchanged — discharge `payout` x1.25.
- **Info card:** "PRIOR AUTHORIZATION — the insurer's 'mother, may I?' —
  once took days of faxes. AI agents now auto-approve ~90% of requests in
  seconds, so treatment isn't held hostage by paperwork."

---

## Progression summary

```
1950s-90s  ERA 0  PAPER CHARTS (+ stepping stones: CRASH CART, MAINFRAME HIS,
 (shifts          PULSE-OX MONITORS, PIONEER EMR — see docs/ERAS.md)
  1-5)              |
2000s      ERA 1  EHR TERMINAL ($250, cures Era 0, adds mild click burden)
 (shift 6)  +      E-PRESCRIBE HUB
                    |
2010s      ERA 2/3 TELEHEALTH KIOSK  PATIENT PORTAL  LAB AUTOLINE
 (shift 7)         IMAGING AI  FLOW COMMAND  WARD WEARABLES
                    |
2020s      ERA 4  AMBIENT SCRIBE  AI TRIAGE KIOSK  PRIOR-AUTH AGENT  REVCYCLE BOT
 (shifts 8-9)       |
2030s      FINALE AGENTIC ROUTER
 (shift 10)
```

Full tree cost ≈ $3,500 (incl. the four ERAS.md stepping stones, + scribes
per staff), spread across a 10-shift run with START_BUDGET $600 — the player
must choose a build, not buy everything. Suggested tuning target: a skilled
player buys 2–3 stepping stones in shifts 2–5, affords the EHR the shift it
unlocks (6), grabs 2–3 of the 2010s wave in shift 7, and banks for 1–2
agents + the AGENTIC ROUTER finale in shifts 8–10 (decade payout inflation
per `docs/ERAS.md` funds the late-game prices).

## Educational payload — 8-bit info cards

- Each purchase pauses the game and pops a centered 8-bit modal (NES palette,
  Press Start 2P, typewriter reveal): **CATEGORY NAME** in amber, the 1–2
  line explainer (exact copy above), the flavor line *"as pioneered by X, Y"*
  in small grey text, and a `[ B ] BACK TO THE WARD` button.
- Cards are also collectible: a "FIELD GUIDE" screen (pause menu) lists every
  card discovered across runs (persist in the existing `localStorage` save) —
  replay value doubles as a health-tech glossary.
- Copy rules: present tense, one concrete stat max per card, no company
  claims beyond "as pioneered by", no medical advice.

## Implementation sketch (single later PR, vanilla JS, no build step)

- **`js/constants.js`**
  - Add `PAPER_ERA = { diagMult: 1.6, stressMult: 1.25, lostChartPeriod: 10, lostChartChance: 0.10 }`.
  - Replace `UPGRADE_TYPES` with `TECH_TREE`: same shape per entry
    (`name, cost, target, unique, …mults`) plus `era`, `flavor`, `infoCard`,
    and new effect fields (`pharmacyRateMult`, `teleDivertChance`,
    `diagMult`, `flagPathogens: ['trauma','cardiac']`, `moveMult`,
    `payoutMult`, `waitDecayOverride`, `selfTriagePeriod`). Keep the three
    existing keys (`scribe`, `labRouter`, `priorAuth`) as aliases so saves
    and `js/agentic.js` hooks don't break.
  - Gating: add a `decade` field per tech + `requiresEhr: true` on software
    techs; decade→shift mapping lives in the `DECADES` table (see
    `docs/ERAS.md` implementation sketch). No purchase-count gating.
- **`js/game.js`**
  - `state.tech` (Set of owned tech ids) + save/load via existing
    `localStorage` block.
  - Central `techMods()` helper returning the folded multipliers; call sites:
    diagnosis timer (`diagSeconds` x paper x lab-autoline), stress accrual
    (x paper x EHR-click x scribe), treat-rate assembly (room-type mults),
    payout on discharge (revcycle x priorAuth), `DECAY_MULT.waiting`
    override, walk/elevator speed.
  - LOST CHART tick (Era 0 only): interval scan of diagnosed lobby waiters.
  - Spawn hook: telehealth divert roll (flu only) + imaging-AI auto-flag.
  - AI TRIAGE KIOSK tick: 6s self-triage of one waiter.
  - Shop panel: render grouped by era with lock icons + unlock rules; reuse
    the existing drag-to-target flow for `staff`/`lobby`/`exit` targets;
    hospital-wide techs are click-to-buy (no drag target).
  - Info-card modal: pause loop, draw card on canvas (or a DOM overlay —
    DOM is simpler for text wrap; matches existing HUD approach), dismiss
    resumes.
- **`js/entities.js`**: patient flags `lostChart`, `flagged` (imaging),
  `viaTelehealth`; small sprite badges for FLAGGED and re-greyed "?".
- **`style.css`**: info-card modal + shop era-group styles (only if DOM
  overlay is chosen).
- **`js/agentic.js`**: no changes — AGENTIC ROUTER keeps the same seam.
- **`index.html`**: no changes expected (modal container div at most).
- Untouched: `js/levels.js` wave tables (retuning is a follow-up balance
  pass, not this PR).

## Open design questions

1. **EHR click-burden tradeoff (stress x1.1)** — keep it? It's the most
   honest and most educational beat in the tree (EHR burden is *why*
   ambient scribes exist), but it's also the only upgrade with a downside;
   some players may read it as a bug.
2. ~~**Era gating strictness**~~ — RESOLVED: decade gating per
   `docs/ERAS.md` (techs unlock when their real-world decade arrives in the
   run; EHR remains the one purchase prerequisite for later software).
3. **Company flavor lines** — comfortable naming real companies ("as
   pioneered by Epic, Abridge…") on info cards, or should a config flag
   allow a company-free build for events/judges?
4. **LOST CHART tuning** — 10%/10s is designed to be felt 1–2 times in
   shift 1. Too punishing for the Rural Clinic tutorial, or exactly the
   hook that sells the EHR?
5. **Does the tree persist across levels** (meta-progression, buy once and
   keep across the 3 hospitals) or reset per run like rooms/staff do today?
   Reset keeps balance simple; persistence makes the "industry history"
   arc feel bigger.
6. **Payout stacking cap** — REVCYCLE BOT x1.15 · PRIOR-AUTH x1.25 ≈ x1.44.
   Intended as the endgame economy spike; cap it if late-game budget trivializes shifts 8–10.
