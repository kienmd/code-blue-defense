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
    const speed = (vertical ? ELEV_SPEED : WALK_SPEED) * (ent.speedMult || 1);
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
    this.outcome = null;            // 'walked_out' | 'transferred'
    this.aiTag = null;              // set by the Agentic Lab-Router
    this.complaint = null;          // first-person flavor (js/agentic.js)
    this.blurtT = 0;                // auto-blurt bubble timer on sit-down
    this.bob = Math.random() * Math.PI * 2;
    this.sporeTimer = SPORE_PULSE;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    this.look = {
      skin: pick(PATIENT_SKINS),
      hair: pick(PATIENT_HAIRS),
      style: Math.floor(Math.random() * HAIR_STYLE_COUNT),
      gown: pick(PATIENT_GOWNS),
    };
  }

  floor() { return this.room ? this.room.floor : 0; }

  decayMult() {
    if (this.state === 'waiting' || this.state === 'arriving') {
      // Era baseline (monitoring tech spots trouble sooner), softened
      // further by owned tech (crash carts, telehealth) and orderlies.
      // G.calmOrderlies is cached once per tick in sim.update().
      let m = currentEra().mods.wait * techMult('decayMult');
      for (let i = 0; i < Math.min(ORDERLY_LOBBY_CAP, G.calmOrderlies || 0); i++) m *= STAFF_TYPES.orderly.lobbyCalm;
      return m;
    }
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
    // per-person presentation (skin / hair / hair style) — roles are
    // not visually gender-coded to any one look
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    this.look = { skin: pick(PATIENT_SKINS), hair: pick(PATIENT_HAIRS), style: Math.floor(Math.random() * 3) };
  }

  isBurnedOut(time) { return time < this.burnoutUntil; }

  /* Treat rate in `room` (optional): scribe multiplier, then the
   * specialist curve — a Surgeon is x1.8 in Surgery, x0.5 anywhere else. */
  rate(room) {
    let r = this.def.treatRate * (this.scribe ? UPGRADE_TYPES.scribe.rateMult : 1);
    if (this.def.specialty && room) {
      r *= room.typeKey === this.def.specialty ? this.def.specialtyMult : this.def.offSpecialtyMult;
    }
    return r;
  }

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

/* mood: 'sick' | 'happy'. typeKey adds the PRESENTING TELL — the
 * skill-based visual hint that shows what's wrong before diagnosis
 * (cracked helmet, chest clutch, green cough...). t drives tiny
 * animations (shivers, cough pixels). */
const DEFAULT_LOOK = { skin: '#f2c8a8', hair: '#5a4632', style: 1, gown: '#9fc4e8' };

function drawPatientSprite(ctx, cx, cy, bobPhase, mood = 'sick', typeKey = null, t = 0, look = DEFAULT_LOOK, people = null) {
  const bob = Math.round(Math.sin(bobPhase) * 1.5);
  const shiver = (mood === 'sick' && typeKey === 'flu') ? Math.round(Math.sin(t * 34) * 1) : 0;
  // era street clothes: deterministic per patient (look.style seeds it)
  const outfit = people ? people.outfits[(look.style + look.skin.length) % people.outfits.length] : null;
  ctx.save();
  ctx.translate(Math.round(cx + shiver), Math.round(cy + bob));
  // head
  ctx.fillStyle = look.skin;
  ctx.fillRect(-3, -20, 6, 5);
  if (mood === 'sick') {
    ctx.fillStyle = '#b8d090';                               // queasy green cheeks
    ctx.fillRect(-3, -17, 1, 1); ctx.fillRect(2, -17, 1, 1);
  }
  // hair (per-patient style + color; 0 = bald)
  ctx.fillStyle = look.hair;
  if (look.style === 1) ctx.fillRect(-3, -21, 6, 2);                                   // flat
  else if (look.style === 2) { ctx.fillRect(-3, -23, 6, 4); }                          // tall
  else if (look.style === 3) { ctx.fillRect(-4, -20, 1, 3); ctx.fillRect(3, -20, 1, 3); ctx.fillRect(-3, -21, 6, 1); } // side tufts
  // era headwear sits over the hair (1950s fedoras; Y3K antennae)
  if (people && people.hat === 'fedora' && look.style !== 2 && outfit) {
    ctx.fillStyle = outfit;
    ctx.fillRect(-3, -23, 6, 3);                             // crown
    ctx.fillRect(-5, -21, 10, 1);                            // brim
  }
  if (people && people.accessory === 'antenna') {
    ctx.fillStyle = '#c8f0f8';
    ctx.fillRect(0, -26, 1, 4);
    ctx.fillStyle = '#40e05a';
    if (Math.sin(t * 5) > 0) ctx.fillRect(-1, -27, 3, 2);
  }
  // face
  ctx.fillStyle = PALETTE.ink;
  if (mood === 'happy') { ctx.fillRect(-2, -18, 1, 1); ctx.fillRect(1, -18, 1, 1); ctx.fillRect(-1, -16.5, 2, 1); }
  else { ctx.fillRect(-2, -18, 1, 1); ctx.fillRect(1, -18, 1, 1); }
  if (people && people.accessory === 'visor') {
    ctx.fillStyle = 'rgba(102,224,255,0.85)';                // cyber-visor over the eyes
    ctx.fillRect(-3, -18.5, 6, 2);
  }
  // gown — with an era-colored jacket/coat layer at the shoulders
  ctx.fillStyle = look.gown;
  ctx.fillRect(-5, -15, 10, 11);
  if (outfit) {
    ctx.fillStyle = outfit;
    ctx.fillRect(-5, -15, 2, 8); ctx.fillRect(3, -15, 2, 8); // coat lapels/sleeves
  }
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(-2, -13, 4, 4);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(-1, -13, 2, 4); ctx.fillRect(-2, -12, 4, 2);   // little red cross patch
  // arms up when cured
  if (mood === 'happy') {
    ctx.fillStyle = look.skin;
    ctx.fillRect(-8, -19, 3, 3); ctx.fillRect(5, -19, 3, 3);
  } else if (people && people.accessory === 'phone' && look.style % 2 === 0) {
    ctx.fillStyle = '#12233a';                               // phone-zombie glow
    ctx.fillRect(4, -12, 3, 5);
    ctx.fillStyle = '#8ad8f0';
    ctx.fillRect(4.5, -11, 2, 3);
  } else if (people && people.accessory === 'soldier' && look.style === 3) {
    ctx.fillStyle = '#5a6a3a';                               // returning GI: olive cap
    ctx.fillRect(-3, -22, 6, 2);
  }
  // legs — era trousers when street clothes are known
  ctx.fillStyle = outfit || PALETTE.ink;
  ctx.fillRect(-4, -4, 3, 4); ctx.fillRect(1, -4, 3, 4);

  if (mood === 'sick' && typeKey) drawPresentingTell(ctx, typeKey, t, look);
  ctx.restore();
}

/* The per-pathogen presenting tell, drawn in patient-local coords
 * (origin at the feet). These read BEFORE diagnosis. */
function drawPresentingTell(ctx, typeKey, t, look = DEFAULT_LOOK) {
  if (typeKey === 'flu') {
    ctx.fillStyle = PALETTE.brightRed;                      // rudolph nose
    ctx.fillRect(-1, -18, 2, 2);
    ctx.fillStyle = '#58d858';                              // sniffle drip
    if (Math.sin(t * 4) > 0) ctx.fillRect(0, -16, 1, 2);
  } else if (typeKey === 'bacteria') {
    ctx.fillStyle = PALETTE.white;                          // bandaged arm...
    ctx.fillRect(-8, -13, 3, 6);
    ctx.fillStyle = '#7fb840';                              // ...gone green
    ctx.fillRect(-8, -11, 3, 2);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(-8, -9, 3, 1);
  } else if (typeKey === 'virus') {
    ctx.fillStyle = '#ff5a5a';                              // spots everywhere
    ctx.fillRect(-3, -19, 1, 1); ctx.fillRect(2, -18, 1, 1);
    ctx.fillRect(-4, -12, 2, 2); ctx.fillRect(3, -10, 2, 2);
    ctx.fillRect(-1, -7, 2, 2);
  } else if (typeKey === 'spore') {
    const drift = (t * 10) % 8;                             // green cough pixels
    ctx.globalAlpha = 1 - drift / 8;
    ctx.fillStyle = PALETTE.spore;
    ctx.fillRect(4 + drift, -18 - drift * 0.4, 2, 2);
    ctx.fillRect(6 + drift * 0.6, -15, 1, 1);
    ctx.globalAlpha = 1;
  } else if (typeKey === 'trauma') {
    ctx.fillStyle = PALETTE.amber;                          // cracked bike helmet
    ctx.fillRect(-4, -22, 8, 3);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(0, -22, 1, 3);                             // the crack
    ctx.fillStyle = PALETTE.white;                          // arm sling
    ctx.fillRect(-5, -13, 8, 2);
    ctx.fillRect(2, -12, 2, 3);
  } else if (typeKey === 'cardiac') {
    ctx.fillStyle = look.skin;                              // hand clutching chest
    ctx.fillRect(-1, -12, 4, 3);
    ctx.fillStyle = PALETTE.brightRed;                      // pained blip
    if (Math.sin(t * 6) > 0.3) ctx.fillRect(5, -20, 2, 2);
  }
}

/* `outfit` overrides the scrub color — render.js passes the current
 * era's palette so uniforms march through the decades (1950s whites
 * -> teal 70s scrubs -> future bodysuits). */
/* Staff sprites vary per person (skin tone, hair color, hair style),
 * so no role reads as one gender: some nurses have a buzz cut, some
 * doctors wear their hair long, and so on. `look` comes from the
 * Staff instance; shop icons pass null and get a neutral default. */
const STAFF_DEFAULT_LOOK = { skin: '#e8b088', hair: '#5a4632', style: 0 };

function drawStaffHair(ctx, look, capped) {
  // style 0: short crop (top only) — 1: side-length hair — 2: tied back
  ctx.fillStyle = look.hair;
  if (!capped) ctx.fillRect(-5, -22, 10, 3);
  if (look.style === 1) { ctx.fillRect(-6, -20, 2, 6); ctx.fillRect(4, -20, 2, 6); }
  else if (look.style === 2) ctx.fillRect(-7, -21, 2, 4);   // bun at the back
}

function drawStaffSprite(ctx, typeKey, cx, cy, bobPhase = 0, outfit = null, look = STAFF_DEFAULT_LOOK) {
  const bob = Math.round(Math.sin(bobPhase) * 1);
  const scrub = outfit || '#7fd4e8';
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + bob));
  if (typeKey === 'nurse') {
    ctx.fillStyle = look.skin; ctx.fillRect(-4, -20, 8, 6);            // head
    drawStaffHair(ctx, look, true);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-5, -23, 10, 4);       // cap
    ctx.fillStyle = PALETTE.red; ctx.fillRect(-1, -23, 2, 4);          // cap cross
    ctx.fillStyle = scrub; ctx.fillRect(-6, -14, 12, 12);              // scrubs
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -12, 4, 6);        // apron
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(1, -2, 3, 2);
  } else if (typeKey === 'surgeon') {
    ctx.fillStyle = look.skin; ctx.fillRect(-4, -20, 8, 6);            // head
    drawStaffHair(ctx, look, true);
    ctx.fillStyle = scrub; ctx.fillRect(-5, -23, 10, 4);               // scrub cap
    ctx.fillStyle = '#dfe8ec'; ctx.fillRect(-4, -17, 8, 3);            // surgical mask
    ctx.fillStyle = scrub; ctx.fillRect(-6, -14, 12, 12);              // gown
    ctx.fillStyle = '#2f8f6f'; ctx.fillRect(-6, -14, 12, 2);           // gown yoke
    ctx.fillStyle = '#f2d8b8'; ctx.fillRect(-8, -10, 2, 4); ctx.fillRect(6, -10, 2, 4); // gloves up
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(1, -2, 3, 2);
  } else if (typeKey === 'orderly') {
    ctx.fillStyle = look.skin; ctx.fillRect(-4, -20, 8, 6);            // head
    drawStaffHair(ctx, look, false);
    ctx.fillStyle = '#8a94a4'; ctx.fillRect(-6, -14, 12, 12);          // grey uniform
    ctx.fillStyle = '#59616e'; ctx.fillRect(-6, -8, 12, 2);            // belt
    ctx.fillStyle = PALETTE.white; ctx.fillRect(2, -13, 3, 3);         // badge
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-4, -2, 3, 2); ctx.fillRect(1, -2, 3, 2);
  } else {
    ctx.fillStyle = look.skin; ctx.fillRect(-4, -20, 8, 6);            // head
    drawStaffHair(ctx, look, false);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-7, -14, 14, 13);      // lab coat
    ctx.fillStyle = scrub; ctx.fillRect(-2, -14, 4, 7);                // shirt
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
  } else if (key === 'pneumo') {
    // brass pneumatic tube with a chart capsule whooshing up
    ctx.fillStyle = '#7a6a34'; ctx.fillRect(-3, -8, 6, 16);
    ctx.fillStyle = '#b09a4c'; ctx.fillRect(-2, -8, 2, 16);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -2, 4, 6);
    ctx.fillStyle = PALETTE.grey; ctx.fillRect(-1, 0, 2, 1); ctx.fillRect(-1, 2, 2, 1);
  } else if (key === 'crashcart') {
    ctx.fillStyle = PALETTE.red; ctx.fillRect(-7, -5, 14, 9);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -4, 4, 2); ctx.fillRect(-1, -5, 2, 4);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-6, 5, 3, 3); ctx.fillRect(3, 5, 3, 3);
  } else if (key === 'pulseox') {
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-8, -7, 16, 12);
    ctx.fillStyle = '#0c1a2c'; ctx.fillRect(-6, -5, 12, 8);
    ctx.fillStyle = PALETTE.green;
    ctx.fillRect(-5, -1, 2, 1); ctx.fillRect(-3, -3, 1, 3); ctx.fillRect(-2, -1, 2, 1);
    ctx.fillRect(0, -1, 1, 2); ctx.fillRect(1, -1, 4, 1);
  } else if (key === 'pacs') {
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#12233a'; ctx.fillRect(-6, -4, 5, 8); ctx.fillRect(1, -4, 5, 8);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-5, -3, 3, 4); ctx.fillRect(2, -1, 3, 4);
  } else if (key === 'ehr') {
    ctx.fillStyle = PALETTE.grey; ctx.fillRect(-7, -7, 14, 10);
    ctx.fillStyle = '#0c2818'; ctx.fillRect(-5, -5, 10, 6);
    ctx.fillStyle = PALETTE.toxic; ctx.fillRect(-4, -4, 6, 1); ctx.fillRect(-4, -2, 8, 1);
    ctx.fillStyle = PALETTE.grey; ctx.fillRect(-4, 3, 8, 2);
  } else if (key === 'telehealth') {
    ctx.fillStyle = PALETTE.deepBlue; ctx.fillRect(-7, -7, 14, 12);
    ctx.fillStyle = '#12233a'; ctx.fillRect(-5, -5, 10, 8);
    ctx.fillStyle = '#e8b088'; ctx.fillRect(-2, -4, 4, 4);   // a face on the call
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-3, 0, 6, 2);
    ctx.fillStyle = PALETTE.green; ctx.fillRect(4, -6, 2, 2);
  } else if (key === 'regenpod') {
    ctx.fillStyle = '#0a3040'; ctx.fillRect(-5, -8, 10, 16);
    ctx.fillStyle = '#66e0ff'; ctx.fillRect(-3, -6, 6, 12);
    ctx.fillStyle = '#e8b088'; ctx.fillRect(-2, -4, 4, 3);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, 0, 4, 5);
    ctx.fillStyle = '#66e0ff'; ctx.fillRect(-6, -2, 1, 4); ctx.fillRect(5, -2, 1, 4);
  }
  ctx.restore();
}
