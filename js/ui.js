/* ============================================================
 * UI — DOM references, canvas setup, banner, HUD, menu/result
 * overlays, and the shop strip (icon cards + enable/disable
 * state). All DOM reads/writes live here.
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
  menuBest: document.getElementById('menu-best'),
  btnStart: document.getElementById('btn-start'),
  result: document.getElementById('result'),
  resultTitle: document.getElementById('result-title'),
  resultStars: document.getElementById('result-stars'),
  resultDetail: document.getElementById('result-detail'),
  btnRetry: document.getElementById('btn-retry'),
  btnMenu: document.getElementById('btn-menu'),
  banner: document.getElementById('banner'),
  report: document.getElementById('report'),
  reportTitle: document.getElementById('report-title'),
  reportDetail: document.getElementById('report-detail'),
  reportFlavor: document.getElementById('report-flavor'),
  btnNextShift: document.getElementById('btn-next-shift'),
  btnKeepBuilding: document.getElementById('btn-keep-building'),
  btnShift: document.getElementById('btn-shift'),
  shopRooms: document.getElementById('shop-rooms'),
  shopStaff: document.getElementById('shop-staff'),
  shopUpgrades: document.getElementById('shop-upgrades'),
  tooltip: document.getElementById('tooltip'),
  dragGhost: document.getElementById('drag-ghost'),
  intro: document.getElementById('intro'),
  ekg: document.getElementById('ekg'),
  btnMute: document.getElementById('btn-mute'),
};

/* ---------- Banner ---------- */
let bannerTimeout = null;
function showBanner(html, kind, seconds) {
  el.banner.innerHTML = html;
  el.banner.classList.remove('hidden', 'info');
  if (kind === 'info') el.banner.classList.add('info');
  clearTimeout(bannerTimeout);
  bannerTimeout = setTimeout(() => el.banner.classList.add('hidden'), seconds * 1000);
}

/* ---------- HUD ---------- */
function refreshHud() {
  el.budget.textContent = `$${G.budget}`;
  el.lives.innerHTML = `ICU ${'\u2665'.repeat(Math.max(0, G.lives))}${'\u2661'.repeat(Math.max(0, START_LIVES - G.lives))}`;
  el.shift.textContent = G.phase === 'cooloff'
    ? `COOL-OFF \u00b7 NEXT: SHIFT ${G.shiftIdx + 2}/${SHIFTS.length}`
    : `SHIFT ${G.shiftIdx + 1}/${SHIFTS.length}`;
  el.waiting.textContent = `WAITING ${waitingPatients().length}`;
}

/* ---------- Menu / result overlays ---------- */
function showMenu() {
  G.state = 'menu';
  el.result.classList.add('hidden');
  const best = getBest();
  el.menuBest.textContent = best
    ? `BEST RUN: ${'\u2605'.repeat(best.stars)} \u00b7 ${best.discharged} PATIENTS HELPED`
    : '';
  el.menu.classList.remove('hidden');
}

/* ---------- Shift report + player-paced start button ---------- */
function fmtSecs(s) {
  const m = Math.floor(s / 60), r = Math.floor(s % 60);
  return m ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

function showShiftReport() {
  const st = G.shiftStats;
  el.reportTitle.textContent = `SHIFT ${G.shiftIdx + 1} REPORT`;
  el.reportDetail.innerHTML =
    `PATIENTS HELPED: <b>${st.helped}</b> \u00b7 ICU TRANSFERS: <b>${st.transfers}</b><br/>` +
    `EARNED: <b>$${st.earned}</b> \u00b7 SPENT: <b>$${st.spent}</b><br/>` +
    `STAFF BURNOUTS: <b>${st.burnouts}</b><br/>` +
    `TOTALS \u2014 HELPED ${G.discharged} \u00b7 TRANSFERS ${G.transfers} \u00b7 BUDGET $${G.budget}`;
  let flavor;
  if (st.helped === 0) flavor = 'ROUGH ONE. NOBODY WALKED OUT SMILING.';
  else if (st.fastestCure !== null && st.fastestCure < 20) flavor = `FASTEST CURE: ${fmtSecs(st.fastestCure)} \u2014 NICE HUSTLE.`;
  else if (st.longestWait > 30) flavor = `LONGEST WAIT: ${fmtSecs(st.longestWait)} \u2014 SOMEONE CAMPED IN THE LOBBY.`;
  else if (st.burnouts > 0) flavor = 'THE BREAK ROOM IS CALLING. YOUR STAFF NEED IT.';
  else flavor = `FASTEST CURE: ${st.fastestCure === null ? '\u2014' : fmtSecs(st.fastestCure)} \u00b7 LONGEST WAIT: ${fmtSecs(st.longestWait)}`;
  el.reportFlavor.textContent = flavor;
  el.btnNextShift.textContent = `START SHIFT ${G.shiftIdx + 2}`;
  el.report.classList.remove('hidden');
}

function refreshShiftButton() {
  const show = G.state === 'playing' && G.phase === 'cooloff' && el.report.classList.contains('hidden');
  el.btnShift.classList.toggle('hidden', !show);
  if (show) el.btnShift.textContent = `START SHIFT ${G.shiftIdx + 2}`;
}

function showResult(won, stars) {
  el.resultTitle.textContent = won ? 'ALL SHIFTS COMPLETE' : 'ICU AT CAPACITY';
  el.resultTitle.style.color = won ? 'var(--green)' : 'var(--red)';
  el.resultStars.textContent = won ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '';
  el.resultDetail.innerHTML =
    `PATIENTS HELPED: ${G.discharged}<br/>` +
    `ICU TRANSFERS: ${G.transfers}<br/>` +
    `FINAL BUDGET: $${G.budget}`;
  el.result.classList.remove('hidden');
}

/* ---------- Shop strip ---------- */
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
      `<b>${def.name}</b> — ${def.desc} Builds instantly in the next open slot.`,
      () => { G.selection = null; buildRoom(key); },
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
      evt => startUpgradeDrag(key, evt),
      true,
    );
  }
}

function startUpgradeDrag(key, evt) {
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
}

function refreshShop() {
  const full = !nextBuildSlot();
  for (const [key, def] of Object.entries(ROOM_TYPES)) {
    const item = shopButtons.rooms[key];
    item.classList.toggle('disabled', full || G.budget < def.cost);
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
