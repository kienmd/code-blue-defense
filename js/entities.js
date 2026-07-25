/* ============================================================
 * Entities: Patient (creep), Tower (human staff), FX helpers,
 * and the shared pixel-sprite painters (used on the canvas AND
 * for the shop icons, so art stays in one place).
 * ============================================================ */

let PATIENT_SEQ = 1;

class Patient {
  constructor(typeKey, pathPx) {
    this.id = PATIENT_SEQ++;
    this.typeKey = typeKey;
    this.def = PATIENT_TYPES[typeKey];
    this.pathPx = pathPx;
    this.seg = 0;                       // current checkpoint segment
    this.x = pathPx[0].x;
    this.y = pathPx[0].y;
    this.health = 100;                  // 0 => crash (lose a life)
    this.complexity = this.def.complexity; // 0 => discharged
    this.maxComplexity = this.def.complexity;
    this.untreatedTime = 0;
    this.assessed = false;              // tagged by a Triage Nurse
    this.slowMult = 1;                  // reset each frame; nurses lower it
    this.outcome = null;                // 'discharged' | 'crashed' | 'leaked'
    this.aiTag = null;                  // set by the Agentic Lab-Router
    this.bob = Math.random() * Math.PI * 2;
  }

  // Speed escalation: untreated patients start wandering ICU-ward faster.
  escalation() {
    const over = Math.max(0, this.untreatedTime - UNTREATED_GRACE);
    return Math.min(ESCALATION_CAP, 1 + over * ESCALATION_RATE);
  }

  update(dt) {
    if (this.outcome) return;
    this.untreatedTime += dt;
    this.health -= this.def.decay * dt;

    if (this.complexity <= 0) { this.outcome = 'discharged'; return; }
    if (this.health <= 0)     { this.outcome = 'crashed';    return; }

    let remaining = this.def.speed * this.escalation() * this.slowMult * dt;
    while (remaining > 0 && this.seg < this.pathPx.length - 1) {
      const tgt = this.pathPx[this.seg + 1];
      const dx = tgt.x - this.x, dy = tgt.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= remaining) {
        this.x = tgt.x; this.y = tgt.y;
        remaining -= dist;
        this.seg++;
      } else {
        this.x += (dx / dist) * remaining;
        this.y += (dy / dist) * remaining;
        remaining = 0;
      }
    }
    if (this.seg >= this.pathPx.length - 1) this.outcome = 'leaked';
  }

  // Distance progressed along the path — used for 'first' targeting.
  progress() {
    let d = 0;
    for (let i = 0; i < this.seg; i++) {
      d += Math.hypot(this.pathPx[i + 1].x - this.pathPx[i].x, this.pathPx[i + 1].y - this.pathPx[i].y);
    }
    d += Math.hypot(this.x - this.pathPx[this.seg].x, this.y - this.pathPx[this.seg].y);
    return d;
  }
}

class Tower {
  constructor(typeKey, tx, ty) {
    this.typeKey = typeKey;
    this.def = TOWER_TYPES[typeKey];
    this.tx = tx; this.ty = ty;         // top-left tile of footprint
    const f = this.def.footprint;
    this.cx = (tx + f / 2) * TILE;      // pixel center
    this.cy = (ty + f / 2) * TILE;
    this.stress = 0;                    // 0-100 => burnout
    this.burnoutUntil = 0;
    this.cooldown = 0;
    this.scribe = false;                // Ambient AI Scribe attached
  }

  tiles() {
    const out = [];
    const f = this.def.footprint;
    for (let dx = 0; dx < f; dx++) for (let dy = 0; dy < f; dy++) out.push([this.tx + dx, this.ty + dy]);
    return out;
  }

  isBurnedOut(time) { return time < this.burnoutUntil; }

  update(game, dt) {
    const time = game.time;
    if (this.isBurnedOut(time)) return;
    if (this.stress >= 100) {
      // BURNOUT: freeze for 8 seconds, then return refreshed.
      this.burnoutUntil = time + BURNOUT_SECONDS;
      this.stress = 0;
      game.addText(this.cx, this.cy - 20, 'BURNOUT!', PALETTE.red);
      game.sfx('burnout');
      return;
    }

    if (this.def.kind === 'slow') {
      // Passive aura: slow + tag every patient in radius. No stress cost.
      for (const p of game.patients) {
        if (p.outcome) continue;
        if (Math.hypot(p.x - this.cx, p.y - this.cy) <= this.def.range) {
          p.slowMult = Math.min(p.slowMult, this.def.slowFactor);
          if (!p.assessed) { p.assessed = true; game.addText(p.x, p.y - 16, 'ASSESSED', PALETTE.blue, 0.8); }
        }
      }
      return;
    }

    // Attack towers (GP / Cardiologist)
    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const inRange = game.patients.filter(p =>
      !p.outcome && p.complexity > 0 &&
      Math.hypot(p.x - this.cx, p.y - this.cy) <= this.def.range);
    if (inRange.length === 0) return;

    let target;
    if (this.def.targeting === 'complex') {
      target = inRange.reduce((a, b) => (b.complexity > a.complexity ? b : a));
    } else {
      target = inRange.reduce((a, b) => (b.progress() > a.progress() ? b : a));
    }

    // GAME MATH: the Ambient AI Scribe multiplies rate x1.3 and
    // halves stress gain; the level's burnoutMod scales stress up
    // in harsher hospitals (Inner-City ER = 1.5x).
    const rate = this.def.rate * (this.scribe ? UPGRADE_TYPES.scribe.rateMult : 1);
    const stressGain = this.def.stressPerAction
      * (this.scribe ? UPGRADE_TYPES.scribe.stressMult : 1)
      * game.level.burnoutMod;

    target.complexity -= this.def.dmg;
    this.stress = Math.min(100, this.stress + stressGain);
    this.cooldown = 1 / rate;
    game.beams.push({ x1: this.cx, y1: this.cy - 8, x2: target.x, y2: target.y, t: 0.15, color: this.typeKey === 'cardio' ? PALETTE.red : PALETTE.blue });
    game.sfx('treat');
  }
}

/* ---------- Pixel sprite painters ---------- */

function drawStaffSprite(ctx, typeKey, cx, cy, s = 1) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.scale(s, s);
  if (typeKey === 'nurse') {
    ctx.fillStyle = '#f2b8a0'; ctx.fillRect(-4, -12, 8, 6);            // head
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-5, -15, 10, 4);       // cap
    ctx.fillStyle = PALETTE.red; ctx.fillRect(-1, -15, 2, 4);          // cap cross
    ctx.fillStyle = '#7fd4e8'; ctx.fillRect(-6, -6, 12, 12);           // scrubs
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -4, 4, 6);         // apron
  } else if (typeKey === 'gp') {
    ctx.fillStyle = '#e8b088'; ctx.fillRect(-4, -12, 8, 6);            // head
    ctx.fillStyle = '#5a4632'; ctx.fillRect(-5, -14, 10, 3);           // hair
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-7, -6, 14, 13);       // lab coat
    ctx.fillStyle = '#7fd4e8'; ctx.fillRect(-2, -6, 4, 7);             // shirt
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-2, -5, 1, 6); ctx.fillRect(1, -5, 1, 6); // stethoscope
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-1, 0, 2, 2);            // bell
  } else if (typeKey === 'cardio') {
    ctx.fillStyle = '#d8a078'; ctx.fillRect(-5, -16, 10, 7);           // head
    ctx.fillStyle = '#c8ccd0'; ctx.fillRect(-6, -18, 12, 3);           // grey hair
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-9, -9, 18, 17);       // long coat
    ctx.fillStyle = PALETTE.red; ctx.fillRect(-3, -7, 6, 5);           // heart logo
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-1, -6, 2, 2);
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-6, -2, 3, 2); ctx.fillRect(3, -2, 3, 2); // pockets
  }
  ctx.restore();
}

function drawPatientSprite(ctx, typeKey, cx, cy, bobPhase = 0, s = 1) {
  const def = PATIENT_TYPES[typeKey];
  const bob = Math.round(Math.sin(bobPhase) * 1.5);
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy + bob));
  ctx.scale(s, s);
  ctx.fillStyle = '#f2c8a8'; ctx.fillRect(-3, -10, 6, 5);              // head
  ctx.fillStyle = def.color; ctx.fillRect(-5, -5, 10, 9);              // gown
  ctx.fillStyle = def.accent; ctx.fillRect(-5, 2, 10, 2);              // gown hem
  ctx.fillStyle = PALETTE.white; ctx.fillRect(-2, -4, 4, 4);           // patch
  ctx.fillStyle = PALETTE.red;                                          // red cross
  ctx.fillRect(-1, -4, 2, 4); ctx.fillRect(-2, -3, 4, 2);
  ctx.restore();
}

function drawUpgradeIcon(ctx, key, cx, cy, s = 1) {
  ctx.save();
  ctx.translate(Math.round(cx), Math.round(cy));
  ctx.scale(s, s);
  if (key === 'scribe') {
    // glowing blue floppy disk
    ctx.fillStyle = PALETTE.deepBlue; ctx.fillRect(-7, -7, 14, 14);
    ctx.fillStyle = PALETTE.blue; ctx.fillRect(-7, -7, 12, 2);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-4, -7, 8, 5);
    ctx.fillStyle = PALETTE.deepBlue; ctx.fillRect(1, -6, 2, 3);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-4, 1, 8, 6);
    ctx.fillStyle = PALETTE.blue; ctx.fillRect(-3, 3, 6, 1);
  } else if (key === 'labRouter') {
    // terminal with routing arrows
    ctx.fillStyle = PALETTE.ink; ctx.fillRect(-8, -6, 16, 12);
    ctx.fillStyle = '#0c2818'; ctx.fillRect(-6, -4, 12, 8);
    ctx.fillStyle = PALETTE.toxic; ctx.fillRect(-5, -3, 6, 1); ctx.fillRect(-5, -1, 8, 1); ctx.fillRect(-5, 1, 4, 1);
    ctx.fillStyle = PALETTE.green; ctx.fillRect(5, -1, 2, 1);
  } else if (key === 'priorAuth') {
    // stamped document
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-6, -8, 12, 16);
    ctx.fillStyle = PALETTE.grey; ctx.fillRect(-4, -6, 8, 1); ctx.fillRect(-4, -4, 8, 1); ctx.fillRect(-4, -2, 6, 1);
    ctx.fillStyle = PALETTE.green; ctx.fillRect(-3, 1, 7, 5);
    ctx.fillStyle = PALETTE.white; ctx.fillRect(-1, 2, 1, 1); ctx.fillRect(0, 3, 1, 1); ctx.fillRect(1, 2, 1, 1); // check
  }
  ctx.restore();
}
