/* ============================================================
 * Code Blue Defense: Ward Shift — constants + balance table
 *
 * Fallout Shelter-style hospital cross-section. All game math
 * lives here so hackathon judges can audit the numbers in one
 * place. Layout is in raw pixels (side-view building).
 * ============================================================ */

/* ---------- Canvas + world + camera ----------
 * The WORLD (building layout) is 880px wide; the CANVAS is wider.
 * The camera renders the world through a uniform scale+translate:
 * a young hospital (few floors) is zoomed IN (up to CANVAS_W/WORLD_W),
 * and the view eases out toward 1:1 as floors get built.
 */
const CANVAS_W = 1240;
const CANVAS_H = 620;
const WORLD_W  = 880;

const ZOOM_MAX = CANVAS_W / WORLD_W;   // width-fit: never crop the building
const ZOOM_EASE = 0.06;               // per-frame lerp toward target zoom

const GROUND_Y   = 604;         // bottom of the ground floor
const FLOOR_H    = 92;          // per-floor height
const NUM_FLOORS = 6;           // floor 0 = ground lobby, 1..5 buildable

const ELEV_X = 64;              // elevator shaft left edge
const ELEV_W = 48;
const ELEV_CX = ELEV_X + ELEV_W / 2;

const SLOT_X0   = 120;          // first room slot left edge
const SLOT_W    = 244;
const SLOTS_PER_FLOOR = 3;      // floors 1..5 only

const ENTRANCE_X = 26;          // street door (ground floor, left of shaft)

// y of the "walk line" (feet) for a given floor
function floorWalkY(floor) { return GROUND_Y - floor * FLOOR_H - 8; }
function floorTopY(floor)  { return GROUND_Y - (floor + 1) * FLOOR_H; }
function slotX(slot)       { return SLOT_X0 + slot * SLOT_W; }

// Lobby waiting spots (ground floor, right of the shaft)
const WAIT_SPOTS = 12;
function waitSpotX(i) { return 150 + i * 58; }

/* ---------- Palette ---------- */
const PALETTE = {
  night:    '#0b1020',
  building: '#2a3448',
  frame:    '#3d4a66',
  slotDark: '#131a2c',
  floorLine:'#4a5a7a',
  wallLit:  '#e8f0ee',
  ink:      '#1b2733',
  white:    '#f6fbfb',
  blue:     '#4aa3df',
  deepBlue: '#1d5fa0',
  green:    '#58d858',
  toxic:    '#9bd400',
  red:      '#d82800',
  brightRed:'#ff3d3d',
  amber:    '#ffb300',
  grey:     '#7c8ea0',
  purple:   '#a05ad8',
  spore:    '#b8d84a',
};

/* ---------- Deterioration multipliers ----------
 * Health 100 -> 0 = ICU TRANSFER (a life lost). Deterioration is
 * caused by the ailment — the clock the player races, never harm
 * the player inflicts. Being in the RIGHT bed stabilizes (x0.4).
 */
const DECAY_MULT = { waiting: 1.3, walking: 1.0, rightBed: 0.4, wrongBed: 1.0 };

const WALK_SPEED = 78;          // px/s horizontal
const ELEV_SPEED = 150;         // px/s vertical in the shaft

/* ---------- Pathogens (the visible enemies) ----------
 * Each rides its patient as an ailment sprite. Treatment shrinks
 * the ailment; complexity 0 => the germ pops, patient discharged.
 * room: the room type that treats at full rate.
 */
/* ECONOMY (canonical spec: docs/ECONOMY.md — faucets, drains, lanes):
 * Realistic US-hospital dollars at x1.0 inflation (1990s baseline);
 * the per-era `inflation` knob (docs/ERAS.md, x0.5 -> x10) scales
 * payouts AND costs so numbers balloon Age-of-War-style without
 * changing ratios. Display uses fmtMoney ($4,500 / $137K / $1.4M).
 *
 * FAUCETS: outcome-scaled case reimbursements (billed-charges scale),
 * a small walk-in copay floor, inverse-performance era grants, and
 * the opt-in private-wing contract (payouts x1.3, ICU settlements).
 * DRAINS: per-shift salaries + room upkeep (settled at shift end,
 * soft-debt: never below $0 — shortfall carries as accounts payable),
 * and escalating build costs for repeat room types (x1.5 per copy).
 * RAILS: copay floor, capped catch-up grant, county bailout (first
 * free, later ones cost stars), lives and cash never cross except
 * the opted-in private wing.
 */
const PATHOGENS = {
  flu: {
    name: 'Influenza', room: 'ward',
    color: '#58d858', complexity: 35, decay: 0.8, payout: 4000,
    desc: 'Mild. Any General Ward bed clears it fast.',
  },
  bacteria: {
    name: 'Bacteria', room: 'pharmacy',
    color: '#a05ad8', complexity: 70, decay: 1.0, payout: 18000,
    desc: 'Tanky. Needs Pharmacy antibiotics.',
  },
  virus: {
    name: 'Virus', room: 'virology',
    color: '#ff5a5a', complexity: 90, decay: 1.2, payout: 25000,
    desc: 'Complex. Route to the Virology Lab.',
  },
  spore: {
    name: 'Airborne Spore', room: 'virology',
    color: '#b8d84a', complexity: 60, decay: 1.0, payout: 22000,
    contagious: true,
    desc: 'CONTAGIOUS in the lobby — isolate in Virology fast.',
  },
  trauma: {
    name: 'Trauma', room: 'surgery',
    color: '#ff7043', complexity: 80, decay: 2.2, payout: 95000,
    desc: 'Deteriorates fast. Straight to Surgery.',
  },
  cardiac: {
    name: 'Cardiac Event', room: 'cardiology',
    color: '#d82800', complexity: 100, decay: 3.0, payout: 130000,
    desc: 'Fastest deterioration in the game. Cardiology, NOW.',
  },
};

/* Money display: raw dollars under the hood, compact on screen. */
function fmtMoney(n) {
  const neg = n < 0 ? '-' : '';
  n = Math.abs(Math.round(n));
  if (n >= 1e6) return `${neg}$${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M`;
  if (n >= 1e4) return `${neg}$${Math.round(n / 1e3)}K`;
  return `${neg}$${n.toLocaleString('en-US')}`;
}

/* ---------- Patient looks (visual variety) ----------
 * Rolled once per patient at spawn: skin tone, hair color, hair
 * style index (see drawPatientSprite), gown shade. Pure cosmetics.
 */
const PATIENT_SKINS = ['#f6d8c0', '#f2c8a8', '#e8b088', '#c68863', '#a06844', '#7c4a2d'];
const PATIENT_HAIRS = ['#2b2b2b', '#5a4632', '#8a5a28', '#c8a050', '#d0d0d0', '#a04828'];
const PATIENT_GOWNS = ['#9fc4e8', '#a8e0c0', '#e0c0e8', '#f0e0a8', '#c0c8f0'];
const HAIR_STYLE_COUNT = 4;     // 0 bald, 1 flat, 2 tall, 3 side tufts

// Spore contagion: every PULSE seconds, other lobby waiters lose DMG health.
const SPORE_PULSE = 4;
const SPORE_DMG   = 3;

/* ---------- Treatment math ----------
 * Room treat rate (complexity/sec) = ROOM_BASE_RATE (self-care)
 *   + sum of staffed treatRate (x1.3 with an AI Scribe)
 * then x MATCH multiplier:
 *   right room:       x1.0
 *   wrong room:       x0.3
 *   undiagnosed:      x0.35 (staff don't know what they're treating)
 */
const ROOM_BASE_RATE   = 1.2;
const WRONG_ROOM_MULT  = 0.3;
const UNDIAGNOSED_MULT = 0.35;

/* ---------- Rooms (built into floor slots) ---------- */
const ROOM_TYPES = {
  ward: {
    name: 'General Ward', cost: 250000, color: '#3fae8f',
    beds: 2, staffSlots: 2,
    desc: 'Treats INFLUENZA. The cheap workhorse room.',
  },
  pharmacy: {
    name: 'Pharmacy', cost: 350000, color: '#a05ad8',
    beds: 2, staffSlots: 2,
    desc: 'Treats BACTERIA with antibiotics.',
  },
  virology: {
    name: 'Virology Lab', cost: 500000, color: '#b8d84a',
    beds: 2, staffSlots: 2,
    desc: 'Treats VIRUS + isolates AIRBORNE SPORE.',
  },
  surgery: {
    name: 'Surgery', cost: 700000, color: '#ff7043',
    beds: 2, staffSlots: 2,
    desc: 'Treats TRAUMA cases.',
  },
  cardiology: {
    name: 'Cardiology', cost: 900000, color: '#ff5a5a',
    beds: 2, staffSlots: 2,
    desc: 'Treats CARDIAC EVENTS.',
  },
  breakroom: {
    name: 'Break Room', cost: 150000, color: '#4aa3df',
    beds: 0, staffSlots: 0, support: true,
    desc: 'All staff recover +3 stress/sec per Break Room (max 2 count).',
  },
};

/* ---------- Staff ----------
 * Assigned to rooms Fallout Shelter-style. In the LOBBY they
 * diagnose (reveal a patient's pathogen); in a treatment room
 * they add treatRate. Stress accumulates while working; at 100
 * they BURN OUT and freeze for BURNOUT_SECONDS.
 */
const BURNOUT_SECONDS   = 8;
const STRESS_IDLE_REGEN = 4;    // stress/sec recovered when not working
const BREAKROOM_REGEN   = 3;    // extra stress/sec recovery per break room
const BREAKROOM_CAP     = 2;    // break rooms counted beyond this do nothing

/* USER RULE — "Not everyone can diagnose." Diagnosis is a CLINICAL
 * capability, not a lobby side effect:
 *   - DOCTOR diagnoses properly (fast, "DIAGNOSED").
 *   - NURSE does a slower preliminary triage ("ASSESSED") — keeps the
 *     early game viable before doctors are affordable.
 *   - EVERYONE ELSE (surgeon, orderly, and any future hire) has
 *     canDiagnose: false. They never pick up lobby diag tasks; staff
 *     with no other lobby role are refused lobby assignment outright.
 *   - The AI Lab-Router (+ the free era autoDiag baselines) is the
 *     ONLY non-human diagnosis path. Keep this invariant when adding
 *     staff types.
 */
const STAFF_TYPES = {
  nurse: {
    name: 'Nurse', cost: 12000, salary: 4000,
    treatRate: 3, canDiagnose: true, diagSeconds: 4, diagLabel: 'ASSESSED',
    stressPerSec: 2.5,
    desc: 'Treats slowly; does a preliminary triage ASSESSMENT in the LOBBY (4s). Low burnout.',
  },
  doctor: {
    name: 'Doctor', cost: 35000, salary: 12000,
    treatRate: 7, canDiagnose: true, diagSeconds: 2, diagLabel: 'DIAGNOSED',
    stressPerSec: 4.5,
    desc: 'Treats fast, burns out fast. The proper diagnostician: formal LOBBY diagnosis in 2s.',
  },
  surgeon: {
    name: 'Surgeon', cost: 60000, salary: 20000,
    treatRate: 8, canDiagnose: false, stressPerSec: 4.0,
    specialty: 'surgery', specialtyMult: 1.8, offSpecialtyMult: 0.5,
    desc: 'A virtuoso IN SURGERY (x1.8 rate) — half speed anywhere else, and CANNOT diagnose.',
  },
  orderly: {
    name: 'Orderly', cost: 6000, salary: 2000,
    treatRate: 1, canDiagnose: false, stressPerSec: 1.5,
    lobbyCalm: 0.85,                 // each orderly on lobby duty: waiting decay x0.85 (max 2 count)
    desc: 'Post in the LOBBY: keeps waiting patients calmer (-15% deterioration each, max 2). Cannot diagnose; barely treats.',
  },
};
const ORDERLY_LOBBY_CAP = 2;

/* ---------- Economy knobs (docs/ECONOMY.md Part 3) ----------
 * Hire cost above is a one-time signing bonus; `salary` drains
 * per shift at settle time. All values quoted at x1.0 inflation.
 */
const PAYOUT_OUTCOME_MULT = { right: 1.0, wrong: 0.8, undiagnosed: 0.7 }; // "no chart, no charge"
const COPAY = 300;                    // per arrival — the income floor faucet
const UPKEEP_RATE = 0.02;             // per shift, x room base build cost
const BUILD_ESCALATION = 1.5;         // Nth copy of a room type: cost x1.5^(N-1). Break Room exempt (support).
const ERA_GRANT_BASE = 150000;        // era-up grant, x inflation x (1 + 0.5*livesLost/START_LIVES)
const PRIVATE_WING = { payoutMult: 1.3, icuPenalty: 75000 };  // opt-in risk lever, per shift
const BAILOUT_FLOOR = 16000;          // county bailout: 1 nurse hire + 1 shift of her salary
const BAILOUT_TRIGGER = 6000;         // bail out when budget < cheapest hire (orderly), x inflation

/* ---------- Agentic AI multipliers ----------
 * Zero physical footprint — they multiply the humans.
 *
 * GAME MATH (judge-facing):
 *  - scribe:    on a staff member. stressGain x0.5, treatRate x1.3.
 *  - labRouter: on the LOBBY. Every arrival is serialized into a
 *               Patient Manifest -> simulateAgenticDecision()
 *               (js/agentic.js). Diagnosis is instant, and the
 *               agent AUTO-ASSIGNS diagnosed waiters to a free
 *               matching bed every second. The LLM decides WHAT
 *               the patient has; the game decides what that
 *               knowledge is worth (routing, not balance).
 *  - priorAuth: on the EXIT door. Discharge payout x1.25.
 */
const UPGRADE_TYPES = {
  scribe: {
    name: 'Ambient AI Scribe', cost: 120000, target: 'staff', unique: false,
    unlockShift: 6,                 // 2020s (docs/ERAS.md tech gating)
    stressMult: 0.5, rateMult: 1.3,
    desc: 'Drop on a staff member: -50% burnout gain, +30% treat speed.',
  },
  labRouter: {
    name: 'Agentic Lab-Router', cost: 300000, target: 'lobby', unique: true,
    unlockShift: 7,                 // 2030s — the agentic ward
    desc: 'Drop on the LOBBY: instant AI diagnosis + auto-assign to matching beds.',
  },
  priorAuth: {
    name: 'Prior-Auth Agent', cost: 180000, target: 'exit', unique: true,
    unlockShift: 6,                 // 2020s
    payoutMult: 1.25,
    desc: 'Drop on the EXIT door: +25% budget per discharge.',
  },
};

/* ---------- Eras (round-defining decades; docs/ERAS.md) ----------
 * COMPRESSED 13-shift march (deviation from ERAS.md's 14+bonus,
 * per user pacing request — front-load momentum, reach the AI eras
 * in ~6-8 minutes): the 1970s+1980s merge into one imaging-leap
 * shift, the 2020s take a single shift instead of two, so the
 * 2000s EHR moment lands on SHIFT 5. Futures (2030s -> 2100) keep
 * one shift each; YEAR 3000 stays the fantasy bonus finale.
 * `startShift` is 0-based; lookup takes the last era whose
 * startShift <= shift.
 *
 * Per-era knobs (the "era baseline table" in docs/ERAS.md — free,
 * universal, auto-applied the moment the era begins):
 *   mods.diag   x on staff diagnosis seconds (lower = faster)
 *   mods.stress x on staff stress gain
 *   mods.treat  x on room treatment rate
 *   mods.wait   ABSOLUTE waiting-room decay multiplier (replaces
 *               DECAY_MULT.waiting; monitoring tech spots trouble sooner)
 *   autoDiag / autoAssign: standard-of-care automation, free from
 *               the 2030s / 2050s on (the Lab-Router purchase grants
 *               both earlier)
 *   inflation:  x on payouts AND room/staff costs — Age-of-War-style
 *               number growth without rebalancing ratios
 * Visual knobs: scrub (staff outfit), wall (room interior tint).
 * Card copy: sub/body (canvas era card), tech/impact (ERA REPORT).
 */
const ERAS = [
  { startShift: 0, label: '1950s', sign: 'EST. 1952', inflation: 0.5,
    mods: { diag: 1.6, stress: 1.25, treat: 1.0, wait: 1.3 },
    scrub: '#e8ecec', wall: '#2b2519',
    sub: 'THE MODERN HOSPITAL IS BORN', body: 'OPEN-HEART SURGERY! THE ICU! AND EVERY CHART IS PAPER.',
    tech: ['1953 — HEART-LUNG MACHINE', '1953 — THE ICU IS INVENTED', '1955 — POLIO VACCINE AT SCALE'],
    impact: 'IRON-LUNG WARDS EMPTY AS THE POLIO VACCINE SCALES NATIONWIDE.' },
  { startShift: 1, label: '1960s', sign: '1960s', inflation: 0.6,
    mods: { diag: 1.5, stress: 1.2, treat: 1.0, wait: 1.3 },
    scrub: '#dff0df', wall: '#243024',
    sub: 'RESUSCITATION GETS ORGANIZED', body: 'CPR IS INVENTED. CRASH CARTS ROLL. CARDIAC PATIENTS GET THEIR OWN WARD.',
    tech: ['1960 — CPR STANDARDIZED', '1962 — CORONARY CARE UNITS', '1965 — PORTABLE DEFIBRILLATOR'],
    impact: 'IN-HOSPITAL HEART-ATTACK DEATHS DROP SHARPLY ONCE CARDIAC PATIENTS ARE MONITORED TOGETHER.' },
  { startShift: 2, label: '1970s-80s', sign: '1970s-80s', inflation: 0.8,
    mods: { diag: 1.3, stress: 1.18, treat: 1.08, wait: 1.27 },
    scrub: '#4fb8a8', wall: '#2e2817',
    sub: 'SEEING INSIDE THE BODY', body: 'CT! MRI! KEYHOLE SURGERY! PARAMEDICS HIT THE STREETS.',
    tech: ['1971 — CT SCANNER', '1983 — PULSE OXIMETERS', '1985 — KEYHOLE SURGERY'],
    impact: 'ANESTHESIA DEATHS FALL ROUGHLY TENFOLD AFTER PULSE OXIMETRY.' },
  { startShift: 3, label: '1990s', sign: '1990s', inflation: 1.0,
    mods: { diag: 1.15, stress: 1.1, treat: 1.15, wait: 1.25 },
    scrub: '#68a8d8', wall: '#262b31',
    sub: 'THE DIGITAL SEED', body: 'X-RAY FILM GOES FILMLESS. STENTS PROP ARTERIES OPEN.',
    tech: ['1994 — CORONARY STENT APPROVED', '1990s — FILMLESS RADIOLOGY (PACS)', '1994 — FIRST SURGICAL ROBOT'],
    impact: 'THE X-RAY LIGHTBOX RETIRES; IMAGES MOVE OVER NETWORKS.' },
  { startShift: 4, label: '2000s', sign: '2000s', inflation: 1.2,
    mods: { diag: 1.1, stress: 1.05, treat: 1.2, wait: 1.2 },
    scrub: '#4a8ad0', wall: '#232c3a',
    sub: 'THE CHART GOES DIGITAL', body: 'UNCLE SAM PAYS HOSPITALS TO DITCH PAPER. E-PRESCRIBING KILLS THE FAX (ALMOST).',
    tech: ['2009 — HITECH ACT: EHR EVERYWHERE', '2001 — E-PRESCRIBING SCALES', '2000 — DA VINCI ROBOT APPROVED'],
    impact: 'US HOSPITALS ON ELECTRONIC RECORDS: ~10% TO ~96% IN A DECADE.' },
  { startShift: 5, label: '2010s', sign: '2010s', inflation: 1.5,
    mods: { diag: 0.85, stress: 1.0, treat: 1.3, wait: 1.1 },
    scrub: '#3a7ac8', wall: '#202c3e',
    sub: 'CONNECTED + QUANTIFIED', body: 'THE DOCTOR WILL SEE YOU NOW — ON VIDEO. AI READS ITS FIRST SCANS.',
    tech: ['2015 — TELEHEALTH AT SCALE', '2018 — FIRST AUTONOMOUS IMAGING AI', '2018 — ECG ON YOUR WRIST'],
    impact: 'AI TAKES FIRST CALL IN RADIOLOGY; VITALS LEAVE THE BUILDING.' },
  { startShift: 6, label: '2020s', sign: '2020s', inflation: 1.8,
    mods: { diag: 0.7, stress: 0.85, treat: 1.4, wait: 1.0 },
    scrub: '#3aa8a0', wall: '#1e3038',
    sub: 'THE AI DECADE', body: 'IT LISTENS, WRITES THE NOTE, FILES THE CLAIM. THE HOSPITAL MAKES HOUSE CALLS AGAIN.',
    tech: ['2020s — AMBIENT AI SCRIBES', '2020 — HOSPITAL-AT-HOME', '2023 — LLMs ENTER THE CLINIC'],
    impact: 'FDA-CLEARED AI DEVICES PASS 1,000; 9 IN 10 SYSTEMS PILOT AI SCRIBES.' },
  { startShift: 7, label: '2030s', sign: '2030s', inflation: 2.2, autoDiag: true,
    mods: { diag: 0.5, stress: 0.75, treat: 1.5, wait: 0.95 },
    scrub: '#7a68d8', wall: '#241f3e',
    sub: 'THE AGENTIC WARD', body: 'AI READS INTAKE, ORDERS THE WORKUP, BOOKS THE BED. YOU SUPERVISE.',
    tech: ['AGENTIC CARE ORCHESTRATION', 'THE SELF-MONITORING WARD', 'DIGITAL COMMAND CENTERS'],
    impact: 'FORECAST: DETERIORATION FLAGGED HOURS EARLY; STANDARD CASES DIAGNOSE THEMSELVES.' },
  { startShift: 8, label: '2040s', sign: '2040s', inflation: 2.8, autoDiag: true,
    mods: { diag: 0.35, stress: 0.65, treat: 1.7, wait: 0.9 },
    scrub: '#c8a040', wall: '#1e2f26',
    sub: 'THE HOSPITAL LOSES ITS WALLS', body: 'DRONES RUN THE HALLS. HALF YOUR WARD IS IN PATIENTS\' BEDROOMS.',
    tech: ['HOSPITAL-AT-HOME BY DEFAULT', 'AUTONOMOUS DRONE LOGISTICS', 'FIRST BIOPRINTED ORGANS'],
    impact: 'FORECAST: PRINTED HEART VALVES IN TRIALS; ORGAN COST HEADS UNDER $50K.' },
  { startShift: 9, label: '2050s', sign: '2050s', inflation: 3.5, autoDiag: true, autoAssign: true,
    mods: { diag: 0.25, stress: 0.55, treat: 1.9, wait: 0.85 },
    scrub: '#48c8c8', wall: '#1a2c33',
    sub: 'REPAIR, DON\'T REPLACE', body: 'NANOBOTS CARRY THE MEDICINE. GENES GET SPELL-CHECKED.',
    tech: ['NANOMEDICINE AT THE BEDSIDE', 'BIOPRINTED ORGANS TO ORDER', 'DRAG-AND-DROP GENE EDITING'],
    impact: 'FORECAST: THE TRANSPLANT WAITLIST ENDS — ORGANS PRINT TO ORDER.' },
  { startShift: 10, label: '2075', sign: '2075', inflation: 5.0, autoDiag: true, autoAssign: true,
    mods: { diag: 0.15, stress: 0.45, treat: 2.2, wait: 0.8 },
    scrub: '#b8bcd0', wall: '#281f38',
    sub: 'THE BODY SHOP', body: 'ORGANS REGROW IN PLACE. SWARMS PATROL YOUR BLOOD. AGING FILES AN APPEAL.',
    tech: ['IN-SITU REGENERATION', 'NANOBOT IMMUNE PATROLS', 'AGE-REVERSAL THERAPIES'],
    impact: 'SPECULATION: AI PHYSICIANS RUN STANDARD CARE; HUMANS OWN THE EXCEPTIONS.' },
  { startShift: 11, label: '2100', sign: '2100', inflation: 7.0, autoDiag: true, autoAssign: true,
    mods: { diag: 0.1, stress: 0.35, treat: 2.5, wait: 0.7 },
    scrub: '#e8d8a0', wall: '#2d2a1e',
    sub: 'MEDICINE IS INFRASTRUCTURE', body: 'ILLNESS IS CAUGHT BEFORE IT\'S FELT. MOSTLY, THE HOSPITAL HUMS.',
    tech: ['PRE-SYMPTOM DISEASE INTERCEPTION', 'FULL-BODY DIGITAL TWINS', 'CLINICAL LONGEVITY'],
    impact: 'SPECULATION: THE CENTURY-OLD PATIENT IS UNREMARKABLE.' },
  { startShift: 12, label: 'Y3K', sign: 'Y3K', inflation: 10, autoDiag: true, autoAssign: true,
    mods: { diag: 0.05, stress: 0.1, treat: 5.0, wait: 0.5 },
    scrub: '#c858e8', wall: '#150e2e',
    sub: 'YEAR 3000 — TOTAL CARE', body: 'REGENERATION PODS. TELEPORT TRIAGE. ONE HUMAN REMAINS ON STAFF: YOU.',
    tech: ['FULL-BODY REGENERATION PODS', 'NANOBOT IMMUNE SWARMS', 'MATTER-STREAM TRIAGE'],
    impact: '100% CERTIFIED FANTASY. ENJOY THE VICTORY LAP.' },
];
function eraForShift(i) {
  let era = ERAS[0];
  for (const e of ERAS) { if (e.startShift <= i) era = e; }
  return era;
}
/* Era in force right now (pre-run and shift-1 cool-off count as the 1950s). */
function currentEra() {
  const idx = (typeof G !== 'undefined' && G.shiftIdx >= 0) ? G.shiftIdx : 0;
  return eraForShift(idx);
}
/* Age-of-War inflation on room/staff prices, rounded to $5. */
function inflatedCost(base) {
  return Math.max(5, Math.round(base * currentEra().inflation / 5) * 5);
}
/* Escalating build price: Nth copy of a treatment room costs x1.5^(N-1)
 * BEFORE inflation (anti-spam, ECONOMY.md 3b). Support rooms exempt. */
function roomBuildCost(typeKey) {
  const def = ROOM_TYPES[typeKey];
  let owned = 0;
  if (!def.support && typeof G !== 'undefined' && G.rooms) {
    owned = G.rooms.filter(r => r.typeKey === typeKey).length;
  }
  return inflatedCost(def.cost * Math.pow(BUILD_ESCALATION, owned));
}

const ERA_CARD_SECONDS = 5.4;   // slide in (0.5) + HOLD (4.0) + fade (0.9)
const ERA_CARD_HOLD = 4.0;      // let the decade SIT — a click skips it

/* ---------- Run structure ---------- */
const START_BUDGET = 500000;    // seed grant: 1 ward + 2 nurses + working capital, OR a leaner build (ECONOMY.md 3e)
const START_LIVES  = 5;         // ICU capacity — transfers that end the run
const AUTO_ASSIGN_PERIOD = 1;   // labRouter scan interval (sec)
