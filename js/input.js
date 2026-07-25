/* ============================================================
 * Input — canvas mouse handling (build / select / allocate),
 * keyboard, and the AI-upgrade drag-and-drop.
 * ============================================================ */

/* Client px -> WORLD coords: undo the CSS scale, then invert the
 * camera transform (G.view) that render.js applied this frame. */
function canvasPos(evt) {
  const rect = canvas.getBoundingClientRect();
  const cx = (evt.clientX - rect.left) * (canvas.width / rect.width);
  const cy = (evt.clientY - rect.top) * (canvas.height / rect.height);
  return {
    x: (cx - G.view.ox) / G.view.s,
    y: (cy - G.view.oy) / G.view.s,
  };
}

canvas.addEventListener('mousemove', evt => { G.hover = canvasPos(evt); });
canvas.addEventListener('mouseleave', () => { G.hover = null; });

canvas.addEventListener('click', evt => {
  ensureAudio();
  if (G.state !== 'playing') return;
  const { x, y } = canvasPos(evt);

  // 1. Selection-driven assignment
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

  // 2. Select an entity
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
});

window.addEventListener('keydown', evt => {
  if (evt.key === 'Escape') {
    G.selection = null; G.dragUpgrade = null;
    el.dragGhost.classList.add('hidden');
  }
});

/* ---------- AI-upgrade drag & drop ---------- */
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
  G.shiftStats.spent += def.cost;
  G.sfx('buy');
  refreshShop();
}
