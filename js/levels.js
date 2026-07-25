/* ============================================================
 * Shift schedule — one persistent hospital, 10 escalating shifts.
 *
 * Each shift lists arrival entries: {type, count, interval}.
 * Entries interleave with a phase offset so mixed shifts arrive
 * shuffled. A shift ends when every arrival has been resolved
 * (discharged or transferred); then a player-paced cool-off —
 * the next shift starts when the player clicks START SHIFT.
 * Banner shifts flash an event warning + siren.
 * ============================================================ */

const SHIFTS = [
  { // 1 — tutorial: build a Ward, hire a nurse for the lobby + one for the ward
    entries: [{ type: 'flu', count: 4, interval: 7.0 }],
  },
  { // 2 — bacteria appears: you need a Pharmacy
    entries: [
      { type: 'flu', count: 4, interval: 6.0 },
      { type: 'bacteria', count: 2, interval: 9.0 },
    ],
  },
  { // 3 — virus appears: Virology Lab time
    entries: [
      { type: 'flu', count: 3, interval: 6.0 },
      { type: 'bacteria', count: 3, interval: 7.0 },
      { type: 'virus', count: 1, interval: 10.0 },
    ],
  },
  { // 4 — trauma event
    banner: '!! MULTI-CAR PILE-UP INBOUND !!',
    entries: [
      { type: 'trauma', count: 3, interval: 5.0 },
      { type: 'flu', count: 3, interval: 6.0 },
    ],
  },
  { // 5 — complexity ramp
    entries: [
      { type: 'virus', count: 3, interval: 7.0 },
      { type: 'bacteria', count: 3, interval: 6.0 },
      { type: 'flu', count: 2, interval: 8.0 },
    ],
  },
  { // 6 — spore outbreak: contagion pressure in the lobby
    banner: '!! AIRBORNE SPORE OUTBREAK !!',
    entries: [
      { type: 'spore', count: 3, interval: 7.0 },
      { type: 'flu', count: 4, interval: 5.0 },
    ],
  },
  { // 7 — cardiac arrives: the deterioration race begins
    entries: [
      { type: 'cardiac', count: 2, interval: 12.0 },
      { type: 'trauma', count: 2, interval: 8.0 },
      { type: 'bacteria', count: 3, interval: 6.0 },
    ],
  },
  { // 8 — full mix
    entries: [
      { type: 'flu', count: 3, interval: 5.0 },
      { type: 'virus', count: 2, interval: 8.0 },
      { type: 'spore', count: 2, interval: 9.0 },
      { type: 'trauma', count: 2, interval: 7.0 },
      { type: 'cardiac', count: 1, interval: 10.0 },
    ],
  },
  { // 9 — mass casualty
    banner: '!! MASS CASUALTY EVENT !!',
    entries: [
      { type: 'trauma', count: 4, interval: 4.0 },
      { type: 'cardiac', count: 2, interval: 9.0 },
      { type: 'spore', count: 2, interval: 8.0 },
    ],
  },
  { // 10 — final crunch
    banner: '!! FULL WAITING ROOM — FINAL SHIFT !!',
    entries: [
      { type: 'flu', count: 4, interval: 4.0 },
      { type: 'bacteria', count: 3, interval: 5.0 },
      { type: 'virus', count: 2, interval: 7.0 },
      { type: 'trauma', count: 3, interval: 6.0 },
      { type: 'cardiac', count: 2, interval: 10.0 },
      { type: 'spore', count: 2, interval: 9.0 },
    ],
  },
];
