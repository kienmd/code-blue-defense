/* ============================================================
 * Simulation — run lifecycle, shift engine, spawning,
 * allocation, treatment, deterioration, contagion, burnout,
 * and the agentic auto-triage. Mutates G; renders nothing.
 * ============================================================ */

/* ---------- Run lifecycle ---------- */
function startRun() {
  G.state = 'playing';
  G.time = 0;
  G.budget = START_BUDGET;
  G.lives = START_LIVES;
  G.discharged = 0;
  G.transfers = 0;
  G.rooms = [];
  G.staffList = [];
  G.patients = [];
  G.waitSpots = new Array(WAIT_SPOTS).fill(null);
  G.upgrades = { labRouter: false, priorAuth: false };
  G.shiftIdx = -1;
  G.phase = 'cooloff';              // player-paced: build + hire, then click START
  G.schedule = [];
  G.shiftStats = freshShiftStats();
  G.selection = null;
  G.texts = [];
  G.particles = [];
  el.menu.classList.add('hidden');
  el.result.classList.add('hidden');
  el.report.classList.add('hidden');
  showBanner('BUILD A WARD + HIRE A NURSE<br/>THEN START SHIFT 1', 'info', 4);
  refreshShop();
  refreshShiftButton();
}

function freshShiftStats() {
  return { helped: 0, transfers: 0, earned: 0, spent: 0, burnouts: 0, fastestCure: null, longestWait: 0 };
}

function startShift() {
  if (G.state !== 'playing' || G.phase !== 'cooloff') return;
  G.shiftIdx++;
  const shift = SHIFTS[G.shiftIdx];
  G.phase = 'shift';
  G.shiftElapsed = 0;
  G.schedule = [];
  G.shiftStats = freshShiftStats();
  el.report.classList.add('hidden');
  refreshShiftButton();
  shift.entries.forEach((entry, ei) => {
    for (let i = 0; i < entry.count; i++) {
      G.schedule.push({ t: 1 + ei * 1.7 + i * entry.interval, type: entry.type });
    }
  });
  G.schedule.sort((a, b) => a.t - b.t);
  if (shift.banner) { showBanner(shift.banner, 'alert', 3); G.sfx('siren'); }
  else showBanner(`SHIFT ${G.shiftIdx + 1} / ${SHIFTS.length}`, 'info', 1.6);
}

function endRun(won) {
  G.state = won ? 'won' : 'lost';
  G.selection = null;
  let stars = 0;
  if (won) {
    stars = G.transfers === 0 ? 3 : (G.transfers <= 2 ? 2 : 1);
    setBest(stars, G.discharged);
  }
  showResult(won, stars);
  refreshShiftButton();
  if (won) { playSfx('discharge'); setTimeout(() => playSfx('buy'), 200); } else { playSfx('transfer'); }
}

function endShift() {
  // Round over: show the SHIFT REPORT, then hold in player-paced
  // cool-off until they click START SHIFT N+1.
  G.phase = 'cooloff';
  G.selection = null;
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

  // Presenting complaint: fire-and-forget flavor (LLM or canned table).
  generateComplaint(p).then(line => { if (!p.outcome) p.complaint = line; });

  // AGENTIC LAB-ROUTER: instant AI diagnosis on arrival.
  if (G.upgrades.labRouter) {
    simulateAgenticDecision(p).then(decision => {
      if (p.outcome || p.diagnosed) return;
      p.diagnosed = true;
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
    if (lobbyStaff().length >= 3) { G.sfx('denied'); return false; }
    staff.room = 'lobby';
    staff.state = 'walking';
    const idx = lobbyStaff().length - 1;     // position by arrival order
    staff.path = pathFrom(staff, 170 + Math.min(2, idx) * 120, 0);
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
  if (G.budget < def.cost) { G.sfx('denied'); return; }
  G.budget -= def.cost;
  G.shiftStats.spent += def.cost;
  const s = new Staff(typeKey);
  s.x = -20; s.y = floorWalkY(0);
  s.state = 'walking';
  s.path = [{ x: 830 - (G.staffList.length % 4) * 26, y: floorWalkY(0) }];
  G.staffList.push(s);
  G.selection = { kind: 'staff', obj: s };
  G.addText(200, floorWalkY(0) - 40, `${def.name.toUpperCase()} HIRED — CLICK A ROOM`, PALETTE.blue, 2);
  G.sfx('buy');
  refreshShop();
}

function buildRoom(typeKey) {
  // Fallout Shelter-style: no slot picking. The room lands in the
  // next open slot (floor 1 fills left-to-right, then floor 2, …).
  const def = ROOM_TYPES[typeKey];
  if (G.budget < def.cost) { G.sfx('denied'); return; }
  const slot = nextBuildSlot();
  if (!slot) { G.sfx('denied'); G.addText(WORLD_W / 2, floorTopY(NUM_FLOORS - 1) + 30, 'HOSPITAL FULL', PALETTE.amber, 1.6); return; }
  G.budget -= def.cost;
  G.shiftStats.spent += def.cost;
  const r = new Room(typeKey, slot.floor, slot.slot);
  G.rooms.push(r);
  G.buildFlash = { floor: slot.floor, slot: slot.slot, t: 0 };
  G.addText(r.x + r.w / 2, r.y + 30, `${def.name.toUpperCase()} BUILT`, def.color, 1.6);
  G.sfx('place');
  refreshShop();
}

/* ---------- Frame update ---------- */
function update(dt) {
  if (G.state !== 'playing') return;
  G.time += dt;

  // Shift phases — cool-off is player-paced: no arrivals until the
  // player clicks START SHIFT (no auto-timer).
  if (G.phase === 'shift') {
    G.shiftElapsed += dt;
    while (G.schedule.length && G.schedule[0].t <= G.shiftElapsed) {
      spawnPatient(G.schedule.shift().type);
    }
    if (!G.schedule.length && G.patients.length === 0) {
      if (G.shiftIdx >= SHIFTS.length - 1) { endRun(true); return; }
      endShift();
    }
  }

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

  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter(t => t.t < t.life);
  for (const pt of G.particles) {
    pt.t += dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    if (pt.grav) pt.vy += 160 * dt;
  }
  G.particles = G.particles.filter(pt => pt.t < pt.life);
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
  const mult = G.upgrades.priorAuth ? UPGRADE_TYPES.priorAuth.payoutMult : 1;
  const pay = Math.round(p.def.payout * mult);
  G.budget += pay;
  G.shiftStats.earned += pay;
  const cureT = G.time - p.spawnT;
  if (G.shiftStats.fastestCure === null || cureT < G.shiftStats.fastestCure) G.shiftStats.fastestCure = cureT;
  if (p.room) { p.room.beds[p.bedIndex] = null; p.room = null; p.bedIndex = -1; }
  p.state = 'exiting';
  p.complexity = 0;
  p.path = pathFrom(p, -30, 0);
  G.addText(p.x, p.y - 34, `CURED! +$${pay}`, PALETTE.green, 1.6);
  burstConfetti(p.x, p.y - 20);
  G.sfx('discharge');
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
    if (s.room === 'lobby') {
      // Triage: diagnose the longest-waiting undiagnosed patient.
      if (!s.diagPatient || s.diagPatient.outcome || s.diagPatient.state !== 'waiting' || s.diagPatient.diagnosed) {
        s.diagPatient = waitingPatients().find(p =>
          !p.diagnosed && !G.staffList.some(o => o !== s && o.diagPatient === p)) || null;
        s.diagT = 0;
      }
      if (s.diagPatient) {
        working = true;
        s.diagT += dt;
        if (s.diagT >= s.def.diagSeconds) {
          const p = s.diagPatient;
          p.diagnosed = true;
          G.addText(p.x, p.y - 34, `DIAGNOSED: ${p.def.name.toUpperCase()}`, PALETTE.blue, 1.6);
          G.sfx('diagnose');
          s.diagPatient = null;
          s.diagT = 0;
        }
      }
    } else if (s.room instanceof Room) {
      working = s.room.beds.some(b => b && b.state === 'inBed');
    }

    if (working) {
      s.stress = Math.min(100, s.stress + s.stressGain() * dt);
      if (s.stress >= 100) {
        s.burnoutUntil = G.time + BURNOUT_SECONDS;
        s.stress = 0;
        s.diagPatient = null;
        G.shiftStats.burnouts++;
        G.addText(s.x, s.y - 36, 'BURNOUT!', PALETTE.red, 1.6);
        G.sfx('burnout');
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
      .reduce((sum, s) => sum + s.rate(), 0);
    const perBed = (ROOM_BASE_RATE + staffRate) / occupied.length;
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
      if (waitingPatients().length > 1) G.addText(p.x, p.y - 40, 'SPREADING!', PALETTE.spore, 1);
    }
  }
}

function updateAutoAssign(dt) {
  if (!G.upgrades.labRouter) return;
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
