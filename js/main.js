/* ============================================================
 * Main — boot + requestAnimationFrame loop. Wires the menu
 * buttons and exposes the debug hook. Must load last.
 * ============================================================ */

el.btnStart.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); stopMusic(); startRun(); });
el.btnRetry.addEventListener('click', () => { ensureAudio(); stopMusic(); startRun(); });
el.btnMenu.addEventListener('click', () => { showMenu(); startMusic(); });
el.btnShift.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startShift(); });
el.btnNextShift.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startShift(); });
el.btnKeepBuilding.addEventListener('click', () => {
  el.report.classList.add('hidden');
  refreshShiftButton();
});

/* Intro screen: the click-through IS the autoplay gesture — it
 * unlocks WebAudio and starts the theme in one move. */
el.intro.addEventListener('click', () => {
  ensureAudio();
  el.intro.classList.add('hidden');
  showMenu();
  startMusic();
  G.sfx('era');
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
