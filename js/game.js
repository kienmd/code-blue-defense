/* ============================================================
 * Code Blue Defense: Ward Shift — engine + UI
 *
 * Fallout Shelter-style cross-section. requestAnimationFrame ->
 * update(dt) + render(). The core verb is ALLOCATION: click a
 * patient, click a room. Treatment happens in beds; the ailment
 * sprite takes the treatment, never the patient (DESIGN.md).
 * ============================================================ */

(() => {
  'use strict';

  /* ---------- DOM ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  ctx.imageSmoothingEnabled = false;

  const el = {
    budget: document.getElementById('hud-budget'),
    lives: document.getElementById('hud-lives'),
    shift: document.getElementById('hud-shift'),
    waiting: document.getElementById('hud-waiting'),
    menu: document.getElementById('menu'),
    menuBest: document.getElementById('menu-best'),
    btnStart: document.getElementById('btn-start'),
    result: document.getElementById('result'),
    resultTitle: document.getElementById('result-title'),
    resultStars: document.getElementById('result-stars'),
    resultDetail: document.getElementById('result-detail'),
    btnRetry: document.getElementById('btn-retry'),
    btnMenu: document.getElementById('btn-menu'),
    banner: document.getElementById('banner'),
    shopRooms: document.getElementById('shop-rooms'),
    shopStaff: document.getElementById('shop-staff'),
    shopUpgrades: document.getElementById('shop-upgrades'),
    tooltip: document.getElementById('tooltip'),
    dragGhost: document.getElementById('drag-ghost'),
  };

  /* ---------- Audio: tiny chiptune synth ---------- */
  let audioCtx = null;
  function ensureAudio() {
    if (!audioCtx) {
      try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* no audio */ }
    }
  }
  function tone(freq, dur, type = 'square', vol = 0.035, when = 0) {
    if (!audioCtx) return;
    const t0 = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t0); osc.stop(t0 + dur + 0.02);
  }
  const SFX = {
    discharge: () => { tone(660, 0.08); tone(880, 0.1, 'square', 0.035, 0.08); tone(1180, 0.14, 'square', 0.03, 0.18); },
    transfer:  () => { tone(680, 0.22, 'square', 0.05); tone(510, 0.22, 'square', 0.05, 0.24); tone(680, 0.3, 'square', 0.05, 0.48); },
    place:     () => tone(440, 0.07),
    buy:       () => { tone(590, 0.06); tone(790, 0.08, 'square', 0.035, 0.06); },
    burnout:   () => tone(110, 0.5, 'sawtooth', 0.05),
    siren:     () => { tone(680, 0.22, 'square', 0.045); tone(510, 0.22, 'square', 0.045, 0.24); tone(680, 0.22, 'square', 0.045, 0.48); },
    beep:      () => tone(880, 0.05, 'sine', 0.03),
    diagnose:  () => { tone(740, 0.05, 'sine', 0.03); tone(990, 0.07, 'sine', 0.03, 0.05); },
    denied:    () => tone(160, 0.12, 'square', 0.04),
    select:    () => tone(520, 0.04, 'sine', 0.025),
    assign:    () => { tone(520, 0.05); tone(700, 0.06, 'square', 0.03, 0.05); },
  };

  /* ---------- Game state ---------- */
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
    dragUpgrade: null,
    autoAssignTimer: 0,
    heartbeatTimer: 0,
    texts: [],
    particles: [],
    sfx(name) { (SFX[name] || (() => {}))(); },
    addText(x, y, text, color, life = 1.3) { this.texts.push({ x, y, text, color, t: 0, life }); },
  };

  function lobbyStaff() { return G.staffList.filter(s => s.room === 'lobby'); }
  function breakroomCount() { return Math.min(BREAKROOM_CAP, G.rooms.filter(r => r.typeKey === 'breakroom').length); }
  function waitingPatients() { return G.patients.filter(p => p.state === 'waiting'); }

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
    G.phase = 'prep';
    G.prepTimer = 14;                 // generous first prep: build + hire
    G.schedule = [];
    G.selection = null;
    G.buildType = null;
    G.texts = [];
    G.particles = [];
    el.menu.classList.add('hidden');
    el.result.classList.add('hidden');
    showBanner('BUILD A WARD + HIRE A NURSE<br/>FIRST PATIENTS INBOUND', 'info', 4);
    refreshShop();
  }

  function startShift() {
    G.shiftIdx++;
    const shift = SHIFTS[G.shiftIdx];
    G.phase = 'shift';
    G.shiftElapsed = 0;
    G.schedule = [];
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
    G.buildType = null;
    let stars = 0;
    if (won) {
      stars = G.transfers === 0 ? 3 : (G.transfers <= 2 ? 2 : 1);
      setBest(stars, G.discharged);
    }
    el.resultTitle.textContent = won ? 'ALL SHIFTS COMPLETE' : 'ICU AT CAPACITY';
    el.resultTitle.style.color = won ? 'var(--green)' : 'var(--red)';
    el.resultStars.textContent = won ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '';
    el.resultDetail.innerHTML =
      `PATIENTS HELPED: ${G.discharged}<br/>` +
      `ICU TRANSFERS: ${G.transfers}<br/>` +
      `FINAL BUDGET: $${G.budget}`;
    el.result.classList.remove('hidden');
    if (won) { SFX.discharge(); setTimeout(SFX.buy, 200); } else { SFX.transfer(); }
  }

  /* ---------- Spawning + allocation ---------- */
  function spawnPatient(type) {
    const p = new Patient(type);
    let spot = G.waitSpots.indexOf(null);
    if (spot === -1) spot = WAIT_SPOTS - 1;      // overflow: crowd the last spot
    else G.waitSpots[spot] = p;
    p.waitIndex = spot;
    p.path = [{ x: waitSpotX(spot), y: floorWalkY(0) }];
    G.patients.push(p);

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

  function currentFloorOf(ent) {
    return Math.max(0, Math.min(NUM_FLOORS - 1, Math.round((GROUND_Y - 8 - ent.y) / FLOOR_H)));
  }

  function pathFrom(ent, toX, toFloor) {
    if (Math.abs(ent.x - ELEV_CX) < 1) {
      return [{ x: ELEV_CX, y: floorWalkY(toFloor) }, { x: toX, y: floorWalkY(toFloor) }];
    }
    return buildPath(ent.x, currentFloorOf(ent), toX, toFloor);
  }

  function assignPatientToRoom(p, room) {
    const bed = room.freeBed();
    if (bed === -1) { G.sfx('denied'); G.addText(p.x, p.y - 30, 'NO FREE BED', PALETTE.amber, 1); return false; }
    freeWaitSpot(p);
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

  function buildRoom(typeKey, floor, slot) {
    const def = ROOM_TYPES[typeKey];
    if (G.budget < def.cost) { G.sfx('denied'); return; }
    G.budget -= def.cost;
    const r = new Room(typeKey, floor, slot);
    G.rooms.push(r);
    G.addText(r.x + r.w / 2, r.y + 30, `${def.name.toUpperCase()} BUILT`, def.color, 1.6);
    G.sfx('place');
    refreshShop();
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

  /* ---------- Update ---------- */
  function update(dt) {
    if (G.state !== 'playing') return;
    G.time += dt;

    // Shift phases
    if (G.phase === 'prep') {
      G.prepTimer -= dt;
      if (G.prepTimer <= 0) startShift();
    } else {
      G.shiftElapsed += dt;
      while (G.schedule.length && G.schedule[0].t <= G.shiftElapsed) {
        spawnPatient(G.schedule.shift().type);
      }
      if (!G.schedule.length && G.patients.length === 0) {
        if (G.shiftIdx >= SHIFTS.length - 1) { endRun(true); return; }
        G.phase = 'prep';
        G.prepTimer = PREP_SECONDS;
        showBanner(`SHIFT ${G.shiftIdx + 1} COMPLETE`, 'info', 1.6);
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
      if (p.state === 'arriving' || p.state === 'walking') {
        if (moveAlongPath(p, dt)) {
          if (p.state === 'arriving') p.state = 'waiting';
          else {
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
      } else if (p.outcome === 'walked_out') {
        G.discharged++;
      }
    }
    G.patients = G.patients.filter(p => !p.outcome);
  }

  function dischargePatient(p) {
    // The germ pops; the patient celebrates and walks out. THE win moment.
    const mult = G.upgrades.priorAuth ? UPGRADE_TYPES.priorAuth.payoutMult : 1;
    const pay = Math.round(p.def.payout * mult);
    G.budget += pay;
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

  /* ---------- Banner ---------- */
  let bannerTimeout = null;
  function showBanner(html, kind, seconds) {
    el.banner.innerHTML = html;
    el.banner.classList.remove('hidden', 'info');
    if (kind === 'info') el.banner.classList.add('info');
    clearTimeout(bannerTimeout);
    bannerTimeout = setTimeout(() => el.banner.classList.add('hidden'), seconds * 1000);
  }

  /* ---------- Input ---------- */
  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

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

  canvas.addEventListener('mousemove', evt => { G.hover = canvasPos(evt); });
  canvas.addEventListener('mouseleave', () => { G.hover = null; });

  canvas.addEventListener('click', evt => {
    ensureAudio();
    if (G.state !== 'playing') return;
    const { x, y } = canvasPos(evt);

    // 1. Build mode
    if (G.buildType) {
      const slot = slotFromPoint(x, y);
      if (slot && !roomAt(slot.floor, slot.slot)) {
        buildRoom(G.buildType, slot.floor, slot.slot);
        G.buildType = null;                  // one build per selection — no sticky mode
        refreshShop();
      } else G.sfx('denied');
      return;
    }

    // 2. Selection-driven assignment
    if (G.selection) {
      const { kind, obj } = G.selection;
      const room = hitRoom(x, y);
      if (kind === 'patient' && room && !room.def.support) {
        if (obj.state === 'waiting' && assignPatientToRoom(obj, room)) { G.selection = null; return; }
        if (obj.state !== 'waiting') G.sfx('denied');
        return;
      }
      if (kind === 'staff') {
        if (room && !room.def.support) { if (assignStaff(obj, room)) G.selection = null; return; }
        if (room && room.def.support) { G.sfx('denied'); return; }
        if (inLobby(x, y) && !hitPatient(x, y) && !hitStaff(x, y)) {
          if (assignStaff(obj, 'lobby')) G.selection = null;
          return;
        }
      }
      // fall through: maybe they clicked another entity
    }

    // 3. Select an entity
    const p = hitPatient(x, y);
    if (p) {
      G.selection = { kind: 'patient', obj: p };
      G.sfx('select');
      el.tooltip.innerHTML = p.diagnosed
        ? `<b>${p.def.name}</b> — needs <b>${ROOM_TYPES[PATHOGENS[p.typeKey].room].name.toUpperCase()}</b>. ${p.def.desc}`
        : '<b>UNDIAGNOSED</b> — a lobby nurse (or the Lab-Router) must identify the pathogen. You can still bed them, but treatment crawls.';
      return;
    }
    const s = hitStaff(x, y);
    if (s) {
      G.selection = { kind: 'staff', obj: s };
      G.sfx('select');
      el.tooltip.innerHTML = `<b>${s.def.name}</b> — ${s.def.desc} Click a room to assign (or the lobby floor for triage duty).`;
      return;
    }
    const r = hitRoom(x, y);
    if (r) {
      el.tooltip.innerHTML = `<b>${r.def.name}</b> — ${r.def.desc} Staff ${r.staff.length}/${r.def.staffSlots}` +
        (r.def.beds ? `, beds ${r.beds.filter(Boolean).length}/${r.def.beds}.` : '.');
    }
    G.selection = null;
  });

  canvas.addEventListener('contextmenu', evt => {
    evt.preventDefault();
    G.selection = null;
    G.buildType = null;
    refreshShop();
  });
  window.addEventListener('keydown', evt => {
    if (evt.key === 'Escape') {
      G.selection = null; G.buildType = null; G.dragUpgrade = null;
      el.dragGhost.classList.add('hidden');
      refreshShop();
    }
  });

  // Upgrade drag & drop
  window.addEventListener('mousemove', evt => {
    if (!G.dragUpgrade) return;
    el.dragGhost.style.left = (evt.clientX - 18) + 'px';
    el.dragGhost.style.top = (evt.clientY - 18) + 'px';
  });
  window.addEventListener('mouseup', evt => {
    if (!G.dragUpgrade) return;
    const key = G.dragUpgrade;
    G.dragUpgrade = null;
    el.dragGhost.classList.add('hidden');
    if (G.state !== 'playing') return;
    const rect = canvas.getBoundingClientRect();
    if (evt.clientX < rect.left || evt.clientX > rect.right || evt.clientY < rect.top || evt.clientY > rect.bottom) return;
    const { x, y } = canvasPos(evt);
    dropUpgrade(key, x, y);
  });

  function dropUpgrade(key, px, py) {
    const def = UPGRADE_TYPES[key];
    if (G.budget < def.cost) { G.sfx('denied'); return; }
    if (def.target === 'staff') {
      const s = hitStaff(px, py);
      if (!s) { G.addText(px, py, 'DROP ON A STAFF MEMBER', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      if (s.scribe) { G.addText(px, py, 'ALREADY HAS A SCRIBE', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      s.scribe = true;
      G.budget -= def.cost;
      G.addText(s.x, s.y - 40, 'AI SCRIBE ONLINE', PALETTE.toxic, 1.5);
    } else if (def.target === 'lobby') {
      if (G.upgrades.labRouter || !inLobby(px, py)) { G.sfx('denied'); if (!G.upgrades.labRouter) G.addText(px, py, 'DROP ON THE LOBBY', PALETTE.amber, 1.2); return; }
      G.upgrades.labRouter = true;
      G.budget -= def.cost;
      G.addText(400, floorWalkY(0) - 50, 'LAB-ROUTER ONLINE: AUTO-TRIAGE ACTIVE', PALETTE.toxic, 2);
    } else if (def.target === 'exit') {
      if (G.upgrades.priorAuth || !inEntrance(px, py)) { G.sfx('denied'); if (!G.upgrades.priorAuth) G.addText(px, py, 'DROP ON THE ENTRANCE DOOR', PALETTE.amber, 1.2); return; }
      G.upgrades.priorAuth = true;
      G.budget -= def.cost;
      G.addText(120, floorWalkY(0) - 50, 'PRIOR-AUTH AGENT ONLINE', PALETTE.toxic, 2);
    }
    G.sfx('buy');
    refreshShop();
  }

  /* ---------- Shop ---------- */
  const shopButtons = { rooms: {}, staff: {}, upgrades: {} };

  function iconCanvas(draw) {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const ictx = c.getContext('2d');
    ictx.imageSmoothingEnabled = false;
    ictx.save(); ictx.translate(20, 22); ictx.scale(1.4, 1.4);
    draw(ictx);
    ictx.restore();
    return c;
  }

  function makeShopItem(parent, iconDraw, name, cost, tooltipHtml, onActivate, drag) {
    const item = document.createElement('div');
    item.className = 'shop-item' + (drag ? ' upgrade' : '');
    item.appendChild(iconCanvas(iconDraw));
    item.insertAdjacentHTML('beforeend',
      `<div class="si-name">${name.toUpperCase()}</div><div class="si-cost">$${cost}</div>`);
    item.addEventListener(drag ? 'mousedown' : 'click', evt => {
      ensureAudio();
      if (item.classList.contains('disabled') || item.classList.contains('soldout')) { G.sfx('denied'); return; }
      onActivate(evt, item);
      if (drag) evt.preventDefault();
    });
    item.addEventListener('mouseenter', () => { el.tooltip.innerHTML = tooltipHtml; });
    parent.appendChild(item);
    return item;
  }

  function buildShop() {
    for (const [key, def] of Object.entries(ROOM_TYPES)) {
      shopButtons.rooms[key] = makeShopItem(
        el.shopRooms,
        ictx => drawRoomIcon(ictx, key, 0, 0),
        def.name, def.cost,
        `<b>${def.name}</b> — ${def.desc} Then click an empty floor slot.`,
        () => { G.buildType = (G.buildType === key) ? null : key; G.selection = null; refreshShop(); },
      );
    }
    for (const [key, def] of Object.entries(STAFF_TYPES)) {
      shopButtons.staff[key] = makeShopItem(
        el.shopStaff,
        ictx => drawStaffSprite(ictx, key, 0, 10),
        def.name, def.cost,
        `<b>${def.name}</b> — ${def.desc}`,
        () => hireStaff(key),
      );
    }
    for (const [key, def] of Object.entries(UPGRADE_TYPES)) {
      shopButtons.upgrades[key] = makeShopItem(
        el.shopUpgrades,
        ictx => drawUpgradeIcon(ictx, key, 0, -2),
        def.name, def.cost,
        `<b>${def.name}</b> — ${def.desc}`,
        evt => {
          G.dragUpgrade = key;
          el.dragGhost.innerHTML = '';
          const gc = document.createElement('canvas');
          gc.width = 36; gc.height = 36;
          const gctx = gc.getContext('2d');
          gctx.imageSmoothingEnabled = false;
          gctx.save(); gctx.translate(18, 18); gctx.scale(1.7, 1.7); drawUpgradeIcon(gctx, key, 0, 0); gctx.restore();
          el.dragGhost.appendChild(gc);
          el.dragGhost.style.left = (evt.clientX - 18) + 'px';
          el.dragGhost.style.top = (evt.clientY - 18) + 'px';
          el.dragGhost.classList.remove('hidden');
        },
        true,
      );
    }
  }

  function refreshShop() {
    for (const [key, def] of Object.entries(ROOM_TYPES)) {
      const item = shopButtons.rooms[key];
      item.classList.toggle('disabled', G.budget < def.cost);
      item.classList.toggle('selected', G.buildType === key);
    }
    for (const [key, def] of Object.entries(STAFF_TYPES)) {
      shopButtons.staff[key].classList.toggle('disabled', G.budget < def.cost);
    }
    for (const [key, def] of Object.entries(UPGRADE_TYPES)) {
      const item = shopButtons.upgrades[key];
      const sold = def.unique && G.upgrades[key];
      item.classList.toggle('soldout', !!sold);
      item.classList.toggle('disabled', !sold && G.budget < def.cost);
    }
  }

  /* ---------- Render ---------- */
  const FONT = '7px "Press Start 2P", monospace';

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Night sky + stars
    ctx.fillStyle = PALETTE.night;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#3a4a6a';
    for (let i = 0; i < 24; i++) {
      ctx.fillRect((i * 137 + 40) % canvas.width, (i * 71 + 10) % Math.max(1, floorTopY(NUM_FLOORS - 1) - 10), 2, 2);
    }

    // Street
    ctx.fillStyle = '#161c2e';
    ctx.fillRect(0, GROUND_Y, canvas.width, canvas.height - GROUND_Y);
    ctx.fillStyle = '#242e48';
    ctx.fillRect(0, GROUND_Y, canvas.width, 3);

    // Building shell
    const bTop = floorTopY(NUM_FLOORS - 1);
    ctx.fillStyle = PALETTE.building;
    ctx.fillRect(32, bTop - 14, 848 - 8, GROUND_Y - bTop + 14);
    // Roof sign
    ctx.fillStyle = PALETTE.frame;
    ctx.fillRect(32, bTop - 14, 840, 14);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(388, bTop - 34, 20, 20);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(396, bTop - 30, 4, 12); ctx.fillRect(392, bTop - 26, 12, 4);
    ctx.font = FONT;
    ctx.fillStyle = PALETTE.blue;
    ctx.textAlign = 'left';
    ctx.fillText('CODE BLUE GENERAL', 420, bTop - 20);

    // Floors
    for (let f = 0; f < NUM_FLOORS; f++) {
      const top = floorTopY(f);
      // floor slab
      ctx.fillStyle = PALETTE.floorLine;
      ctx.fillRect(32, top + FLOOR_H - 4, 840, 4);
      if (f === 0) continue;
      for (let sl = 0; sl < SLOTS_PER_FLOOR; sl++) {
        const room = roomAt(f, sl);
        const x = slotX(sl);
        if (room) drawRoomInterior(room);
        else {
          ctx.fillStyle = PALETTE.slotDark;
          ctx.fillRect(x + 2, top + 2, SLOT_W - 4, FLOOR_H - 6);
          ctx.strokeStyle = '#22304a';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(x + 8, top + 8, SLOT_W - 16, FLOOR_H - 18);
          ctx.setLineDash([]);
        }
      }
    }

    // Lobby interior
    drawLobby();

    // Elevator shaft
    ctx.fillStyle = '#101828';
    ctx.fillRect(ELEV_X, bTop, ELEV_W, GROUND_Y - bTop);
    ctx.fillStyle = '#2e3c5c';
    ctx.fillRect(ELEV_X + 4, bTop, 2, GROUND_Y - bTop);
    ctx.fillRect(ELEV_X + ELEV_W - 6, bTop, 2, GROUND_Y - bTop);
    for (let f = 0; f < NUM_FLOORS; f++) {
      ctx.fillStyle = PALETTE.frame;
      ctx.fillRect(ELEV_X, floorTopY(f) + FLOOR_H - 4, ELEV_W, 4);
    }

    // Build-mode hover ghost
    if (G.buildType && G.hover) {
      const slot = slotFromPoint(G.hover.x, G.hover.y);
      if (slot) {
        const free = !roomAt(slot.floor, slot.slot);
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = free ? PALETTE.green : PALETTE.red;
        ctx.fillRect(slotX(slot.slot) + 2, floorTopY(slot.floor) + 2, SLOT_W - 4, FLOOR_H - 6);
        ctx.globalAlpha = 1;
      }
    }

    // Entities
    for (const s of G.staffList) drawStaffEntity(s);
    for (const p of G.patients) drawPatientEntity(p);

    // Diagnosis beams
    for (const s of G.staffList) {
      if (s.room === 'lobby' && s.diagPatient && !s.isBurnedOut(G.time)) {
        ctx.strokeStyle = PALETTE.blue;
        ctx.globalAlpha = 0.6;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(s.x, s.y - 14);
        ctx.lineTo(s.diagPatient.x, s.diagPatient.y - 14);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }

    // Particles
    for (const pt of G.particles) {
      const frac = pt.t / pt.life;
      ctx.globalAlpha = 1 - frac;
      ctx.fillStyle = pt.color;
      if (pt.kind === 'plus') {
        ctx.fillRect(pt.x - 1, pt.y - 3, 2, 6);
        ctx.fillRect(pt.x - 3, pt.y - 1, 6, 2);
      } else if (pt.kind === 'puff') {
        const r = 2 + frac * 5;
        ctx.fillRect(pt.x - r / 2, pt.y - r / 2, r, r);
      } else {
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
      }
      ctx.globalAlpha = 1;
    }

    // Selection highlight + hint
    if (G.selection) {
      const o = G.selection.obj;
      ctx.strokeStyle = PALETTE.green;
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 6);
      ctx.lineWidth = 2;
      ctx.strokeRect(o.x - 13, o.y - 34, 26, 40);
      ctx.globalAlpha = 1;
      ctx.font = FONT;
      ctx.fillStyle = PALETTE.green;
      ctx.textAlign = 'center';
      const hint = G.selection.kind === 'patient' ? 'CLICK A ROOM TO ALLOCATE' : 'CLICK A ROOM (OR LOBBY) TO ASSIGN';
      ctx.fillText(hint, canvas.width / 2, 14);
    }
    if (G.buildType) {
      ctx.font = FONT;
      ctx.fillStyle = PALETTE.amber;
      ctx.textAlign = 'center';
      ctx.fillText(`CLICK AN EMPTY SLOT TO BUILD: ${ROOM_TYPES[G.buildType].name.toUpperCase()}`, canvas.width / 2, 14);
    }

    // Floating texts
    ctx.font = FONT;
    ctx.textAlign = 'center';
    for (const t of G.texts) {
      const frac = t.t / t.life;
      ctx.globalAlpha = 1 - frac;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x), Math.round(t.y - frac * 16));
      ctx.globalAlpha = 1;
    }

    // Prep countdown
    if (G.state === 'playing' && G.phase === 'prep') {
      ctx.fillStyle = PALETTE.amber;
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`NEXT SHIFT IN ${Math.ceil(G.prepTimer)}…`, 8, canvas.height - 8);
    }
    ctx.textAlign = 'left';
  }

  function drawLobby() {
    const top = floorTopY(0);
    ctx.fillStyle = '#1c2438';
    ctx.fillRect(ELEV_X + ELEV_W, top + 2, 872 - ELEV_X - ELEV_W, FLOOR_H - 6);
    // waiting chairs
    for (let i = 0; i < WAIT_SPOTS; i++) {
      const x = waitSpotX(i);
      ctx.fillStyle = '#31405e';
      ctx.fillRect(x - 10, floorWalkY(0) - 6, 20, 4);
      ctx.fillRect(x - 10, floorWalkY(0) - 14, 3, 10);
    }
    ctx.font = FONT;
    ctx.fillStyle = '#516a8a';
    ctx.fillText('WAITING ROOM', 400, top + 16);

    // Entrance door (also the happy exit)
    ctx.fillStyle = '#0e1626';
    ctx.fillRect(34, top + 10, 28, FLOOR_H - 18);
    ctx.fillStyle = PALETTE.green;
    ctx.fillRect(34, top + 10, 28, 4);
    ctx.fillStyle = PALETTE.white;
    ctx.font = FONT;
    ctx.fillText('ER', 42, top + 34);
    if (G.upgrades.priorAuth) {
      drawUpgradeIcon(ctx, 'priorAuth', 48, top + 54, 0.8);
      pulseGlow(48, top + 54);
    }
    if (G.upgrades.labRouter) {
      drawUpgradeIcon(ctx, 'labRouter', 130, top + 20, 1);
      pulseGlow(130, top + 20);
    }
  }

  function drawRoomInterior(room) {
    const { x, y, w, h } = room;
    // lit interior, tinted by room type
    ctx.fillStyle = '#20293e';
    ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
    ctx.fillStyle = room.def.color;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
    ctx.globalAlpha = 1;
    ctx.fillStyle = room.def.color;
    ctx.fillRect(x + 2, y + 2, w - 4, 3);
    // label
    ctx.font = FONT;
    ctx.fillStyle = room.def.color;
    ctx.textAlign = 'left';
    ctx.fillText(room.def.name.toUpperCase(), x + 10, y + 18);

    if (room.def.support) {
      // break room: coffee machine + couch
      const wy = floorWalkY(room.floor);
      ctx.fillStyle = '#31405e';
      ctx.fillRect(x + w * 0.5 - 24, wy - 8, 48, 6);
      ctx.fillRect(x + w * 0.5 - 24, wy - 16, 5, 14);
      ctx.fillRect(x + w * 0.5 + 19, wy - 16, 5, 14);
      ctx.fillStyle = PALETTE.white;
      ctx.fillRect(x + w - 40, wy - 22, 14, 20);
      ctx.fillStyle = room.def.color;
      ctx.fillRect(x + w - 37, wy - 18, 8, 6);
    } else {
      for (let i = 0; i < room.def.beds; i++) {
        const pos = room.bedPos(i);
        drawBed(ctx, pos.x, pos.y);
      }
    }
  }

  function drawPatientEntity(p) {
    if (p.state === 'transfer') {
      // stretcher flash — sad, not violent
      const on = Math.floor(p.transferT * 8) % 2 === 0;
      ctx.globalAlpha = on ? 1 : 0.35;
      ctx.fillStyle = '#c8d8dc';
      ctx.fillRect(p.x - 14, p.y - 8, 28, 5);
      drawPatientSprite(ctx, p.x, p.y - 6, 0, 'sick');
      ctx.globalAlpha = 1;
      return;
    }
    const mood = p.state === 'exiting' ? 'happy' : 'sick';
    drawPatientSprite(ctx, p.x, p.y, G.time * 5 + p.bob, mood);
    if (p.state === 'exiting') return;                       // cured: no bars, no germ

    // The ailment — the actual enemy — rides above the patient.
    drawAilment(ctx, p.diagnosed ? p.typeKey : null, p.x, p.y - 32, p.ailmentScale(), G.time + p.bob);

    // deterioration bar (red = the disease is winning)
    const bw = 18;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(p.x - bw / 2, p.y - 44, bw, 3);
    const hf = Math.max(0, p.health / 100);
    ctx.fillStyle = hf > 0.5 ? PALETTE.green : (hf > 0.25 ? PALETTE.amber : PALETTE.red);
    ctx.fillRect(p.x - bw / 2, p.y - 44, bw * hf, 3);
    // treatment progress (blue, drains as care lands)
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(p.x - bw / 2, p.y - 40, bw, 3);
    ctx.fillStyle = PALETTE.blue;
    ctx.fillRect(p.x - bw / 2, p.y - 40, bw * Math.max(0, p.complexity / p.maxComplexity), 3);
    if (p.aiTag) { ctx.fillStyle = PALETTE.toxic; ctx.fillRect(p.x + bw / 2 + 2, p.y - 44, 3, 3); }
  }

  function drawStaffEntity(s) {
    const burned = s.isBurnedOut(G.time);
    ctx.globalAlpha = burned ? 0.45 : 1;
    drawStaffSprite(ctx, s.typeKey, s.x, s.y, s.state === 'walking' ? G.time * 9 : 0);
    ctx.globalAlpha = 1;
    if (burned) {
      ctx.font = FONT;
      ctx.fillStyle = PALETTE.red;
      ctx.textAlign = 'center';
      ctx.fillText(`BURNOUT ${Math.ceil(s.burnoutUntil - G.time)}`, s.x, s.y - 34);
      ctx.textAlign = 'left';
    } else if (s.stress > 0) {
      const bw = 16, frac = s.stress / 100;
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(s.x - bw / 2, s.y - 30, bw, 3);
      ctx.fillStyle = frac > 0.7 ? PALETTE.red : PALETTE.amber;
      ctx.fillRect(s.x - bw / 2, s.y - 30, bw * frac, 3);
    }
    if (s.scribe) {
      drawUpgradeIcon(ctx, 'scribe', s.x + 10, s.y - 26, 0.6);
    }
  }

  function pulseGlow(x, y) {
    ctx.globalAlpha = 0.25 + 0.2 * Math.sin(G.time * 5);
    ctx.strokeStyle = PALETTE.toxic;
    ctx.lineWidth = 2;
    ctx.strokeRect(x - 10, y - 10, 20, 20);
    ctx.globalAlpha = 1;
  }

  /* ---------- HUD ---------- */
  function refreshHud() {
    el.budget.textContent = `$${G.budget}`;
    el.lives.innerHTML = `ICU ${'\u2665'.repeat(Math.max(0, G.lives))}${'\u2661'.repeat(Math.max(0, START_LIVES - G.lives))}`;
    el.shift.textContent = G.shiftIdx < 0 ? 'PREP' : `SHIFT ${G.shiftIdx + 1}/${SHIFTS.length}`;
    el.waiting.textContent = `WAITING ${waitingPatients().length}`;
  }

  /* ---------- Menu / result ---------- */
  function showMenu() {
    G.state = 'menu';
    el.result.classList.add('hidden');
    const best = getBest();
    el.menuBest.textContent = best
      ? `BEST RUN: ${'\u2605'.repeat(best.stars)} \u00b7 ${best.discharged} PATIENTS HELPED`
      : '';
    el.menu.classList.remove('hidden');
  }

  el.btnStart.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startRun(); });
  el.btnRetry.addEventListener('click', () => { ensureAudio(); startRun(); });
  el.btnMenu.addEventListener('click', showMenu);
  window.addEventListener('pointerdown', ensureAudio, { once: true });

  /* ---------- Main loop ---------- */
  let lastTs = 0;
  function frame(ts) {
    const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
    lastTs = ts;
    update(dt);
    render();
    refreshHud();
    requestAnimationFrame(frame);
  }

  buildShop();
  refreshShop();
  showMenu();
  requestAnimationFrame(frame);

  // Debug/test hook (harmless in production; used by automated playtests)
  window.CBD = G;
})();
