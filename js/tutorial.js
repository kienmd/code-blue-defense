/* ============================================================
 * Tutorial — first-run guided onboarding. A spotlight cutout
 * dims everything except the current target (DOM shop cards OR
 * canvas regions projected through the camera transform), with
 * an 8-bit instruction card. Steps advance on the ACTUAL action
 * being completed; NEXT only appears on read-only steps.
 * Skippable any time; restartable from the era select.
 * ============================================================ */

const tut = {
  active: false,
  step: 0,
  el: {
    root: document.getElementById('tutorial'),
    hole: document.getElementById('tut-hole'),
    card: document.getElementById('tut-card'),
    text: document.getElementById('tut-text'),
    next: document.getElementById('btn-tut-next'),
    skip: document.getElementById('btn-tut-skip'),
  },
};

/* World-rect -> viewport-rect through the live camera transform. */
function worldRect(wx, wy, ww, wh) {
  const rect = canvas.getBoundingClientRect();
  const k = rect.width / canvas.width;
  const v = G.view || { s: 1, ox: 0, oy: 0 };
  return {
    x: rect.left + (wx * v.s + v.ox) * k,
    y: rect.top + (wy * v.s + v.oy) * k,
    w: ww * v.s * k,
    h: wh * v.s * k,
  };
}

function domRect(el2) {
  if (!el2) return null;
  const r = el2.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/* Step table (data-driven, SHORT — one sentence per step, two max).
 * target() returns a viewport rect or null (null = no spotlight,
 * center card). done() advances action steps; there is NO timed
 * auto-dismissal anywhere — every step waits for the player. */
const TUTORIAL_STEPS = [
  {
    text: 'BUILD A GENERAL WARD, THEN HIRE A NURSE.',
    narr: 'First: a ward, and a nurse to run it.',
    target: () => G.rooms.some(r => r.typeKey === 'ward')
      ? domRect(shopButtons.staff.nurse)
      : domRect(shopButtons.rooms.ward),
    done: () => G.rooms.some(r => r.typeKey === 'ward') && G.staffList.some(s => s.typeKey === 'nurse'),
  },
  {
    text: 'CLICK THE NURSE, THEN THE WAITING ROOM — THEY\'LL DIAGNOSE ARRIVALS.',
    narr: 'Post them to the lobby. Triage is everything.',
    target: () => {
      const nurse = G.staffList.find(s => s.typeKey === 'nurse');
      if (nurse && !G.selection) return worldRect(nurse.x - 18, nurse.y - 44, 36, 54);
      return worldRect(60, floorTopY(0) - 10, 780, 90);
    },
    done: () => lobbyStaff().length > 0,
  },
  {
    text: 'PRESS START WAVE 1.',
    narr: 'When ready, start the wave.',
    target: () => domRect(el.btnShift),
    done: () => G.phase === 'shift',
  },
  {
    // card stays hidden (waitFor) until a patient is diagnosed
    text: 'CLICK THE PATIENT, THEN CLICK THE WARD.',
    narr: 'Diagnosed. Click the patient, then the ward.',
    target: () => {
      const p = waitingPatients().find(q => q.diagnosed) || waitingPatients()[0];
      if (p && !G.selection) return worldRect(p.x - 20, p.y - 50, 40, 60);
      const room = G.rooms.find(r => !r.def.support);
      return room ? worldRect(room.x, room.y, room.w, room.h) : null;
    },
    done: () => G.patients.some(p => p.room),
    waitFor: () => G.patients.some(p => p.diagnosed),
  },
  {
    text: 'HIRE A SECOND NURSE. CLICK THEM, THEN THE WARD — TREATMENT NEEDS STAFF.',
    narr: 'A bed without a nurse is just furniture. Hire another and post them to the ward.',
    target: () => {
      if (G.staffList.filter(s => s.typeKey === 'nurse').length < 2) return domRect(shopButtons.staff.nurse);
      const nurse = G.staffList.find(s => s.typeKey === 'nurse' && !(s.room instanceof Room) && s.room !== 'lobby');
      if (nurse && !G.selection) return worldRect(nurse.x - 18, nurse.y - 44, 36, 54);
      const room = G.rooms.find(r => r.beds && r.beds.some(Boolean));
      return room ? worldRect(room.x, room.y, room.w, room.h) : null;
    },
    done: () => G.rooms.some(r => r.beds && r.beds.some(Boolean) && r.staff.length > 0),
  },
  {
    // card stays hidden until the cure actually lands
    text: 'FIRST CURE! THAT\'S THE LOOP — DIAGNOSE, ALLOCATE, GET PAID.',
    narr: 'Cured, and walking out smiling. The ward is yours.',
    target: () => null,
    manual: true,
    waitFor: () => G.discharged > 0,
  },
];

/* While the tutorial runs, nothing may allocate FOR the player — the
 * two core manual actions (patient -> room, nurse -> room) must be
 * performed by hand. sim.updateAutoAssign checks this. */
function tutorialBlocksAutoAssign() { return tut.active; }

function startTutorial() {
  tut.active = true;
  tut.step = 0;
  tut.el.root.classList.remove('hidden');
  applyTutorialStep();
}

function endTutorial(completed) {
  tut.active = false;
  tut.el.root.classList.add('hidden');
  storage.set('cbd_tutorial_done', '1');
  if (completed) showBanner('TUTORIAL COMPLETE — THE WARD IS YOURS', 'info', 3);
}

function applyTutorialStep() {
  const step = TUTORIAL_STEPS[tut.step];
  if (!step) { endTutorial(true); return; }
  tut.el.text.innerHTML = step.text;
  tut.el.next.classList.toggle('hidden', !step.manual);
  if (step.narr) narrate(`tut_${tut.step}`, { always: true, text: step.narr });
}

tut.el.next.addEventListener('click', () => {
  ensureAudio(); G.sfx('assign');
  tut.step++;
  applyTutorialStep();
});
tut.el.skip.addEventListener('click', () => { ensureAudio(); G.sfx('denied'); endTutorial(false); });

/* Per-frame: reposition the spotlight (canvas targets move with the
 * camera) and auto-advance when the step's action completes. */
function updateTutorial() {
  if (!tut.active) return;
  if (G.state !== 'playing') { endTutorial(false); return; }
  // STRICT OVERLAY SEQUENCING: the tutorial never renders on top of
  // (or underneath) a modal overlay — stage intro, wave report, result,
  // menu. It hides completely and resumes when the modal is dismissed.
  if (modalUp()) { tut.el.root.classList.add('hidden'); return; }
  tut.el.root.classList.remove('hidden');
  const step = TUTORIAL_STEPS[tut.step];
  if (!step) { endTutorial(true); return; }

  // gate steps that need world state (e.g. a patient on screen)
  if (step.waitFor && !step.waitFor()) {
    tut.el.card.style.visibility = 'hidden';
    tut.el.hole.style.visibility = 'hidden';
    return;
  }
  tut.el.card.style.visibility = 'visible';
  tut.el.hole.style.visibility = 'visible';

  const r = step.target ? step.target() : null;
  if (r) {
    tut.el.hole.style.display = 'block';
    tut.el.hole.style.left = (r.x - 6) + 'px';
    tut.el.hole.style.top = (r.y - 6) + 'px';
    tut.el.hole.style.width = (r.w + 12) + 'px';
    tut.el.hole.style.height = (r.h + 12) + 'px';
    // instruction card: below the target if there's room, else above
    const cardW = Math.min(460, window.innerWidth - 24);
    const below = r.y + r.h + 12;
    tut.el.card.style.width = cardW + 'px';
    tut.el.card.style.left = Math.max(12, Math.min(window.innerWidth - cardW - 12, r.x + r.w / 2 - cardW / 2)) + 'px';
    tut.el.card.style.top = (below + 170 < window.innerHeight ? below : Math.max(12, r.y - 180)) + 'px';
  } else {
    tut.el.hole.style.display = 'none';
    const cardW = Math.min(460, window.innerWidth - 24);
    tut.el.card.style.width = cardW + 'px';
    tut.el.card.style.left = (window.innerWidth / 2 - cardW / 2) + 'px';
    tut.el.card.style.top = (window.innerHeight * 0.3) + 'px';
  }

  if (step.done && step.done()) {
    G.sfx('diagnose');
    tut.step++;
    applyTutorialStep();
  }
}
