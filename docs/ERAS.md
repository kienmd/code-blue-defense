# Decade Progression — hospital tech invention index + era mapping

Status: DESIGN PROPOSAL (not implemented). Companion to `docs/TECH_TREE.md`.
Research snapshot: July 2026.

The run becomes an Age of War-style march through hospital history: the
building starts in the **1950s** and era-ups one decade at a time until the
final shift plays in a speculative **2030s**. The tech shop is gated to
period-accurate tools, and each era-up pops an 8-bit card teaching 2–3 real
inventions from the incoming decade. **This decade gating supersedes the
"own any 2 to advance" rule in `TECH_TREE.md`** (that doc's era tiers survive
as shop section labels; see "Reconciliation" below).

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

### 2030s — near future (speculative, flagged as such in-game)
- **Agentic care orchestration**: multi-agent systems that read intake, order
  workups, book beds and file claims end-to-end, humans supervising.
- **The self-monitoring ward**: continuous ambient sensing (vision + vitals)
  replaces spot checks; deterioration flagged hours early.
- Robotic logistics and nursing assist; point-of-care precision medicine.

---

## Shift → decade mapping

The current run is 10 shifts (`js/levels.js`); nine decade buckets map onto
them with a double-length 2020s (the content-richest era) as the crunch:

| Shift | Decade | Roof sign | Cost/payout inflation* | Shop unlocks (see below) |
|---|---|---|---|---|
| 1 | 1950s | "ST. PIXEL'S — est. 1952" | x0.5 | (base rooms/staff only) |
| 2 | 1960s | 1960s | x0.6 | CRASH CART |
| 3 | 1970s | 1970s | x0.7 | MAINFRAME HIS |
| 4 | 1980s | 1980s | x0.85 | PULSE-OX MONITORS |
| 5 | 1990s | 1990s | x1.0 | PIONEER EMR |
| 6 | 2000s | 2000s | x1.2 | EHR TERMINAL, E-PRESCRIBE HUB |
| 7 | 2010s | 2010s | x1.5 | TELEHEALTH KIOSK, PATIENT PORTAL, LAB AUTOLINE, IMAGING AI, FLOW COMMAND, WARD WEARABLES |
| 8–9 | 2020s | 2020s | x1.8 | AMBIENT SCRIBE, AI TRIAGE KIOSK, PRIOR-AUTH AGENT, REVCYCLE BOT |
| 10 | 2030s | "20??s" | x2.2 | AGENTIC ROUTER |

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
- **2030s**: `20??s — THE AGENTIC WARD. AI runs the floor. Humans supervise.
  (We're guessing — you'll live it.)`

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

## Open design questions

1. **Decade pacing** — 1 shift per decade with a double 2020s (proposed) vs.
   2 shifts per decade and a 20-shift run (bigger change, other agent owns
   `levels.js`).
2. **Inflation scope** — payouts + hire costs only (proposed), or also
   retro-price already-owned techs for a visible "healthcare costs balloon"
   teaching beat?
3. **CRASH CART revive** — is a once-per-shift free save too strong for
   shift 2, or the right tutorial mercy?
4. **Palette shift** — subtle tint swaps (proposed) vs. full per-decade
   palettes (more art, more charm).
