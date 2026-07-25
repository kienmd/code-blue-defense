/* ============================================================
 * Main — boot + requestAnimationFrame loop. Wires the menu
 * buttons and exposes the debug hook. Must load last.
 * ============================================================ */

el.btnStart.addEventListener('click', () => { ensureAudio(); G.sfx('buy'); startRun(); });
el.btnRetry.addEventListener('click', () => { ensureAudio(); startRun(); });
el.btnMenu.addEventListener('click', showMenu);
window.addEventListener('pointerdown', ensureAudio, { once: true });

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
