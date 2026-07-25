/* ============================================================
 * Level definitions — "Angry Birds style" progression.
 *
 * path: hardcoded checkpoint array in TILE coordinates (the spec's
 *       alternative to full A*). Patients walk checkpoint to
 *       checkpoint; the first tile is the ENTRANCE, the last is
 *       the ICU LEAK GATE.
 * maxRooms: physical bed-space cap (nurse/gp = 1 room, cardio = 2).
 * burnoutMod: multiplier on all stress accumulation for the level.
 * waves: sequential entries; banner waves flash an event warning.
 * ============================================================ */

const LEVELS = [
  {
    id: 1,
    name: 'RURAL CLINIC',
    desc: '2 rooms. Slow influx. Basic flu season. Learn the ropes.',
    gridW: 16, gridH: 10,
    maxRooms: 2,
    burnoutMod: 1.0,
    startBudget: 320,
    path: [[0, 5], [5, 5], [5, 2], [10, 2], [10, 7], [15, 7]],
    waves: [
      { entries: [{ type: 'flu', count: 4, interval: 5.0 }] },
      { entries: [{ type: 'flu', count: 6, interval: 4.0 }] },
      { entries: [{ type: 'flu', count: 5, interval: 3.4 }, { type: 'webmd', count: 2, interval: 4.0 }] },
    ],
  },
  {
    id: 2,
    name: 'SUBURBAN URGENT CARE',
    desc: 'Mid-size grid. Brace for the TRAUMA WAVE event.',
    gridW: 20, gridH: 12,
    maxRooms: 5,
    burnoutMod: 1.0,
    startBudget: 420,
    path: [[0, 6], [4, 6], [4, 2], [9, 2], [9, 9], [14, 9], [14, 4], [19, 4]],
    waves: [
      { entries: [{ type: 'flu', count: 6, interval: 3.6 }] },
      { entries: [{ type: 'flu', count: 5, interval: 3.0 }, { type: 'webmd', count: 4, interval: 3.2 }] },
      {
        banner: '!! TRAUMA WAVE INCOMING !!',
        entries: [{ type: 'trauma', count: 6, interval: 1.8 }],
      },
      { entries: [{ type: 'webmd', count: 6, interval: 2.6 }, { type: 'flu', count: 4, interval: 2.2 }, { type: 'trauma', count: 2, interval: 3.0 }] },
    ],
  },
  {
    id: 3,
    name: 'INNER-CITY ER',
    desc: 'Severe overcrowding. 1.5x burnout. Silent heart attacks hide in the queue.',
    gridW: 22, gridH: 13,
    maxRooms: 8,
    burnoutMod: 1.5,
    startBudget: 520,
    path: [[0, 2], [18, 2], [18, 5], [3, 5], [3, 8], [18, 8], [18, 11], [21, 11]],
    waves: [
      { entries: [{ type: 'flu', count: 8, interval: 2.6 }, { type: 'webmd', count: 2, interval: 3.0 }] },
      { entries: [{ type: 'webmd', count: 6, interval: 2.4 }, { type: 'silent', count: 2, interval: 6.0 }] },
      {
        banner: '!! MASS CASUALTY EVENT !!',
        entries: [{ type: 'trauma', count: 8, interval: 1.6 }],
      },
      { entries: [{ type: 'silent', count: 4, interval: 5.0 }, { type: 'webmd', count: 5, interval: 2.2 }] },
      {
        banner: '!! FULL WAITING ROOM — FINAL PUSH !!',
        entries: [
          { type: 'flu', count: 6, interval: 1.8 },
          { type: 'trauma', count: 4, interval: 2.4 },
          { type: 'silent', count: 3, interval: 4.5 },
        ],
      },
    ],
  },
];
