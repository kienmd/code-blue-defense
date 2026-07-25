# Code Blue Defense: Agentic Triage

An 8-bit retro tower-defense/management game built for a healthcare AI
hackathon. The classic TD formula is flipped: **the "creeps" are patients**
flowing through a hospital grid, deteriorating in real time — and you must
deploy **human staff (physical towers)** and **agentic AI upgrades (virtual
buffs)** to diagnose and discharge them before they crash or leak into the ICU.

Zero dependencies, zero build step: vanilla HTML5 Canvas + JavaScript.

## Run it

```bash
# option 1: just open it
open index.html

# option 2: any static server
python3 -m http.server 8080   # then visit http://localhost:8080
```

## How to play

- **Patients** walk the corridor from the entrance toward the **ICU Leak Gate**.
  Each has a **health bar** (hits 0 → they crash, you lose a life) and a
  **complexity shield** (reduce to 0 → discharged, you earn budget).
- **Click a staff card, then click a tile beside the corridor** to place them.
  Staff occupy limited **room** capacity (the Cardiologist takes a 2x2
  footprint and 2 rooms).
- Doctors accumulate **cognitive load** per patient treated. At 100% they
  **burn out** and freeze for 8 seconds. The Inner-City ER level applies a
  1.5x burnout modifier.
- **Drag AI upgrades** from the shop onto their targets: the **Ambient AI
  Scribe** onto a doctor, the **Agentic Lab-Router** onto the entrance, the
  **Prior-Auth Agent** onto the ICU gate. AI takes no physical space — it
  multiplies the humans you already have.

## Roster

| Unit | Cost | Effect |
|---|---|---|
| Triage Nurse | $100 | Slows patients 40% in radius, tags them ASSESSED |
| General Practitioner | $200 | Steady complexity damage; burns out fast |
| Cardiologist | $400 | Huge damage, targets the sickest patient; 2x2 footprint |
| Ambient AI Scribe | $150 | On a doctor: -50% burnout gain, +30% speed |
| Agentic Lab-Router | $250 | At the entrance: AI pre-triage shreds 30% complexity |
| Prior-Auth Agent | $200 | At the ICU gate: +25% payout per discharge |

Patient types range from the **Seasonal Flu** swarm and the **WebMD
Over-thinker** (high complexity, barely sick) to the **Silent Heart Attack**
(deteriorates fast, huge complexity) and **Trauma Wave** events.

## Levels

1. **Rural Clinic** — 2 rooms max, slow influx, flu season tutorial.
2. **Suburban Urgent Care** — mid-size grid, TRAUMA WAVE event.
3. **Inner-City ER** — overcrowding, 1.5x burnout, silent heart attacks.

Angry-Birds-style star ratings (based on lives kept) gate level unlocks;
progress persists in `localStorage`.

## The agentic AI layer (for judges)

`js/agentic.js` is the seam between the game and a real LLM. When the
Lab-Router is installed, every arriving patient is serialized into a
**Patient Manifest** and passed to `simulateAgenticDecision()`:

- With `window.ANTHROPIC_API_KEY` set (see the comment in `index.html`), it
  calls Claude with a pinned JSON output contract ("act as an ED triage agent;
  output a priority 1-5 and diagnostic category").
- Without a key it falls back to deterministic structured-data matching over
  the same symptom table — the demo is fully self-contained offline.

Design principle: **the LLM decides WHAT the patient has; the game decides
how much that knowledge is worth.** The mechanical effect (a flat 30%
complexity shred) is constant and auditable, so live-LLM nondeterminism can
never unbalance the game. All balance math is centralized and commented in
`js/constants.js`.

## Repo layout

```
index.html        entry point + optional API-key hook
style.css         retro UI shell (Press Start 2P, NES-ish palette)
js/constants.js   ALL balance numbers + judge-facing math comments
js/agentic.js     LLM scaffold + local triage fallback
js/levels.js      3 levels: grids, checkpoint paths, wave tables
js/entities.js    Patient/Tower classes + pixel sprite painters
js/game.js        engine loop, input, drag-drop, waves, render, HUD
DESIGN.md         design ideation history
```

## API keys (optional — the game runs fully without them)

Put your keys in `js/keys.local.js` — **it is gitignored**, so they never
land in a commit:

```js
// js/keys.local.js  (create this file yourself; a 404 for it is harmless)
window.ELEVENLABS_API_KEY = 'sk_...';   // British narrator voice (TTS)
window.ANTHROPIC_API_KEY = 'sk-ant-...'; // live LLM triage + patient complaints
```

Without keys: narration falls back to the browser's built-in en-GB voice
(subtitles always render), and diagnosis/complaints use the deterministic
offline tables. See the AUDIO & NARRATION section for details.
