/* ============================================================
 * Code Blue Defense: Ward Shift — constants + balance table
 *
 * Fallout Shelter-style hospital cross-section. All game math
 * lives here so hackathon judges can audit the numbers in one
 * place. Layout is in raw pixels (side-view building).
 * ============================================================ */

/* ---------- Canvas + building layout ---------- */
const CANVAS_W = 880;
const CANVAS_H = 620;

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
const PATHOGENS = {
  flu: {
    name: 'Influenza', room: 'ward',
    color: '#58d858', complexity: 35, decay: 0.8, payout: 60,
    desc: 'Mild. Any General Ward bed clears it fast.',
  },
  bacteria: {
    name: 'Bacteria', room: 'pharmacy',
    color: '#a05ad8', complexity: 70, decay: 1.0, payout: 100,
    desc: 'Tanky. Needs Pharmacy antibiotics.',
  },
  virus: {
    name: 'Virus', room: 'virology',
    color: '#ff5a5a', complexity: 90, decay: 1.2, payout: 130,
    desc: 'Complex. Route to the Virology Lab.',
  },
  spore: {
    name: 'Airborne Spore', room: 'virology',
    color: '#b8d84a', complexity: 60, decay: 1.0, payout: 120,
    contagious: true,
    desc: 'CONTAGIOUS in the lobby — isolate in Virology fast.',
  },
  trauma: {
    name: 'Trauma', room: 'surgery',
    color: '#ff7043', complexity: 80, decay: 2.2, payout: 150,
    desc: 'Deteriorates fast. Straight to Surgery.',
  },
  cardiac: {
    name: 'Cardiac Event', room: 'cardiology',
    color: '#d82800', complexity: 100, decay: 3.0, payout: 200,
    desc: 'Fastest deterioration in the game. Cardiology, NOW.',
  },
};

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
    name: 'General Ward', cost: 150, color: '#3fae8f',
    beds: 2, staffSlots: 2,
    desc: 'Treats INFLUENZA. The cheap workhorse room.',
  },
  pharmacy: {
    name: 'Pharmacy', cost: 200, color: '#a05ad8',
    beds: 2, staffSlots: 2,
    desc: 'Treats BACTERIA with antibiotics.',
  },
  virology: {
    name: 'Virology Lab', cost: 250, color: '#b8d84a',
    beds: 2, staffSlots: 2,
    desc: 'Treats VIRUS + isolates AIRBORNE SPORE.',
  },
  surgery: {
    name: 'Surgery', cost: 300, color: '#ff7043',
    beds: 2, staffSlots: 2,
    desc: 'Treats TRAUMA cases.',
  },
  cardiology: {
    name: 'Cardiology', cost: 350, color: '#ff5a5a',
    beds: 2, staffSlots: 2,
    desc: 'Treats CARDIAC EVENTS.',
  },
  breakroom: {
    name: 'Break Room', cost: 150, color: '#4aa3df',
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

const STAFF_TYPES = {
  nurse: {
    name: 'Nurse', cost: 100,
    treatRate: 3, diagSeconds: 3, stressPerSec: 2.5,
    desc: 'Treats slowly, diagnoses in the LOBBY in 3s. Low burnout.',
  },
  doctor: {
    name: 'Doctor', cost: 250,
    treatRate: 7, diagSeconds: 2, stressPerSec: 4.5,
    desc: 'Treats fast, burns out fast. Can also diagnose in the lobby.',
  },
};

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
    name: 'Ambient AI Scribe', cost: 150, target: 'staff', unique: false,
    stressMult: 0.5, rateMult: 1.3,
    desc: 'Drop on a staff member: -50% burnout gain, +30% treat speed.',
  },
  labRouter: {
    name: 'Agentic Lab-Router', cost: 300, target: 'lobby', unique: true,
    desc: 'Drop on the LOBBY: instant AI diagnosis + auto-assign to matching beds.',
  },
  priorAuth: {
    name: 'Prior-Auth Agent', cost: 200, target: 'exit', unique: true,
    payoutMult: 1.25,
    desc: 'Drop on the EXIT door: +25% budget per discharge.',
  },
};

/* ---------- Run structure ---------- */
const START_BUDGET = 600;
const START_LIVES  = 5;         // ICU capacity — transfers that end the run
const AUTO_ASSIGN_PERIOD = 1;   // labRouter scan interval (sec)
