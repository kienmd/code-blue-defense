/* ============================================================
 * Stages — the Angry Birds-style ERA LEVEL SELECT campaign.
 * Each stage is a self-contained level: one decade, its own
 * starting hospital, budget, wave schedule, and an ERA-SCOPED
 * shop (rooms / staff / TECHNOLOGY that exist in that decade —
 * agentic AI simply does not exist before its era).
 *
 * eraIdx points into ERAS (visuals, mods, inflation, card copy).
 * budget/lives are absolute (already era-scaled by hand, tuned
 * for scarcity: ~ONE meaningful purchase per cool-off).
 * prebuilt/prestaff define the starting hospital.
 * waves reuse the shift engine (entries: {type, count, interval}).
 * Stars: 3 = zero ICU transfers, 2 = <=2, 1 = survived; extra
 * county bailouts subtract (first is free).
 * ============================================================ */

const STAGES = [
  {
    id: '1950s', eraIdx: 0, name: 'FOUND THE HOSPITAL', year: '1952',
    budget: 160000, lives: 3,
    prebuilt: [], prestaff: [],
    rooms: ['ward', 'pharmacy', 'breakroom'],
    staff: ['nurse', 'doctor'],
    tech: ['pneumo'],
    waves: [
      { entries: [{ type: 'flu', count: 3, interval: 8 }] },
      { entries: [{ type: 'flu', count: 4, interval: 6 }, { type: 'bacteria', count: 1, interval: 10 }], banner: 'FIRST BACTERIAL CASE — PHARMACY BEDS TREAT IT BEST' },
    ],
  },
  {
    id: '1960s', eraIdx: 1, name: 'THE CORONARY UNIT', year: '1963',
    budget: 620000, lives: 3,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'breakroom'],
    staff: ['nurse', 'doctor'],
    tech: ['crashcart'],
    waves: [
      { entries: [{ type: 'flu', count: 3, interval: 6 }, { type: 'bacteria', count: 2, interval: 9 }] },
      { entries: [{ type: 'cardiac', count: 1, interval: 5 }, { type: 'flu', count: 3, interval: 6 }], banner: 'CARDIAC EVENT INBOUND — CARDIOLOGY, NOW' },
      { entries: [{ type: 'cardiac', count: 2, interval: 16 }, { type: 'bacteria', count: 2, interval: 8 }] },
    ],
  },
  {
    id: '1970s-80s', eraIdx: 2, name: 'PARAMEDICS HIT THE STREETS', year: '1978',
    budget: 700000, lives: 3,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'cardiology', floor: 1, slot: 2 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon'],
    tech: ['pulseox'],
    waves: [
      { entries: [{ type: 'flu', count: 4, interval: 5 }, { type: 'trauma', count: 1, interval: 8 }], banner: 'AMBULANCES INBOUND — TRAUMA NEEDS SURGERY' },
      { entries: [{ type: 'trauma', count: 2, interval: 14 }, { type: 'bacteria', count: 2, interval: 8 }] },
      { entries: [{ type: 'trauma', count: 2, interval: 12 }, { type: 'cardiac', count: 1, interval: 6 }, { type: 'flu', count: 3, interval: 5 }] },
    ],
  },
  {
    id: '1990s', eraIdx: 3, name: 'THE VIROLOGY WING', year: '1994',
    budget: 750000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'surgery', floor: 1, slot: 2 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'nurse', post: 0 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['pacs'],
    waves: [
      { entries: [{ type: 'virus', count: 2, interval: 9 }, { type: 'flu', count: 3, interval: 5 }], banner: 'COMPLEX VIRAL CASES — BUILD THE VIROLOGY LAB' },
      { entries: [{ type: 'spore', count: 1, interval: 5 }, { type: 'virus', count: 2, interval: 10 }, { type: 'flu', count: 3, interval: 5 }], banner: 'AIRBORNE SPORE — CONTAGIOUS IN THE LOBBY. ISOLATE IT.' },
      { entries: [{ type: 'spore', count: 2, interval: 14 }, { type: 'trauma', count: 1, interval: 7 }, { type: 'bacteria', count: 3, interval: 6 }] },
    ],
  },
  {
    id: '2000s', eraIdx: 4, name: 'THE CHART GOES DIGITAL', year: '2009',
    budget: 850000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'nurse', post: 1 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['ehr'],
    waves: [
      { entries: [{ type: 'flu', count: 5, interval: 4 }, { type: 'bacteria', count: 2, interval: 8 }] },
      { entries: [{ type: 'virus', count: 2, interval: 8 }, { type: 'cardiac', count: 1, interval: 5 }, { type: 'flu', count: 3, interval: 5 }] },
      { entries: [{ type: 'trauma', count: 2, interval: 12 }, { type: 'spore', count: 1, interval: 6 }, { type: 'bacteria', count: 3, interval: 6 }] },
    ],
  },
  {
    id: '2010s', eraIdx: 5, name: 'CONNECTED + QUANTIFIED', year: '2016',
    budget: 950000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'cardiology', floor: 2, slot: 0 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'nurse', post: 0 }, { type: 'doctor', post: 3 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['telehealth'],
    waves: [
      { entries: [{ type: 'flu', count: 6, interval: 4 }, { type: 'virus', count: 2, interval: 8 }] },
      { entries: [{ type: 'cardiac', count: 2, interval: 14 }, { type: 'bacteria', count: 3, interval: 6 }, { type: 'flu', count: 3, interval: 4 }] },
      { entries: [{ type: 'spore', count: 2, interval: 12 }, { type: 'trauma', count: 2, interval: 10 }, { type: 'virus', count: 2, interval: 7 }] },
    ],
  },
  {
    id: '2020s', eraIdx: 6, name: 'THE AI DECADE', year: '2027',
    budget: 1100000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }, { type: 'cardiology', floor: 2, slot: 1 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'nurse', post: 1 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['scribe', 'priorAuth'],
    waves: [
      { entries: [{ type: 'flu', count: 6, interval: 3.5 }, { type: 'bacteria', count: 3, interval: 6 }], banner: 'AI SCRIBES AVAILABLE — YOUR STAFF JUST GOT SUPERPOWERS' },
      { entries: [{ type: 'virus', count: 3, interval: 7 }, { type: 'cardiac', count: 2, interval: 12 }, { type: 'flu', count: 4, interval: 4 }] },
      { entries: [{ type: 'spore', count: 2, interval: 10 }, { type: 'trauma', count: 3, interval: 9 }, { type: 'virus', count: 2, interval: 6 }] },
    ],
  },
  {
    id: '2040s', eraIdx: 8, name: 'THE AGENTIC WARD', year: '2044',
    budget: 1500000, lives: 5,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }, { type: 'cardiology', floor: 2, slot: 1 }, { type: 'breakroom', floor: 2, slot: 2 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'surgeon', post: 3 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['labRouter', 'scribe', 'priorAuth'],
    waves: [
      { entries: [{ type: 'flu', count: 7, interval: 3 }, { type: 'virus', count: 3, interval: 6 }], banner: 'THE LAB-ROUTER IS LIVE — LET THE AGENT RUN TRIAGE' },
      { entries: [{ type: 'cardiac', count: 3, interval: 10 }, { type: 'trauma', count: 3, interval: 8 }, { type: 'bacteria', count: 4, interval: 5 }] },
      { entries: [{ type: 'spore', count: 3, interval: 9 }, { type: 'virus', count: 4, interval: 5 }, { type: 'cardiac', count: 2, interval: 10 }, { type: 'flu', count: 5, interval: 3 }] },
    ],
  },
  {
    id: 'Y3K', eraIdx: 12, name: 'TOTAL CARE', year: '3000',
    budget: 8000000, lives: 5,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }, { type: 'cardiology', floor: 2, slot: 1 }, { type: 'breakroom', floor: 2, slot: 2 }],
    prestaff: [{ type: 'doctor', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'surgeon', post: 3 }, { type: 'nurse', post: 1 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['regenpod', 'labRouter', 'scribe', 'priorAuth'],
    waves: [
      { entries: [{ type: 'flu', count: 8, interval: 2.5 }, { type: 'spore', count: 2, interval: 8 }], banner: 'YEAR 3000 — ONE HUMAN REMAINS ON STAFF: YOU' },
      { entries: [{ type: 'cardiac', count: 4, interval: 8 }, { type: 'trauma', count: 4, interval: 7 }, { type: 'virus', count: 4, interval: 5 }] },
      { entries: [{ type: 'spore', count: 4, interval: 7 }, { type: 'cardiac', count: 3, interval: 8 }, { type: 'trauma', count: 3, interval: 7 }, { type: 'flu', count: 6, interval: 2.5 }] },
    ],
  },
];
