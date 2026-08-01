/* ============================================================
 * Main — boot + requestAnimationFrame loop. Wires the era
 * select, stage intro, report paper, and tutorial. Loads last.
 * ============================================================ */

/* Pre-game the topbar stats + shop are hidden (clean title screen +
 * era select); the hospital reveals once a stage starts. */
function setPregame(on) { document.body.classList.toggle('pregame', on); }
setPregame(true);

function launchStage(stage, withTutorial) {
  ensureAudio();
  G.sfx('buy');
  stopMusic();
  setPregame(false);
  el.stageIntro.classList.add('hidden');
  el.menu.classList.add('hidden');
  startRun(stage);
  if (withTutorial || (stage === STAGES[0] && !storage.get('cbd_tutorial_done'))) {
    startTutorial();
  }
}

el.btnStageStart.addEventListener('click', () => { if (G.pendingStage) launchStage(G.pendingStage); });
el.btnStageBack.addEventListener('click', () => { ensureAudio(); el.stageIntro.classList.add('hidden'); showMenu(); });
el.btnRetry.addEventListener('click', () => { ensureAudio(); if (G.stage) launchStage(G.stage); });
el.btnNextStage.addEventListener('click', () => {
  ensureAudio();
  const idx = STAGES.indexOf(G.stage);
  const next = STAGES[idx + 1];
  if (next && stageUnlocked(idx + 1)) { el.result.classList.add('hidden'); showStageIntro(next); }
});
el.btnMenu.addEventListener('click', () => { stopGameMusic(); showMenu(); startMusic(); setPregame(true); });
el.btnShift.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startShift(); });
el.btnTutorial.addEventListener('click', () => { el.menu.classList.add('hidden'); launchStage(STAGES[0], true); });

function dismissShiftReport(startNext) {
  ensureAudio();
  el.report.classList.add('hidden');
  flushBanners();
  if (startNext) { G.sfx('buy'); startShift(); }
  else refreshShiftButton();
}
el.btnNextShift.addEventListener('click', () => dismissShiftReport(true));
el.btnKeepBuilding.addEventListener('click', () => dismissShiftReport(false));

el.shopTechHead.addEventListener('click', () => { ensureAudio(); G.sfx('assign'); toggleTechDrawer(); });

/* Intro screen: the click-through IS the autoplay gesture — it
 * unlocks WebAudio and starts the theme in one move. */
el.intro.addEventListener('click', () => {
  ensureAudio();
  el.intro.classList.add('hidden');
  showMenu();
  startMusic();
  G.sfx('era');
  narrate('intro');
});

function refreshMuteButton() {
  el.btnMute.textContent = isMuted() ? 'SND OFF' : 'SND ON';
  el.btnMute.classList.toggle('off', isMuted());
}
el.btnMute.addEventListener('click', () => {
  ensureAudio();
  setMuted(!isMuted());
  refreshMuteButton();
});
refreshMuteButton();

/* Intro EKG: scrolling pixel heartbeat trace. */
function drawEkg(time) {
  const c = el.ekg, ec = c.getContext('2d');
  ec.imageSmoothingEnabled = false;
  ec.fillStyle = '#060c18';
  ec.fillRect(0, 0, c.width, c.height);
  const period = 90, base = 42;
  const scroll = Math.floor(time * 140);
  ec.fillStyle = '#58d858';
  for (let x = 0; x < c.width; x += 2) {
    const ph = ((x + scroll) % period + period) % period;
    let y = base;
    if (ph > 34 && ph <= 40) y = base - (ph - 34) * 1.5;        // P bump
    else if (ph > 44 && ph <= 50) y = base - (ph - 44) * 7;     // QRS spike up
    else if (ph > 50 && ph <= 56) y = base - 42 + (ph - 50) * 9; // drop past baseline
    else if (ph > 56 && ph <= 62) y = base + 12 - (ph - 56) * 2;
    else if (ph > 70 && ph <= 78) y = base - Math.sin((ph - 70) / 8 * Math.PI) * 6; // T wave
    ec.fillRect(x, Math.round(y), 2, 3);
  }
}
window.addEventListener('pointerdown', ensureAudio, { once: true });

/* Global error surface: a public web game must never freeze silently.
 * The banner tells the player; the console keeps the details. */
let errorBannerShown = false;
function surfaceError(err) {
  console.error('[cbd]', err);
  if (errorBannerShown) return;
  errorBannerShown = true;
  try {
    el.banner.innerHTML = 'SOMETHING BROKE — PLEASE REFRESH<br/>(DETAILS IN THE CONSOLE)';
    el.banner.classList.remove('hidden', 'info');
  } catch (_) { /* if even the banner is broken, the console has it */ }
}
window.addEventListener('error', e => surfaceError(e.error || e.message));
window.addEventListener('unhandledrejection', e => surfaceError(e.reason));

let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  update(dt);
  render();
  refreshHud();
  updateTutorial();
  if (!el.intro.classList.contains('hidden')) drawEkg(ts / 1000);
  requestAnimationFrame(frame);
}

G.state = 'menu';                 // intro overlay is up; era select follows the click-through
requestAnimationFrame(frame);

// Debug/test hook (harmless in production; used by automated playtests)
window.CBD = G;
