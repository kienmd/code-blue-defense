# Code Blue Defense — Design Ideation

Living document. Everything here is a proposal until we lock it.

## Core fantasy

You are the hospital. Waves of illness try to reach your patients; you deploy
staff and equipment to stop them. The theme does real mechanical work — almost
every TD trope has a natural hospital analog.

## The map

- Levels are hospital floors: ER intake → corridors → wards → ICU (the base).
- Enemies path along corridors; ICU beds are your lives ("patients lost").
- Later floors introduce elevators (enemy shortcuts), quarantine doors
  (player-toggled path blockers), and vents (airborne-enemy-only routes).

## Towers (first-draft roster)

| Tower | TD archetype | Flavor |
|---|---|---|
| Nurse Station | rapid single-target | basic pea-shooter, cheap, everywhere |
| Pharmacy | slow/debuff | antibiotic AoE puddle, slows + damage-over-time |
| X-Ray Machine | pierce/line | hits every enemy in a straight beam |
| UV Sanitizer | AoE pulse | short range, hits all adjacent, great at choke points |
| Surgeon | sniper | slow, huge single-target damage, "operates" on bosses |
| Lab | support/economy | doesn't attack; researches enemies to reveal weaknesses + generates income |
| Defibrillator | stun | chain-lightning stun, long cooldown |
| Immunization Clinic | anti-swarm | permanently weakens all future enemies of one type (vaccination!) |

## Enemies (first-draft roster)

- **Common Cold** — swarm fodder, fast, weak.
- **Bacteria** — slow, tanky, *splits* when killed unless finished by Pharmacy (antibiotics).
- **Virus** — mutates: gains resistance to the tower type that damaged it most last wave.
- **Airborne Spore** — flies over corridors, only UV/vent-mounted towers hit it.
- **Superbug** (boss) — antibiotic-resistant; Pharmacy heals it, forcing tower diversity.
- **Outbreak event** — mid-wave siren, a burst wave spawns from a random vent.

## The signature mechanic (what makes it not just a reskin)

**Triage.** Instead of enemies simply dying, some are "stabilized" and wheeled
to a bed, occupying ward capacity. Ward capacity is a second resource: run out
of beds and stabilized enemies leak damage. Discharge patients over time or
build recovery towers to free beds faster. Kill vs. stabilize could even be a
moral/score axis.

**Code Blue button.** Once per N waves: every tower on the floor sprints to a
point you click and attacks at double speed for 10 seconds. The panic button
the whole game is named after.

## Open questions (ideating now)

1. **Scope**: single-floor arcade levels, or a roguelite run up the hospital
   tower (floor-by-floor, draft towers between floors)?
2. **Tone**: earnest-cute (Theme Hospital lineage) vs. dry-absurd humor?
3. **Platform/engine**: web-first (TypeScript + Canvas/Phaser/PixiJS) vs.
   desktop (Godot)? Web = easiest to share; Godot = more game out of the box.
4. **Grid vs. path**: fixed paths with tower plots (classic TD) or open grid
   where tower placement shapes the maze (Fieldrunners-style)?
5. Does the Triage mechanic stay, and how punishing is bed capacity?

## Decisions log

- 2026-07-24 — Name: **Code Blue Defense**. Repo created. Ideation begins.
