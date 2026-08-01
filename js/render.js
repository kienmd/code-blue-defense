/* ============================================================
 * Render — the whole frame: building cross-section, rooms,
 * entities, particles, speech bubbles, overlays. Reads G,
 * never mutates it (except the hover-tooltip bookkeeping).
 * ============================================================ */

const FONT = '7px "Press Start 2P", monospace';

/* The era whose LOOK is in force — fixed per stage (era level select). */
function eraNow() { return currentEra(); }

function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  /* ---- Camera: ease zoom toward fitting the visible floors ----
   * Few floors => zoomed in (big sprites); more floors => eased out.
   * Uniform scale + translate; input.js inverts G.view for clicks. */
  const topFloor = topVisibleFloor();
  const worldTop = floorTopY(topFloor) - 40;               // roof sign headroom
  const worldH = GROUND_Y + 30 - worldTop;                 // + curb strip for era street props
  // Fit the building plus a narrow curb on each side — enough for the
  // parked era vehicle + a skyline sliver without shrinking sprites much.
  const bldX = -100, bldW = 900 - bldX;
  const widthFit = canvas.width / bldW;
  const targetZoom = Math.min(widthFit, canvas.height / worldH);
  G.zoom += (targetZoom - G.zoom) * ZOOM_EASE;
  const s = G.zoom;
  const ox = (canvas.width - bldW * s) / 2 - bldX * s;
  const oy = (canvas.height - worldH * s) / 2 - worldTop * s;
  G.view = { s, ox, oy };
  const era = eraNow();                                    // drives every era visual below

  // Era night sky + stars (screen space, full canvas)
  const bd = era.backdrop || {};
  ctx.fillStyle = bd.sky || PALETTE.night;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#3a4a6a';
  const skyH = Math.max(1, worldTop * s + oy);
  for (let i = 0; i < 30; i++) {
    ctx.fillRect((i * 137 + 40) % canvas.width, (i * 71 + 10) % skyH, 2, 2);
  }

  ctx.setTransform(s, 0, 0, s, ox, oy);                    // ---- world space ----

  drawSkyline(bd, worldTop);
  drawCrosser(bd, worldTop);

  // Street (overdraw sideways/down to cover canvas gutters at low zoom)
  ctx.fillStyle = '#161c2e';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 400);
  ctx.fillStyle = '#242e48';
  ctx.fillRect(-400, GROUND_Y, WORLD_W + 800, 3);
  drawStreetProp(bd);
  if (G.ambulance) drawAmbulance(bd);

  // Building shell — the exterior AGES with the era (brick -> concrete
  // -> glass -> holo), driven by ERAS[*].shell / roofStyle.
  const bTop = floorTopY(topFloor);
  ctx.fillStyle = era.shell || PALETTE.building;
  ctx.fillRect(32, bTop - 14, 848 - 8, GROUND_Y - bTop + 14);
  if (era.roofStyle === 'cross' || era.roofStyle === 'water') {
    // brick/concrete courses on the parapet edges
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (let yy = bTop; yy < GROUND_Y; yy += 10) { ctx.fillRect(32, yy, 6, 2); ctx.fillRect(866, yy, 6, 2); }
  }
  drawRoof(era, bTop);
  ctx.font = FONT;
  ctx.fillStyle = era.roofStyle === 'glass' || era.roofStyle === 'helipad' || era.roofStyle === 'holo'
    ? PALETTE.blue : PALETTE.white;
  ctx.textAlign = 'left';
  ctx.fillText(`CODE BLUE GENERAL \u00b7 ${era.sign}`, 420, bTop - 20);

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

/* ---------- Era backdrop: the city outside dates the stage ---------- */

/* Distant skyline silhouette behind/left+right of the hospital.
 * lowrise (1950s brick town) -> midrise -> highrise -> glass -> future. */
function drawSkyline(bd, worldTop) {
  const style = bd.skyline || 'lowrise';
  ctx.fillStyle = 'rgba(13,22,38,0.9)';
  const blocks = {
    lowrise:  [[-320, 60, 90], [-190, 40, 70], [900, 50, 80], [1030, 34, 60], [1150, 46, 80]],
    midrise:  [[-330, 120, 80], [-210, 90, 70], [-110, 140, 60], [900, 110, 70], [1000, 150, 60], [1090, 90, 80]],
    highrise: [[-340, 220, 70], [-250, 170, 60], [-160, 260, 70], [900, 240, 66], [990, 180, 60], [1070, 280, 70]],
    glass:    [[-340, 260, 70], [-250, 320, 62], [-160, 220, 70], [900, 300, 66], [990, 240, 60], [1070, 340, 70]],
    future:   [[-330, 340, 56], [-250, 280, 44], [-180, 400, 50], [910, 380, 50], [990, 300, 44], [1060, 430, 56]],
    y3k:      [[-330, 420, 46], [-260, 340, 36], [-190, 480, 42], [910, 460, 42], [980, 380, 36], [1050, 520, 48]],
  }[style] || [];
  for (const [x, h, w] of blocks) {
    ctx.fillRect(x, GROUND_Y - h, w, h);
    // lit windows
    ctx.fillStyle = style === 'future' || style === 'y3k' ? 'rgba(120,220,255,0.35)' : 'rgba(230,200,120,0.28)';
    for (let wy = GROUND_Y - h + 8; wy < GROUND_Y - 8; wy += 16) {
      for (let wx = x + 6; wx < x + w - 6; wx += 14) {
        if (((wx * 7 + wy * 13) | 0) % 3 === 0) ctx.fillRect(wx, wy, 4, 5);
      }
    }
    if (style === 'y3k') {                       // floating tier
      ctx.fillStyle = 'rgba(160,90,230,0.5)';
      ctx.fillRect(x + 6, GROUND_Y - h - 18, w - 12, 8);
    }
    ctx.fillStyle = 'rgba(13,22,38,0.9)';
  }
}

/* One animated sky-crosser per era: prop plane -> jet -> copter ->
 * drone -> flying car -> UFO. Loops on a long period. */
function drawCrosser(bd, worldTop) {
  const kind = bd.crosser || 'plane';
  const period = 26;                             // seconds per crossing
  const f = ((G.time % period) / period);
  const x = -80 + f * (WORLD_W + 200);
  const y = worldTop - 60 + Math.sin(G.time * 0.8) * 4;
  ctx.save();
  if (kind === 'plane') {
    ctx.fillStyle = '#9aa4b4';
    ctx.fillRect(x, y, 26, 5);                    // fuselage
    ctx.fillRect(x + 8, y - 5, 6, 5);             // tail
    ctx.fillRect(x + 10, y + 4, 10, 3);           // wing
    const spin = Math.floor(G.time * 12) % 2 === 0;
    ctx.fillRect(x + 26, y + (spin ? -2 : 2), 2, 5); // prop blur
  } else if (kind === 'jet') {
    ctx.fillStyle = '#c8d0dc';
    ctx.fillRect(x, y, 34, 5);
    ctx.fillRect(x + 4, y - 5, 6, 5);
    ctx.fillRect(x + 12, y + 4, 14, 3);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';     // contrail
    ctx.fillRect(x - 40, y + 2, 38, 2);
  } else if (kind === 'copter') {
    ctx.fillStyle = '#8a94a4';
    ctx.fillRect(x, y, 20, 7);
    ctx.fillRect(x - 8, y + 2, 8, 3);
    const spin = Math.floor(G.time * 16) % 2 === 0;
    ctx.fillRect(x - 2 + (spin ? 0 : 4), y - 3, spin ? 24 : 16, 2);
  } else if (kind === 'drone') {
    ctx.fillStyle = '#5a6a7a';
    ctx.fillRect(x, y, 12, 4);
    const spin = Math.floor(G.time * 20) % 2 === 0;
    ctx.fillRect(x - 4, y - 2, spin ? 6 : 4, 2);
    ctx.fillRect(x + 10, y - 2, spin ? 6 : 4, 2);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 5, y + 4, 2, 2);             // payload light
  } else if (kind === 'flyingcar') {
    ctx.fillStyle = '#c86a3a';
    ctx.fillRect(x, y, 22, 6);
    ctx.fillStyle = '#8ad8f0';
    ctx.fillRect(x + 4, y - 4, 10, 4);            // canopy
    ctx.fillStyle = 'rgba(120,220,255,0.5)';
    ctx.fillRect(x + 2, y + 6, 4, 3); ctx.fillRect(x + 16, y + 6, 4, 3); // thrusters
  } else if (kind === 'ufo') {
    const bob = Math.sin(G.time * 2.4) * 3;
    ctx.fillStyle = '#9a8ae0';
    ctx.fillRect(x, y + bob, 28, 5);
    ctx.fillStyle = '#c8f0f8';
    ctx.fillRect(x + 9, y - 4 + bob, 10, 4);      // dome
    const blink = Math.floor(G.time * 4) % 3;
    ctx.fillStyle = '#40e05a';
    ctx.fillRect(x + 4 + blink * 8, y + 5 + bob, 3, 2);
  }
  ctx.restore();
}

/* FLAVOR EVENT: an ambulance pulls up, delivers a patient, drives off.
 * Era-dressed: rounded wagon in the early days, boxy lightbar rig in
 * the modern eras, hover rig in the far future (keyed off bd.street). */
function drawAmbulance(bd) {
  const a = G.ambulance;
  const y = GROUND_Y + 6;
  // motion: drive in (0..1.5s), hold with doors open, reverse out (2.6s+)
  // stops just left of the ER door (view fits world x >= -100)
  const stopX = -42;
  let x;
  if (a.t < 1.5) x = -420 + (a.t / 1.5) * (stopX + 420);
  else if (a.t < 2.6) x = stopX;
  else x = stopX - (a.t - 2.6) * 220;

  const hover = (bd.street === 'hover');
  const bob = hover ? Math.sin(G.time * 3) * 2 : 0;
  ctx.save();
  ctx.translate(x, y + bob);
  if (hover) {
    ctx.fillStyle = '#c8d0e8';
    ctx.fillRect(0, -8, 62, 14);
    ctx.fillStyle = 'rgba(120,220,255,0.5)';
    ctx.fillRect(6, 7, 10, 4); ctx.fillRect(46, 7, 10, 4);   // thrusters
  } else if (bd.street === 'oldcar') {
    // rounded mid-century wagon
    ctx.fillStyle = '#e8e8e0';
    ctx.fillRect(0, -4, 64, 16);
    ctx.fillRect(10, -14, 38, 10);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(8, 10, 10, 8); ctx.fillRect(44, 10, 10, 8);
  } else {
    // boxy paramedic rig
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(0, -14, 46, 26);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(0, -3, 46, 4);                              // belt stripe
    ctx.fillStyle = '#e8e8e0';
    ctx.fillRect(46, -8, 16, 20);                            // cab
    ctx.fillStyle = '#8ad8f0';
    ctx.fillRect(49, -6, 9, 7);                              // windshield
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(6, 10, 9, 8); ctx.fillRect(48, 10, 9, 8);
  }
  // red cross + flashing lights on every variant
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(20, hover ? -6 : -12, 10, 10);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(24, hover ? -4 : -10, 2, 6); ctx.fillRect(21, hover ? -2 : -8, 8, 2);
  const flash = Math.floor(G.time * 6) % 2 === 0;
  ctx.fillStyle = flash ? PALETTE.red : '#4aa3df';
  ctx.fillRect(hover ? 26 : 14, hover ? -12 : -18, 6, 3);
  ctx.fillStyle = flash ? '#4aa3df' : PALETTE.red;
  ctx.fillRect(hover ? 34 : 24, hover ? -12 : -18, 6, 3);
  ctx.restore();
}

/* Parked street prop by the entrance: era car -> EV -> hover gurney. */
function drawStreetProp(bd) {
  const kind = bd.street || 'oldcar';
  const x = -110, y = GROUND_Y + 8;
  if (kind === 'oldcar') {
    // rounded 1950s ambulance-wagon
    ctx.fillStyle = '#d8d8d0';
    ctx.fillRect(x, y, 64, 16);
    ctx.fillRect(x + 10, y - 10, 36, 10);
    ctx.fillStyle = PALETTE.red;
    ctx.fillRect(x + 24, y + 2, 10, 10);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(x + 28, y + 3, 2, 8); ctx.fillRect(x + 25, y + 6, 8, 2);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 8, y + 12, 10, 8); ctx.fillRect(x + 44, y + 12, 10, 8);
  } else if (kind === 'sedan') {
    ctx.fillStyle = '#7a2a2a';
    ctx.fillRect(x, y + 2, 66, 12);
    ctx.fillRect(x + 14, y - 6, 34, 8);
    ctx.fillStyle = '#aad0e8';
    ctx.fillRect(x + 18, y - 4, 12, 6); ctx.fillRect(x + 34, y - 4, 10, 6);
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 8, y + 12, 10, 8); ctx.fillRect(x + 46, y + 12, 10, 8);
  } else if (kind === 'ev') {
    ctx.fillStyle = '#e8e8ec';
    ctx.fillRect(x, y + 2, 62, 12);
    ctx.fillStyle = '#28303c';
    ctx.fillRect(x + 10, y - 5, 42, 8);
    ctx.fillStyle = '#40e05a';
    ctx.fillRect(x + 54, y + 6, 6, 3);            // charge light
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + 8, y + 12, 10, 8); ctx.fillRect(x + 42, y + 12, 10, 8);
  } else if (kind === 'hover') {
    const bob = Math.sin(G.time * 3) * 2;
    ctx.fillStyle = '#8a9ae0';
    ctx.fillRect(x, y - 4 + bob, 58, 10);
    ctx.fillStyle = '#c8f0f8';
    ctx.fillRect(x + 8, y - 10 + bob, 20, 6);
    ctx.fillStyle = 'rgba(120,220,255,0.5)';
    ctx.fillRect(x + 6, y + 7 + bob, 8, 4); ctx.fillRect(x + 42, y + 7 + bob, 8, 4);
  }
}

/* Roofline: parapet + era props. Every era keeps the red cross (it's
 * a hospital); what sits beside it marks the decade. */
function drawRoof(era, bTop) {
  // parapet
  ctx.fillStyle = PALETTE.frame;
  ctx.fillRect(32, bTop - 14, 840, 14);
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(32, bTop - 14, 840, 3);
  // the constant: red cross sign
  ctx.fillStyle = PALETTE.red;
  ctx.fillRect(388, bTop - 34, 20, 20);
  ctx.fillStyle = PALETTE.white;
  ctx.fillRect(396, bTop - 30, 4, 12); ctx.fillRect(392, bTop - 26, 12, 4);

  const style = era.roofStyle || 'cross';
  if (style === 'cross') {
    // 1950s-60s: brick chimney + wire antenna
    ctx.fillStyle = '#4a2c20';
    ctx.fillRect(120, bTop - 34, 16, 20);
    ctx.fillStyle = '#3a2018';
    ctx.fillRect(118, bTop - 36, 20, 4);
    ctx.fillStyle = '#8a94a4';
    ctx.fillRect(760, bTop - 40, 2, 26);
    ctx.fillRect(752, bTop - 34, 18, 2);
  } else if (style === 'water') {
    // 70s-80s: rooftop water tower + AC box
    ctx.fillStyle = '#6a5844';
    ctx.fillRect(110, bTop - 44, 34, 22);
    ctx.fillStyle = '#57483a';
    ctx.fillRect(106, bTop - 48, 42, 6);
    ctx.fillRect(114, bTop - 22, 4, 8); ctx.fillRect(136, bTop - 22, 4, 8);
    ctx.fillStyle = '#8a94a4';
    ctx.fillRect(720, bTop - 26, 26, 12);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(724, bTop - 22, 18, 2);
  } else if (style === 'ac') {
    // 1990s: twin HVAC units + antenna
    ctx.fillStyle = '#8a94a4';
    ctx.fillRect(120, bTop - 26, 26, 12); ctx.fillRect(160, bTop - 26, 26, 12);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillRect(124, bTop - 22, 18, 2); ctx.fillRect(164, bTop - 22, 18, 2);
    ctx.fillStyle = '#aab4c4';
    ctx.fillRect(770, bTop - 44, 2, 30);
    ctx.fillRect(764, bTop - 38, 14, 2);
  } else if (style === 'glass') {
    // 2000s-10s: glass parapet gleam + illuminated sign backing
    ctx.fillStyle = 'rgba(122,180,255,0.25)';
    ctx.fillRect(32, bTop - 12, 840, 10);
    ctx.fillStyle = 'rgba(74,163,223,0.28)';
    ctx.fillRect(414, bTop - 32, 260, 16);
    ctx.fillStyle = '#aab4c4';
    ctx.fillRect(140, bTop - 40, 2, 26); ctx.fillRect(134, bTop - 34, 14, 2);
  } else if (style === 'helipad') {
    // 2020s-30s: helipad + blinking beacon
    ctx.fillStyle = '#39445c';
    ctx.fillRect(96, bTop - 20, 80, 8);
    ctx.fillStyle = PALETTE.white;
    ctx.fillRect(128, bTop - 18, 4, 5); ctx.fillRect(140, bTop - 18, 4, 5); ctx.fillRect(130, bTop - 16, 12, 2);
    const blink = Math.floor(G.time * 2) % 2 === 0;
    ctx.fillStyle = blink ? PALETTE.brightRed : '#5a2020';
    ctx.fillRect(770, bTop - 24, 4, 4);
    ctx.fillStyle = '#8a94a4';
    ctx.fillRect(771, bTop - 20, 2, 8);
  } else if (style === 'holo') {
    // 2040s+: floating holo-spire, pulsing
    const pulse = 0.5 + 0.5 * Math.sin(G.time * 3);
    ctx.fillStyle = '#7a68d8';
    ctx.fillRect(136, bTop - 46, 4, 32);
    ctx.globalAlpha = 0.35 + 0.35 * pulse;
    ctx.fillStyle = '#c858e8';
    ctx.fillRect(128, bTop - 54, 20, 6);
    ctx.fillRect(132, bTop - 62, 12, 4);
    ctx.globalAlpha = 0.2 + 0.2 * pulse;
    ctx.fillRect(414, bTop - 34, 260, 20);                 // sign halo
    ctx.globalAlpha = 1;
  }
}

/* Age of War-style decade card: slides in from the left, SITS for
 * several seconds (click to skip), fades out. Arrivals hold while
 * it's up — reading it is never punished. Screen space. */
function drawEraCard(card) {
  const IN = 0.5, HOLD = ERA_CARD_HOLD;                    // + fade = ERA_CARD_SECONDS
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
  // era wall wash — the interior dates itself along with the roofline
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = eraNow().wall;
  ctx.fillRect(ELEV_X + ELEV_W, top + 2, 872 - ELEV_X - ELEV_W, FLOOR_H - 6);
  ctx.globalAlpha = 1;
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
  // lit interior: era wall base, tinted by room type
  ctx.fillStyle = '#20293e';
  ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = eraNow().wall;
  ctx.fillRect(x + 2, y + 2, w - 4, h - 6);
  ctx.globalAlpha = 1;
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
    drawPatientSprite(ctx, p.x, p.y - 6, 0, 'sick', p.typeKey, G.time, p.look, eraNow().people);
    ctx.globalAlpha = 1;
    return;
  }
  const mood = p.state === 'exiting' ? 'happy' : 'sick';
  drawPatientSprite(ctx, p.x, p.y, G.time * 5 + p.bob, mood, p.typeKey, G.time + p.bob, p.look, eraNow().people);
  if (p.state === 'exiting') return;                       // cured: no bars, no germ

  // FLAVOR: the screaming sprinter gets a big flashing '!'
  if (p.screamUntil && G.time < p.screamUntil) {
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillStyle = Math.floor(G.time * 8) % 2 === 0 ? PALETTE.red : PALETTE.amber;
    ctx.fillText('!', p.x + 10, p.y - 38);
    ctx.font = FONT;
  }

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
  // era outfit: scrub palette marches through the decades
  drawStaffSprite(ctx, s.typeKey, s.x, s.y, s.state === 'walking' ? G.time * 9 : 0, eraNow().scrub, s.look);
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
