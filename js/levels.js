/* ============================================================
 * Shift schedule — one persistent hospital, 13 brisk shifts
 * marching through the eras (docs/ERAS.md, COMPRESSED per the
 * pacing pass: 1970s+80s merged, single 2020s shift, so the
 * 2000s EHR moment is SHIFT 5 and the AI eras arrive within
 * ~6-8 minutes of play).
 *
 * Each shift lists arrival entries: {type, count, interval}.
 * Entries interleave with a phase offset so mixed shifts arrive
 * shuffled. Early-decade shifts are deliberately tight (~60-90s
 * of arrivals — enough to FEEL the manual chaos, not enough to
 * drag). A shift ends when every arrival is resolved; then a
 * player-paced cool-off until the player clicks START SHIFT.
 * Banner shifts flash an event warning + siren.
 * ============================================================ */

const SHIFTS = [
  { // 1 · 1950s — tutorial: build a Ward, hire a nurse for the lobby + one for the ward
    entries: [{ type: 'flu', count: 3, interval: 5.5 }],
  },
  { // 2 · 1960s — bacteria appears: you need a Pharmacy
    entries: [
      { type: 'flu', count: 3, interval: 5.0 },
      { type: 'bacteria', count: 2, interval: 8.0 },
    ],
  },
  { // 3 · 1970s-80s — paramedics deliver: trauma + first virus
    banner: '!! MULTI-CAR PILE-UP INBOUND !!',
    entries: [
      { type: 'flu', count: 2, interval: 6.0 },
      { type: 'bacteria', count: 2, interval: 7.0 },
      { type: 'trauma', count: 2, interval: 6.0 },
      { type: 'virus', count: 1, interval: 12.0 },
    ],
  },
  { // 4 · 1990s — spore outbreak: contagion pressure in the lobby
    banner: '!! AIRBORNE SPORE OUTBREAK !!',
    entries: [
      { type: 'spore', count: 2, interval: 8.0 },
      { type: 'flu', count: 3, interval: 4.5 },
      { type: 'virus', count: 2, interval: 8.0 },
    ],
  },
  { // 5 · 2000s — the EHR moment; cardiac arrives: the deterioration race begins
    entries: [
      { type: 'cardiac', count: 1, interval: 12.0 },
      { type: 'trauma', count: 2, interval: 7.0 },
      { type: 'bacteria', count: 3, interval: 5.0 },
      { type: 'flu', count: 3, interval: 4.5 },
    ],
  },
  { // 6 · 2010s — connected + quantified: full mix
    entries: [
      { type: 'flu', count: 3, interval: 4.0 },
      { type: 'virus', count: 2, interval: 6.5 },
      { type: 'spore', count: 2, interval: 8.0 },
      { type: 'trauma', count: 2, interval: 6.0 },
      { type: 'cardiac', count: 2, interval: 10.0 },
    ],
  },
  { // 7 · 2020s — AI toys unlock (Scribe, Prior-Auth); mass casualty
    banner: '!! MASS CASUALTY EVENT !!',
    entries: [
      { type: 'trauma', count: 4, interval: 4.0 },
      { type: 'cardiac', count: 2, interval: 8.5 },
      { type: 'spore', count: 2, interval: 7.5 },
      { type: 'flu', count: 3, interval: 4.0 },
    ],
  },
  { // 8 · 2030s — the agentic ward: free auto-diagnosis carries the volume
    entries: [
      { type: 'flu', count: 4, interval: 3.5 },
      { type: 'bacteria', count: 3, interval: 4.5 },
      { type: 'virus', count: 2, interval: 6.0 },
      { type: 'trauma', count: 2, interval: 5.5 },
      { type: 'cardiac', count: 2, interval: 10.0 },
    ],
  },
  { // 9 · 2040s — the hospital loses its walls
    banner: '!! REGIONAL SURGE — DRONES INBOUND !!',
    entries: [
      { type: 'flu', count: 4, interval: 3.2 },
      { type: 'bacteria', count: 3, interval: 4.0 },
      { type: 'virus', count: 3, interval: 5.5 },
      { type: 'trauma', count: 3, interval: 5.0 },
      { type: 'spore', count: 2, interval: 7.5 },
    ],
  },
  { // 10 · 2050s — free auto-assign arrives just in time
    entries: [
      { type: 'flu', count: 4, interval: 3.0 },
      { type: 'bacteria', count: 3, interval: 3.8 },
      { type: 'virus', count: 3, interval: 5.0 },
      { type: 'trauma', count: 3, interval: 4.5 },
      { type: 'cardiac', count: 2, interval: 8.5 },
      { type: 'spore', count: 2, interval: 9.0 },
    ],
  },
  { // 11 · 2075 — the body shop hums
    banner: '!! CITYWIDE ALERT !!',
    entries: [
      { type: 'flu', count: 5, interval: 2.6 },
      { type: 'bacteria', count: 4, interval: 3.4 },
      { type: 'virus', count: 3, interval: 4.5 },
      { type: 'trauma', count: 3, interval: 4.2 },
      { type: 'cardiac', count: 2, interval: 7.5 },
      { type: 'spore', count: 2, interval: 8.0 },
    ],
  },
  { // 12 · 2100 — medicine as infrastructure: the campaign finale
    banner: '!! THE RARE AND THE UNLUCKY — FINAL SHIFT !!',
    entries: [
      { type: 'flu', count: 5, interval: 2.4 },
      { type: 'bacteria', count: 4, interval: 3.0 },
      { type: 'virus', count: 3, interval: 4.0 },
      { type: 'trauma', count: 4, interval: 3.6 },
      { type: 'cardiac', count: 3, interval: 6.5 },
      { type: 'spore', count: 2, interval: 7.0 },
    ],
  },
  { // 13 · YEAR 3000 — certified-fantasy bonus round: absurd volume, absurd tech
    banner: '!! Y3K — MATTER-STREAM TRIAGE ONLINE !!',
    entries: [
      { type: 'flu', count: 6, interval: 1.8 },
      { type: 'bacteria', count: 5, interval: 2.2 },
      { type: 'virus', count: 4, interval: 2.8 },
      { type: 'trauma', count: 4, interval: 2.8 },
      { type: 'cardiac', count: 3, interval: 4.5 },
      { type: 'spore', count: 3, interval: 5.5 },
    ],
  },
];
