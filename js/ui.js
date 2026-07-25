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
  reportLedger: document.getElementById('report-ledger'),
  reportFlavor: document.getElementById('report-flavor'),
  btnNextShift: document.getElementById('btn-next-shift'),
  btnKeepBuilding: document.getElementById('btn-keep-building'),
  btnShift: document.getElementById('btn-shift'),
  btnWing: document.getElementById('btn-wing'),
  shopRooms: document.getElementById('shop-rooms'),
  shopStaff: document.getElementById('shop-staff'),
  shopUpgrades: document.getElementById('shop-upgrades'),
  tooltip: document.getElementById('tooltip'),
  dragGhost: document.getElementById('drag-ghost'),
  intro: document.getElementById('intro'),
  ekg: document.getElementById('ekg'),
  btnMute: document.getElementById('btn-mute'),
  btnVoice: document.getElementById('btn-voice'),
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
  el.budget.textContent = fmtMoney(G.budget);
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
  const era = eraForShift(G.shiftIdx);
  el.reportDetail.innerHTML =
    `PATIENTS HELPED: <b>${st.helped}</b> \u00b7 ICU TRANSFERS: <b>${st.transfers}</b><br/>` +
    `STAFF BURNOUTS: <b>${st.burnouts}</b>` +
    (st.diagCount ? ` \u00b7 AVG TIME-TO-DIAGNOSIS: <b>${fmtSecs(st.diagTime / st.diagCount)}</b>` : '') + '<br/>' +
    `ERA TECH (${era.label}): DIAG x${era.mods.diag} \u00b7 TREAT x${era.mods.treat} \u00b7 STRESS x${era.mods.stress}<br/>` +
    `TOTALS \u2014 HELPED ${G.discharged} \u00b7 TRANSFERS ${G.transfers} \u00b7 BUDGET ${fmtMoney(G.budget)}`;

  // Income/expense ledger (docs/ECONOMY.md 3d.6): faucets above the
  // line, drains below, NET in big type — the economy teaches itself.
  const income = st.earned + st.copays + st.grant;
  const expense = st.salaries + st.upkeep + st.spent + st.penalties + st.apPrior;
  const net = income - expense;
  const row = (label, amt, cls, sign) =>
    amt ? `<div class="${cls}">${sign}${fmtMoney(amt)} \u2014 ${label}</div>` : '';
  el.reportLedger.innerHTML =
    row('REIMBURSEMENTS', st.earned, 'lg-in', '+') +
    row('COPAYS', st.copays, 'lg-in', '+') +
    row('MODERNIZATION GRANT', st.grant, 'lg-in', '+') +
    row('SALARIES', st.salaries, 'lg-out', '-') +
    row('ROOM UPKEEP', st.upkeep, 'lg-out', '-') +
    row('BUILDS / HIRES / TECH', st.spent, 'lg-out', '-') +
    row('PRIVATE-WING SETTLEMENTS', st.penalties, 'lg-out', '-') +
    row('ACCOUNTS PAYABLE (PRIOR)', st.apPrior, 'lg-out', '-') +
    `<div class="lg-net" style="color:${net >= 0 ? 'var(--green)' : 'var(--red)'}">NET ${net >= 0 ? '+' : ''}${fmtMoney(net)}</div>` +
    (st.apCarried ? `<div class="lg-out">CARRIED TO NEXT SHIFT: ${fmtMoney(st.apCarried)} A/P</div>` : '');
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
  // Private-wing lever rides along with the cool-off (ECONOMY.md 3a).
  el.btnWing.classList.toggle('hidden', !show);
  el.btnWing.classList.toggle('armed', G.privateWingArmed);
  el.btnWing.textContent = `PRIVATE WING: ${G.privateWingArmed ? 'ON' : 'OFF'}`;
}

function showResult(won, stars) {
  el.resultTitle.textContent = won ? 'ALL SHIFTS COMPLETE' : 'ICU AT CAPACITY';
  el.resultTitle.style.color = won ? 'var(--green)' : 'var(--red)';
  el.resultStars.textContent = won ? '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars) : '';
  el.resultDetail.innerHTML =
    `PATIENTS HELPED: ${G.discharged}<br/>` +
    `ICU TRANSFERS: ${G.transfers}<br/>` +
    `FINAL BUDGET: ${fmtMoney(G.budget)}`;
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
    `<div class="si-name">${name.toUpperCase()}</div><div class="si-cost">${fmtMoney(cost)}</div>`);
  item.addEventListener(drag ? 'mousedown' : 'click', evt => {
    ensureAudio();
    if (item.classList.contains('locked')) { G.sfx('denied'); return; }
    if (item.classList.contains('disabled') || item.classList.contains('soldout')) { G.sfx('denied'); return; }
    onActivate(evt, item);
    if (drag) evt.preventDefault();
  });
  item.addEventListener('mouseenter', () => { el.tooltip.innerHTML = tooltipHtml; });
  parent.appendChild(item);
  return item;
}

/* Era gating (docs/ERAS.md): a tech appears the shift its decade
 * begins; the cool-off BEFORE that shift counts as prep for it. */
function upgradeLocked(def) {
  if (def.unlockShift == null) return false;
  const reach = G.phase === 'cooloff' ? G.shiftIdx + 1 : G.shiftIdx;
  return reach < def.unlockShift;
}

/* "DIAGNOSIS: YES/SLOW/NO" — the capability line for tooltips + the
 * inspector panel (user rule: not everyone can diagnose). */
function diagCapability(def) {
  if (!def.canDiagnose) return 'NO';
  return def.diagSeconds <= 2 ? 'YES (FAST)' : 'SLOW (ASSESSMENT)';
}

function buildShop() {
  for (const [key, def] of Object.entries(ROOM_TYPES)) {
    shopButtons.rooms[key] = makeShopItem(
      el.shopRooms,
      ictx => drawRoomIcon(ictx, key, 0, 0),
      def.name, def.cost,
      `<b>${def.name}</b> — ${def.desc} Builds instantly in the next open slot.` +
        ` Upkeep ${fmtMoney(def.cost * UPKEEP_RATE)}/shift${def.support ? '' : '; repeat copies cost x1.5'}.`,
      () => { G.selection = null; buildRoom(key); },
    );
  }
  for (const [key, def] of Object.entries(STAFF_TYPES)) {
    shopButtons.staff[key] = makeShopItem(
      el.shopStaff,
      ictx => drawStaffSprite(ictx, key, 0, 10),
      def.name, def.cost,
      `<b>${def.name}</b> — ${def.desc}` +
        ` DIAGNOSIS: ${diagCapability(def)}. Salary ${fmtMoney(def.salary)}/shift.`,
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
    const cost = roomBuildCost(key);      // escalated for repeat copies, then inflated
    item.querySelector('.si-cost').textContent = fmtMoney(cost);
    item.classList.toggle('disabled', full || G.budget < cost);
  }
  for (const [key, def] of Object.entries(STAFF_TYPES)) {
    const item = shopButtons.staff[key];
    const cost = inflatedCost(def.cost);
    item.querySelector('.si-cost').textContent = fmtMoney(cost);
    item.classList.toggle('disabled', G.budget < cost);
  }
  for (const [key, def] of Object.entries(UPGRADE_TYPES)) {
    const item = shopButtons.upgrades[key];
    const sold = def.unique && G.upgrades[key];
    const locked = upgradeLocked(def);
    const cost = inflatedCost(def.cost);
    item.classList.toggle('locked', locked);
    item.querySelector('.si-cost').textContent = locked
      ? `\u{1F512}${eraForShift(def.unlockShift).label}`
      : fmtMoney(cost);
    item.classList.toggle('soldout', !!sold);
    item.classList.toggle('disabled', !sold && !locked && G.budget < cost);
  }
}
