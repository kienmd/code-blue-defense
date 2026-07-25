# Decade Progression — hospital tech invention index + era mapping

Status: DESIGN PROPOSAL (not implemented). Companion to `docs/TECH_TREE.md`.
Research snapshot: July 2026.

The run becomes an Age of War-style march through hospital history: the
building starts in the **1950s** and era-ups one era at a time — through the
present, then into predicted futures (**2030s → 2100**) and a **YEAR 3000
bonus round**. The tech shop is gated to period-accurate tools, each era-up
pops an 8-bit card teaching 2–3 real inventions (or credible predictions)
from the incoming era, and every era is designed so its tech's impact is
DEMONSTRABLE by contrast (see "Game feel per era"). **This decade gating
supersedes the "own any 2 to advance" rule in `TECH_TREE.md`** (that doc's
era tiers survive as shop section labels; see "Reconciliation" below).

---

## Invention index: hospital technology by decade

Care-delivery and hospital-technology landmarks only (no epidemics/diseases).
Dates verified against device-history timelines (AHA, AIMBE, MDDI, ICAOT),
July 2026. Bolded entries are the 2–3 taught on each era-up card.

### 1950s — the modern hospital is born
- **1953 — Heart-lung machine**: Gibbon performs the first successful
  open-heart surgery on bypass; Mayo's 1955 series makes it routine.
- **1953 — The ICU**: Ibsen's Copenhagen respiratory unit invents intensive
  care — one room, continuous observation, a nurse always present.
- **1955 — Polio vaccine mass production**: Salk's vaccine scales nationwide;
  iron-lung wards begin to empty.
- 1952–56 — External pacing and defibrillation (Zoll): electricity restarts
  hearts at the bedside.
- 1957–58 — First wearable and implantable pacemakers (Bakken/Lillehei;
  Greatbatch/Chardack; Senning).
- 1954 — First successful kidney transplant (Murray, identical twins).

### 1960s — resuscitation gets organized
- **1960 — CPR standardized**: chest compressions + rescue breathing become a
  teachable protocol; survival stops depending on luck.
- **1962 — Coronary care units**: cardiac patients grouped under continuous
  ECG monitoring; in-hospital MI mortality drops sharply.
- **1965 — Portable defibrillator** (Pantridge): resuscitation leaves the
  building — the crash cart and mobile coronary care are born.
- 1967 — First human heart transplant (Barnard).
- Late 1960s — First hospital mainframe information systems (e.g. the
  Lockheed/Technicon MIS piloted at El Camino Hospital): order entry on a
  terminal, decades before the modern EHR.

### 1970s — seeing inside the body
- **1971 — CT scanner** (Hounsfield): first patient scan; cross-sectional
  imaging replaces exploratory guesswork for the brain.
- **1977 — First human MRI images** (Damadian; Lauterbur/Mansfield's methods):
  soft tissue without radiation — clinical scanners follow in the 80s.
- **Early 1970s — Paramedics and 911 EMS systems**: the ambulance stops being
  a taxi; treatment starts before the door.
- 1971–75 — ECMO: long-duration heart-lung support outside the OR.
- 1974 — Pulse oximetry principle (Aoyagi): oxygen saturation from a beam of
  light through a fingertip.

### 1980s — imaging and instruments go mainstream
- **1984 — Clinical MRI cleared** in the US; scanners spread through the
  decade.
- **1985–87 — Laparoscopic surgery**: the first lap cholecystectomies
  (Mühe, Mouret) launch minimally-invasive "keyhole" surgery.
- **1983 — Commercial pulse oximeters** (Nellcor): continuous O2 monitoring
  on every anesthetized patient; anesthesia deaths plummet.
- 1980–85 — Implantable cardioverter-defibrillator (Mirowski): a
  rhythm-watching rescuer inside the chest.
- 1982 — First PACS concepts demonstrated: medical images as digital files
  instead of film.

### 1990s — the digital seed
- **1994 — Coronary stent FDA-approved** (Palmaz-Schatz): propping arteries
  open replaces many open-chest bypasses.
- **1990s — PACS adoption / filmless radiology**: the lightbox retires;
  images move over networks.
- **1994–99 — Robotic surgery arrives**: AESOP (1994) is the first FDA-cleared
  surgical robot; ZEUS and da Vinci follow by decade's end.
- 1990s — Pioneer electronic records: VA's VistA and early Epic/Cerner sites
  prove the paperless chart is possible (adoption stays in single digits).
- 1990s — Telemedicine pilots over early internet/ISDN links.

### 2000s — the chart goes digital
- **2009 — HITECH Act**: $30B+ in incentives detonates EHR adoption — from
  ~10% of US hospitals to near-universal within a decade.
- **2001 — E-prescribing network scales** (Surescripts founded): scripts flow
  chart-to-pharmacy; handwriting errors and fax loops start dying.
- **2000 — da Vinci FDA-approved**: robotic surgery goes mainstream through
  the decade.
- 2003 — Drug-eluting stents; Human Genome Project completed.
- 2000s — Barcode medication administration: scan the wristband, scan the
  drug — wrong-patient errors collapse.

### 2010s — connected and quantified
- **2015 — Telehealth at scale**: Teladoc's IPO marks video visits becoming a
  standing front door (Amwell, MDLIVE alongside).
- **2018 — First autonomous imaging-AI clearances**: Viz.ai's stroke alert
  (first FDA De Novo of its kind) and Aidoc's triage tools put AI on call in
  radiology.
- **2018 — Consumer ECG wearables** (Apple Watch clearance) + mainstream CGM
  (Dexcom): continuous vitals leave the hospital.
- 2010s — EHR near-universal (~96% of US hospitals by 2015); patient portals
  and online scheduling (Zocdoc et al.) become standard.
- 2010s — Capacity/flow AI (Qventus, LeanTaaS) starts orchestrating beds and
  ORs.

### 2020s — the AI decade
- **2020s — Ambient AI scribes**: Nuance DAX (2020) then Abridge, Ambience,
  Suki; a ~$600M category by 2025 with 9-in-10 health systems piloting or
  deployed.
- **2020 — Hospital-at-home**: CMS's Acute Hospital Care at Home waiver makes
  the ward portable — monitors, visits and meds delivered to the bedroom.
- **2023+ — LLMs enter the clinic**: GPT-4-class models draft notes, answer
  patients, and pre-read symptoms; Epic ships native AI charting (2026).
- 2024–26 — AI prior-auth and revenue-cycle automation (Waystar, Cohere
  Health) auto-approve ~90% of requests in seconds.
- 2020s — FDA-cleared AI devices pass 1,000; imaging AI in ~2,000 hospitals
  each via Aidoc/Viz.ai.

### 2030s — the agentic ward (predictions; source kind tagged per item)
- **Agentic care orchestration**: multi-agent systems that read intake, order
  workups, book beds and file claims end-to-end, humans supervising.
  *(industry forecasts: 2026 agentic-AI-in-healthcare reports)*
- **The self-monitoring ward**: continuous ambient sensing (vision + vitals)
  replaces spot checks; deterioration flagged hours early.
  *(consultancy: Deloitte "Intelligent healthcare 2030"; smart-hospital
  market projections)*
- **Digital command centers**: hospitals run predictive flow simulation —
  tomorrow's bed crunch fixed today. *(consultancy: Deloitte/Frost &
  Sullivan smart-hospital 2030 outlooks)*
- Robotic logistics and nursing assist; point-of-care precision medicine
  ("5P" care). *(consultancy + academic smart-hospital roadmaps)*

### 2040s — the hospital without walls (predictions)
- **Hospital-at-home as the default** for medium-acuity care: monitors,
  drones and visiting teams make the ward portable; the building keeps only
  high-acuity cases. *(consultancy: Deloitte "hospital without walls";
  remote-monitoring market forecasts)*
- **Autonomous logistics**: drones and robot carts deliver meds, labs and
  linens with no human courier. *(smart-hospital roadmaps)*
- **First bioprinted organs in routine use**: printed heart valves in trials
  ~2035; vascularized kidney prototypes by 2040; organ cost projected under
  $50k by 2045. *(academic roadmap: 2026 bioprinting reviews)*
- **Autonomous routine diagnostics**: AI cleared to close simple cases
  without physician sign-off, doctors handling exceptions. *(AI-in-medicine
  forecast literature)*
- Genomic risk scores standard at intake. *(precision-medicine forecasts)*

### 2050s — the regenerative decade (predictions)
- **Nanomedicine at the bedside**: nanoparticle and nanorobot drug delivery
  steers therapy straight to diseased tissue. *(academic: nanorobotics
  reviews; market extrapolations)*
- **Bioprinted organs end the transplant waitlist**: patient-matched organs
  printed to order. *(academic bioprinting roadmaps)*
- **Teleoperated + semi-autonomous surgery** as standard of care; a surgeon
  in a VR rig guides robots across continents. *(surgical-society futures:
  "operating theatre of 2050" essays)*
- **Neural implants commonplace**: BCIs restore movement, sight and hearing.
  *(futurist/industry: mid-century BCI forecasts)*
- **"Drag-and-drop" gene editing** eliminates many inherited diseases.
  *(CRISPR trajectory forecasts)*

### 2075 — the body shop (deep speculation, flagged in-game)
- **In-situ regeneration**: damaged organs regrown in place — the ward's job
  becomes supervising healing, not doing it. *(extrapolated from regenerative
  -medicine trajectories)*
- **Nanobot immune augmentation**: swarms patrol the bloodstream, clearing
  pathogens before symptoms. *(nanomedicine extrapolation)*
- **Age-reversal therapies** (partial cellular reprogramming) in clinical
  use; "elderly" is renegotiated. *(longevity-research trajectory)*
- **Fully autonomous AI physicians** for standard care; humans supervise
  fleets and own the exceptions. *(AI-forecast extrapolation)*
- Cybernetic implants routine; the hardware clinic is a hospital department.
  *(bionics trajectory)*

### 2100 — medicine as infrastructure (deep speculation, flagged in-game)
- **Disease interception**: illness detected and treated pre-symptom by
  ambient + implanted sensors; acute crises become rare events.
  *(futurist synthesis of monitoring trends)*
- **Full-body digital twins**: every treatment simulated on your virtual
  self before it touches you. *(digital-twin research trajectory)*
- **The hospital as rare-events hub**: a small high-acuity core orchestrating
  a city-wide care mesh — the logical end of "without walls." *(consultancy
  trajectory, extrapolated)*
- **Clinical longevity**: aging managed as a treatable condition; the
  century-old patient is unremarkable. *(longevity futurism — most
  speculative claim in the doc, labeled as such in-game)*

### BONUS — YEAR 3000 (pure sci-fi fantasy round, labeled in-game)
- **Full-body regeneration pods**: step in sick, step out rebuilt.
- **Nanobot immune swarms** replace the immune system outright; disease is a
  firmware issue.
- **Matter-stream triage**: the ambulance is a teleporter pad.
- **Consciousness backup ward**: the truly unlucky restore from yesterday's
  save.
- The hospital is a benevolent AI organism; one ceremonial human remains on
  staff. (That's you.)

---

## Shift → era mapping

**RECOMMENDATION: extend the campaign from 10 to 14 shifts** (one shift per
future era) **plus a YEAR 3000 bonus round (shift 15) after the victory
screen.** Rationale: the future eras are the payoff of the whole progression
and deserve real play time; a fixed 14-shift arc keeps the difficulty curve
authored and lets the mandatory era-report popups tell one complete story
(paper → agentic → post-human). An "endless future" mode was considered and
rejected for scope — noted in backlog as OVERTIME MODE (loop 2100 with +10%
volume per loop) if replayability is wanted later.

| Shift | Era | Roof sign | Cost/payout inflation* | Shop unlocks (see below) |
|---|---|---|---|---|
| 1 | 1950s | "ST. PIXEL'S — est. 1952" | x0.5 | (base rooms/staff only) |
| 2 | 1960s | 1960s | x0.6 | CRASH CART |
| 3 | 1970s | 1970s | x0.7 | MAINFRAME HIS |
| 4 | 1980s | 1980s | x0.85 | PULSE-OX MONITORS |
| 5 | 1990s | 1990s | x1.0 | PIONEER EMR |
| 6 | 2000s | 2000s | x1.2 | EHR TERMINAL, E-PRESCRIBE HUB |
| 7 | 2010s | 2010s | x1.5 | TELEHEALTH KIOSK, PATIENT PORTAL, LAB AUTOLINE, IMAGING AI, FLOW COMMAND, WARD WEARABLES |
| 8–9 | 2020s | 2020s | x1.8 | AMBIENT SCRIBE, AI TRIAGE KIOSK, PRIOR-AUTH AGENT, REVCYCLE BOT |
| 10 | 2030s | 2030s | x2.2 | AGENTIC ROUTER |
| 11 | 2040s | 2040s | x2.8 | MED-DRONE BAY, HOME WARD LINK |
| 12 | 2050s | 2050s | x3.5 | BIOPRINT VAT, GENE-EDIT SUITE |
| 13 | 2075 | 2075 | x5.0 | NANO-SWARM INFUSER, REGEN POD |
| 14 | 2100 | 2100 | x7.0 | AMBIENT CARE CORE |
| 15 | YEAR 3000 (bonus) | "Y3K" | x10 (payouts shown in "cr") | NANOBOT IMMUNE SWARM (free, pre-installed) |

\* **Inflation knob (flavor + economy pacing):** multiplier applies to
discharge `payout` AND to room/staff hire costs each decade, so numbers grow
Age-of-War-style without rebalancing ratios. Tech-shop prices in
`TECH_TREE.md` are already quoted in their unlock-decade dollars (no extra
multiplier). Educational hook on the 2020s card: US health spending grew
from ~4.5% of GDP in 1950 to ~17% today.

### New pre-2000 stepping-stone purchases (keeps the shop alive shifts 2–5)

Four small period-accurate items, one per decade, each a partial relief of
the PAPER CHARTS handicap or a defensive tool — all expressed in existing
constants:

| Upgrade | Decade | Cost | Teaches | Effect |
|---|---|---|---|---|
| CRASH CART | 1960s | $100 | CPR + portable defibrillation (1960/1965) | Once per shift, a patient hitting 0 health is revived to 15 health instead of an ICU transfer ("CODE BLUE!" jingle — the game's namesake beat) |
| MAINFRAME HIS | 1970s | $150 | first hospital information systems (late 60s–1971) | LOST CHART chance 10% → 5% ("the mainframe remembers… usually") |
| PULSE-OX MONITORS | 1980s | $150 | continuous monitoring (Nellcor 1983) | `DECAY_MULT.waiting` 1.3 → 1.2 (trouble in the lobby spotted sooner) |
| PIONEER EMR | 1990s | $200 | early electronic records (VistA, early Epic) | paper `diagSeconds` penalty x1.6 → x1.3; LOST CHART 5% → 2% ("beta software: occasionally still loses one") |

The full PAPER CHARTS cure remains the 2000s EHR TERMINAL, exactly as in
`TECH_TREE.md` — historically honest: US hospitals really did run on paper
into the 2000s, and the stepping stones only soften the pain.

### Future-era shop items (2040+, extends the TECH_TREE)

Prices quoted in unlock-era dollars (inflation already applied). All effects
in existing constants; `treatRate` items stack multiplicatively with
TECH_TREE purchases.

| Upgrade | Era | Cost | Teaches | Effect |
|---|---|---|---|---|
| MED-DRONE BAY | 2040s | $600 | autonomous hospital logistics | unstaffed rooms treat at `ROOM_BASE_RATE` x2.0; staffed rooms +1 flat treatRate (drones fetch, humans treat) |
| HOME WARD LINK | 2040s | $500 | hospital-at-home | 25% of flu + bacteria arrivals diverted to home care: never enter the lobby, payout x0.8 after an 8s "van dispatched" animation |
| BIOPRINT VAT | 2050s | $800 | bioprinted organs | Surgery + Cardiology rooms `treatRate` x1.5 ("spare parts printed to order") |
| GENE-EDIT SUITE | 2050s | $700 | CRISPR-era gene therapy | GENE-MOD REJECTION cases treatable at full rate (x0.2 anywhere otherwise); virus + bacteria arrive with complexity −20% |
| NANO-SWARM INFUSER | 2075 | $1000 | nanomedicine | every patient anywhere (lobby, walking, any bed) loses 1 complexity/sec passively |
| REGEN POD | 2075 | $900 | regenerative medicine | any bedded patient below 20 health regenerates +2 health/sec (deterioration can be outrun, not just slowed) |
| AMBIENT CARE CORE | 2100 | $1500 | medicine as infrastructure | staff `stressPerSec` x0.5 hospital-wide; novel cases auto-routed 10s after arrival (route them manually first for a x1.2 "hands-on" payout bonus) |
| NANOBOT IMMUNE SWARM | Y3K | free | the fantasy | pre-installed in the bonus round: all treat rates x5, diagnosis instant — see the Year 3000 game-feel entry for why it still plays |

### Era-up popup copy (1–2 lines, 8-bit terse)

Shown during `PREP_SECONDS` between shifts, with the decade's 2–3 bolded
inventions listed beneath as pixel icons + one-liners:

- **1950s** (run start): `THE MODERN HOSPITAL IS BORN. Open-heart surgery!
  The ICU! And every chart is PAPER.`
- **1960s**: `RESUSCITATION GETS ORGANIZED. CPR is invented. Crash carts
  roll. Cardiac patients get their own ward.`
- **1970s**: `THE CT SCANNER SEES ALL. Cross-section pictures of a living
  brain. Paramedics hit the streets.`
- **1980s**: `IMAGING GOES MAINSTREAM. MRI! Keyhole surgery! A pulse-ox on
  every finger.`
- **1990s**: `THE DIGITAL SEED. X-ray film goes filmless. Stents prop
  arteries open. A few brave wards try 'electronic records.'`
- **2000s**: `THE CHART GOES DIGITAL. Uncle Sam pays hospitals to ditch
  paper. E-prescribing kills the fax (almost).`
- **2010s**: `CONNECTED + QUANTIFIED. The doctor will see you now — on
  video. AI reads its first scans. Your watch takes an ECG.`
- **2020s**: `THE AI DECADE. It listens, writes the note, files the claim.
  The hospital makes house calls again.`
- **2030s**: `THE AGENTIC WARD. AI reads intake, orders the workup, books
  the bed. You supervise. (Forecast, not history — you'll live it.)`
- **2040s**: `THE HOSPITAL LOSES ITS WALLS. Drones run the halls. Half your
  ward is in patients' bedrooms. Organs come off a printer.`
- **2050s**: `REPAIR, DON'T REPLACE. Nanobots carry the medicine. Surgeons
  operate from another continent. Genes get spell-checked.`
- **2075**: `THE BODY SHOP. Organs regrow in place. Swarms patrol your
  blood. Aging files an appeal.`
- **2100**: `MEDICINE IS INFRASTRUCTURE. Illness is caught before it's felt.
  The hospital handles the rare and the unlucky. Mostly, it hums.`
- **YEAR 3000** (bonus): `Y3K — TOTAL CARE. Regeneration pods. Teleport
  triage. One human remains on staff: YOU. (100% certified fantasy.)`

---

## Game feel per era — making the tech's impact demonstrable

Design invariant: **every era must be FELT before it is explained.** The
1950s are chaotic so the EHR feels like salvation; the 2020s hum so the
2040s' "the hospital runs itself" lands. Two mechanisms deliver this:

1. **Era baselines** (table below) — global modifiers auto-applied the
   moment an era begins, representing standard-of-care diffusion. Free,
   universal, felt by every player.
2. **Purchases** (TECH_TREE + this doc) — player-chosen spikes that stack
   multiplicatively on the era baseline.

**The player's verb migrates as automation grows**: micro-allocation
(click every patient to a bed, 1950s–2010s) → exception handling + surge
management (2020s+). Automation absorbs standard cases while VOLUME scales,
tuned so *manual* actions per shift stay roughly constant (~8–12): the
screen gets busier, the player's hands stay equally full, and what their
hands are doing changes era by era. That constancy is the difficulty knob;
volume is the spectacle knob.

### Era baseline table (auto-applied; multiplies base constants)

Base constants for reference: nurse `diagSeconds` 3 / `stressPerSec` 2.5 /
`treatRate` 3; doctor 2 / 4.5 / 7; `DECAY_MULT.waiting` 1.3.

| Era | diag x | stress x | treat x | waiting decay | volume (patients/shift) | automation baseline (free) | signature pressure valve |
|---|---|---|---|---|---|---|---|
| 1950s | 1.6 | 1.25 | 1.0 | 1.3 | 6 | none — NO auto-anything | LOST CHART: 10%/10s re-diagnosis events |
| 1960s | 1.5 | 1.2 | 1.0 | 1.3 | 8 | none | cardiac events begin arriving |
| 1970s | 1.35 | 1.2 | 1.05 | 1.3 | 10 | none | trauma begins (EMS delivers sicker patients, faster) |
| 1980s | 1.25 | 1.15 | 1.1 | 1.25 | 12 | none | — |
| 1990s | 1.15 | 1.1 | 1.15 | 1.25 | 14 | none | — |
| 2000s | 1.15→1.0 w/ EHR | 1.1 (x1.15 w/ EHR click burden, until scribe) | 1.2 | 1.2 | 16 | EHR purchase kills LOST CHART forever | the click-burden tradeoff is FELT |
| 2010s | 0.85 | 1.0 | 1.3 | 1.1 | 19 | arrival smoothing | — |
| 2020s | 0.7 | 0.85 | 1.4 | 1.0 | 24 | auto-diag/assign PURCHASABLE | AI BLIND SPOT: 5% of arrivals immune to auto-diagnosis (manual only) |
| 2030s | 0.5 | 0.75 | 1.5 | 0.95 | 30 | auto-DIAGNOSIS free for standard cases | blind spots rise to 10% |
| 2040s | 0.35 | 0.65 | 1.7 | 0.9 | 38 | + drone delivery (see MED-DRONE BAY; baseline = unstaffed rooms treat at `ROOM_BASE_RATE` x1.5) | DRONE OUTAGE: 1–2x/shift all automation dark for 15s |
| 2050s | 0.25 | 0.55 | 1.9 | 0.85 | 48 | + auto-ASSIGN free for standard cases | GENE-MOD REJECTION: new case type, auto-immune, x0.2 rate without GENE-EDIT SUITE |
| 2075 | 0.15 | 0.45 | 2.2 | 0.8 | 60 | + wards self-treat standard cases unstaffed | CYBER-SEPSIS: new case type; while in a room, that room's automation is DISABLED |
| 2100 | 0.1 | 0.35 | 2.5 | 0.7 | 75 | full ambient care: standard cases handled end-to-end | LONGEVITY OVERLOAD: 150-year-old multi-system patients need TWO rooms sequentially, manual both times |
| Y3K | instant | 0.1 | 5.0 | 0.5 | 100+ | everything | NANOBOT REBELLION finale: last 30s, ALL automation reverses — 1950s chaos at Year-3000 volume |

### The three feel-beats (spelled out for the implementer)

- **1950s–1990s: CHAOS, EARNED.** Manual diagnosis queues in the lobby;
  LOST CHART stings ("CHART LOST!" jingle + the grey "?" reappearing);
  burnout freezes staff mid-rush; nothing moves unless clicked. The player
  should end shift 1 slightly overwhelmed — that's the curriculum.
- **2000s: THE DELTA SHIFT.** Buying EHR TERMINAL mid-run should be
  night-and-day: diagnosis x1.15→x1.0 baseline, LOST CHART gone, and the
  ERA REPORT (below) prints the receipts — e.g. nurse diagnosis throughput
  (patients diagnosed/min) up ~40–60% era-over-era for a player who was on
  paper penalties, stress incidents down. The report DOES the teaching; the
  purchase does the feeling.
- **2040s+: YOU SUPERVISE.** Standard patients glide lobby→bed→discharge
  untouched (subtle trail particles mark auto-routing). The player watches
  a living machine and handles only: flagged novel cases (blinking red
  outline), automation-outage scrambles, and surge spikes. The hands-on
  x1.2 payout bonus (AMBIENT CARE CORE) keeps clicking optional-but-
  rewarded. Y3K's NANOBOT REBELLION strips it all away for 30 seconds so
  the run ends on the thesis: *now you know exactly how much the tech was
  carrying.*

### Mandatory inter-round ERA REPORT (click-through learning popup)

Extends the existing end-of-shift SHIFT REPORT popup. Fires after the final
shift of each era, after the normal shift report, BEFORE the next build
phase; it cannot be dismissed by ESC/click-outside — a single button gates
progression.

Three stacked blocks on one 8-bit card:

1. **WHAT ARRIVED** — era title + the 2–3 taught inventions (pixel icon,
   year, one-liner from the index above).
2. **WHAT IT CHANGED OUT THERE** — one real-world stat per era, pulled from
   the index (e.g. 2000s: "US hospitals on EHRs: ~10% → ~96% in a decade";
   1980s: "anesthesia deaths fell ~10x after pulse oximetry").
3. **WHAT IT CHANGED IN HERE** — computed deltas, this era's shifts vs the
   previous era's, ▲green/▼red:
   - avg time-to-diagnosis (s)
   - patients discharged / shift
   - burnout incidents / shift
   - ICU transfers / shift
   - budget earned / shift
   Implementation: accumulate the counters the SHIFT REPORT already tracks
   into `state.eraStats[eraIndex]`; delta % = (this − prev) / prev.

Button copy: `[ PUNCH IN → 1970s ]` (next era's label). The era-up flavor
popup (copy above) then plays as the next shift begins — REPORT looks back,
ERA-UP looks forward.

---

## Visual progression per era (pixel-art tweak budget: palette swaps + 1–2 sprite details each)

| Era | Staff sprites | Environment / palette | Background props (2–3) |
|---|---|---|---|
| 1950s | nurses: white dress + 2px white cap; doctors: white coat + 1px head-mirror dot | sepia/cream walls, warm tungsten glow | wall rack of paper charts; rotary phone at desk; iron-lung cylinder in a ward corner |
| 1960s | same whites | mint "surgical green" walls | crash cart; single-trace CRT monitor; big wall clock |
| 1970s | first colored scrubs (teal/butterscotch palette swap) | beige + wood-panel band | CT donut in a corner; mainframe cabinet w/ 2-frame tape spin; orange plastic lobby chairs |
| 1980s | pastel scrubs | brighter beige, fluorescent white ceiling line | X-ray film lightbox; bedside monitor per bed; 1px pager on belts |
| 1990s | modern blue/green scrubs | off-white walls | beige CRT PACS workstation; "FILMLESS!" wall poster; coffee machine |
| 2000s | scrubs + 1px ID lanyard | clean blue-white | computer-on-wheels cart; wall-mounted EHR screen per room; hand-sanitizer pump |
| 2010s | scrubs, 2px tablet in hand | whiter + accent blue | flat wall displays; telehealth screen in lobby; wearables kiosk |
| 2020s | scrubs + 1px earpiece (ambient mic) | cool white + teal accents | ceiling ambient-mic dots; delivery-robot cart; big ops dashboard on lobby wall |
| 2030s | 2px AR-visor band across eyes | subtle neon edge-lighting on walls | bedside holo-chart (2-frame flicker); ceiling sensor strip; parked delivery drone |
| 2040s | porter exosuit (bright outline pixels on limbs) | cooler palette, glowing floor lanes | drone-lane markings; robotic pharmacy arm; home-ward video wall |
| 2050s | sleek bodysuit scrubs | teal-violet accents | bubbling bioprinter vat; gene-editor column; nano-infuser pod |
| 2075 | half the "staff" drawn as robot silhouettes | violet/chrome | regeneration pod (glow-cycle); cybernetic-limb charging rack; in-situ organ printer |
| 2100 | 1–2 human supervisors + translucent holo-attendants (50% alpha) | white-gold minimal + living-wall green strip | digital-twin tank; fixtureless ambient ceiling glow; antique stethoscope in a display case (gag) |
| Y3K | holographic everything | deep-purple/cyan neon | floating beds (2px shadow offset); nanobot shimmer particles; tiny UFO ambulance at the door |

Feasibility rule for the implementation agent: every row = PALETTE swaps on
existing sprites + at most 2 new small sprite details; props are static 1–2
frame background paints in `render.js`'s room/lobby painters. No re-art of
patients or core animations.

---

## Reconciliation with docs/TECH_TREE.md

The decade model **supersedes** TECH_TREE's purchase-count gating ("EHR gates
Era 2; own any 2 to advance"). One coherent scheme across both docs:

- **Unlock rule = decade only.** A tech appears in the shop the shift its
  decade begins (per the mapping table above). No "own any 2" counting.
- **One dependency survives:** software techs (everything from TELEHEALTH
  KIOSK onward in Era 2+) still require EHR TERMINAL to be owned first —
  historically true (they all plug into the digital chart) and it keeps the
  EHR purchase load-bearing.
- **Era tiers (0–4) remain as shop SECTION LABELS** and as the doc's teaching
  structure; they now correspond to decade bands: Era 0 = 1950s–1990s
  baseline (+ stepping stones), Era 1–2 = 2000s–2010s, Era 3 = 2010s,
  Era 4 = 2020s, with AGENTIC ROUTER promoted to a 2030s finale.
- TECH_TREE.md's "Era gating strictness" open question is resolved by this
  doc; its gating text and `ERA_UNLOCK` implementation bullet are revised in
  the same commit to point here.
- Costs/effects of all TECH_TREE items are unchanged.

## Implementation sketch (single later PR, vanilla JS, no build step)

- **`js/constants.js`**: add `DECADES` array — per entry: `label`,
  `startShift`, `inflation`, `paletteTint` (2–3 PALETTE overrides, e.g.
  sepia walls in the 50s–70s, warmer NES tones 80s–90s, cool neon 2020s),
  `unlocks: [techIds]`, `popup: { title, body, inventions: [{icon, year,
  line}] }`. Add `decade` field to each `TECH_TREE` entry; add the four
  stepping-stone techs; replace `ERA_UNLOCK` with `requiresEhr: true` flags.
- **`js/game.js`**:
  - `currentDecade(shiftIndex)` helper; apply `inflation` in the payout and
    hire-cost code paths.
  - Shop render: filter/grey items whose decade hasn't arrived, with an
    `UNLOCKS 1970s` tag; section headers by era label.
  - Era-up popup: reuse the TECH_TREE info-card modal during the
    `PREP_SECONDS` window (pause the prep timer while open).
  - Roof sign: draw `label` text on the building roof each frame; palette
    tint applied by swapping the overridden PALETTE keys on decade change.
  - CRASH CART revive hook in the ICU-transfer branch (once-per-shift flag).
- **`js/entities.js`**: no changes beyond reading tinted PALETTE.
- **`js/levels.js`** (owner: other agent — coordinate, don't touch): wave
  tables eventually retuned so early decades lean flu/bacteria (period
  difficulty ramp); not required for the PR.
- **`style.css` / `index.html`**: popup styles only if the DOM-overlay modal
  option from TECH_TREE.md is chosen; otherwise none.

Additions for the future-era extension (same PR or a follow-up):

- **`js/constants.js`**: extend `DECADES` to 15 entries with the new columns
  from the baseline table (`diagMult`, `stressMult`, `treatMult`,
  `waitDecay`, `volume`, `autoLevel`, `pressureValve`); add the 8 future
  shop items; add novel case types (GENE-MOD REJECTION, CYBER-SEPSIS,
  LONGEVITY OVERLOAD) to `PATHOGENS` with an `autoImmune: true` flag and,
  for LONGEVITY OVERLOAD, a `roomSequence: [a, b]` field.
- **sim (`js/sim.js` or equivalent)**: era-baseline fold in the same
  `techMods()` seam as purchases; free-automation ticks per `autoLevel`
  (auto-diag 2030s+, auto-assign 2050s+, self-treat 2075+), skipping
  `autoImmune` patients; DRONE OUTAGE + NANOBOT REBELLION timers (one
  shared "automation enabled" flag); hands-on x1.2 payout check (was the
  routing click human?).
- **era stats**: `state.eraStats[]` accumulation + ERA REPORT popup (block
  3 computed deltas); mandatory-gate flag on the popup (ESC disabled).
- **render**: auto-routed patients get a 3-frame trail particle; novel cases
  a blinking red outline; per-era prop painters keyed off `DECADES` index.

## Open design questions

1. **Decade pacing** — RECOMMENDED above: 14-shift campaign (double 2020s,
   one shift per future era) + Year 3000 bonus round; endless OVERTIME MODE
   deferred to backlog. Needs sign-off since `levels.js` (other agent)
   defines the 10-shift run today.
2. **Inflation scope** — payouts + hire costs only (proposed), or also
   retro-price already-owned techs for a visible "healthcare costs balloon"
   teaching beat?
3. **CRASH CART revive** — is a once-per-shift free save too strong for
   shift 2, or the right tutorial mercy?
4. **Palette shift** — subtle tint swaps (proposed) vs. full per-decade
   palettes (more art, more charm).
5. **Volume ceiling** — 75–100 concurrent patients (2100/Y3K) may strain the
   canvas renderer and the 12 `WAIT_SPOTS`; may need sprite batching and a
   deeper lobby queue, or cap on-screen count and represent overflow as a
   counter ("+23 inbound").
6. **Novel-case difficulty** — are 3 new pathogen types (gene-mod, cyber-
   sepsis, longevity) worth the sprite + balance cost, or should future
   pressure valves lean entirely on outage events + volume?
