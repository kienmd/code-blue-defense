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

/* Step table (data-driven). target() returns a viewport rect or null
 * (null = no spotlight, center card). done() advances action steps. */
const TUTORIAL_STEPS = [
  {
    text: 'THIS IS YOUR HOSPITAL, 1952.<br/>PATIENTS ARRIVE AT THE LOBBY DOOR (LEFT). YOUR JOB: NOBODY LEAVES ON A STRETCHER.',
    narr: 'Welcome to your hospital. Try not to lose anyone.',
    target: () => worldRect(24, floorTopY(0) - 20, 856, 100),
    manual: true,
  },
  {
    text: 'BUILD A GENERAL WARD.<br/>CLICK THE CARD — IT LANDS IN THE NEXT OPEN SLOT AUTOMATICALLY.',
    narr: 'First, a ward. Click the card and the builders do the rest.',
    target: () => domRect(shopButtons.rooms.ward),
    done: () => G.rooms.some(r => r.typeKey === 'ward'),
  },
  {
    text: 'NOW HIRE A NURSE.',
    narr: 'A hospital is its people. Hire a nurse.',
    target: () => domRect(shopButtons.staff.nurse),
    done: () => G.staffList.some(s => s.typeKey === 'nurse'),
  },
  {
    text: 'POST HER TO THE LOBBY: CLICK THE WAITING-ROOM AREA.<br/>LOBBY STAFF ASSESS WALK-INS SO YOU KNOW WHAT AILS THEM.',
    narr: 'Post her to the lobby. Triage is everything.',
    target: () => worldRect(60, floorTopY(0) - 10, 780, 90),
    done: () => lobbyStaff().length > 0,
  },
  {
    text: 'HIRE A DOCTOR, THEN CLICK YOUR WARD TO STATION HIM THERE.<br/>DOCTORS TREAT FAST — AND DIAGNOSE EVEN FASTER.',
    narr: 'Now a doctor for the ward. The expensive kind of useful.',
    target: () => domRect(shopButtons.staff.doctor),
    done: () => G.staffList.some(s => s.typeKey === 'doctor' && s.room instanceof Room),
  },
  {
    text: 'READY? START THE WAVE.<br/>NO ONE ARRIVES UNTIL YOU DO — BUILD AT YOUR OWN PACE.',
    narr: 'When ready, start the wave. They will come.',
    target: () => domRect(el.btnShift),
    done: () => G.phase === 'shift',
  },
  {
    text: 'A PATIENT! HOVER THEM TO HEAR THE PRESENTING COMPLAINT.<br/>THE TIMER OVER THEIR HEAD IS THEIR WAIT — DON\'T LET IT RUN RED.',
    narr: 'Hover a patient and they will tell you what hurts.',
    target: () => {
      const p = waitingPatients()[0];
      return p ? worldRect(p.x - 20, p.y - 50, 40, 60) : worldRect(60, floorTopY(0) - 10, 300, 90);
    },
    done: () => G.patients.some(p => p.diagnosed),
    waitFor: () => G.patients.length > 0,
  },
  {
    text: 'DIAGNOSED! NOW CLICK THE PATIENT, THEN CLICK THE WARD.<br/>RIGHT ROOM = FULL SPEED + FULL REIMBURSEMENT.',
    narr: 'Diagnosed. Click the patient, then the ward. A bed awaits.',
    target: () => {
      const p = waitingPatients().find(q => q.diagnosed) || waitingPatients()[0];
      return p ? worldRect(p.x - 20, p.y - 50, 40, 60) : null;
    },
    done: () => G.patients.some(p => p.room),
  },
  {
    text: 'TREATMENT UNDERWAY — THE ORANGE BAR IS THE SICKNESS. WHEN IT EMPTIES, THEY WALK OUT SMILING (AND THE HOSPITAL GETS PAID).',
    narr: 'Now medicine does its work. Watch the sickness bar fall.',
    target: () => {
      const p = G.patients.find(q => q.room);
      return p ? worldRect(p.x - 24, p.y - 50, 48, 64) : null;
    },
    done: () => G.discharged > 0,
  },
  {
    text: 'CURED! CLEAR EVERY WAVE TO FINISH THE STAGE.<br/>EACH ERA CARD ON THE MENU IS A NEW DECADE: NEW TECH, NEW DISEASES, NEW HOSPITAL. GOOD LUCK OUT THERE.',
    narr: 'Cured. The decades ahead bring wonders. Carry on.',
    target: () => null,
    manual: true,
  },
];

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
