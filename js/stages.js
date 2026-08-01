/* ============================================================
 * Stages — the era level-select campaign, compressed to FOUR
 * stages (user call, v3 of the run structure):
 *
 *   19XX — 20th-century medicine (1950s-90s in one sweep)
 *   2XXX — the digital era (EHR / internet / smartphones)
 *   2026 — today: agentic AI enters the clinic
 *   Y26  — far-future bonus (certified fantasy)
 *
 * Each stage is a self-contained level with ~3 waves: its own
 * starting hospital, budget, wave schedule, and an era-scoped
 * shop (rooms / staff / TECHNOLOGY that exist in that span —
 * agentic AI simply does not exist before 2026).
 *
 * eraIdx points into ERAS (visuals, mods, inflation). The
 * optional `intro` block overrides the era's learning-card copy
 * so one stage can teach its whole span of inventions.
 * Stars: 3 = zero ICU transfers, 2 = <=2, 1 = survived; extra
 * county bailouts subtract (first is free).
 * ============================================================ */

const STAGES = [
  {
    id: '19XX', eraIdx: 1, name: 'THE CENTURY OF MEDICINE', year: '19XX',
    budget: 185000, lives: 3,
    prebuilt: [], prestaff: [],
    rooms: ['ward', 'pharmacy', 'cardiology', 'breakroom'],
    staff: ['nurse', 'doctor'],
    tech: ['pneumo', 'crashcart', 'pulseox'],
    intro: {
      title: '19XX — THE CENTURY OF MEDICINE',
      sub: 'FROM PAPER CHARTS TO PARAMEDICS',
      tech: [
        '1953 — HEART-LUNG MACHINE + THE ICU',
        '1960 — CPR STANDARDIZED, CRASH CARTS ROLL',
        '1971 — CT SCANNER SEES INSIDE THE BODY',
        '1983 — PULSE OXIMETERS ON EVERY FINGER',
      ],
      impact: 'ANESTHESIA DEATHS FALL TENFOLD; HEART ATTACKS STOP BEING A DEATH SENTENCE.',
    },
    waves: [
      { entries: [{ type: 'flu', count: 3, interval: 8 }] },
      { entries: [{ type: 'flu', count: 3, interval: 6 }, { type: 'bacteria', count: 2, interval: 10 }], banner: 'BACTERIAL CASES — PHARMACY BEDS TREAT THEM BEST' },
      { entries: [{ type: 'cardiac', count: 1, interval: 16 }, { type: 'flu', count: 3, interval: 6 }, { type: 'bacteria', count: 2, interval: 9 }], banner: 'CARDIAC EVENT INBOUND — CARDIOLOGY TREATS IT BEST' },
    ],
  },
  {
    id: '2XXX', eraIdx: 5, name: 'THE DIGITAL HOSPITAL', year: '2XXX',
    budget: 900000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'cardiology', floor: 1, slot: 2 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['pacs', 'ehr', 'telehealth'],
    intro: {
      title: '2XXX — THE DIGITAL HOSPITAL',
      sub: 'THE CHART GOES DIGITAL, THE DOCTOR GOES ONLINE',
      tech: [
        '1990s — FILMLESS RADIOLOGY (PACS)',
        '2009 — HITECH ACT: EHR EVERYWHERE',
        '2015 — TELEHEALTH AT SCALE',
        '2018 — ECG ON YOUR WRIST',
      ],
      impact: 'US HOSPITALS ON ELECTRONIC RECORDS: ~10% TO ~96% IN A DECADE.',
    },
    waves: [
      { entries: [{ type: 'flu', count: 4, interval: 5 }, { type: 'trauma', count: 1, interval: 8 }], banner: 'AMBULANCES INBOUND — TRAUMA NEEDS SURGERY' },
      { entries: [{ type: 'virus', count: 2, interval: 9 }, { type: 'bacteria', count: 3, interval: 6 }, { type: 'flu', count: 3, interval: 5 }], banner: 'COMPLEX VIRAL CASES — BUILD THE VIROLOGY LAB' },
      { entries: [{ type: 'spore', count: 1, interval: 5 }, { type: 'trauma', count: 2, interval: 12 }, { type: 'cardiac', count: 1, interval: 6 }, { type: 'flu', count: 3, interval: 5 }], banner: 'AIRBORNE SPORE — CONTAGIOUS IN THE LOBBY. ISOLATE IT.' },
    ],
  },
  {
    id: '2026', eraIdx: 6, name: 'THE AGENTIC CLINIC', year: '2026',
    budget: 1100000, lives: 4,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }],
    prestaff: [{ type: 'nurse', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'nurse', post: 1 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['scribe', 'labRouter', 'priorAuth'],
    intro: {
      title: '2026 — THE AGENTIC CLINIC',
      sub: 'AI JOINS THE STAFF',
      tech: [
        '2020s — AMBIENT AI SCRIBES WRITE THE NOTE',
        '2023 — LLMs ENTER THE CLINIC',
        '2026 — AGENTS RUN TRIAGE, ROUTING, AND BILLING',
      ],
      impact: 'FDA-CLEARED AI DEVICES PASS 1,000; 9 IN 10 SYSTEMS PILOT AI SCRIBES. THE MACHINES MULTIPLY YOUR HUMANS.',
    },
    waves: [
      { entries: [{ type: 'flu', count: 6, interval: 3.5 }, { type: 'bacteria', count: 3, interval: 6 }], banner: 'AI TOOLS AVAILABLE — YOUR STAFF JUST GOT SUPERPOWERS' },
      { entries: [{ type: 'virus', count: 3, interval: 7 }, { type: 'cardiac', count: 2, interval: 12 }, { type: 'flu', count: 4, interval: 4 }] },
      { entries: [{ type: 'spore', count: 2, interval: 10 }, { type: 'trauma', count: 3, interval: 9 }, { type: 'virus', count: 2, interval: 6 }], banner: 'FULL WAITING ROOM — LET THE LAB-ROUTER RUN TRIAGE' },
    ],
  },
  {
    id: 'Y26', eraIdx: 12, name: 'TOTAL CARE (BONUS)', year: 'Y26',
    budget: 8000000, lives: 5,
    prebuilt: [{ type: 'ward', floor: 1, slot: 0 }, { type: 'pharmacy', floor: 1, slot: 1 }, { type: 'virology', floor: 1, slot: 2 }, { type: 'surgery', floor: 2, slot: 0 }, { type: 'cardiology', floor: 2, slot: 1 }, { type: 'breakroom', floor: 2, slot: 2 }],
    prestaff: [{ type: 'doctor', post: 'lobby' }, { type: 'doctor', post: 0 }, { type: 'surgeon', post: 3 }, { type: 'nurse', post: 1 }],
    rooms: ['ward', 'pharmacy', 'cardiology', 'surgery', 'virology', 'breakroom'],
    staff: ['nurse', 'doctor', 'surgeon', 'orderly'],
    tech: ['regenpod', 'labRouter', 'scribe', 'priorAuth'],
    intro: {
      title: 'Y26 — TOTAL CARE',
      sub: 'CERTIFIED FANTASY. ENJOY THE VICTORY LAP.',
      tech: [
        'FULL-BODY REGENERATION PODS',
        'NANOBOT IMMUNE SWARMS',
        'MATTER-STREAM TRIAGE',
      ],
      impact: 'ONE HUMAN REMAINS ON STAFF. IT APPEARS TO BE YOU.',
    },
    waves: [
      { entries: [{ type: 'flu', count: 8, interval: 2.5 }, { type: 'spore', count: 2, interval: 8 }], banner: 'THE FAR FUTURE — ONE HUMAN REMAINS ON STAFF: YOU' },
      { entries: [{ type: 'cardiac', count: 4, interval: 8 }, { type: 'trauma', count: 4, interval: 7 }, { type: 'virus', count: 4, interval: 5 }] },
      { entries: [{ type: 'spore', count: 4, interval: 7 }, { type: 'cardiac', count: 3, interval: 8 }, { type: 'trauma', count: 3, interval: 7 }, { type: 'flu', count: 6, interval: 2.5 }] },
    ],
  },
];
