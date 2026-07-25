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
  shopRooms: document.getElementById('shop-rooms'),
  shopStaff: document.getElementById('shop-staff'),
  shopUpgrades: document.getElementById('shop-upgrades'),
  tooltip: document.getElementById('tooltip'),
  dragGhost: document.getElementById('drag-ghost'),
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
  el.shift.textContent = G.shiftIdx < 0 ? 'PREP' : `SHIFT ${G.shiftIdx + 1}/${SHIFTS.length}`;
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
