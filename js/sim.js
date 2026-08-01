/* ============================================================
 * Simulation — run lifecycle, shift engine, spawning,
 * allocation, treatment, deterioration, contagion, burnout,
 * and the agentic auto-triage. Mutates G; renders nothing.
 * ============================================================ */

/* ---------- Run lifecycle (one STAGE = one self-contained level) ---------- */
function startRun(stage) {
  G.stage = stage;
  G.runToken = (G.runToken || 0) + 1;   // invalidates async callbacks from prior runs
  G.state = 'playing';
  G.time = 0;
  G.budget = stage.budget;
  G.lives = stage.lives;
  G.discharged = 0;
  G.transfers = 0;
  G.rooms = [];
  G.staffList = [];
  G.patients = [];
  G.waitSpots = new Array(WAIT_SPOTS).fill(null);
  G.upgrades = { labRouter: false, priorAuth: false };
  G.tech = {};
  G.shiftIdx = -1;
  G.phase = 'cooloff';              // player-paced: build + hire, then click START
  G.schedule = [];
  G.shiftStats = freshShiftStats();
  G.accountsPayable = 0;
  G.bailouts = 0;
  G.selection = null;
  G.texts = [];
  G.particles = [];
  G.zoom = 1;

  // Pre-built era hospital: this stage's starting rooms + staff.
  for (const pb of stage.prebuilt) {
    G.rooms.push(new Room(pb.type, pb.floor, pb.slot));
  }
  for (const ps of stage.prestaff) {
    const s = new Staff(ps.type);
    s.x = HIRE_STAGING_X - (G.staffList.length % 4) * HIRE_STAGING_GAP;
    s.y = floorWalkY(0);
    G.staffList.push(s);
    if (ps.post === 'lobby') assignStaff(s, 'lobby');
    else if (typeof ps.post === 'number' && G.rooms[ps.post]) assignStaff(s, G.rooms[ps.post]);
    // teleport into position (no opening walk-in parade)
    if (s.path.length) { const last = s.path[s.path.length - 1]; s.x = last.x; s.y = last.y; s.path = []; s.state = 'working'; }
  }

  el.menu.classList.add('hidden');
  el.result.classList.add('hidden');
  el.report.classList.add('hidden');
  narratorReset();
  buildShop(stage);                 // era-scoped: only what EXISTS in this decade
  refreshShop();
  refreshShiftButton();
  startGameMusic();
}

function freshShiftStats() {
  return {
    helped: 0, transfers: 0, burnouts: 0,
    fastestCure: null, longestWait: 0, diagCount: 0, diagTime: 0,
    // ledger (docs/ECONOMY.md) — faucets above the line, drains below
    earned: 0,          // case reimbursements (outcome-scaled)
    copays: 0,
    spent: 0,           // builds / hires / tech this wave
    salaries: 0, upkeep: 0, apPrior: 0, apCarried: 0,
  };
}

/* Soft debt (ECONOMY.md rail 4): charges never push budget below $0 —
 * the shortfall carries as ACCOUNTS PAYABLE against the next settle. */
function chargeSoft(amount) {
  const paid = Math.min(G.budget, amount);
  G.budget -= paid;
  G.accountsPayable += amount - paid;
}

/* End-of-shift settle: salaries + upkeep + prior accounts payable. */
function settleLedger() {
  const st = G.shiftStats;
  const infl = currentEra().inflation;
  st.salaries = G.staffList.reduce((sum, s) => sum + Math.round(s.def.salary * infl), 0);
  st.upkeep = G.rooms.reduce((sum, r) => sum + Math.round(r.def.cost * UPKEEP_RATE * infl), 0);
  st.apPrior = G.accountsPayable;
  G.accountsPayable = 0;
  chargeSoft(st.salaries + st.upkeep + st.apPrior);
  st.apCarried = G.accountsPayable;

  // County bailout (rail 3): never stranded below one hire. First is
  // free; each subsequent one dings the end-of-run star rating.
  if (G.budget < Math.round(BAILOUT_TRIGGER * infl)) {
    G.budget = Math.max(G.budget, Math.round(BAILOUT_FLOOR * infl));
    G.bailouts++;
    showBanner(`COUNTY BAILOUT ${G.bailouts > 1 ? '(STAR PENALTY)' : '(FIRST IS FREE)'}<br/>BUDGET TOPPED UP TO ${fmtMoney(G.budget)}`, 'alert', 4);
  }
}

function startShift() {
  if (G.state !== 'playing' || G.phase !== 'cooloff') return;
  G.shiftIdx++;
  const wave = G.stage.waves[G.shiftIdx];
  G.phase = 'shift';
  G.shiftElapsed = 0;
  G.schedule = [];
  G.shiftStats = freshShiftStats();
  el.report.classList.add('hidden');
  refreshShiftButton();
  wave.entries.forEach((entry, ei) => {
    for (let i = 0; i < entry.count; i++) {
      G.schedule.push({ t: 1 + ei * 1.7 + i * entry.interval, type: entry.type });
    }
  });
  G.schedule.sort((a, b) => a.t - b.t);

  // The stage's decade card sweeps once, at wave 1 (Age of War beat).
  if (G.shiftIdx === 0) {
    const era = currentEra();
    G.eraCard = { t: 0, label: era.label, sub: era.sub, body: era.body };
    G.sfx('era');
    narrate(`era_${era.label}`, { always: true });
  }
  if (G.shiftIdx === G.stage.waves.length - 1) narrate('finalShift');
  if (wave.banner) { showBanner(wave.banner, 'alert', 3); G.sfx('siren'); }
}

function stageStarRating() {
  let stars = G.transfers === 0 ? 3 : (G.transfers <= 2 ? 2 : 1);
  // County bailouts past the first free one ding the rating (rail 3).
  return Math.max(1, stars - Math.max(0, G.bailouts - 1));
}

function endRun(won) {
  G.state = won ? 'won' : 'lost';
  G.selection = null;
  let stars = 0;
  if (won) {
    settleLedger();                          // final wave's drains still land
    stars = stageStarRating();
    setStageStars(G.stage.id, stars);
  }
  showResult(won, stars);
  refreshShiftButton();
  narrate(won ? 'win' : 'lose', { always: true });
  stopGameMusic();
  if (won) { playSfx('discharge'); setTimeout(() => playSfx('buy'), 200); } else { playSfx('transfer'); }
}

function endShift() {
  // Wave over: hand over the paperwork, then hold in player-paced
  // cool-off until the next wave is started.
  G.phase = 'cooloff';
  G.selection = null;
  settleLedger();                   // salaries + upkeep + accounts payable
  showShiftReport();
  refreshShiftButton();
  refreshShop();
  G.sfx('discharge');
}

/* ---------- Spawning + allocation ---------- */
function spawnPatient(type) {
  const p = new Patient(type);
  p.spawnT = G.time;                           // for cure-speed / wait-time report stats
  let spot = G.waitSpots.indexOf(null);
  if (spot === -1) spot = WAIT_SPOTS - 1;      // overflow: crowd the last spot
  else G.waitSpots[spot] = p;
  p.waitIndex = spot;
  p.path = [{ x: waitSpotX(spot), y: floorWalkY(0) }];
  G.patients.push(p);
  narrate('firstPatient');

  // Walk-in copay (ECONOMY.md): the income floor — a shift never grosses $0.
  const copay = Math.round(COPAY * currentEra().inflation);
  G.budget += copay;
  G.shiftStats.copays += copay;

  // Async callbacks below must not leak into a NEW run: a slow LLM
  // response arriving after a retry/stage-change would otherwise
  // mutate the fresh run's stats. runToken changes on every startRun.
  const run = G.runToken;

  // Presenting complaint: fire-and-forget flavor (LLM or canned table).
  generateComplaint(p).then(line => { if (G.runToken === run && !p.outcome) p.complaint = line; });

  // AGENTIC LAB-ROUTER (or the free 2030s+ era baseline):
  // instant AI diagnosis on arrival.
  if (G.upgrades.labRouter || currentEra().autoDiag) {
    simulateAgenticDecision(p).then(decision => {
      if (G.runToken !== run || p.outcome || p.diagnosed) return;
      p.diagnosed = true;
      G.shiftStats.diagCount++;
      G.shiftStats.diagTime += G.time - p.spawnT;
      p.aiTag = decision;
      G.addText(p.x, p.y - 34, `AI P${decision.priority}: ${decision.category}`, PALETTE.toxic, 1.8);
      G.sfx('diagnose');
    });
  }
}

function freeWaitSpot(p) {
  if (p.waitIndex >= 0 && G.waitSpots[p.waitIndex] === p) G.waitSpots[p.waitIndex] = null;
  p.waitIndex = -1;
}

function assignPatientToRoom(p, room) {
  const bed = room.freeBed();
  if (bed === -1) { G.sfx('denied'); G.addText(p.x, p.y - 30, 'NO FREE BED', PALETTE.amber, 1); return false; }
  freeWaitSpot(p);
  G.shiftStats.longestWait = Math.max(G.shiftStats.longestWait, G.time - p.spawnT);
  room.beds[bed] = p;
  p.room = room;
  p.bedIndex = bed;
  p.state = 'walking';
  const pos = room.bedPos(bed);
  p.path = pathFrom(p, pos.x, room.floor);
  G.sfx('assign');
  return true;
}

function assignStaff(staff, dest) {
  // Remove from current post
  if (staff.room instanceof Room) {
    staff.room.staff = staff.room.staff.filter(s => s !== staff);
  }
  staff.diagPatient = null;
  staff.diagT = 0;

  if (dest === 'lobby') {
    // "Not everyone can diagnose": lobby duty needs a clinical
    // diagnostician OR a lobby role of its own (orderly calming).
    if (!staff.def.canDiagnose && !staff.def.lobbyCalm) {
      G.sfx('denied');
      G.addText(staff.x, staff.y - 36, "CAN'T DIAGNOSE", PALETTE.amber, 1.4);
      return false;
    }
    if (lobbyStaff().length >= 3) { G.sfx('denied'); return false; }
    staff.room = 'lobby';
    staff.state = 'walking';
    const idx = lobbyStaff().length - 1;     // position by arrival order
    staff.path = pathFrom(staff, LOBBY_POST_X + Math.min(2, idx) * LOBBY_POST_GAP, 0);
  } else {
    if (!dest.hasStaffSpace() || dest.def.support) { G.sfx('denied'); return false; }
    dest.staff.push(staff);
    staff.room = dest;
    staff.state = 'walking';
    const pos = dest.staffPos(dest.staff.length - 1);
    staff.path = pathFrom(staff, pos.x, dest.floor);
  }
  G.sfx('assign');
  return true;
}

function hireStaff(typeKey) {
  const def = STAFF_TYPES[typeKey];
  const cost = inflatedCost(def.cost);
  if (G.budget < cost) { G.sfx('denied'); return; }
  G.budget -= cost;
  G.shiftStats.spent += cost;
  const s = new Staff(typeKey);
  s.x = -20; s.y = floorWalkY(0);
  s.state = 'walking';
  s.path = [{ x: HIRE_STAGING_X - (G.staffList.length % 4) * HIRE_STAGING_GAP, y: floorWalkY(0) }];
  G.staffList.push(s);
  G.selection = { kind: 'staff', obj: s };
  G.addText(200, floorWalkY(0) - 40, `${def.name.toUpperCase()} HIRED — CLICK A ROOM`, PALETTE.blue, 2);
  G.sfx('buy');
  refreshShop();
}

function buildRoom(typeKey) {
  // Fallout Shelter-style: no slot picking. The room lands in the
  // next open slot (floor 1 fills left-to-right, then floor 2, …).
  // Repeat copies of the same type cost x1.5 each (anti-spam).
  const def = ROOM_TYPES[typeKey];
  const cost = roomBuildCost(typeKey);
  if (G.budget < cost) { G.sfx('denied'); return; }
  const slot = nextBuildSlot();
  if (!slot) { G.sfx('denied'); G.addText(WORLD_W / 2, floorTopY(NUM_FLOORS - 1) + 30, 'HOSPITAL FULL', PALETTE.amber, 1.6); return; }
  G.budget -= cost;
  G.shiftStats.spent += cost;
  const r = new Room(typeKey, slot.floor, slot.slot);
  G.rooms.push(r);
  G.buildFlash = { floor: slot.floor, slot: slot.slot, t: 0 };
  G.addText(r.x + r.w / 2, r.y + 30, `${def.name.toUpperCase()} BUILT`, def.color, 1.6);
  G.sfx('place');
  refreshShop();
}

/* Passive TECHNOLOGY purchase (era tech: tubes, PACS, EHR, regen pod…).
 * The drag-target AI trio still goes through input.js's dropUpgrade. */
function buyTech(typeKey) {
  const def = UPGRADE_TYPES[typeKey];
  if (G.tech[typeKey]) { G.sfx('denied'); return; }
  const cost = inflatedCost(def.cost);
  if (G.budget < cost) { G.sfx('denied'); return; }
  G.budget -= cost;
  G.shiftStats.spent += cost;
  G.tech[typeKey] = true;
  G.addText(WORLD_W / 2, floorTopY(1) - 16, `${def.name.toUpperCase()} INSTALLED`, PALETTE.toxic, 2.2);
  G.sfx('buy');
  refreshShop();
}

/* ---------- Frame update ---------- */
function update(dt) {
  if (G.state !== 'playing') return;
  G.time += dt;

  // Shift phases — cool-off is player-paced: no arrivals until the
  // player clicks START SHIFT (no auto-timer).
  if (G.phase === 'shift') {
    // The decade card pauses the arrival clock — reading it is free.
    if (!G.eraCard) {
      G.shiftElapsed += dt;
      while (G.schedule.length && G.schedule[0].t <= G.shiftElapsed) {
        spawnPatient(G.schedule.shift().type);
      }
    }
    if (!G.schedule.length && G.patients.length === 0) {
      if (G.shiftIdx >= G.stage.waves.length - 1) { endRun(true); return; }
      endShift();
    }
  }

  // Cached once per tick: Patient.decayMult reads this per patient per
  // frame — filtering the staff list there was O(patients x staff).
  G.calmOrderlies = lobbyStaff().filter(s => s.typeKey === 'orderly' && !s.isBurnedOut(G.time)).length;

  updatePatients(dt);
  updateStaff(dt);
  updateRooms(dt);
  updateContagion(dt);
  updateAutoAssign(dt);

  if (G.lives <= 0 && G.state === 'playing') { endRun(false); return; }

  // Low-capacity heart monitor
  if (G.lives <= 2) {
    G.heartbeatTimer -= dt;
    if (G.heartbeatTimer <= 0) { G.sfx('beep'); G.heartbeatTimer = 1.1; }
  }

  if (G.buildFlash) {
    G.buildFlash.t += dt;
    if (G.buildFlash.t > 1.2) G.buildFlash = null;
  }
  if (G.eraCard) {
    G.eraCard.t += dt;
    if (G.eraCard.t > ERA_CARD_SECONDS) G.eraCard = null;
  }

  // In-place compaction (no per-frame array allocation)
  compactExpiring(G.texts, dt, null);
  compactExpiring(G.particles, dt, pt => {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.grav) pt.vy += 160 * dt;
  });
}

/* Advance `t` on every item, run `move`, and swap-remove expired ones. */
function compactExpiring(arr, dt, move) {
  let w = 0;
  for (let i = 0; i < arr.length; i++) {
    const item = arr[i];
    item.t += dt;
    if (move) move(item);
    if (item.t < item.life) arr[w++] = item;
  }
  arr.length = w;
}

function updatePatients(dt) {
  for (const p of G.patients) {
    if (p.state === 'transfer') {
      p.transferT -= dt;
      if (p.transferT <= 0) p.outcome = 'transferred';
      continue;
    }
    if (p.blurtT > 0) p.blurtT -= dt;
    if (p.state === 'arriving' || p.state === 'walking') {
      if (moveAlongPath(p, dt)) {
        if (p.state === 'arriving') {
          p.state = 'waiting';
          if (Math.random() < 0.65) p.blurtT = 3;      // blurt on sit-down
        } else {
          p.state = 'inBed';
          const pos = p.room.bedPos(p.bedIndex);
          p.x = pos.x; p.y = pos.y - 4;
        }
      }
    } else if (p.state === 'exiting') {
      if (moveAlongPath(p, dt)) p.outcome = 'walked_out';
      continue;                                    // cured: no decay
    }

    // Deterioration: the ailment's clock, always ticking.
    p.health -= p.def.decay * p.decayMult() * dt;

    if (p.complexity <= 0 && p.state === 'inBed') dischargePatient(p);
    else if (p.health <= 0) transferPatient(p);
  }

  // Resolve outcomes
  for (const p of G.patients) {
    if (p.outcome === 'transferred') {
      G.lives--;
      G.transfers++;
      G.shiftStats.transfers++;
    } else if (p.outcome === 'walked_out') {
      G.discharged++;
      G.shiftStats.helped++;
    }
  }
  G.patients = G.patients.filter(p => !p.outcome);
}

function dischargePatient(p) {
  // The germ pops; the patient celebrates and walks out. THE win moment.
  // Billed charges x outcome multiplier ("no chart, no charge" —
  // ECONOMY.md 3a) x Prior-Auth x private-wing x the decade's inflation.
  const outcome = !p.diagnosed ? 'undiagnosed'
    : (p.room && p.room.treats(p.typeKey)) ? 'right' : 'wrong';
  let mult = PAYOUT_OUTCOME_MULT[outcome] * techMult('payoutMult');
  if (G.upgrades.priorAuth) mult *= UPGRADE_TYPES.priorAuth.payoutMult;
  const pay = Math.round(p.def.payout * mult * currentEra().inflation);
  G.budget += pay;
  G.shiftStats.earned += pay;
  const cureT = G.time - p.spawnT;
  if (G.shiftStats.fastestCure === null || cureT < G.shiftStats.fastestCure) G.shiftStats.fastestCure = cureT;
  if (p.room) { p.room.beds[p.bedIndex] = null; p.room = null; p.bedIndex = -1; }
  p.state = 'exiting';
  p.complexity = 0;
  p.path = pathFrom(p, -30, 0);
  G.addText(p.x, p.y - 34, `CURED! +${fmtMoney(pay)}`, PALETTE.green, 1.6);
  burstConfetti(p.x, p.y - 20);
  G.sfx('discharge');
  narrate('firstDischarge');
  refreshShop();
}

function transferPatient(p) {
  // Deterioration won: stretcher team rushes them to the ICU.
  // Sad, not violent — red flash + siren, no explosion.
  if (p.room) { p.room.beds[p.bedIndex] = null; p.room = null; p.bedIndex = -1; }
  freeWaitSpot(p);
  if (G.selection && G.selection.obj === p) G.selection = null;
  p.state = 'transfer';
  p.transferT = 1.4;
  G.addText(p.x, p.y - 34, 'ICU TRANSFER', PALETTE.brightRed, 2);
  G.sfx('transfer');
  narrate('firstTransfer');
}

function updateStaff(dt) {
  const brRegen = breakroomCount() * BREAKROOM_REGEN;
  for (const s of G.staffList) {
    if (s.state === 'walking') {
      if (moveAlongPath(s, dt)) s.state = 'working';
      continue;
    }
    if (s.isBurnedOut(G.time)) continue;

    let working = false;
    if (s.room === 'lobby' && s.def.canDiagnose) {
      // Triage: diagnose the longest-waiting undiagnosed patient.
      // (Non-diagnosticians in the lobby — orderlies — never pick up
      // diag tasks; their calming effect is passive in decayMult.)
      if (!s.diagPatient || s.diagPatient.outcome || s.diagPatient.state !== 'waiting' || s.diagPatient.diagnosed) {
        s.diagPatient = waitingPatients().find(p =>
          !p.diagnosed && !G.staffList.some(o => o !== s && o.diagPatient === p)) || null;
        s.diagT = 0;
      }
      if (s.diagPatient) {
        working = true;
        s.diagT += dt;
        // Era baseline x owned diagnostic tech (tubes, PACS, EHR…).
        if (s.diagT >= s.def.diagSeconds * currentEra().mods.diag * techMult('diagMult')) {
          const p = s.diagPatient;
          p.diagnosed = true;
          G.shiftStats.diagCount++;
          G.shiftStats.diagTime += G.time - p.spawnT;
          G.addText(p.x, p.y - 34, `${s.def.diagLabel}: ${p.def.name.toUpperCase()}`, PALETTE.blue, 1.6);
          G.sfx('diagnose');
          narrate('firstDiagnosis');
          s.diagPatient = null;
          s.diagT = 0;
        }
      }
    } else if (s.room instanceof Room) {
      working = s.room.beds.some(b => b && b.state === 'inBed');
    }

    if (working) {
      s.stress = Math.min(100, s.stress + s.stressGain() * currentEra().mods.stress * dt);
      if (s.stress >= 100) {
        s.burnoutUntil = G.time + BURNOUT_SECONDS;
        s.stress = 0;
        s.diagPatient = null;
        G.shiftStats.burnouts++;
        G.addText(s.x, s.y - 36, 'BURNOUT!', PALETTE.red, 1.6);
        G.sfx('burnout');
        narrate('firstBurnout');
      }
    } else {
      s.stress = Math.max(0, s.stress - (STRESS_IDLE_REGEN + brRegen) * dt);
    }
  }
}

function updateRooms(dt) {
  for (const r of G.rooms) {
    if (r.def.support) continue;
    const occupied = r.beds.filter(b => b && b.state === 'inBed');
    if (!occupied.length) continue;
    const staffRate = r.staff
      .filter(s => s.state === 'working' && !s.isBurnedOut(G.time))
      .reduce((sum, s) => sum + s.rate(r), 0);
    // Era baseline x owned treatment tech (pulse-ox, regen pod…).
    const perBed = (ROOM_BASE_RATE + staffRate) * currentEra().mods.treat * techMult('treatMult') / occupied.length;
    for (const p of occupied) {
      let mult = 1;
      if (!p.diagnosed) mult = UNDIAGNOSED_MULT;
      else if (!r.treats(p.typeKey)) mult = WRONG_ROOM_MULT;
      p.complexity -= perBed * mult * dt;
      // healing plus-particles — treatment aimed at the ailment
      if (Math.random() < dt * 3) {
        G.particles.push({
          x: p.x + (Math.random() * 16 - 8), y: p.y - 26,
          vx: 0, vy: -14, t: 0, life: 0.8,
          color: mult >= 1 ? PALETTE.green : PALETTE.amber, kind: 'plus',
        });
      }
    }
  }
}

function updateContagion(dt) {
  // Airborne spores make the WAITING ROOM dangerous — isolate them fast.
  for (const p of G.patients) {
    if (p.typeKey !== 'spore' || p.state === 'inBed' || p.state === 'exiting' || p.state === 'transfer') continue;
    p.sporeTimer -= dt;
    if (p.sporeTimer <= 0) {
      p.sporeTimer = SPORE_PULSE;
      for (const other of waitingPatients()) {
        if (other === p) continue;
        other.health -= SPORE_DMG;
        G.particles.push({ x: other.x, y: other.y - 20, vx: 0, vy: -8, t: 0, life: 0.7, color: PALETTE.spore, kind: 'puff' });
      }
      G.particles.push({ x: p.x, y: p.y - 24, vx: 0, vy: -12, t: 0, life: 1, color: PALETTE.spore, kind: 'puff' });
      if (waitingPatients().length > 1) {
        G.addText(p.x, p.y - 40, 'SPREADING!', PALETTE.spore, 1);
        narrate('sporeOutbreak');
      }
    }
  }
}

function updateAutoAssign(dt) {
  // Lab-Router purchase, or free from the 2050s era baseline on.
  if (!G.upgrades.labRouter && !currentEra().autoAssign) return;
  G.autoAssignTimer -= dt;
  if (G.autoAssignTimer > 0) return;
  G.autoAssignTimer = AUTO_ASSIGN_PERIOD;
  for (const p of waitingPatients()) {
    if (!p.diagnosed) continue;
    const room = G.rooms.find(r => r.treats(p.typeKey) && r.freeBed() !== -1);
    if (room) {
      assignPatientToRoom(p, room);
      G.addText(p.x, p.y - 30, 'AI ROUTED', PALETTE.toxic, 1);
      break;                                    // one per tick: visible, not teleporty
    }
  }
}

function burstConfetti(x, y) {
  for (let i = 0; i < 14; i++) {
    G.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 120,
      vy: -40 - Math.random() * 80,
      t: 0, life: 0.9 + Math.random() * 0.4, grav: true,
      color: [PALETTE.green, PALETTE.blue, PALETTE.amber, PALETTE.white][i % 4],
      kind: 'confetti',
    });
  }
}
