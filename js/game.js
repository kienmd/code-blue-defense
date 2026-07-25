/* ============================================================
 * Code Blue Defense: Agentic Triage — engine + UI
 *
 * Rigid requestAnimationFrame loop -> update(dt) + render().
 * Patients follow hardcoded checkpoint paths (levels.js).
 * Tower range = circular bounding check (Math.hypot vs range).
 * ============================================================ */

(() => {
  'use strict';

  /* ---------- DOM ---------- */
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const el = {
    budget: document.getElementById('hud-budget'),
    lives: document.getElementById('hud-lives'),
    wave: document.getElementById('hud-wave'),
    rooms: document.getElementById('hud-rooms'),
    levelSelect: document.getElementById('level-select'),
    levelCards: document.getElementById('level-cards'),
    result: document.getElementById('result'),
    resultTitle: document.getElementById('result-title'),
    resultStars: document.getElementById('result-stars'),
    resultDetail: document.getElementById('result-detail'),
    btnRetry: document.getElementById('btn-retry'),
    btnNext: document.getElementById('btn-next'),
    btnMenu: document.getElementById('btn-menu'),
    banner: document.getElementById('banner'),
    shopTowers: document.getElementById('shop-towers'),
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
    treat:     () => tone(520, 0.05, 'square', 0.02),
    discharge: () => { tone(660, 0.08); tone(880, 0.1, 'square', 0.035, 0.08); },
    crash:     () => { tone(220, 0.25, 'sawtooth', 0.06); tone(140, 0.4, 'sawtooth', 0.06, 0.2); },
    leak:      () => { tone(300, 0.2, 'triangle', 0.05); tone(200, 0.3, 'triangle', 0.05, 0.15); },
    place:     () => tone(440, 0.07),
    buy:       () => { tone(590, 0.06); tone(790, 0.08, 'square', 0.035, 0.06); },
    burnout:   () => tone(110, 0.5, 'sawtooth', 0.05),
    siren:     () => { tone(680, 0.22, 'square', 0.045); tone(510, 0.22, 'square', 0.045, 0.24); tone(680, 0.22, 'square', 0.045, 0.48); },
    beep:      () => tone(880, 0.05, 'sine', 0.03),
    denied:    () => tone(160, 0.12, 'square', 0.04),
  };

  /* ---------- Game state ---------- */
  const G = {
    state: 'menu',            // 'menu' | 'playing' | 'won' | 'lost'
    levelIdx: 0,
    level: null,
    time: 0,
    budget: 0,
    lives: 0,
    roomsUsed: 0,
    discharged: 0,
    towers: [],
    patients: [],
    beams: [],
    texts: [],
    pathPx: [],               // checkpoints in pixel coords
    pathTiles: new Set(),     // "x,y" strings
    occupied: new Set(),
    upgrades: { labRouter: false, priorAuth: false },
    // wave engine
    waveIdx: -1,
    phase: 'prep',            // 'prep' | 'wave'
    prepTimer: 0,
    waveElapsed: 0,
    schedule: [],             // [{t, type}] sorted asc
    // input
    placing: null,            // tower typeKey being placed
    dragUpgrade: null,        // upgrade key being dragged
    hoverTile: null,
    heartbeatTimer: 0,
    sfx(name) { (SFX[name] || (() => {}))(); },
    addText(x, y, text, color, life = 1.2) {
      this.texts.push({ x, y, text, color, t: 0, life });
    },
  };

  /* ---------- Stars persistence ---------- */
  function getStars() {
    try { return JSON.parse(localStorage.getItem('cbd_stars') || '[0,0,0]'); }
    catch (_) { return [0, 0, 0]; }
  }
  function setStars(idx, stars) {
    const s = getStars();
    s[idx] = Math.max(s[idx] || 0, stars);
    localStorage.setItem('cbd_stars', JSON.stringify(s));
  }

  /* ---------- Level lifecycle ---------- */
  function loadLevel(idx) {
    const lv = LEVELS[idx];
    G.levelIdx = idx;
    G.level = lv;
    G.time = 0;
    G.budget = lv.startBudget;
    G.lives = START_LIVES;
    G.roomsUsed = 0;
    G.discharged = 0;
    G.towers = [];
    G.patients = [];
    G.beams = [];
    G.texts = [];
    G.upgrades = { labRouter: false, priorAuth: false };
    G.waveIdx = -1;
    G.phase = 'prep';
    G.prepTimer = 6;
    G.schedule = [];
    G.placing = null;
    G.dragUpgrade = null;

    canvas.width = lv.gridW * TILE;
    canvas.height = lv.gridH * TILE;
    ctx.imageSmoothingEnabled = false;

    // Path checkpoints -> pixel centers + path tile set (fill tiles between checkpoints)
    G.pathPx = lv.path.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
    G.pathTiles = new Set();
    for (let i = 0; i < lv.path.length - 1; i++) {
      let [x0, y0] = lv.path[i];
      const [x1, y1] = lv.path[i + 1];
      const sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
      G.pathTiles.add(`${x0},${y0}`);
      while (x0 !== x1 || y0 !== y1) {
        x0 += sx; y0 += sy;
        G.pathTiles.add(`${x0},${y0}`);
      }
    }
    G.occupied = new Set();

    el.levelSelect.classList.add('hidden');
    el.result.classList.add('hidden');
    G.state = 'playing';
    showBanner(`LEVEL ${lv.id}: ${lv.name}<br/>FIRST PATIENTS EN ROUTE`, 'info', 2.6);
    refreshShop();
  }

  const entrancePx = () => G.pathPx[0];
  const exitPx = () => G.pathPx[G.pathPx.length - 1];

  /* ---------- Wave engine ---------- */
  function startNextWave() {
    G.waveIdx++;
    const wave = G.level.waves[G.waveIdx];
    G.phase = 'wave';
    G.waveElapsed = 0;
    // Interleave entries: each entry schedules on its own interval with a
    // small phase offset so mixed waves arrive shuffled, not batched.
    G.schedule = [];
    wave.entries.forEach((entry, ei) => {
      for (let i = 0; i < entry.count; i++) {
        G.schedule.push({ t: 0.6 + ei * 0.9 + i * entry.interval, type: entry.type });
      }
    });
    G.schedule.sort((a, b) => a.t - b.t);
    if (wave.banner) {
      showBanner(wave.banner, 'alert', 3);
      G.sfx('siren');
    } else {
      showBanner(`WAVE ${G.waveIdx + 1} / ${G.level.waves.length}`, 'info', 1.6);
    }
  }

  function spawnPatient(type) {
    const p = new Patient(type, G.pathPx);
    G.patients.push(p);
    // AGENTIC LAB-ROUTER: intercept at the entrance. The async LLM (or
    // fallback) decision resolves shortly after spawn; the mechanical
    // effect is a flat 30% complexity shred (see js/agentic.js header).
    if (G.upgrades.labRouter) {
      simulateAgenticDecision(p).then(decision => {
        if (p.outcome) return;
        const shred = p.complexity * UPGRADE_TYPES.labRouter.complexityShred;
        p.complexity -= shred;
        p.aiTag = decision;
        G.addText(p.x, p.y - 22, `AI P${decision.priority}: ${decision.category}`, PALETTE.toxic, 1.6);
        G.addText(p.x, p.y - 10, `-${Math.round(shred)} COMPLEXITY`, PALETTE.blue, 1.4);
      });
    }
  }

  /* ---------- Update ---------- */
  function update(dt) {
    if (G.state !== 'playing') return;
    G.time += dt;

    // Wave phases
    if (G.phase === 'prep') {
      G.prepTimer -= dt;
      if (G.prepTimer <= 0) startNextWave();
    } else {
      G.waveElapsed += dt;
      while (G.schedule.length && G.schedule[0].t <= G.waveElapsed) {
        spawnPatient(G.schedule.shift().type);
      }
      if (!G.schedule.length && G.patients.length === 0) {
        if (G.waveIdx >= G.level.waves.length - 1) { endLevel(true); return; }
        G.phase = 'prep';
        G.prepTimer = 5;
        showBanner(`WAVE ${G.waveIdx + 1} CLEARED`, 'info', 1.5);
      }
    }

    // Reset per-frame patient modifiers, then let towers act, then move.
    for (const p of G.patients) p.slowMult = 1;
    for (const t of G.towers) t.update(G, dt);
    for (const p of G.patients) p.update(dt);

    // Resolve outcomes
    for (const p of G.patients) {
      if (!p.outcome) continue;
      if (p.outcome === 'discharged') {
        // PRIOR-AUTH AGENT math: base payout x1.25 when installed.
        const mult = G.upgrades.priorAuth ? UPGRADE_TYPES.priorAuth.payoutMult : 1;
        const pay = Math.round(p.def.payout * mult);
        G.budget += pay;
        G.discharged++;
        G.addText(p.x, p.y - 14, `DISCHARGED +$${pay}`, PALETTE.green, 1.4);
        G.sfx('discharge');
      } else if (p.outcome === 'crashed') {
        G.lives--;
        G.addText(p.x, p.y - 14, 'CODE BLUE! PATIENT CRASHED', PALETTE.red, 2);
        G.sfx('crash');
      } else if (p.outcome === 'leaked') {
        G.lives--;
        G.addText(p.x, p.y - 14, 'ICU LEAK!', PALETTE.red, 2);
        G.sfx('leak');
      }
    }
    G.patients = G.patients.filter(p => !p.outcome);
    if (G.lives <= 0) { endLevel(false); return; }

    // Low-lives heart monitor
    if (G.lives <= 2) {
      G.heartbeatTimer -= dt;
      if (G.heartbeatTimer <= 0) { G.sfx('beep'); G.heartbeatTimer = 1.1; }
    }

    // FX decay
    for (const b of G.beams) b.t -= dt;
    G.beams = G.beams.filter(b => b.t > 0);
    for (const t of G.texts) t.t += dt;
    G.texts = G.texts.filter(t => t.t < t.life);
  }

  function endLevel(won) {
    G.state = won ? 'won' : 'lost';
    G.placing = null;
    let stars = 0;
    if (won) {
      stars = G.lives >= START_LIVES ? 3 : (G.lives >= 3 ? 2 : 1);
      setStars(G.levelIdx, stars);
    }
    el.resultTitle.textContent = won ? 'SHIFT COMPLETE' : 'HOSPITAL OVERRUN';
    el.resultTitle.style.color = won ? 'var(--green)' : 'var(--red)';
    el.resultStars.textContent = won ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '';
    el.resultDetail.innerHTML =
      `PATIENTS DISCHARGED: ${G.discharged}<br/>` +
      `LIVES REMAINING: ${Math.max(0, G.lives)} / ${START_LIVES}<br/>` +
      `FINAL BUDGET: $${G.budget}`;
    el.btnNext.classList.toggle('hidden', !(won && G.levelIdx < LEVELS.length - 1));
    el.result.classList.remove('hidden');
    if (won) { SFX.discharge(); setTimeout(SFX.buy, 180); } else { SFX.crash(); }
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

  /* ---------- Placement ---------- */
  function placementValid(typeKey, tx, ty) {
    const def = TOWER_TYPES[typeKey];
    if (G.budget < def.cost) return false;
    if (G.roomsUsed + def.rooms > G.level.maxRooms) return false;
    let adjacent = false;
    for (let dx = 0; dx < def.footprint; dx++) {
      for (let dy = 0; dy < def.footprint; dy++) {
        const x = tx + dx, y = ty + dy;
        if (x < 0 || y < 0 || x >= G.level.gridW || y >= G.level.gridH) return false;
        if (G.pathTiles.has(`${x},${y}`) || G.occupied.has(`${x},${y}`)) return false;
        for (const [ax, ay] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (G.pathTiles.has(`${ax},${ay}`)) adjacent = true;
        }
      }
    }
    return adjacent; // staff must sit beside the corridor to reach patients
  }

  function placeTower(typeKey, tx, ty) {
    const def = TOWER_TYPES[typeKey];
    const t = new Tower(typeKey, tx, ty);
    for (const [x, y] of t.tiles()) G.occupied.add(`${x},${y}`);
    G.towers.push(t);
    G.budget -= def.cost;
    G.roomsUsed += def.rooms;
    G.addText(t.cx, t.cy - 22, `${def.name.toUpperCase()} ON DUTY`, PALETTE.blue, 1.4);
    G.sfx('place');
    refreshShop();
  }

  /* ---------- Upgrade drop resolution ---------- */
  function towerAt(px, py) {
    for (const t of G.towers) {
      const f = t.def.footprint * TILE;
      if (px >= t.tx * TILE && px < t.tx * TILE + f && py >= t.ty * TILE && py < t.ty * TILE + f) return t;
    }
    return null;
  }

  function dropUpgrade(key, px, py) {
    const def = UPGRADE_TYPES[key];
    if (G.budget < def.cost) { G.sfx('denied'); return; }
    if (def.target === 'doctor') {
      const t = towerAt(px, py);
      if (!t || t.def.kind !== 'attack') { G.addText(px, py, 'ATTACH TO A DOCTOR', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      if (t.scribe) { G.addText(px, py, 'ALREADY HAS A SCRIBE', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      t.scribe = true;
      G.budget -= def.cost;
      G.addText(t.cx, t.cy - 26, 'AI SCRIBE ONLINE', PALETTE.toxic, 1.5);
    } else if (def.target === 'entrance') {
      if (G.upgrades.labRouter) { G.sfx('denied'); return; }
      const e = entrancePx();
      if (Math.hypot(px - e.x, py - e.y) > 2.2 * TILE) { G.addText(px, py, 'DROP ON THE ENTRANCE', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      G.upgrades.labRouter = true;
      G.budget -= def.cost;
      G.addText(e.x, e.y - 26, 'LAB-ROUTER ONLINE', PALETTE.toxic, 1.5);
    } else if (def.target === 'exit') {
      if (G.upgrades.priorAuth) { G.sfx('denied'); return; }
      const x = exitPx();
      if (Math.hypot(px - x.x, py - x.y) > 2.2 * TILE) { G.addText(px, py, 'DROP ON THE ICU GATE', PALETTE.amber, 1.2); G.sfx('denied'); return; }
      G.upgrades.priorAuth = true;
      G.budget -= def.cost;
      G.addText(x.x, x.y - 26, 'PRIOR-AUTH AGENT ONLINE', PALETTE.toxic, 1.5);
    }
    G.sfx('buy');
    refreshShop();
  }

  /* ---------- Input ---------- */
  function canvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (evt.clientX - rect.left) * (canvas.width / rect.width),
      y: (evt.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', evt => {
    const p = canvasPos(evt);
    G.hoverTile = { tx: Math.floor(p.x / TILE), ty: Math.floor(p.y / TILE) };
  });
  canvas.addEventListener('mouseleave', () => { G.hoverTile = null; });

  canvas.addEventListener('click', evt => {
    ensureAudio();
    if (G.state !== 'playing' || !G.placing) return;
    const p = canvasPos(evt);
    const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    if (placementValid(G.placing, tx, ty)) {
      placeTower(G.placing, tx, ty);
      if (G.budget < TOWER_TYPES[G.placing]?.cost) G.placing = null;
      refreshShop();
    } else {
      G.sfx('denied');
    }
  });

  canvas.addEventListener('contextmenu', evt => { evt.preventDefault(); G.placing = null; refreshShop(); });
  window.addEventListener('keydown', evt => {
    if (evt.key === 'Escape') { G.placing = null; G.dragUpgrade = null; el.dragGhost.classList.add('hidden'); refreshShop(); }
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
    if (evt.clientX >= rect.left && evt.clientX <= rect.right && evt.clientY >= rect.top && evt.clientY <= rect.bottom) {
      const p = canvasPos(evt);
      dropUpgrade(key, p.x, p.y);
    }
  });

  /* ---------- Shop ---------- */
  const shopButtons = { towers: {}, upgrades: {} };

  function iconCanvas(draw) {
    const c = document.createElement('canvas');
    c.width = 40; c.height = 40;
    const ictx = c.getContext('2d');
    ictx.imageSmoothingEnabled = false;
    ictx.save(); ictx.translate(20, 24); ictx.scale(1.6, 1.6); ictx.translate(-0, -0);
    draw(ictx);
    ictx.restore();
    return c;
  }

  function buildShop() {
    for (const [key, def] of Object.entries(TOWER_TYPES)) {
      const item = document.createElement('div');
      item.className = 'shop-item';
      item.appendChild(iconCanvas(ictx => drawStaffSprite(ictx, key, 0, 2)));
      item.insertAdjacentHTML('beforeend',
        `<div class="si-name">${def.name.toUpperCase()}</div><div class="si-cost">$${def.cost} \u00b7 ${def.rooms}RM</div>`);
      item.addEventListener('click', () => {
        ensureAudio();
        if (item.classList.contains('disabled')) { G.sfx('denied'); return; }
        G.placing = (G.placing === key) ? null : key;
        refreshShop();
      });
      item.addEventListener('mouseenter', () => { el.tooltip.innerHTML = `<b>${def.name}</b> \u2014 ${def.desc}`; });
      el.shopTowers.appendChild(item);
      shopButtons.towers[key] = item;
    }
    for (const [key, def] of Object.entries(UPGRADE_TYPES)) {
      const item = document.createElement('div');
      item.className = 'shop-item upgrade';
      item.appendChild(iconCanvas(ictx => drawUpgradeIcon(ictx, key, 0, -3)));
      item.insertAdjacentHTML('beforeend',
        `<div class="si-name">${def.name.toUpperCase()}</div><div class="si-cost">$${def.cost}</div>`);
      item.addEventListener('mousedown', evt => {
        ensureAudio();
        if (item.classList.contains('disabled') || item.classList.contains('soldout')) { G.sfx('denied'); return; }
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
        evt.preventDefault();
      });
      item.addEventListener('mouseenter', () => { el.tooltip.innerHTML = `<b>${def.name}</b> \u2014 ${def.desc}`; });
      el.shopUpgrades.appendChild(item);
      shopButtons.upgrades[key] = item;
    }
  }

  function refreshShop() {
    if (!G.level) return;
    for (const [key, def] of Object.entries(TOWER_TYPES)) {
      const item = shopButtons.towers[key];
      const affordable = G.budget >= def.cost && G.roomsUsed + def.rooms <= G.level.maxRooms;
      item.classList.toggle('disabled', !affordable);
      item.classList.toggle('selected', G.placing === key);
    }
    for (const [key, def] of Object.entries(UPGRADE_TYPES)) {
      const item = shopButtons.upgrades[key];
      const sold = def.unique && G.upgrades[key];
      item.classList.toggle('soldout', !!sold);
      item.classList.toggle('disabled', !sold && G.budget < def.cost);
    }
  }

  /* ---------- Render ---------- */
  function render() {
    if (!G.level) return;
    const lv = G.level;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Floor checkerboard
    for (let y = 0; y < lv.gridH; y++) {
      for (let x = 0; x < lv.gridW; x++) {
        ctx.fillStyle = (x + y) % 2 === 0 ? PALETTE.floorA : PALETTE.floorB;
        ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      }
    }
    // Corridor
    for (const key of G.pathTiles) {
      const [x, y] = key.split(',').map(Number);
      ctx.fillStyle = PALETTE.path;
      ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.fillStyle = PALETTE.pathEdge;
      ctx.fillRect(x * TILE, y * TILE, TILE, 2);
      ctx.fillRect(x * TILE, y * TILE + TILE - 2, TILE, 2);
    }
    // Entrance + ICU gate
    const ent = entrancePx(), ext = exitPx();
    ctx.fillStyle = PALETTE.entrance;
    ctx.fillRect(ent.x - TILE / 2, ent.y - TILE / 2, 6, TILE);
    ctx.fillStyle = PALETTE.ink;
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText('IN', ent.x - TILE / 2 + 9, ent.y + 3);
    ctx.fillStyle = PALETTE.exit;
    ctx.fillRect(ext.x + TILE / 2 - 6, ext.y - TILE / 2, 6, TILE);
    ctx.fillStyle = PALETTE.red;
    ctx.fillText('ICU', ext.x - TILE / 2 + 2, ext.y - TILE / 2 - 4);

    // Installed gate agents
    if (G.upgrades.labRouter) {
      drawUpgradeIcon(ctx, 'labRouter', ent.x + 2, ent.y - TILE + 4, 1);
      pulseGlow(ent.x + 2, ent.y - TILE + 4);
    }
    if (G.upgrades.priorAuth) {
      drawUpgradeIcon(ctx, 'priorAuth', ext.x - 2, ext.y - TILE + 2, 1);
      pulseGlow(ext.x - 2, ext.y - TILE + 2);
    }

    // Towers (bed pad + staff sprite + stress bar + scribe chip)
    for (const t of G.towers) {
      const f = t.def.footprint;
      ctx.fillStyle = '#c2d4d8';
      ctx.fillRect(t.tx * TILE + 2, t.ty * TILE + 2, f * TILE - 4, f * TILE - 4);
      ctx.strokeStyle = PALETTE.pathEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(t.tx * TILE + 2, t.ty * TILE + 2, f * TILE - 4, f * TILE - 4);

      const burned = t.isBurnedOut(G.time);
      ctx.globalAlpha = burned ? 0.45 : 1;
      drawStaffSprite(ctx, t.typeKey, t.cx, t.cy + 4, f === 2 ? 1.5 : 1);
      ctx.globalAlpha = 1;

      if (burned) {
        ctx.fillStyle = PALETTE.red;
        ctx.font = '7px "Press Start 2P", monospace';
        const left = Math.ceil(t.burnoutUntil - G.time);
        ctx.fillText(`BURNOUT ${left}`, t.tx * TILE - 4, t.ty * TILE - 4);
      } else if (t.def.stressPerAction > 0) {
        // stress bar (amber -> red as it fills)
        const w = f * TILE - 8, frac = t.stress / 100;
        ctx.fillStyle = PALETTE.ink;
        ctx.fillRect(t.tx * TILE + 4, t.ty * TILE - 6, w, 4);
        ctx.fillStyle = frac > 0.7 ? PALETTE.red : PALETTE.amber;
        ctx.fillRect(t.tx * TILE + 4, t.ty * TILE - 6, w * frac, 4);
      }
      if (t.scribe) {
        drawUpgradeIcon(ctx, 'scribe', t.tx * TILE + f * TILE - 6, t.ty * TILE + 2, 0.7);
        pulseGlow(t.tx * TILE + f * TILE - 6, t.ty * TILE + 2);
      }
    }

    // Treatment beams
    for (const b of G.beams) {
      ctx.globalAlpha = Math.max(0, b.t / 0.15);
      ctx.strokeStyle = b.color;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Patients + status bars
    for (const p of G.patients) {
      drawPatientSprite(ctx, p.typeKey, p.x, p.y, G.time * 6 + p.bob);
      const bw = 16;
      // health (crash bar)
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(p.x - bw / 2, p.y - 17, bw, 3);
      const hf = Math.max(0, p.health / 100);
      ctx.fillStyle = hf > 0.5 ? PALETTE.green : (hf > 0.25 ? PALETTE.amber : PALETTE.red);
      ctx.fillRect(p.x - bw / 2, p.y - 17, bw * hf, 3);
      // complexity (diagnostic shield)
      ctx.fillStyle = PALETTE.ink;
      ctx.fillRect(p.x - bw / 2, p.y - 13, bw, 3);
      ctx.fillStyle = PALETTE.blue;
      ctx.fillRect(p.x - bw / 2, p.y - 13, bw * Math.max(0, p.complexity / p.maxComplexity), 3);
      if (p.assessed) { ctx.fillStyle = PALETTE.blue; ctx.fillRect(p.x - bw / 2 - 4, p.y - 16, 3, 3); }
      if (p.aiTag) { ctx.fillStyle = PALETTE.toxic; ctx.fillRect(p.x + bw / 2 + 1, p.y - 16, 3, 3); }
    }

    // Placement ghost
    if (G.placing && G.hoverTile && G.state === 'playing') {
      const def = TOWER_TYPES[G.placing];
      const { tx, ty } = G.hoverTile;
      const ok = placementValid(G.placing, tx, ty);
      const f = def.footprint;
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = ok ? PALETTE.green : PALETTE.red;
      ctx.fillRect(tx * TILE, ty * TILE, f * TILE, f * TILE);
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = ok ? PALETTE.green : PALETTE.red;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((tx + f / 2) * TILE, (ty + f / 2) * TILE, def.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Floating combat text
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    for (const t of G.texts) {
      const frac = t.t / t.life;
      ctx.globalAlpha = 1 - frac;
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, Math.round(t.x), Math.round(t.y - frac * 18));
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';

    // Prep countdown
    if (G.state === 'playing' && G.phase === 'prep' && G.waveIdx < G.level.waves.length - 1) {
      ctx.fillStyle = PALETTE.ink;
      ctx.font = '8px "Press Start 2P", monospace';
      const next = G.waveIdx + 2 > G.level.waves.length ? G.level.waves.length : G.waveIdx + 2;
      ctx.fillText(`NEXT WAVE IN ${Math.ceil(G.prepTimer)}...`, 8, canvas.height - 8);
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
    if (!G.level) return;
    el.budget.textContent = `$${G.budget}`;
    el.lives.innerHTML = `&hearts; ${Math.max(0, G.lives)}`;
    el.wave.textContent = `WAVE ${Math.max(1, G.waveIdx + 1)}/${G.level.waves.length}`;
    el.rooms.textContent = `ROOMS ${G.roomsUsed}/${G.level.maxRooms}`;
  }

  /* ---------- Level select / result screens ---------- */
  function buildLevelSelect() {
    el.levelCards.innerHTML = '';
    const stars = getStars();
    LEVELS.forEach((lv, i) => {
      const locked = i > 0 && stars[i - 1] === 0;
      const card = document.createElement('div');
      card.className = 'level-card' + (locked ? ' locked' : '');
      card.innerHTML =
        `<div class="lv-num">LEVEL ${lv.id}</div>` +
        `<div class="lv-name">${lv.name}</div>` +
        `<div class="lv-desc">${lv.desc}</div>` +
        `<div class="lv-stars">${locked ? 'LOCKED' : ('\u2605'.repeat(stars[i]) + '\u2606'.repeat(3 - stars[i]))}</div>`;
      if (!locked) card.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); loadLevel(i); });
      el.levelCards.appendChild(card);
    });
  }

  function showMenu() {
    G.state = 'menu';
    G.level = null;
    buildLevelSelect();
    el.result.classList.add('hidden');
    el.levelSelect.classList.remove('hidden');
  }

  el.btnRetry.addEventListener('click', () => loadLevel(G.levelIdx));
  el.btnNext.addEventListener('click', () => loadLevel(G.levelIdx + 1));
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
  showMenu();
  // Default canvas backdrop behind the menu overlay
  canvas.width = 640; canvas.height = 384;
  requestAnimationFrame(frame);
})();
