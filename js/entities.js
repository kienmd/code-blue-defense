/* ============================================================
 * Entities: Patient, Staff, Room + shared pixel-sprite painters
 * (used on the main canvas AND for shop icons).
 *
 * EMPATHY RULE (see DESIGN.md): the patient is never the visual
 * target. The AILMENT sprite riding each patient takes the
 * treatment; it shrinks as complexity drops and pops on cure.
 * ============================================================ */

let ENTITY_SEQ = 1;

/* ---------- Movement ----------
 * Paths route along floor walk-lines and vertically through the
 * elevator shaft. Vertical segments move at ELEV_SPEED.
 */
function buildPath(fromX, fromFloor, toX, toFloor) {
  const fy = floorWalkY(fromFloor), ty = floorWalkY(toFloor);
  if (fromFloor === toFloor) return [{ x: toX, y: ty }];
  return [
    { x: ELEV_CX, y: fy },
    { x: ELEV_CX, y: ty },
    { x: toX, y: ty },
  ];
}

function moveAlongPath(ent, dt) {
  let remaining = dt;
  while (remaining > 0 && ent.path.length) {
    const tgt = ent.path[0];
    const dx = tgt.x - ent.x, dy = tgt.y - ent.y;
    const vertical = Math.abs(dy) > 0.5 && Math.abs(dx) < 0.5;
    const speed = vertical ? ELEV_SPEED : WALK_SPEED;
    const dist = Math.hypot(dx, dy);
    const step = speed * remaining;
    if (dist <= step) {
      ent.x = tgt.x; ent.y = tgt.y;
      remaining -= dist / speed;
      ent.path.shift();
    } else {
      ent.x += (dx / dist) * step;
      ent.y += (dy / dist) * step;
      remaining = 0;
    }
  }
  return ent.path.length === 0;
}

/* ---------- Patient ---------- */
class Patient {
  constructor(typeKey) {
    this.id = ENTITY_SEQ++;
    this.typeKey = typeKey;
    this.def = PATHOGENS[typeKey];
    this.diagnosed = false;
    this.state = 'arriving';        // arriving|waiting|walking|inBed|exiting|transfer
    this.x = -20;
    this.y = floorWalkY(0);
    this.path = [];
    this.health = 100;              // 0 => ICU transfer
    this.complexity = this.def.complexity;
    this.maxComplexity = this.def.complexity;
    this.waitIndex = -1;
    this.room = null;
    this.bedIndex = -1;
    this.outcome = null;            // 'discharged' | 'transferred'
    this.aiTag = null;              // set by the Agentic Lab-Router
    this.bob = Math.random() * Math.PI * 2;
    this.sporeTimer = SPORE_PULSE;
  }

  floor() { return this.room ? this.room.floor : 0; }

  decayMult() {
    if (this.state === 'waiting' || this.state === 'arriving') return DECAY_MULT.waiting;
    if (this.state === 'inBed') {
      return (this.diagnosed && this.room.treats(this.typeKey)) ? DECAY_MULT.rightBed : DECAY_MULT.wrongBed;
    }
    return DECAY_MULT.walking;
  }

  // Ailment scale: shrinks with treatment progress. Pure presentation.
  ailmentScale() { return 0.55 + 0.65 * (this.complexity / this.maxComplexity); }
}

/* ---------- Staff ---------- */
class Staff {
  constructor(typeKey) {
    this.id = ENTITY_SEQ++;
    this.typeKey = typeKey;
    this.def = STAFF_TYPES[typeKey];
    this.state = 'idle';            // idle|walking|working
    this.x = -20;
    this.y = floorWalkY(0);
    this.path = [];
    this.room = null;               // Room | 'lobby' | null (idle pool)
    this.pendingRoom = null;        // where they're walking to
    this.slotIndex = -1;
    this.stress = 0;
    this.burnoutUntil = 0;
    this.scribe = false;
    this.diagPatient = null;        // lobby triage in progress
    this.diagT = 0;
    this.bob = Math.random() * Math.PI * 2;
  }

  isBurnedOut(time) { return time < this.burnoutUntil; }

  rate() { return this.def.treatRate * (this.scribe ? UPGRADE_TYPES.scribe.rateMult : 1); }

  stressGain() { return this.def.stressPerSec * (this.scribe ? UPGRADE_TYPES.scribe.stressMult : 1); }
}

/* ---------- Room ---------- */
class Room {
  constructor(typeKey, floor, slot) {
    this.id = ENTITY_SEQ++;
    this.typeKey = typeKey;
    this.def = ROOM_TYPES[typeKey];
    this.floor = floor;
    this.slot = slot;
    this.x = slotX(slot);
    this.y = floorTopY(floor);
    this.w = SLOT_W;
    this.h = FLOOR_H;
    this.beds = new Array(this.def.beds).fill(null);   // Patient refs
    this.staff = [];                                    // Staff refs
  }

  treats(pathogenKey) { return PATHOGENS[pathogenKey].room === this.typeKey; }

  freeBed() { return this.beds.indexOf(null); }

  hasStaffSpace() { return this.staff.length < this.def.staffSlots; }

  bedPos(i) {
    // beds on the right 2/3 of the room
    return { x: this.x + this.w * (0.48 + i * 0.28), y: floorWalkY(this.floor) };
  }

  staffPos(i) {
    return { x: this.x + this.w * (0.14 + i * 0.14), y: floorWalkY(this.floor) };
  }

  contains(px, py) {
    return px >= this.x && px < this.x + this.w && py >= this.y && py < this.y + this.h;
  }
}

/* ============================================================
 * Pixel sprite painters
 * ============================================================ */

function drawPatientSprite(ctx, cx, cy, bobPhase, mood = 'sick', gown = '#9fc4e8') {
  const bob = Math.round(Math.sin(bobPhase) * 1.5);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + bob));
  // head
  ctx.fillStyle = mood === 'sick' ? '#d8e0b0' : '#f2c8a8'; // green-tinged when ill
  ctx.fillRect(-3, -20, 6, 5);
  // face
  ctx.fillStyle = PALETTE.ink;
  if (mood === 'happy') { ctx.fillRect(-2, -18, 1, 1); ctx.fillRect(1, -18, 1, 1); ctx.fillRect(-1, -16.5, 2, 1); }
  else { ctx.fillRect(-2, -18, 1, 1); ctx.fillRect(1, -18, 1, 1); }
  // gown
  ctx.fillStyle = gown;
  ctx.fillRect(-5, -15, 10, 11);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(-2, -13, 4, 4);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(-1, -13, 2, 4); ctx.fillRect(-2, -12, 4, 2);   // little red cross patch
  // arms up when cured
  if (mood === 'happy') {
    ctx.fillStyle = '#f2c8a8';
    ctx.fillRect(-8, -19, 3, 3); ctx.fillRect(5, -19, 3, 3);
  }
  // legs
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(-4, -4, 3, 4); ctx.fillRect(1, -4, 3, 4);
  ctx.restore();
}

function drawStaffSprite(ctx, typeKey, cx, cy, bobPhase = 0) {
  const bob = Math.round(Math.sin(bobPhase) * 1);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + bob));
  if (typeKey === 'nurse') {
    ctx.fillStyle = '#f2b8a0'; ctx.fillRect(-4, -20, 8, 6);            // head
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-5, -23, 10, 4);       // cap
    ctx.fillStyle = PALETTE.red; ctx.fillRect(-1, -23, 2, 4);          // cap cross
    ctx.fillStyle = '#7fd4e8'; ctx.fillRect(-6, -14, 12, 12);          // scrubs
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -12, 4, 6);        // apron
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(1, -2, 3, 2);
  } else {
    ctx.fillStyle = '#e8b088'; ctx.fillRect(-4, -20, 8, 6);            // head
    ctx.fillStyle = '#5a4632'; ctx.fillRect(-5, -22, 10, 3);           // hair
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-7, -14, 14, 13);      // lab coat
    ctx.fillStyle = '#7fd4e8'; ctx.fillRect(-2, -14, 4, 7);            // shirt
    ctx.fillStyle = PALETTE.ink;                                        // stethoscope
    ctx.fillRect(-2, -13, 1, 6); ctx.fillRect(1, -13, 1, 6); ctx.fillRect(-1, -8, 2, 2);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -1, 3, 2); ctx.fillRect(1, -1, 3, 2);
  }
  ctx.restore();
}

/* ---------- Ailment sprites (the visible enemies) ----------
 * Drawn hovering above the patient. `key` null => undiagnosed "?".
 */
function drawAilment(ctx, key, cx, cy, scale, t) {
  const drift = Math.sin(t * 3) * 2;
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + drift));
  ctx.scale(scale, scale);
  if (!key) {
    // undiagnosed: grey mystery blob
    ctx.fillStyle = PALETTE.grey;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillRect(-7, -3, 14, 6);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-1, -3, 2, 4); ctx.fillRect(-1, 2, 2, 2);   // "?"
    ctx.fillRect(1, -3, 2, 2);
  } else if (key === 'flu') {
    // green snot cloud
    ctx.fillStyle = '#58d858';
    ctx.fillRect(-7, -3, 14, 6); ctx.fillRect(-4, -6, 8, 6); ctx.fillRect(2, -5, 5, 5);
    ctx.fillStyle = '#2f8f2f';
    ctx.fillRect(-2, 3, 3, 3);                                // drip
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -2, 2, 2); ctx.fillRect(1, -2, 2, 2);
  } else if (key === 'bacteria') {
    // purple rod with eyes + flagella
    ctx.fillStyle = '#a05ad8';
    ctx.fillRect(-8, -3, 16, 7);
    ctx.fillRect(-9, -1, 18, 3);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-5, -1, 3, 3); ctx.fillRect(2, -1, 3, 3);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, 0, 1, 1); ctx.fillRect(3, 0, 1, 1);
    ctx.fillStyle = '#6a30a0'; ctx.fillRect(-11, 0, 2, 1); ctx.fillRect(9, 0, 2, 1);
  } else if (key === 'virus') {
    // red spiky ball
    ctx.fillStyle = '#ff5a5a';
    ctx.fillRect(-4, -4, 8, 8);
    ctx.fillStyle = '#b22020';
    ctx.fillRect(-7, -1, 3, 2); ctx.fillRect(4, -1, 3, 2);    // spikes
    ctx.fillRect(-1, -7, 2, 3); ctx.fillRect(-1, 4, 2, 3);
    ctx.fillRect(-6, -6, 2, 2); ctx.fillRect(4, -6, 2, 2);
    ctx.fillRect(-6, 4, 2, 2); ctx.fillRect(4, 4, 2, 2);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -2, 2, 2);
  } else if (key === 'spore') {
    // drifting yellow-green puff cluster
    ctx.fillStyle = '#b8d84a';
    ctx.fillRect(-6, -2, 6, 6); ctx.fillRect(0, -5, 6, 6); ctx.fillRect(-1, 1, 5, 5);
    ctx.fillStyle = '#8aa828';
    ctx.fillRect(-4, 0, 2, 2); ctx.fillRect(2, -3, 2, 2);
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 5);
    ctx.fillStyle = '#d8f070';
    ctx.fillRect(-9, -6, 2, 2); ctx.fillRect(7, -1, 2, 2); ctx.fillRect(-2, -8, 2, 2);
    ctx.globalAlpha = 1;
  } else if (key === 'trauma') {
    // crossed red bandage
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(-7, -2, 14, 4);
    ctx.save(); ctx.rotate(Math.PI / 2); ctx.fillRect(-7, -2, 14, 4); ctx.restore();
    ctx.fillStyle = '#ff7043';
    ctx.fillRect(-5, -1, 10, 2);
    ctx.fillRect(-1, -5, 2, 10);
  } else if (key === 'cardiac') {
    // broken heart with a crack
    ctx.fillStyle = '#d82800';
    ctx.fillRect(-6, -4, 5, 4); ctx.fillRect(1, -4, 5, 4);
    ctx.fillRect(-6, -1, 12, 3); ctx.fillRect(-4, 2, 8, 3); ctx.fillRect(-2, 5, 4, 2);
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(-1, -4, 1, 4); ctx.fillRect(0, 0, 1, 4);     // the crack
  }
  ctx.restore();
}

/* ---------- Room furniture + shop icons ---------- */
function drawBed(ctx, x, y) {
  // headboard-left pixel hospital bed, feet baseline y
  ctx.fillStyle = '#c8d8dc';
  ctx.fillRect(x - 16, y - 10, 32, 8);        // mattress
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(x - 14, y - 12, 10, 4);        // pillow
  ctx.fillStyle = '#5c7186';
  ctx.fillRect(x - 18, y - 14, 3, 14);        // headboard
  ctx.fillRect(x + 15, y - 10, 3, 10);        // footboard
}

function drawRoomIcon(ctx, typeKey, cx, cy) {
  const def = ROOM_TYPES[typeKey];
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.fillStyle = def.color;
  ctx.fillRect(-12, -10, 24, 20);
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(-10, -8, 20, 16);
  if (typeKey === 'breakroom') {
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-4, -3, 8, 7);       // mug
    ctx.fillRect(4, -1, 3, 3);
    ctx.fillStyle = def.color; ctx.fillRect(-3, -2, 6, 2);           // coffee
  } else {
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-7, 0, 14, 4);       // bed
    ctx.fillRect(-6, -2, 5, 2);
    ctx.fillStyle = def.color;
    ctx.fillRect(2, -6, 2, 6); ctx.fillRect(0, -4, 6, 2);            // cross
  }
  ctx.restore();
}

function drawUpgradeIcon(ctx, key, cx, cy, s = 1) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.scale(s, s);
  if (key === 'scribe') {
    ctx.fillStyle = PALETTE.deepBlue; ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = PALETTE.blue; ctx.fillRect(-7, -7, 12, 2);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-4, -7, 8, 5);
    ctx.fillStyle = PALETTE.deepBlue; ctx.fillRect(1, -6, 2, 3);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-4, 1, 8, 6);
    ctx.fillStyle = PALETTE.blue; ctx.fillRect(-3, 3, 6, 1);
  } else if (key === 'labRouter') {
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#0c2818'; ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = PALETTE.toxic; ctx.fillRect(-5, -3, 6, 1); ctx.fillRect(-5, -1, 8, 1); ctx.fillRect(-5, 1, 4, 1);
    ctx.fillStyle = PALETTE.green; ctx.fillRect(5, -1, 2, 1);
  } else if (key === 'priorAuth') {
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = PALETTE.grey; ctx.fillRect(-4, -6, 8, 1); ctx.fillRect(-4, -4, 8, 1); ctx.fillRect(-4, -2, 6, 1);
    ctx.fillStyle = PALETTE.green; ctx.fillRect(-3, 1, 7, 5);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-1, 2, 1, 1); ctx.fillRect(0, 3, 1, 1); ctx.fillRect(1, 2, 1, 1);
  }
  ctx.restore();
}
