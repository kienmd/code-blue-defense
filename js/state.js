/* ============================================================
 * State — the single mutable game-state object G, plus pure
 * query helpers over it (hit-testing, geometry, rosters) and
 * best-run persistence. No DOM, no rendering, no side effects
 * beyond G itself.
 * ============================================================ */

const G = {
  state: 'menu',            // 'menu' | 'playing' | 'won' | 'lost'
  time: 0,
  budget: 0,
  lives: 0,
  discharged: 0,
  transfers: 0,
  rooms: [],
  staffList: [],
  patients: [],
  waitSpots: new Array(WAIT_SPOTS).fill(null),   // Patient refs
  upgrades: { labRouter: false, priorAuth: false },
  // shift engine — 'cooloff' is player-paced (no arrivals, build/hire
  // freely); a shift only starts when the player clicks START SHIFT.
  shiftIdx: -1,
  phase: 'cooloff',
  shiftElapsed: 0,
  schedule: [],
  shiftStats: null,         // per-shift report tally, reset by startShift()
  // economy (docs/ECONOMY.md): soft debt, catch-up rails, risk lever
  accountsPayable: 0,       // salary/upkeep shortfall carried to next settle
  bailouts: 0,              // county bailouts taken (first free, rest cost stars)
  privateWingArmed: false,  // toggled in cool-off, applies to the NEXT shift
  privateWingActive: false, // in force for the CURRENT shift
  // camera (world -> canvas): render.js eases zoom toward the fit
  // for the visible floors; input.js inverts it for hit-testing.
  zoom: 1,
  view: { s: 1, ox: 0, oy: 0 },
  buildFlash: null,         // {floor, slot, t} — highlight where a room landed
  eraCard: null,            // {t, label, sub, body} — decade sweep at shift start
  // input
  selection: null,          // {kind:'patient'|'staff', obj}
  hover: null,              // {x,y} WORLD coords
  hoverPatientId: null,     // for INFO-panel updates on hover change
  dragUpgrade: null,
  autoAssignTimer: 0,
  heartbeatTimer: 0,
  texts: [],
  particles: [],
  sfx(name) { playSfx(name); },
  addText(x, y, text, color, life = 1.3) { this.texts.push({ x, y, text, color, t: 0, life }); },
};

/* ---------- Rosters ---------- */
function lobbyStaff() { return G.staffList.filter(s => s.room === 'lobby'); }
function breakroomCount() { return Math.min(BREAKROOM_CAP, G.rooms.filter(r => r.typeKey === 'breakroom').length); }
function waitingPatients() { return G.patients.filter(p => p.state === 'waiting'); }

/* ---------- Geometry / routing ---------- */
function currentFloorOf(ent) {
  return Math.max(0, Math.min(NUM_FLOORS - 1, Math.round((GROUND_Y - 8 - ent.y) / FLOOR_H)));
}

function pathFrom(ent, toX, toFloor) {
  if (Math.abs(ent.x - ELEV_CX) < 1) {
    return [{ x: ELEV_CX, y: floorWalkY(toFloor) }, { x: toX, y: floorWalkY(toFloor) }];
  }
  return buildPath(ent.x, currentFloorOf(ent), toX, toFloor);
}

function roomAt(floor, slot) {
  return G.rooms.find(r => r.floor === floor && r.slot === slot) || null;
}

/* ---------- Progressive growth (Fallout Shelter-style) ----------
 * Rooms auto-place: fill floor 1 left-to-right, then floor 2, etc.
 * Only floors up to the next buildable one are shown.
 */
function nextBuildSlot() {
  for (let f = 1; f < NUM_FLOORS; f++) {
    for (let sl = 0; sl < SLOTS_PER_FLOOR; sl++) {
      if (!roomAt(f, sl)) return { floor: f, slot: sl };
    }
  }
  return null;                                   // hospital is full
}

function highestBuiltFloor() {
  return G.rooms.reduce((m, r) => Math.max(m, r.floor), 0);
}

function topVisibleFloor() {
  const next = nextBuildSlot();
  return Math.max(1, Math.min(NUM_FLOORS - 1, Math.max(highestBuiltFloor(), next ? next.floor : NUM_FLOORS - 1)));
}

function inLobby(px, py) {
  return py > floorTopY(0) && py <= GROUND_Y && px > ELEV_X;
}

function inEntrance(px, py) {
  return py > floorTopY(0) && py <= GROUND_Y && px <= ELEV_X;
}

/* ---------- Hit-testing ---------- */
function hitPatient(px, py) {
  for (const p of G.patients) {
    if (p.state === 'transfer' || p.state === 'exiting') continue;
    if (Math.abs(px - p.x) < 12 && py > p.y - 34 && py < p.y + 4) return p;
  }
  return null;
}

function hitStaff(px, py) {
  for (const s of G.staffList) {
    if (Math.abs(px - s.x) < 12 && py > s.y - 30 && py < s.y + 4) return s;
  }
  return null;
}

function hitRoom(px, py) {
  return G.rooms.find(r => r.contains(px, py)) || null;
}

/* ---------- Best-run persistence ---------- */
function getBest() {
  try { return JSON.parse(localStorage.getItem('cbd_ws_best') || 'null'); } catch (_) { return null; }
}

function setBest(stars, discharged) {
  const b = getBest();
  if (!b || stars > b.stars || (stars === b.stars && discharged > b.discharged)) {
    localStorage.setItem('cbd_ws_best', JSON.stringify({ stars, discharged }));
  }
}
