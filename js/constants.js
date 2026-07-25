/* ============================================================
 * Code Blue Defense: Agentic Triage — constants + balance table
 *
 * All game math lives here so hackathon judges can audit the
 * numbers in one place. TILE is the grid unit; every range,
 * speed, and footprint is expressed in tiles or px derived
 * from it.
 * ============================================================ */

const TILE = 32;

const PALETTE = {
  floorA:   '#dfe9ea',   // hospital linoleum
  floorB:   '#d3e0e2',
  path:     '#b7c9d4',   // corridor
  pathEdge: '#8fa6b6',
  wall:     '#5c7186',
  entrance: '#58d858',
  exit:     '#ff3d3d',
  ink:      '#1b2733',
  white:    '#f6fbfb',
  blue:     '#4aa3df',
  deepBlue: '#1d5fa0',
  green:    '#58d858',
  toxic:    '#9bd400',
  red:      '#d82800',
  amber:    '#ffb300',
  grey:     '#7c8ea0',
};

/* ---------- Patients ("the creeps") ----------
 * health:      100 -> 0. Hits 0 => patient CRASHES, player loses a life.
 * decay:       health lost per second while in the hospital (deterioration).
 * complexity:  the diagnostic "shield". Staff attack this. 0 => DISCHARGED.
 * speed:       px/sec along the corridor path.
 * payout:      budget earned on discharge (x1.25 with Prior-Auth Agent).
 * Untreated escalation: after UNTREATED_GRACE seconds a patient's speed
 * ramps up (they wander toward the ICU faster), capped at ESCALATION_CAP.
 */
const UNTREATED_GRACE = 12;      // seconds before speed escalation begins
const ESCALATION_RATE = 0.03;    // +3% speed per second past grace
const ESCALATION_CAP  = 1.6;     // max speed multiplier

const PATIENT_TYPES = {
  flu: {
    name: 'Seasonal Flu',
    color: '#58d858', accent: '#2f8f2f',
    decay: 1.1, complexity: 30, speed: 34, payout: 60,
  },
  webmd: {
    name: 'WebMD Over-thinker',
    color: '#ffb300', accent: '#b87700',
    decay: 0.6, complexity: 55, speed: 46, payout: 90,
  },
  trauma: {
    name: 'Trauma Case',
    color: '#ff7043', accent: '#b23b16',
    decay: 2.4, complexity: 85, speed: 56, payout: 140,
  },
  silent: {
    name: 'Silent Heart Attack',
    color: '#d82800', accent: '#7c1000',
    decay: 3.2, complexity: 115, speed: 30, payout: 190,
  },
};

/* ---------- Human staff ("the physical towers") ----------
 * Placed on empty tiles ADJACENT to the corridor. Occupy bed space
 * (rooms). Doctors accumulate stress per action; at 100 they enter
 * BURNOUT and freeze for BURNOUT_SECONDS.
 *
 * dps math: gp = 9 dmg * 1.1 atk/s ~= 9.9 complexity/sec
 *           cardio = 36 dmg * 0.45 atk/s ~= 16.2 complexity/sec
 */
const BURNOUT_SECONDS = 8;

const TOWER_TYPES = {
  nurse: {
    name: 'Triage Nurse', cost: 100, rooms: 1, footprint: 1,
    kind: 'slow', range: 2.3 * TILE, slowFactor: 0.6,   // -40% patient speed
    stressPerAction: 0,   // passive aura — nurses don't burn out in v1
    desc: 'Slows patients 40% in radius and tags them ASSESSED. No burnout.',
  },
  gp: {
    name: 'General Practitioner', cost: 200, rooms: 1, footprint: 1,
    kind: 'attack', range: 2.6 * TILE, dmg: 9, rate: 1.1,
    stressPerAction: 5,   // high burnout accumulation per the design spec
    targeting: 'first',
    desc: 'Steadily shreds complexity. Discharges simple cases fast. Burns out quickly.',
  },
  cardio: {
    name: 'Cardiologist', cost: 400, rooms: 2, footprint: 2,
    kind: 'attack', range: 3.6 * TILE, dmg: 36, rate: 0.45,
    stressPerAction: 7,
    targeting: 'complex', // prioritizes the highest-complexity patient
    desc: 'Huge single-hit complexity damage. 2x2 footprint, 2 rooms. Targets the sickest.',
  },
};

/* ---------- Agentic AI multipliers ("the virtual buffs") ----------
 * Zero physical footprint — they snap onto existing infrastructure.
 *
 * GAME MATH (judge-facing):
 *  - scribe:    attached to a doctor. stressGain *= 0.5, attackRate *= 1.3.
 *               The scribe absorbs documentation load: same clinical work,
 *               half the cognitive cost, 30% more throughput.
 *  - labRouter: attached to the ENTRANCE. Every spawning patient is passed
 *               through simulateAgenticDecision() (js/agentic.js). The
 *               agent's priority/category drive the UI callout; the
 *               mechanical effect is a flat 30% complexity shred —
 *               pre-arrival diagnostics mean less work at the bedside.
 *  - priorAuth: attached to the ICU/exit gate. Discharge payout *= 1.25 —
 *               the agent autonomously wins reimbursement battles.
 */
const UPGRADE_TYPES = {
  scribe: {
    name: 'Ambient AI Scribe', cost: 150, target: 'doctor', unique: false,
    stressMult: 0.5, rateMult: 1.3,
    desc: 'Snap onto a doctor: -50% burnout gain, +30% processing speed.',
  },
  labRouter: {
    name: 'Agentic Lab-Router', cost: 250, target: 'entrance', unique: true,
    complexityShred: 0.30,
    desc: 'Snap onto the ENTRANCE: AI pre-triages arrivals, shredding 30% complexity.',
  },
  priorAuth: {
    name: 'Prior-Auth Agent', cost: 200, target: 'exit', unique: true,
    payoutMult: 1.25,
    desc: 'Snap onto the ICU GATE: +25% budget per discharge in this wing.',
  },
};

const START_LIVES = 5;
