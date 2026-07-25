/* ============================================================
 * Render — the whole frame: building cross-section, rooms,
 * entities, particles, speech bubbles, overlays. Reads G,
 * never mutates it (except the hover-tooltip bookkeeping).
 * ============================================================ */

const FONT = '7px "Press Start 2P", monospace';

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* ---- Camera: ease zoom toward fitting the visible floors ----
   * Few floors => zoomed in (big sprites); more floors => eased out.
   * Uniform scale + translate; input.js inverts G.view for clicks. */
  const topFloor = topVisibleFloor();
  const worldTop = floorTopY(topFloor) - 44;               // roof sign headroom
  const worldH = GROUND_Y + 16 - worldTop;
  const targetZoom = Math.min(ZOOM_MAX, canvas.height / worldH);
  G.zoom += (targetZoom - G.zoom) * ZOOM_EASE;
  const s = G.zoom;
  const ox = (canvas.width - WORLD_W * s) / 2;
  const oy = (canvas.height - worldH * s) / 2 - worldTop * s;
  G.view = { s, ox, oy };

  // Night sky + stars (screen space, full canvas)
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3a4a6a';
  const skyH = Math.max(1, worldTop * s + oy);
  for (let i = 0; i < 30; i++) {
    ctx.fillRect((i * 137 + 40) % canvas.width, (i * 71 + 10) % skyH, 2, 2);
  }

  ctx.setTransform(s, 0, 0, s, ox, oy);                    // ---- world space ----

  // Street (overdraw sideways/down to cover canvas gutters at low zoom)
  ctx.fillStyle = '#161c2e';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 400);
  ctx.fillStyle = '#242e48';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 3);

  // Building shell + roof sign (only as tall as the visible floors)
  const bTop = floorTopY(topFloor);
  ctx.fillStyle = PALETTE.building;
  ctx.fillRect(32, bTop - 14, 848 - 8, GROUND_Y - bTop + 14);
  ctx.fillStyle = PALETTE.frame;
  ctx.fillRect(32, bTop - 14, 840, 14);
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(388, bTop - 34, 20, 20);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(396, bTop - 30, 4, 12); ctx.fillRect(392, bTop - 26, 12, 4);
  ctx.font = FONT;
  ctx.fillStyle = PALETTE.blue;
  ctx.textAlign = 'left';
  const signEra = eraForShift(G.phase === 'cooloff' ? G.shiftIdx + 1 : Math.max(0, G.shiftIdx));
  ctx.fillText(`CODE BLUE GENERAL \u00b7 ${signEra.sign}`, 420, bTop - 20);

  // Floors — only the ones in use, plus the next buildable floor as a
  // dimmed "expansion" hint. The hospital visibly grows as you build.
  const builtTop = highestBuiltFloor();
  for (let f = 0; f <= topFloor; f++) {
    const top = floorTopY(f);
    ctx.fillStyle = PALETTE.floorLine;
    ctx.fillRect(32, top + FLOOR_H - 4, 840, 4);
    if (f === 0) continue;
    const hintFloor = f > builtTop;                        // no rooms here yet
    for (let sl = 0; sl < SLOTS_PER_FLOOR; sl++) {
      const room = roomAt(f, sl);
      const x = slotX(sl);
      if (room) drawRoomInterior(room);
      else {
        ctx.globalAlpha = hintFloor ? 0.35 : 1;
        ctx.fillStyle = PALETTE.slotDark;
        ctx.fillRect(x + 2, top + 2, SLOT_W - 4, FLOOR_H - 6);
        ctx.strokeStyle = '#22304a';
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x + 8, top + 8, SLOT_W - 16, FLOOR_H - 18);
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;
      }
    }
    if (hintFloor) {
      ctx.globalAlpha = 0.4;
      ctx.font = FONT;
      ctx.fillStyle = '#516a8a';
      ctx.textAlign = 'center';
      ctx.fillText('NEXT ROOM BUILDS HERE', WORLD_W / 2, top + FLOOR_H / 2);
      ctx.textAlign = 'left';
      ctx.globalAlpha = 1;
    }
  }

  drawLobby();

  // Elevator shaft
  ctx.fillStyle = '#101828';
  ctx.fillRect(ELEV_X, bTop, ELEV_W, GROUND_Y - bTop);
  ctx.fillStyle = '#2e3c5c';
  ctx.fillRect(ELEV_X + 4, bTop, 2, GROUND_Y - bTop);
  ctx.fillRect(ELEV_X + ELEV_W - 6, bTop, 2, GROUND_Y - bTop);
  for (let f = 0; f <= topFloor; f++) {
    ctx.fillStyle = PALETTE.frame;
    ctx.fillRect(ELEV_X, floorTopY(f) + FLOOR_H - 4, ELEV_W, 4);
  }

  // Fresh-build flash: highlight where the room just landed
  if (G.buildFlash) {
    const f = G.buildFlash;
    const on = Math.floor(f.t * 8) % 2 === 0;
    ctx.globalAlpha = on ? 0.9 : 0.4;
    ctx.strokeStyle = PALETTE.green;
    ctx.lineWidth = 3;
    ctx.strokeRect(slotX(f.slot) + 3, floorTopY(f.floor) + 3, SLOT_W - 6, FLOOR_H - 8);
    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;
  }

  // Entities
  for (const s of G.staffList) drawStaffEntity(s);
  for (const p of G.patients) drawPatientEntity(p);

  // Diagnosis beams
  for (const s of G.staffList) {
    if (s.room === 'lobby' && s.diagPatient && !s.isBurnedOut(G.time)) {
      ctx.strokeStyle = PALETTE.blue;
      ctx.globalAlpha = 0.6;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y - 14);
      ctx.lineTo(s.diagPatient.x, s.diagPatient.y - 14);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  // Particles
  for (const pt of G.particles) {
    const frac = pt.t / pt.life;
    ctx.globalAlpha = 1 - frac;
    ctx.fillStyle = pt.color;
    if (pt.kind === 'plus') {
      ctx.fillRect(pt.x - 1, pt.y - 3, 2, 6);
      ctx.fillRect(pt.x - 3, pt.y - 1, 6, 2);
    } else if (pt.kind === 'puff') {
      const r = 2 + frac * 5;
      ctx.fillRect(pt.x - r / 2, pt.y - r / 2, r, r);
    } else {
      ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  // Auto-blurts: fresh arrivals mutter their complaint
  for (const p of G.patients) {
    if (p.blurtT > 0 && p.complaint && p.state === 'waiting') {
      const short = p.complaint.length > 20 ? p.complaint.slice(0, 19) + '…' : p.complaint;
      drawSpeechBubble(p.x, p.y - 52, [short], null, Math.min(1, p.blurtT));
    }
  }

  // Hover: highlight + presenting complaint speech bubble
  const hp = G.hover && G.state === 'playing' ? hitPatient(G.hover.x, G.hover.y) : null;
  if ((hp ? hp.id : null) !== G.hoverPatientId) {
    G.hoverPatientId = hp ? hp.id : null;
    if (hp) {
      el.tooltip.innerHTML = hp.diagnosed
        ? `<b>"${hp.complaint || '…'}"</b><br/>${hp.def.name} — send to <b>${ROOM_TYPES[PATHOGENS[hp.typeKey].room].name.toUpperCase()}</b>.`
        : `<b>"${hp.complaint || '…'}"</b><br/>UNDIAGNOSED — the tells might give it away, or wait for triage.`;
    }
  }
  if (hp) {
    ctx.strokeStyle = PALETTE.amber;
    ctx.globalAlpha = 0.9;
    ctx.lineWidth = 1;
    ctx.strokeRect(hp.x - 12, hp.y - 32, 24, 36);
    ctx.globalAlpha = 1;
    const lines = wrapText(hp.complaint || '…', 26);
    const dx = hp.diagnosed
      ? `${hp.def.name.toUpperCase()} → ${ROOM_TYPES[PATHOGENS[hp.typeKey].room].name.toUpperCase()}`
      : null;
    drawSpeechBubble(hp.x, hp.y - 56, lines, dx, 1);
  }

  // Selection highlight (world space)
  if (G.selection) {
    const o = G.selection.obj;
    ctx.strokeStyle = PALETTE.green;
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(G.time * 6);
    ctx.lineWidth = 2;
    ctx.strokeRect(o.x - 13, o.y - 34, 26, 40);
    ctx.globalAlpha = 1;
  }

  // Floating texts (world space)
  ctx.font = FONT;
  ctx.textAlign = 'center';
  for (const t of G.texts) {
    const frac = t.t / t.life;
    ctx.globalAlpha = 1 - frac;
    ctx.fillStyle = t.color;
    ctx.fillText(t.text, Math.round(t.x), Math.round(t.y - frac * 16));
    ctx.globalAlpha = 1;
  }

  ctx.setTransform(1, 0, 0, 1, 0, 0);                      // ---- screen space ----

  // Selection hint banner (screen space so it never scales)
  if (G.selection) {
    ctx.font = FONT;
    ctx.fillStyle = PALETTE.green;
    ctx.textAlign = 'center';
    const hint = G.selection.kind === 'patient' ? 'CLICK A ROOM TO ALLOCATE' : 'CLICK A ROOM (OR LOBBY) TO ASSIGN';
    ctx.fillText(hint, canvas.width / 2, 14);
  }

  if (G.eraCard) drawEraCard(G.eraCard);

  ctx.textAlign = 'left';
}

/* Age of War-style decade card: slides in from the left, holds,
 * fades out. Screen space, drawn over everything. */
function drawEraCard(card) {
  const IN = 0.5, HOLD = 2.0;                              // + fade = ERA_CARD_SECONDS
  const t = card.t;
  const cx = canvas.width / 2, cy = canvas.height * 0.36;
  let slide = 0, alpha = 1;
  if (t < IN) {
    const f = 1 - t / IN;
    slide = -f * f * canvas.width * 0.6;                   // ease-out sweep
  } else if (t > IN + HOLD) {
    alpha = Math.max(0, 1 - (t - IN - HOLD) / (ERA_CARD_SECONDS - IN - HOLD));
  }
  ctx.globalAlpha = alpha * 0.55;
  ctx.fillStyle = '#060a14';
  ctx.fillRect(0, cy - 64, canvas.width, 122);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.amber;
  ctx.fillRect(0, cy - 64, canvas.width, 3);
  ctx.fillRect(0, cy + 55, canvas.width, 3);
  ctx.textAlign = 'center';
  ctx.font = '42px "Press Start 2P", monospace';
  ctx.fillStyle = '#3a2600';
  ctx.fillText(card.label, cx + slide + 4, cy + 4);        // drop shadow
  ctx.fillStyle = PALETTE.amber;
  ctx.fillText(card.label, cx + slide, cy);
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillStyle = PALETTE.white;
  ctx.fillText(card.sub, cx - slide, cy + 24);             // counter-sweep
  ctx.font = '7px "Press Start 2P", monospace';
  ctx.fillStyle = '#8aa0b8';
  ctx.fillText(card.body, cx, cy + 44);
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

/* ---------- Pieces ---------- */

function drawLobby() {
  const top = floorTopY(0);
  ctx.fillStyle = '#1c2438';
  ctx.fillRect(ELEV_X + ELEV_W, top + 2, 872 - ELEV_X - ELEV_W, FLOOR_H - 6);
  // waiting chairs
  for (let i = 0; i < WAIT_SPOTS; i++) {
    const x = waitSpotX(i);
    ctx.fillStyle = '#31405e';
    ctx.fillRect(x - 10, floorWalkY(0) - 6, 20, 4);
    ctx.fillRect(x - 10, floorWalkY(0) - 14, 3, 10);
  }
  ctx.font = FONT;
  ctx.fillStyle = '#516a8a';
  ctx.fillText('WAITING ROOM', 400, top + 16);

  // Entrance door (also the happy exit)
  ctx.fillStyle = '#0e1626';
  ctx.fillRect(34, top + 10, 28, FLOOR_H - 18);
  ctx.fillStyle = PALETTE.green;
  ctx.fillRect(34, top + 10, 28, 4);
  ctx.fillStyle = PALETTE.white;
  ctx.font = FONT;
  ctx.fillText('ER', 42, top + 34);
  if (G.upgrades.priorAuth) {
    drawUpgradeIcon(ctx, 'priorAuth', 48, top + 54, 0.8);
    pulseGlow(48, top + 54);
  }
  if (G.upgrades.labRouter) {
    drawUpgradeIcon(ctx, 'labRouter', 130, top + 20, 1);
    pulseGlow(130, top + 20);
  }
}

function drawRoomInterior(room) {
  const { x, y, w, h } = room;
  // lit interior, tinted by room type
  ctx.fillStyle = '#20293e';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
  ctx.fillStyle = room.def.color;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
  ctx.globalAlpha = 1;
  ctx.fillStyle = room.def.color;
  ctx.fillRect(x + 2, y + 2, w - 4, 3);
  // label
  ctx.font = FONT;
  ctx.fillStyle = room.def.color;
  ctx.textAlign = 'left';
  ctx.fillText(room.def.name.toUpperCase(), x + 10, y + 18);

  if (room.def.support) {
    // break room: coffee machine + couch
    const wy = floorWalkY(room.floor);
    ctx.fillStyle = '#31405e';
    ctx.fillRect(x + w * 0.5 - 24, wy - 8, 48, 6);
    ctx.fillRect(x + w * 0.5 - 24, wy - 16, 5, 14);
    ctx.fillRect(x + w * 0.5 + 19, wy - 16, 5, 14);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + w - 40, wy - 22, 14, 20);
    ctx.fillStyle = room.def.color;
    ctx.fillRect(x + w - 37, wy - 18, 8, 6);
  } else {
    for (let i = 0; i < room.def.beds; i++) {
      const pos = room.bedPos(i);
      drawBed(ctx, pos.x, pos.y);
    }
  }
}

function drawPatientEntity(p) {
  if (p.state === 'transfer') {
    // stretcher flash — sad, not violent
    const on = Math.floor(p.transferT * 8) % 2 === 0;
    ctx.globalAlpha = on ? 1 : 0.35;
    ctx.fillStyle = '#c8d8dc';
    ctx.fillRect(p.x - 14, p.y - 8, 28, 5);
    drawPatientSprite(ctx, p.x, p.y - 6, 0, 'sick', p.typeKey, G.time, p.look);
    ctx.globalAlpha = 1;
    return;
  }
  const mood = p.state === 'exiting' ? 'happy' : 'sick';
  drawPatientSprite(ctx, p.x, p.y, G.time * 5 + p.bob, mood, p.typeKey, G.time + p.bob, p.look);
  if (p.state === 'exiting') return;                       // cured: no bars, no germ

  // The ailment — the actual enemy — rides above the patient.
  drawAilment(ctx, p.diagnosed ? p.typeKey : null, p.x, p.y - 32, p.ailmentScale(), G.time + p.bob);

  // deterioration bar (red = the disease is winning)
  const bw = 18;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(p.x - bw / 2, p.y - 44, bw, 3);
  const hf = Math.max(0, p.health / 100);
  ctx.fillStyle = hf > 0.5 ? PALETTE.green : (hf > 0.25 ? PALETTE.amber : PALETTE.red);
  ctx.fillRect(p.x - bw / 2, p.y - 44, bw * hf, 3);
  // treatment progress (blue, drains as care lands)
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(p.x - bw / 2, p.y - 40, bw, 3);
  ctx.fillStyle = PALETTE.blue;
  ctx.fillRect(p.x - bw / 2, p.y - 40, bw * Math.max(0, p.complexity / p.maxComplexity), 3);
  if (p.aiTag) { ctx.fillStyle = PALETTE.toxic; ctx.fillRect(p.x + bw / 2 + 2, p.y - 44, 3, 3); }

  // Wait-time counter: rides the deterioration clock — neutral while
  // healthy, amber as the disease gains, red when critical.
  if (p.state === 'waiting') {
    const wait = Math.max(0, G.time - p.spawnT);
    const m = Math.floor(wait / 60), sec = Math.floor(wait % 60);
    ctx.font = FONT;
    ctx.textAlign = 'center';
    ctx.fillStyle = hf > 0.5 ? '#8aa0b8' : (hf > 0.25 ? PALETTE.amber : PALETTE.brightRed);
    ctx.fillText(m ? `${m}:${String(sec).padStart(2, '0')}` : `${sec}s`, p.x, p.y - 48);
    ctx.textAlign = 'left';
  }
}

function drawStaffEntity(s) {
  const burned = s.isBurnedOut(G.time);
  ctx.globalAlpha = burned ? 0.45 : 1;
  drawStaffSprite(ctx, s.typeKey, s.x, s.y, s.state === 'walking' ? G.time * 9 : 0);
  ctx.globalAlpha = 1;
  if (burned) {
    ctx.font = FONT;
    ctx.fillStyle = PALETTE.red;
    ctx.textAlign = 'center';
    ctx.fillText(`BURNOUT ${Math.ceil(s.burnoutUntil - G.time)}`, s.x, s.y - 34);
    ctx.textAlign = 'left';
  } else if (s.stress > 0) {
    const bw = 16, frac = s.stress / 100;
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(s.x - bw / 2, s.y - 30, bw, 3);
    ctx.fillStyle = frac > 0.7 ? PALETTE.red : PALETTE.amber;
    ctx.fillRect(s.x - bw / 2, s.y - 30, bw * frac, 3);
  }
  if (s.scribe) {
    drawUpgradeIcon(ctx, 'scribe', s.x + 10, s.y - 26, 0.6);
  }
}

function wrapText(str, maxChars) {
  const words = String(str).split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > maxChars && cur) { lines.push(cur); cur = w; }
    else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 3);
}

/* 8-bit speech bubble anchored above (x, y): white box, ink border,
 * little tail. `dxLine` (optional) renders in blue under the quote. */
function drawSpeechBubble(x, y, lines, dxLine, alpha = 1) {
  ctx.font = FONT;
  const all = dxLine ? [...lines, dxLine] : lines;
  const w = Math.max(...all.map(l => ctx.measureText(l).width)) + 12;
  const h = all.length * 11 + 9;
  const bx = Math.round(Math.min(Math.max(6, x - w / 2), WORLD_W - w - 6));
  const by = Math.round(Math.max(4, y - h));
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(bx - 2, by - 2, w + 4, h + 4);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(bx, by, w, h);
  // tail
  ctx.fillRect(Math.round(x) - 2, by + h, 4, 3);
  ctx.fillStyle = PALETTE.ink;
  ctx.fillRect(Math.round(x) - 3, by + h + 3, 6, 2);
  ctx.textAlign = 'left';
  lines.forEach((l, i) => {
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(l, bx + 6, by + 12 + i * 11);
  });
  if (dxLine) {
    ctx.fillStyle = PALETTE.deepBlue;
    ctx.fillText(dxLine, bx + 6, by + 12 + lines.length * 11);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'left';
}

function pulseGlow(x, y) {
  ctx.globalAlpha = 0.25 + 0.2 * Math.sin(G.time * 5);
  ctx.strokeStyle = PALETTE.toxic;
  ctx.lineWidth = 2;
  ctx.strokeRect(x - 10, y - 10, 20, 20);
  ctx.globalAlpha = 1;
}
