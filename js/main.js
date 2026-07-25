/* ============================================================
 * Main — boot + requestAnimationFrame loop. Wires the menu
 * buttons and exposes the debug hook. Must load last.
 * ============================================================ */

/* Pre-game the topbar stats + shop are hidden (clean title screen);
 * the hospital reveals after START. */
function setPregame(on) { document.body.classList.toggle('pregame', on); }
setPregame(true);

el.btnStart.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); stopMusic(); setPregame(false); startRun(); });
el.btnRetry.addEventListener('click', () => { ensureAudio(); stopMusic(); setPregame(false); startRun(); });
el.btnMenu.addEventListener('click', () => { showMenu(); startMusic(); setPregame(true); });
el.btnShift.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startShift(); });

/* Dismissing the SHIFT REPORT routes through the mandatory ERA REPORT
 * when the next shift crosses a decade boundary. */
function dismissShiftReport(startNext) {
  ensureAudio();
  el.report.classList.add('hidden');
  if (G.pendingEraReport) {
    G.sfx('era');
    showEraReport(G.pendingEraReport, startNext);
    return;
  }
  if (startNext) { G.sfx('buy'); startShift(); }
  else refreshShiftButton();
}
el.btnEraContinue.addEventListener('click', () => {
  const startNext = el.eraReport.dataset.startNext === '1';
  el.eraReport.classList.add('hidden');
  G.pendingEraReport = null;
  if (startNext) { G.sfx('buy'); startShift(); }
  else refreshShiftButton();
});

// Private-wing risk lever: arm during cool-off, applies to the next shift.
el.btnWing.addEventListener('click', () => {
  ensureAudio();
  G.privateWingArmed = !G.privateWingArmed;
  G.sfx(G.privateWingArmed ? 'buy' : 'denied');
  refreshShiftButton();
});
el.btnNextShift.addEventListener('click', () => dismissShiftReport(true));
el.btnKeepBuilding.addEventListener('click', () => dismissShiftReport(false));

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

/* VOICE: cycle through the available narrator system voices. */
el.btnVoice.addEventListener('click', () => {
  const name = cycleNarratorVoice();
  if (!name) { showBanner('NO SYSTEM VOICES AVAILABLE', 'info', 2); return; }
  el.btnVoice.title = `Narrator voice: ${name}`;
  showBanner(`NARRATOR VOICE: ${name.toUpperCase()}`, 'info', 2.5);
  try { speechSynthesis.cancel(); } catch (_) { /* ignore */ }
  speakWithSynthesis('Testing, testing. This hospital is in capable hands.');
});

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

let lastTs = 0;
function frame(ts) {
  const dt = Math.min(0.05, (ts - lastTs) / 1000 || 0);
  lastTs = ts;
  update(dt);
  render();
  refreshHud();
  if (!el.intro.classList.contains('hidden')) drawEkg(ts / 1000);
  requestAnimationFrame(frame);
}

buildShop();
refreshShop();
G.state = 'menu';                 // intro overlay is up; menu follows the click-through
requestAnimationFrame(frame);

// Debug/test hook (harmless in production; used by automated playtests)
window.CBD = G;
