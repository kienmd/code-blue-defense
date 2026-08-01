/* ============================================================
 * UI — DOM references, canvas setup, banner, HUD, era level
 * select, stage intro, the pixel-paper wave report, and the
 * era-scoped shop strip. All DOM reads/writes live here.
 * ============================================================ */

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
  stageStrip: document.getElementById('stage-strip'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultStars: document.getElementById('result-stars'),
  resultDetail: document.getElementById('result-detail'),
  btnRetry: document.getElementById('btn-retry'),
  btnNextStage: document.getElementById('btn-next-stage'),
  btnMenu: document.getElementById('btn-menu'),
  banner: document.getElementById('banner'),
  report: document.getElementById('report'),
  reportPaper: document.getElementById('report-paper'),
  reportTitle: document.getElementById('report-title'),
  reportDetail: document.getElementById('report-detail'),
  reportLedger: document.getElementById('report-ledger'),
  reportFlavor: document.getElementById('report-flavor'),
  reportStamp: document.getElementById('report-stamp'),
  reportHand: document.getElementById('report-hand'),
  btnNextShift: document.getElementById('btn-next-shift'),
  btnKeepBuilding: document.getElementById('btn-keep-building'),
  stageIntro: document.getElementById('stage-intro'),
  introEraTitle: document.getElementById('intro-era-title'),
  introEraSub: document.getElementById('intro-era-sub'),
  introEraTech: document.getElementById('intro-era-tech'),
  introEraImpact: document.getElementById('intro-era-impact'),
  introEraBrief: document.getElementById('intro-era-brief'),
  btnStageStart: document.getElementById('btn-stage-start'),
  btnStageBack: document.getElementById('btn-stage-back'),
  btnShift: document.getElementById('btn-shift'),
  shopRooms: document.getElementById('shop-rooms'),
  shopStaff: document.getElementById('shop-staff'),
  shopTechHead: document.getElementById('shop-tech-head'),
  shopTechList: document.getElementById('shop-tech-list'),
  tooltip: document.getElementById('tooltip'),
  dragGhost: document.getElementById('drag-ghost'),
  intro: document.getElementById('intro'),
  ekg: document.getElementById('ekg'),
  btnMute: document.getElementById('btn-mute'),
  btnTutorial: document.getElementById('btn-tutorial'),
  inspector: document.getElementById('inspector'),
  inspIcon: document.getElementById('insp-icon'),
  inspName: document.getElementById('insp-name'),
  inspFlavor: document.getElementById('insp-flavor'),
  inspStats: document.getElementById('insp-stats'),
  inspStatus: document.getElementById('insp-status'),
};

/* ---------- Banner (modal-aware: queue, never bleed through) ---------- */
let bannerTimeout = null;
const bannerQueue = [];

function modalUp() {
  return !el.report.classList.contains('hidden') ||
    !el.stageIntro.classList.contains('hidden') ||
    !el.result.classList.contains('hidden') ||
    !el.menu.classList.contains('hidden');
}

function showBanner(html, kind, seconds) {
  // A banner must never render through a modal overlay (the COUNTY
  // BAILOUT-over-SHIFT-REPORT bug): queue it and flush on dismiss.
  if (modalUp()) { bannerQueue.push([html, kind, seconds]); return; }
  el.banner.innerHTML = html;
  el.banner.classList.remove('hidden', 'info');
  if (kind === 'info') el.banner.classList.add('info');
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => el.banner.classList.add('hidden'), seconds * 1000);
}

function flushBanners() {
  if (modalUp() || !bannerQueue.length || G.state !== 'playing') { bannerQueue.length = 0; return; }
  const [html, kind, seconds] = bannerQueue.shift();
  bannerQueue.length = 0;               // only the freshest queued banner survives
  showBanner(html, kind, seconds);
}

/* ---------- HUD (runs at 60Hz: only write the DOM on change) ---------- */
const hudCache = {};
function hudSet(elem, key, value, asHtml) {
  if (hudCache[key] === value) return;
  hudCache[key] = value;
  if (asHtml) elem.innerHTML = value; else elem.textContent = value;
}

function refreshHud() {
  hudSet(el.budget, 'budget', fmtMoney(G.budget));
  const maxLives = G.stage ? G.stage.lives : START_LIVES;
  hudSet(el.lives, 'lives',
    `ICU ${'\u2665'.repeat(Math.max(0, G.lives))}${'\u2661'.repeat(Math.max(0, maxLives - G.lives))}`, true);
  const waveCount = G.stage ? G.stage.waves.length : 0;
  hudSet(el.shift, 'shift', G.phase === 'cooloff'
    ? `COOL-OFF \u00b7 NEXT: WAVE ${G.shiftIdx + 2}/${waveCount}`
    : `WAVE ${G.shiftIdx + 1}/${waveCount}`);
  let waiting = 0;
  for (const p of G.patients) if (p.state === 'waiting') waiting++;
  hudSet(el.waiting, 'waiting', `WAITING ${waiting}`);
}

/* ---------- Era level select (Angry Birds-style stage cards) ----------
 * Every stage card gets its OWN pixel-art vignette that reads as the
 * decade at a glance — drawn procedurally (no image files), keyed by
 * stage.id in STAGE_ART below. 84x56 canvas, game's 8-bit style. */
const STAGE_ART = {
  '1950s': (p, era) => {
    // small brick hospital, big cross, rounded post-war ambulance
    p.rect(8, 18, 46, 30, era.shell);                     // brick block
    p.rect(8, 18, 46, 3, '#3a2018');
    for (let y = 26; y < 46; y += 8) for (let x = 12; x < 50; x += 9) p.rect(x, y, 5, 5, '#2b2519');
    p.rect(24, 8, 14, 12, PALETTE.red);                   // cross sign
    p.rect(29, 10, 4, 8, PALETTE.white); p.rect(26, 12, 10, 4, PALETTE.white);
    p.rect(20, 4, 3, 8, '#4a2c20');                       // chimney
    p.rect(58, 38, 22, 8, '#d8d8d0');                     // old ambulance
    p.rect(62, 33, 12, 5, '#d8d8d0');
    p.rect(66, 40, 4, 4, PALETTE.red);
    p.rect(60, 46, 4, 4, '#1a1a1a'); p.rect(72, 46, 4, 4, '#1a1a1a');
    p.rect(0, 50, 84, 6, '#161c2e');                      // street
  },
  '1960s': (p, era) => {
    // hospital + coronary-unit annex, ECG heartbeat trace across the sky
    p.rect(10, 22, 30, 28, era.shell);
    for (let y = 28, i = 0; y < 46; y += 8, i++) for (let x = 14; x < 36; x += 8) p.rect(x, y, 4, 4, '#243024');
    p.rect(44, 30, 28, 20, '#6a4a34');                    // CCU annex
    p.rect(50, 34, 16, 6, PALETTE.white);
    p.rect(52, 35, 4, 4, PALETTE.red); p.rect(58, 35, 4, 4, PALETTE.red); // heart pair
    p.rect(20, 12, 12, 10, PALETTE.red);
    p.rect(24, 14, 4, 6, PALETTE.white); p.rect(22, 16, 8, 3, PALETTE.white);
    // ECG trace
    const ekg = [[2,8],[10,8],[14,4],[18,12],[22,8],[40,8],[44,3],[48,13],[52,8],[80,8]];
    for (let i = 0; i < ekg.length - 1; i++) {
      const [x1, y1] = ekg[i], [x2] = ekg[i + 1];
      p.rect(x1, y1, Math.max(2, x2 - x1), 2, PALETTE.green);
    }
    p.rect(0, 50, 84, 6, '#161c2e');
  },
  '1970s-80s': (p) => {
    // boxy paramedic ambulance with a red/blue lightbar, rolling out
    p.rect(0, 44, 84, 12, '#242e48');                     // road
    p.rect(4, 48, 12, 2, PALETTE.white); p.rect(28, 48, 12, 2, PALETTE.white); p.rect(52, 48, 12, 2, PALETTE.white);
    p.rect(14, 20, 44, 22, PALETTE.white);                // box body
    p.rect(14, 30, 44, 4, PALETTE.red);                   // belt stripe
    p.rect(54, 24, 16, 18, '#e8e8e0');                    // cab
    p.rect(58, 26, 8, 6, '#8ad8f0');                      // windshield
    p.rect(20, 16, 10, 4, PALETTE.red); p.rect(32, 16, 10, 4, '#4aa3df'); // lightbar
    p.rect(24, 24, 8, 8, PALETTE.red);                    // cross on box
    p.rect(27, 25, 2, 6, PALETTE.white); p.rect(25, 27, 6, 2, PALETTE.white);
    p.rect(20, 40, 8, 8, '#1a1a1a'); p.rect(58, 40, 8, 8, '#1a1a1a'); // wheels
    p.rect(22, 42, 4, 4, '#66788e'); p.rect(60, 42, 4, 4, '#66788e');
  },
  '1990s': (p) => {
    // virology bench: flasks of green culture, biohazard trefoil
    p.rect(0, 44, 84, 12, '#20293e');                     // bench
    p.rect(8, 26, 12, 18, '#c8d8dc');                     // flask A
    p.rect(11, 20, 6, 8, '#c8d8dc');
    p.rect(9, 34, 10, 9, '#58d858');                      // culture
    p.rect(26, 30, 10, 14, '#c8d8dc');                    // flask B
    p.rect(27, 36, 8, 7, '#9bd400');
    p.rect(42, 22, 3, 22, '#c8d8dc');                     // test tube
    p.rect(42, 32, 3, 12, '#ff5a5a');
    // biohazard trefoil (simplified)
    p.rect(58, 22, 16, 16, '#151a10');
    p.rect(62, 24, 8, 3, PALETTE.amber); p.rect(60, 30, 4, 6, PALETTE.amber);
    p.rect(68, 30, 4, 6, PALETTE.amber); p.rect(64, 29, 4, 4, '#151a10');
    p.rect(12, 8, 60, 2, '#2a3a5c');                      // shelf line
  },
  '2000s': (p) => {
    // the EHR desk: chunky monitor, chart on screen, keyboard, tower
    p.rect(0, 46, 84, 10, '#20293e');                     // desk
    p.rect(16, 10, 40, 30, '#8a94a4');                    // monitor shell
    p.rect(20, 14, 32, 22, '#0c2818');                    // screen
    p.rect(22, 16, 20, 2, '#9bd400');                     // chart lines
    p.rect(22, 20, 26, 2, '#9bd400');
    p.rect(22, 24, 14, 2, '#9bd400');
    p.rect(22, 30, 10, 4, '#4aa3df');                     // OK button
    p.rect(30, 40, 12, 6, '#8a94a4');                     // stand
    p.rect(14, 48, 34, 4, '#66788e');                     // keyboard
    p.rect(62, 26, 14, 24, '#4a5462');                    // PC tower
    p.rect(65, 30, 8, 2, '#9bd400'); p.rect(65, 34, 8, 2, '#2a3a5c');
  },
  '2010s': (p) => {
    // telehealth: a big smartphone, doctor on screen, signal waves
    p.rect(28, 8, 28, 44, '#28303c');                     // phone
    p.rect(31, 12, 22, 32, '#0a1428');                    // screen
    p.rect(38, 18, 8, 6, '#e8b088');                      // doctor's face
    p.rect(37, 24, 10, 8, '#3a7ac8');                     // scrubs
    p.rect(36, 15, 12, 2, '#5a4632');                     // hair
    p.rect(34, 36, 16, 4, '#58d858');                     // CONNECT bar
    p.rect(39, 46, 6, 3, '#66788e');                      // home button
    // signal arcs
    p.rect(62, 22, 3, 3, '#4aa3df'); p.rect(66, 18, 3, 3, '#4aa3df'); p.rect(70, 14, 3, 3, '#4aa3df');
    p.rect(18, 22, 3, 3, '#4aa3df'); p.rect(14, 18, 3, 3, '#4aa3df'); p.rect(10, 14, 3, 3, '#4aa3df');
    p.rect(40, 4, 4, 2, PALETTE.red); p.rect(41, 3, 2, 4, PALETTE.red);  // cross notch
  },
  '2020s': (p) => {
    // the AI decade: robot scribe beside a patient bed, neural glow
    p.rect(0, 46, 84, 10, '#1e3038');
    p.rect(8, 34, 30, 10, PALETTE.white);                 // bed
    p.rect(8, 30, 8, 6, '#f2c8a8');                       // patient head
    p.rect(10, 44, 4, 6, '#31405e'); p.rect(32, 44, 4, 6, '#31405e');
    p.rect(52, 20, 16, 20, '#8a94a4');                    // robot body
    p.rect(54, 12, 12, 8, '#c8d0dc');                     // robot head
    p.rect(56, 14, 3, 3, '#9bd400'); p.rect(62, 14, 3, 3, '#9bd400'); // eyes
    p.rect(58, 8, 2, 4, '#66788e'); p.rect(57, 6, 4, 2, PALETTE.red); // antenna
    p.rect(48, 24, 4, 10, '#8a94a4');                     // arm to bedside
    p.rect(55, 24, 10, 8, '#0c2818');                     // chest screen
    p.rect(57, 26, 6, 1, '#9bd400'); p.rect(57, 29, 4, 1, '#9bd400');
    p.rect(20, 8, 3, 3, '#9bd400'); p.rect(28, 4, 3, 3, '#9bd400'); p.rect(36, 10, 3, 3, '#9bd400'); // neural sparks
  },
  '2040s': (p, era) => {
    // agentic era: glass tower, helipad, delivery drones
    p.rect(26, 8, 32, 44, era.shell);                     // tower
    for (let y = 14; y < 48; y += 7) p.rect(28, y, 28, 3, 'rgba(122,180,255,0.5)');
    p.rect(24, 4, 20, 4, '#39445c');                      // helipad arm
    p.rect(30, 2, 8, 2, PALETTE.white);
    p.rect(38, 20, 8, 8, PALETTE.red);                    // cross
    p.rect(41, 22, 2, 4, PALETTE.white); p.rect(39, 23, 6, 2, PALETTE.white);
    // drones
    p.rect(8, 14, 8, 3, '#5a6a7a'); p.rect(6, 12, 4, 2, '#8a94a4'); p.rect(14, 12, 4, 2, '#8a94a4');
    p.rect(64, 26, 8, 3, '#5a6a7a'); p.rect(62, 24, 4, 2, '#8a94a4'); p.rect(70, 24, 4, 2, '#8a94a4');
    p.rect(11, 17, 2, 2, PALETTE.red); p.rect(67, 29, 2, 2, PALETTE.red); // payloads
    p.rect(0, 52, 84, 4, '#161c2e');
  },
  'Y3K': (p) => {
    // floating neon hospital, tractor beam, starfield
    for (let i = 0; i < 12; i++) p.rect((i * 29 + 7) % 84, (i * 13 + 3) % 30, 2, 2, '#3a4a6a');
    p.rect(22, 14, 40, 16, '#2a1650');                    // floating hull
    p.rect(18, 18, 48, 6, '#3c2a6e');
    p.rect(38, 6, 8, 8, '#c858e8');                       // holo cross halo
    p.rect(41, 8, 2, 4, PALETTE.white); p.rect(39, 9, 6, 2, PALETTE.white);
    p.rect(26, 20, 4, 3, '#66e0ff'); p.rect(34, 20, 4, 3, '#66e0ff');
    p.rect(46, 20, 4, 3, '#66e0ff'); p.rect(54, 20, 4, 3, '#66e0ff');   // portholes
    // tractor beam down to a tiny gurney
    p.rect(38, 30, 8, 14, 'rgba(102,224,255,0.35)');
    p.rect(34, 44, 16, 4, 'rgba(102,224,255,0.2)');
    p.rect(38, 46, 8, 3, '#8a9ae0');                      // hover gurney
    p.rect(0, 52, 84, 4, '#0d1626');                      // dark future ground
  },
};

function stageThumb(stage) {
  const era = ERAS[stage.eraIdx];
  const c = document.createElement('canvas');
  c.width = 84; c.height = 56;
  const tctx = c.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  tctx.fillStyle = (era.backdrop && era.backdrop.sky) || '#0a1a2f';
  tctx.fillRect(0, 0, 84, 56);
  const p = { rect(x, y, w, h, col) { tctx.fillStyle = col; tctx.fillRect(x, y, w, h); } };
  (STAGE_ART[stage.id] || STAGE_ART['1950s'])(p, era);
  return c;
}

function showMenu() {
  G.state = 'menu';
  G.stage = null;
  el.result.classList.add('hidden');
  el.report.classList.add('hidden');
  el.stageIntro.classList.add('hidden');
  el.stageStrip.innerHTML = '';
  STAGES.forEach((stage, i) => {
    const unlocked = stageUnlocked(i);
    const stars = stageStars(stage.id);
    const card = document.createElement('div');
    card.className = 'stage-card' + (unlocked ? '' : ' locked');
    card.appendChild(stageThumb(stage));
    card.insertAdjacentHTML('beforeend',
      `<div class="sc-era">${stage.id}</div>` +
      `<div class="sc-name">${stage.name}</div>` +
      `<div class="sc-stars">${unlocked
        ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars)
        : '\u{1F512}'}</div>`);
    if (unlocked) {
      card.addEventListener('click', () => { ensureAudio(); G.sfx('assign'); showStageIntro(stage); });
    }
    el.stageStrip.appendChild(card);
  });
  el.menu.classList.remove('hidden');
}

/* ---------- Stage intro (the era LEARNING CARD, pre-play) ---------- */
function showStageIntro(stage) {
  const era = ERAS[stage.eraIdx];
  G.pendingStage = stage;
  el.introEraTitle.textContent = `${stage.year} \u2014 ${stage.name}`;
  el.introEraSub.textContent = era.sub;
  el.introEraTech.innerHTML = era.tech.map(t => `<div class="era-tech-line">${t}</div>`).join('');
  el.introEraImpact.textContent = era.impact;
  const techNames = stage.tech.map(k => UPGRADE_TYPES[k].name.toUpperCase()).join(', ');
  el.introEraBrief.innerHTML =
    `<div>STANDARD OF CARE: DIAG x${era.mods.diag} \u00b7 TREAT x${era.mods.treat} \u00b7 LOBBY DECAY x${era.mods.wait}</div>` +
    `<div>BUDGET ${fmtMoney(stage.budget)} \u00b7 ${stage.waves.length} WAVES \u00b7 ICU CAPACITY ${stage.lives}</div>` +
    `<div>TECHNOLOGY OF THE AGE: ${techNames}</div>` +
    (era.autoDiag ? `<div class="lg-in">BASELINE: PATIENTS AUTO-DIAGNOSE ON ARRIVAL</div>` : '') +
    (era.autoAssign ? `<div class="lg-in">BASELINE: AUTO-ASSIGN TO MATCHING BEDS</div>` : '');
  el.menu.classList.add('hidden');
  el.stageIntro.classList.remove('hidden');
}

/* ---------- Wave report: the pixel-paper handed up by the supervisor ---------- */
function fmtSecs(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

/* 8-bit hand gripping the paper's bottom corner (drawn once). */
let handDrawn = false;
function drawReportHand() {
  if (handDrawn) return;
  handDrawn = true;
  const c = el.reportHand;
  const hctx = c.getContext('2d');
  hctx.imageSmoothingEnabled = false;
  const px = (x, y, w, h, col) => { hctx.fillStyle = col; hctx.fillRect(x * 4, y * 4, w * 4, h * 4); };
  const SKIN = '#e8b088', SHADE = '#c08858', CUFF = '#3a6ea5';
  // fist coming up from below, thumb pressed over the paper edge
  px(3, 8, 10, 8, SKIN);          // fist
  px(3, 14, 10, 2, SHADE);
  px(2, 16, 12, 4, CUFF);         // scrub cuff
  px(5, 2, 4, 7, SKIN);           // thumb over the page
  px(5, 2, 4, 1, SHADE);
  px(9, 3, 1, 5, SHADE);
  // knuckle lines
  px(6, 10, 1, 1, SHADE); px(9, 10, 1, 1, SHADE); px(12, 10, 1, 1, SHADE);
}

function showShiftReport() {
  const st = G.shiftStats;
  const waveN = G.shiftIdx + 1;
  el.reportTitle.textContent = `WAVE ${waveN} REPORT \u2014 ${G.stage.id}`;
  el.reportDetail.innerHTML =
    `<div>PATIENTS HELPED <b>${st.helped}</b> \u00b7 ICU TRANSFERS <b>${st.transfers}</b></div>` +
    `<div>STAFF BURNOUTS <b>${st.burnouts}</b>` +
    (st.diagCount ? ` \u00b7 AVG TIME-TO-DIAGNOSIS <b>${fmtSecs(st.diagTime / st.diagCount)}</b>` : '') + '</div>' +
    `<div>STAGE TOTALS \u2014 HELPED ${G.discharged} \u00b7 TRANSFERS ${G.transfers}</div>`;

  // Income/expense ledger (docs/ECONOMY.md): faucets above the line,
  // drains below, NET in big type — the economy teaches itself.
  const income = st.earned + st.copays;
  const expense = st.salaries + st.upkeep + st.spent + st.apPrior;
  const net = income - expense;
  const row = (label, amt, cls, sign) =>
    amt ? `<div class="${cls}">${sign}${fmtMoney(amt)} \u2014 ${label}</div>` : '';
  el.reportLedger.innerHTML =
    row('REIMBURSEMENTS', st.earned, 'lg-in', '+') +
    row('COPAYS', st.copays, 'lg-in', '+') +
    row('SALARIES', st.salaries, 'lg-out', '-') +
    row('ROOM UPKEEP', st.upkeep, 'lg-out', '-') +
    row('BUILDS / HIRES / TECH', st.spent, 'lg-out', '-') +
    row('ACCOUNTS PAYABLE (PRIOR)', st.apPrior, 'lg-out', '-') +
    `<div class="lg-net" style="color:${net >= 0 ? '#1d7a34' : '#a02020'}">NET ${net >= 0 ? '+' : ''}${fmtMoney(net)}</div>` +
    (st.apCarried ? `<div class="lg-out">CARRIED FORWARD: ${fmtMoney(st.apCarried)} A/P</div>` : '');

  let flavor;
  if (st.helped === 0) flavor = 'ROUGH ONE. NOBODY WALKED OUT SMILING.';
  else if (st.fastestCure !== null && st.fastestCure < 20) flavor = `FASTEST CURE: ${fmtSecs(st.fastestCure)} \u2014 NICE HUSTLE.`;
  else if (st.longestWait > 30) flavor = `LONGEST WAIT: ${fmtSecs(st.longestWait)} \u2014 SOMEONE CAMPED IN THE LOBBY.`;
  else if (st.burnouts > 0) flavor = 'THE BREAK ROOM IS CALLING. YOUR STAFF NEED IT.';
  else flavor = `FASTEST CURE: ${st.fastestCure === null ? '\u2014' : fmtSecs(st.fastestCure)} \u00b7 LONGEST WAIT: ${fmtSecs(st.longestWait)}`;
  el.reportFlavor.textContent = flavor;

  // Supervisor's stamp: green PASSED if nobody was lost this wave.
  const passed = st.transfers === 0;
  el.reportStamp.textContent = passed ? 'PASSED' : 'NOTED';
  el.reportStamp.classList.toggle('fail', !passed);

  el.btnNextShift.textContent = `START WAVE ${waveN + 1}`;
  drawReportHand();
  el.report.classList.remove('hidden');
  // retrigger the slide-in animation
  el.reportPaper.classList.remove('slide-in');
  void el.reportPaper.offsetWidth;
  el.reportPaper.classList.add('slide-in');
  G.sfx('paper');
}

function refreshShiftButton() {
  const show = G.state === 'playing' && G.phase === 'cooloff' &&
    el.report.classList.contains('hidden') && el.stageIntro.classList.contains('hidden');
  el.btnShift.classList.toggle('hidden', !show);
  if (show) el.btnShift.textContent = `START WAVE ${G.shiftIdx + 2}`;
}

function showResult(won, stars) {
  const idx = STAGES.indexOf(G.stage);
  const next = idx >= 0 && idx + 1 < STAGES.length ? STAGES[idx + 1] : null;
  el.resultTitle.textContent = won ? `${G.stage.id} CLEARED` : 'ICU AT CAPACITY';
  el.resultTitle.style.color = won ? 'var(--green)' : 'var(--red)';
  el.resultStars.textContent = won ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '';
  el.resultDetail.innerHTML =
    `PATIENTS HELPED: ${G.discharged}<br/>` +
    `ICU TRANSFERS: ${G.transfers}<br/>` +
    `FINAL BUDGET: ${fmtMoney(G.budget)}`;
  el.btnNextStage.classList.toggle('hidden', !(won && next));
  if (won && next) el.btnNextStage.textContent = `NEXT: ${next.id}`;
  el.result.classList.remove('hidden');
}

/* ---------- Inspector (hover codex) ----------
 * Hovering ANY shop card — room, staff, technology — opens a
 * close-up on the left after a short delay: big pixel icon, flavor,
 * exact mechanical stats, cost, and owned status. Hover-only:
 * vanishes on mouse-out, suppressed while dragging an upgrade. */
let inspectorTimer = null;

function hideInspector() {
  clearTimeout(inspectorTimer);
  inspectorTimer = null;
  el.inspector.classList.add('hidden');
}

function scheduleInspector(kind, key) {
  clearTimeout(inspectorTimer);
  inspectorTimer = setTimeout(() => {
    if (G.dragUpgrade) return;                  // never fight drag-and-drop
    showInspector(kind, key);
  }, 250);
}

function showInspector(kind, key) {
  const ictx = el.inspIcon.getContext('2d');
  ictx.imageSmoothingEnabled = false;
  ictx.clearRect(0, 0, 96, 96);
  ictx.save();
  ictx.translate(48, kind === 'staff' ? 78 : 52);
  ictx.scale(3.4, 3.4);
  if (kind === 'room') drawRoomIcon(ictx, key, 0, 0);
  else if (kind === 'staff') drawStaffSprite(ictx, key, 0, 0, false, currentEra().scrub);
  else drawUpgradeIcon(ictx, key, 0, 0);
  ictx.restore();

  const stat = (label, val) => `<div>${label}: <b>${val}</b></div>`;
  let def, stats = '', status = '', statusCls = 'ok';

  if (kind === 'room') {
    def = ROOM_TYPES[key];
    const owned = G.rooms.filter(r => r.typeKey === key).length;
    stats =
      stat('BUILD COST', fmtMoney(roomBuildCost(key)) + (def.support ? '' : ' (x1.5/COPY)')) +
      stat('UPKEEP', `${fmtMoney(Math.round(def.cost * UPKEEP_RATE * currentEra().inflation))}/WAVE`) +
      (def.support
        ? stat('EFFECT', `+${BREAKROOM_REGEN} STRESS RECOVERY/SEC (MAX ${BREAKROOM_CAP})`)
        : stat('BEDS', def.beds) + stat('STAFF SLOTS', def.staffSlots)) +
      (Object.entries(PATHOGENS).some(([, p]) => p.room === key)
        ? stat('TREATS', Object.values(PATHOGENS).filter(p => p.room === key).map(p => p.name.toUpperCase()).join(', '))
        : '');
    status = owned ? `OWNED: ${owned}` : 'NOT BUILT YET';
  } else if (kind === 'staff') {
    def = STAFF_TYPES[key];
    const owned = G.staffList.filter(s => s.typeKey === key).length;
    stats =
      stat('HIRE (SIGNING)', fmtMoney(inflatedCost(def.cost))) +
      stat('SALARY', `${fmtMoney(Math.round(def.salary * currentEra().inflation))}/WAVE`) +
      stat('TREAT RATE', `${def.treatRate}/SEC`) +
      stat('DIAGNOSIS', def.canDiagnose ? `${diagCapability(def)} — ${def.diagSeconds}S` : 'NO (CANNOT DIAGNOSE)') +
      stat('STRESS', `${def.stressPerSec}/SEC WORKING`) +
      (def.specialty ? stat('SPECIALTY', `${def.specialty.toUpperCase()} x${def.specialtyMult} (ELSEWHERE x${def.offSpecialtyMult})`) : '') +
      (def.lobbyCalm ? stat('LOBBY DUTY', `WAITING DECAY x${def.lobbyCalm} EACH (MAX ${ORDERLY_LOBBY_CAP})`) : '');
    status = owned ? `ON PAYROLL: ${owned}` : 'NONE HIRED';
  } else {
    def = UPGRADE_TYPES[key];
    stats =
      stat('COST', fmtMoney(inflatedCost(def.cost))) +
      (def.passive ? stat('KIND', 'FACILITY INSTALL (ONE-TIME)') : stat('TARGET', def.target.toUpperCase())) +
      (def.diagMult ? stat('DIAGNOSIS TIME', `x${def.diagMult}`) : '') +
      (def.treatMult ? stat('ALL TREATMENT', `x${def.treatMult}`) : '') +
      (def.decayMult ? stat('WAITING DECAY', `x${def.decayMult}`) : '') +
      (def.rateMult ? stat('TREAT SPEED', `x${def.rateMult}`) : '') +
      (def.stressMult ? stat('BURNOUT GAIN', `x${def.stressMult}`) : '') +
      (def.payoutMult ? stat('PAYOUTS', `x${def.payoutMult}`) : '') +
      (key === 'labRouter' ? stat('EFFECT', 'INSTANT AI DIAGNOSIS + AUTO-ASSIGN') : '') +
      stat('ERA', def.era);
    if (def.passive) status = G.tech[key] ? 'INSTALLED & ACTIVE' : 'AVAILABLE — CLICK TO INSTALL';
    else if (def.unique && G.upgrades[key]) status = 'INSTALLED & ACTIVE';
    else status = key === 'scribe' ? `DEPLOYED: ${G.staffList.filter(s => s.scribe).length}` : 'AVAILABLE — DRAG TO DEPLOY';
  }

  el.inspName.textContent = def.name.toUpperCase();
  el.inspFlavor.textContent = def.desc;
  el.inspStats.innerHTML = stats;
  el.inspStatus.textContent = status;
  el.inspStatus.className = statusCls;
  el.inspector.classList.remove('hidden');
}

/* ---------- Shop strip (rebuilt per stage — era-scoped) ---------- */
const shopButtons = { rooms: {}, staff: {}, tech: {} };
let techOpen = false;

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

function makeShopItem(parent, iconDraw, name, cost, tooltipHtml, onActivate, drag, inspectKind, inspectKey) {
  const item = document.createElement('div');
  item.className = 'shop-item' + (drag ? ' upgrade' : '');
  item.appendChild(iconCanvas(iconDraw));
  item.insertAdjacentHTML('beforeend',
    `<div class="si-name">${name.toUpperCase()}</div><div class="si-cost">${fmtMoney(cost)}</div>`);
  item.addEventListener(drag ? 'mousedown' : 'click', evt => {
    ensureAudio();
    hideInspector();                             // click = pure buy/build
    if (item.classList.contains('disabled') || item.classList.contains('soldout')) { G.sfx('denied'); return; }
    onActivate(evt, item);
    if (drag) evt.preventDefault();
  });
  item.addEventListener('mouseenter', () => {
    el.tooltip.innerHTML = tooltipHtml;
    scheduleInspector(inspectKind, inspectKey);
  });
  item.addEventListener('mouseleave', hideInspector);
  parent.appendChild(item);
  return item;
}

/* "DIAGNOSIS: YES/SLOW/NO" — the capability line for tooltips + the
 * inspector panel (user rule: not everyone can diagnose). */
function diagCapability(def) {
  if (!def.canDiagnose) return 'NO';
  return def.diagSeconds <= 2 ? 'YES (FAST)' : 'SLOW (ASSESSMENT)';
}

/* Rebuilt on every startRun: only the rooms / staff / TECHNOLOGY that
 * exist in this stage's decade appear — agentic AI does not exist in
 * a 1950s hospital, not even greyed out. */
function buildShop(stage) {
  el.shopRooms.innerHTML = '';
  el.shopStaff.innerHTML = '';
  el.shopTechList.innerHTML = '';
  shopButtons.rooms = {}; shopButtons.staff = {}; shopButtons.tech = {};

  for (const key of stage.rooms) {
    const def = ROOM_TYPES[key];
    shopButtons.rooms[key] = makeShopItem(
      el.shopRooms,
      ictx => drawRoomIcon(ictx, key, 0, 0),
      def.name, def.cost,
      `<b>${def.name}</b> — ${def.desc} Builds instantly in the next open slot.` +
        ` Upkeep ${fmtMoney(def.cost * UPKEEP_RATE)}/wave${def.support ? '' : '; repeat copies cost x1.5'}.`,
      () => { G.selection = null; buildRoom(key); },
      false, 'room', key,
    );
  }
  for (const key of stage.staff) {
    const def = STAFF_TYPES[key];
    shopButtons.staff[key] = makeShopItem(
      el.shopStaff,
      ictx => drawStaffSprite(ictx, key, 0, 10, false, ERAS[stage.eraIdx].scrub),
      def.name, def.cost,
      `<b>${def.name}</b> — ${def.desc}` +
        ` DIAGNOSIS: ${diagCapability(def)}. Salary ${fmtMoney(def.salary)}/wave.`,
      () => hireStaff(key),
      false, 'staff', key,
    );
  }

  // TECHNOLOGY drawer: compact header button + expandable list rows.
  techOpen = false;
  el.shopTechHead.textContent = `\u25B8 TECHNOLOGY (${stage.tech.length})`;
  for (const key of stage.tech) {
    const def = UPGRADE_TYPES[key];
    const row = document.createElement('div');
    row.className = 'tech-row';
    row.appendChild(iconCanvas(ictx => drawUpgradeIcon(ictx, key, 0, -2)));
    row.insertAdjacentHTML('beforeend',
      `<div class="tr-name">${def.name.toUpperCase()}</div>` +
      `<div class="tr-era">${def.era}</div>` +
      `<div class="tr-cost">${fmtMoney(inflatedCost(def.cost))}</div>`);
    row.addEventListener(def.passive ? 'click' : 'mousedown', evt => {
      ensureAudio();
      hideInspector();
      if (row.classList.contains('disabled') || row.classList.contains('soldout')) { G.sfx('denied'); return; }
      if (def.passive) buyTech(key);
      else { startUpgradeDrag(key, evt); evt.preventDefault(); }
    });
    row.addEventListener('mouseenter', () => {
      el.tooltip.innerHTML = `<b>${def.name}</b> — ${def.desc}`;
      scheduleInspector('upgrade', key);
    });
    row.addEventListener('mouseleave', hideInspector);
    el.shopTechList.appendChild(row);
    shopButtons.tech[key] = row;
  }
  el.shopTechList.classList.add('hidden');
}

function toggleTechDrawer(force) {
  techOpen = force != null ? force : !techOpen;
  el.shopTechList.classList.toggle('hidden', !techOpen);
  const stage = G.stage;
  el.shopTechHead.textContent = `${techOpen ? '\u25BE' : '\u25B8'} TECHNOLOGY (${stage ? stage.tech.length : 0})`;
}

function startUpgradeDrag(key, evt) {
  G.dragUpgrade = key;
  hideInspector();
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
}

function refreshShop() {
  if (!G.stage) return;
  const full = !nextBuildSlot();
  for (const [key, item] of Object.entries(shopButtons.rooms)) {
    const cost = roomBuildCost(key);      // escalated for repeat copies, then inflated
    item.querySelector('.si-cost').textContent = fmtMoney(cost);
    item.classList.toggle('disabled', full || G.budget < cost);
  }
  for (const [key, item] of Object.entries(shopButtons.staff)) {
    const cost = inflatedCost(STAFF_TYPES[key].cost);
    item.querySelector('.si-cost').textContent = fmtMoney(cost);
    item.classList.toggle('disabled', G.budget < cost);
  }
  for (const [key, row] of Object.entries(shopButtons.tech)) {
    const def = UPGRADE_TYPES[key];
    const cost = inflatedCost(def.cost);
    const sold = def.passive ? !!G.tech[key] : (def.unique && G.upgrades[key]);
    row.querySelector('.tr-cost').textContent = sold ? 'OWNED' : fmtMoney(cost);
    row.classList.toggle('soldout', !!sold);
    row.classList.toggle('disabled', !sold && G.budget < cost);
  }
}
