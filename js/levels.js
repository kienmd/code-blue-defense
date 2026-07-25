/* ============================================================
 * Shift schedule — one persistent hospital, 15 escalating shifts
 * marching through the eras (docs/ERAS.md): 1950s -> 2100, then
 * the YEAR 3000 fantasy bonus round.
 *
 * Each shift lists arrival entries: {type, count, interval}.
 * Entries interleave with a phase offset so mixed shifts arrive
 * shuffled. A shift ends when every arrival has been resolved
 * (discharged or transferred); then a player-paced cool-off —
 * the next shift starts when the player clicks START SHIFT.
 * Banner shifts flash an event warning + siren.
 *
 * Volume climbs with the decades while era baselines (faster
 * diagnosis, stronger treatment, free automation from the 2030s)
 * absorb standard cases — the screen gets busier, your hands stay
 * roughly as full, and WHAT your hands do changes era by era.
 * ============================================================ */

const SHIFTS = [
  { // 1 · 1950s — tutorial: build a Ward, hire a nurse for the lobby + one for the ward
    entries: [{ type: 'flu', count: 4, interval: 7.0 }],
  },
  { // 2 · 1960s — bacteria appears: you need a Pharmacy
    entries: [
      { type: 'flu', count: 4, interval: 6.0 },
      { type: 'bacteria', count: 2, interval: 9.0 },
    ],
  },
  { // 3 · 1970s — virus appears: Virology Lab time
    entries: [
      { type: 'flu', count: 3, interval: 6.0 },
      { type: 'bacteria', count: 3, interval: 7.0 },
      { type: 'virus', count: 1, interval: 10.0 },
    ],
  },
  { // 4 · 1980s — trauma event
    banner: '!! MULTI-CAR PILE-UP INBOUND !!',
    entries: [
      { type: 'trauma', count: 3, interval: 5.0 },
      { type: 'flu', count: 3, interval: 6.0 },
    ],
  },
  { // 5 · 1990s — complexity ramp
    entries: [
      { type: 'virus', count: 3, interval: 7.0 },
      { type: 'bacteria', count: 3, interval: 6.0 },
      { type: 'flu', count: 2, interval: 8.0 },
    ],
  },
  { // 6 · 2000s — spore outbreak: contagion pressure in the lobby
    banner: '!! AIRBORNE SPORE OUTBREAK !!',
    entries: [
      { type: 'spore', count: 3, interval: 7.0 },
      { type: 'flu', count: 4, interval: 5.0 },
    ],
  },
  { // 7 · 2010s — cardiac arrives: the deterioration race begins
    entries: [
      { type: 'cardiac', count: 2, interval: 12.0 },
      { type: 'trauma', count: 2, interval: 8.0 },
      { type: 'bacteria', count: 3, interval: 6.0 },
    ],
  },
  { // 8 · 2020s — full mix
    entries: [
      { type: 'flu', count: 3, interval: 5.0 },
      { type: 'virus', count: 2, interval: 8.0 },
      { type: 'spore', count: 2, interval: 9.0 },
      { type: 'trauma', count: 2, interval: 7.0 },
      { type: 'cardiac', count: 1, interval: 10.0 },
    ],
  },
  { // 9 · 2020s — mass casualty
    banner: '!! MASS CASUALTY EVENT !!',
    entries: [
      { type: 'trauma', count: 4, interval: 4.0 },
      { type: 'cardiac', count: 2, interval: 9.0 },
      { type: 'spore', count: 2, interval: 8.0 },
    ],
  },
  { // 10 · 2030s — the agentic ward: free auto-diagnosis carries the volume
    entries: [
      { type: 'flu', count: 4, interval: 4.0 },
      { type: 'bacteria', count: 3, interval: 5.0 },
      { type: 'virus', count: 2, interval: 7.0 },
      { type: 'trauma', count: 2, interval: 6.0 },
      { type: 'cardiac', count: 1, interval: 12.0 },
    ],
  },
  { // 11 · 2040s — the hospital loses its walls (volume up, drones deliver)
    banner: '!! REGIONAL SURGE — DRONES INBOUND !!',
    entries: [
      { type: 'flu', count: 4, interval: 3.5 },
      { type: 'bacteria', count: 3, interval: 4.5 },
      { type: 'virus', count: 3, interval: 6.0 },
      { type: 'trauma', count: 2, interval: 6.0 },
      { type: 'spore', count: 2, interval: 8.0 },
    ],
  },
  { // 12 · 2050s — free auto-assign arrives just in time
    entries: [
      { type: 'flu', count: 4, interval: 3.0 },
      { type: 'bacteria', count: 3, interval: 4.0 },
      { type: 'virus', count: 3, interval: 5.0 },
      { type: 'trauma', count: 3, interval: 5.0 },
      { type: 'cardiac', count: 2, interval: 9.0 },
      { type: 'spore', count: 1, interval: 10.0 },
    ],
  },
  { // 13 · 2075 — the body shop hums
    banner: '!! CITYWIDE ALERT !!',
    entries: [
      { type: 'flu', count: 5, interval: 2.8 },
      { type: 'bacteria', count: 3, interval: 3.5 },
      { type: 'virus', count: 3, interval: 4.5 },
      { type: 'trauma', count: 3, interval: 4.5 },
      { type: 'cardiac', count: 2, interval: 8.0 },
      { type: 'spore', count: 2, interval: 8.0 },
    ],
  },
  { // 14 · 2100 — medicine as infrastructure: the campaign finale
    banner: '!! THE RARE AND THE UNLUCKY — FINAL SHIFT !!',
    entries: [
      { type: 'flu', count: 5, interval: 2.5 },
      { type: 'bacteria', count: 4, interval: 3.0 },
      { type: 'virus', count: 3, interval: 4.0 },
      { type: 'trauma', count: 3, interval: 4.0 },
      { type: 'cardiac', count: 3, interval: 7.0 },
      { type: 'spore', count: 2, interval: 7.0 },
    ],
  },
  { // 15 · YEAR 3000 — certified-fantasy bonus round: absurd volume, absurd tech
    banner: '!! Y3K — MATTER-STREAM TRIAGE ONLINE !!',
    entries: [
      { type: 'flu', count: 6, interval: 2.0 },
      { type: 'bacteria', count: 5, interval: 2.4 },
      { type: 'virus', count: 4, interval: 3.0 },
      { type: 'trauma', count: 4, interval: 3.0 },
      { type: 'cardiac', count: 3, interval: 5.0 },
      { type: 'spore', count: 2, interval: 6.0 },
    ],
  },
];
