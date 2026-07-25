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
  // shift engine
  shiftIdx: -1,
  phase: 'prep',
  prepTimer: 0,
  shiftElapsed: 0,
  schedule: [],
  // input
  selection: null,          // {kind:'patient'|'staff', obj}
  buildType: null,
  hover: null,              // {x,y} canvas coords
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

function slotFromPoint(px, py) {
  if (px < SLOT_X0 || px >= SLOT_X0 + SLOTS_PER_FLOOR * SLOT_W) return null;
  const floor = Math.floor((GROUND_Y - py) / FLOOR_H);
  if (floor < 1 || floor >= NUM_FLOORS) return null;
  const slot = Math.floor((px - SLOT_X0) / SLOT_W);
  return { floor, slot };
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
