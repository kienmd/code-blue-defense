# Economy Rethink — faucets, drains, and strategy lanes

Status: DESIGN PROPOSAL (not implemented). Companion to `docs/TECH_TREE.md`
and `docs/ERAS.md`. Research snapshot: July 2026.

Scope: make the money system demand real resourcing strategy without being
unfair. Numbers are quoted in the realistic-dollar scale the implementation
agent is currently landing in `js/constants.js` (ward $250K, cardiac
reimbursement $130K, era `inflation` x0.5 → x10), at **x1.0 inflation
(1990s baseline)** unless noted. This doc acknowledges the implemented
13-shift compressed era table (1970s+80s merged, single 2020s shift) and
quotes eras by label, not shift index.

---

## Part 1 — Principles from strategy-game economy design (researched)

1. **Map every faucet and drain; balance them deliberately.** An economy is
   sources (money enters) and sinks (money leaves); the designer's core job
   is keeping the rates in a chosen ratio, and simulating — not just
   eyeballing — the flow. *(Machinations framework — Adams & Dormans, "Game
   Mechanics" ch. 5; "Game Economy Design" book excerpt, Game Developer)*
2. **Accumulation should be gradual, not runaway.** Target faucets ≈
   1.1–1.3x drains per progression tier: below 1.0 feels punishing, far
   above it makes money meaningless. *(spreadsheet-balancing practice
   guides; same faucet/sink literature)*
3. **Recurring drains give money meaning.** Economies with only one-time
   purchases inflate: once the shop is bought out, income is dead score.
   Repairs, upkeep, consumables, wages are the classic fixes. *(faucet/sink
   literature's standard sink lists)*
4. **The core strategy decision is tempo: survive-now vs scale-later.**
   Good TD economies force "spend the minimum to survive this wave, invest
   the surplus in income" — every purchase is an opportunity cost against
   2–3 waves from now. *(TD economy analyses: farm-vs-DPS timing guides,
   "no challenge without compromise")*
5. **Escalating costs prevent snowballing.** If every copy of a building
   costs the same, the winning move is spamming the best one. Fallout
   Shelter raises each additional room's cost; TDs scale upgrade curves
   exponentially. *(Fallout Shelter economy deconstructions)*
6. **Price risk into income levers.** Fallout Shelter's rush button is free
   money with a rising failure chance — a loss-aversion decision, not a
   button you always press. Optional high-yield/high-risk income is a
   strategy lever, not a faucet. *(Fallout Shelter rush-mechanic analyses)*
7. **"A game is a series of interesting decisions"**: interesting =
   involves a tradeoff, is situational, and expresses a playstyle. If the
   player can afford everything in a shop phase, it's a simulation, not a
   puzzle. *(Sid Meier, GDC 2012 "Interesting Decisions")*
8. **Negative feedback (catch-up) keeps runs close — tuned gently.**
   Perpetual-comeback forces help those behind without making winning
   unrewarding or inviting sandbagging (the Mario Kart blue-shell caution).
   *(Sirlin, "Slippery Slope and Perpetual Comeback"; rubber-banding
   design literature)*
9. **Never let losses compound across resources into a death spiral.**
   The classic TD spiral: leak → less money → weaker defense → leak more.
   Keep defeat tracks separate (lives vs cash), add income floors, and
   never charge money for the thing that already cost a life. *(TD
   "No Cash enemies" death-spiral analyses)*
10. **Legibility is part of fairness.** Decisions are only interesting if
    the player can see the numbers behind them — pause-phase planning and
    explicit ledgers are what make re-optimization sticky. *(Meier on
    information/feedback; TD retention analyses of between-wave planning)*

## Part 2 — Diagnosis of the current economy

Against those principles, today's economy (constants as of the in-flight
rescale):

| # | Finding | Principle violated |
|---|---|---|
| D1 | **Income has one faucet** (discharge payouts) and **zero recurring drains** — build/hire/tech are all one-time. Once built out, every later shift's income is dead score. | 1, 2, 3 |
| D2 | **No tempo decision.** Since nothing costs money per shift, there is no survive-now vs scale-later tension; the optimal play is always "buy everything affordable, ASAP." | 4, 7 |
| D3 | **Flat build costs.** The 2nd and 5th General Ward cost the same $250K; nothing pushes diversification except pathogen mix. | 5 |
| D4 | **No income levers, no risk pricing.** The player cannot choose income risk; payouts are fully determined by wave composition. | 6 |
| D5 | **Death-spiral adjacency.** A bad shift costs lives AND starves income (missed payouts), and `START_BUDGET` is the only floor. A player who loses 3 lives by shift 4 has less money than one who didn't — the struggling player gets less help, the definition of a positive feedback loop. | 8, 9 |
| D6 | **Era tech is pure power.** Tech purchases have no opportunity cost against staffing/infra in the same cool-off if income has piled up (see D1/D2). | 7 |
| D7 | **No ledger.** The shift report shows outcomes but not income vs expense, so even the economy that exists is illegible. | 10 |
| D8 | Stale seed: `START_BUDGET = 600` predates the dollar rescale (buys nothing). | — |

## Part 3 — The redesign

### 3a. Faucets (income)

| Faucet | Amount (x1.0 inflation) | Constants / notes |
|---|---|---|
| **Case reimbursement** (existing) | per `PATHOGENS[*].payout` ($4K flu → $130K cardiac) x outcome multiplier: right-room discharge **x1.0**, wrong-room cure **x0.8**, undiagnosed cure **x0.7** ("no chart, no charge" — you can't bill what you didn't document; educational and real) | `PAYOUT_OUTCOME_MULT = { right: 1.0, wrong: 0.8, undiagnosed: 0.7 }`; priorAuth x1.25 and future hands-on x1.2 stack on top |
| **Walk-in copay** (new, floor faucet) | **$300 per arrival** on entering the lobby, regardless of outcome | `COPAY = 300` x era inflation. Guarantees nonzero income even in a disaster shift (~$5–20K/shift; deliberately small) |
| **Era modernization grant** (new, catch-up faucet) | at each era-up: `ERA_GRANT_BASE` **$150K** x inflation x struggle factor `1.0 + 0.5 * livesLost/START_LIVES` (flawless x1.0, desperate x1.5) | Flavored by era: Hill-Burton construction grants (1950s–60s — real), HITECH incentives (2000s — real, and the perfect teaching beat: HITECH *was* a catch-up subsidy), "CMS Innovation" grants (futures). Cap: never exceeds ~30% of a good shift's income, so winning stays rewarding (principle 8's caution) |
| **Private-wing contract** (new, optional risk lever) | toggle during any cool-off, applies next shift: **payouts x1.3**, but any ICU transfer that shift additionally costs a **$75K x inflation settlement** | `PRIVATE_WING = { payoutMult: 1.3, icuPenalty: 75000 }`. The Fallout-Shelter-rush analog: free money priced in risk; the ONLY place money is ever charged for a lost life, and the player opted in |

### 3b. Drains (recurring costs — the new pressure)

| Drain | Amount (x1.0 inflation) | Constants / notes |
|---|---|---|
| **Salaries** (new) | per staff member, per shift, settled at shift end: orderly **$2K**, nurse **$4K**, doctor **$12K**, surgeon **$20K** | `salary` field in `STAFF_TYPES`. Hire cost stays as a one-time signing bonus. Hoarded idle staff now bleed money — staffing level becomes a decision every era |
| **Room upkeep** (new) | **2% of the room's base build cost** per shift (ward $5K, pharmacy $7K, virology $10K, surgery $14K, cardiology $18K, breakroom $3K) | `UPKEEP_RATE = 0.02` x era inflation. Fixed costs dominate real hospital economics — an empty cardiology suite still costs money (educational note in the ledger tooltip) |
| **Escalating build costs** (new) | each additional room of the SAME type: **x1.5 per copy** (2nd ward $375K, 3rd $562K) | `BUILD_ESCALATION = 1.5`, applied in the shop price: `cost * 1.5^(ownedOfType)` before inflation. Fallout-Shelter-style anti-spam; pushes diversification |
| **Era tech prices** (rescaled) | see table in 3e — tech now costs the same order of magnitude as a room or an era of salaries, forcing infra-vs-staff-vs-tech choices in each cool-off | replaces the old $100–$1,500 toy prices in TECH_TREE/ERAS docs |

**Design target (principle 2):** at par play, per-shift income ≈ **1.2x**
(salaries + upkeep), leaving roughly ONE meaningful purchase (a room, OR a
tech, OR 2–3 hires) per cool-off — that scarcity is the "interesting
decisions" core (principle 7). Worked mid-game check (2000s, x1.2, ~16
patients, full right-room capture ≈ $480K): a 6-staff/4-room hospital pays
~$60K salaries + ~$40K upkeep → income ≈ 4.8x drains at PERFECT play, ~1.5x
at realistic capture — surplus per shift ≈ $150–300K ≈ one purchase. Tune
with the double/half method from there.

### 3c. Strategy lanes (each must be viable — the math sketch)

Per-shift P&L at the 2000s benchmark (x1.2 inflation, ~16 patients: 7 flu /
4 bacteria / 3 virus / 1 trauma / 1 cardiac; total right-room pot ≈ $480K):

| Lane | Build | Recurring drains | Realistic income | Net/shift | Why it wins / risk |
|---|---|---|---|---|---|
| **A. Staff-heavy generalist** ("county hospital") | 2 wards + pharmacy (~$975K capital w/ escalation), 5 nurses + 1 doctor | ~$38K salaries + $23K upkeep | captures all flu+bacteria (~$120K) + slow wrong-room cures at x0.8 (~$150K) ≈ **$325K** | ≈ **$265K** | Cheap capital, resilient to burnout (many hands); loses some trauma/cardiac to ICU — spends lives, not money |
| **B. Infra specialist** ("destination center") | ward + surgery + cardiology (~$1.85M capital, built over 2–3 eras), surgeon + doctor + 2 nurses | ~$48K salaries + $44K upkeep | captures trauma+cardiac at full premium (~$270K incl. specialist speed) + flu (~$34K) + spillover ≈ **$355K** | ≈ **$265K** | Premium payouts scale hardest with inflation and later-era case mix; brittle early (capital-starved, misses volume) |
| **C. Tech rush** ("digital-first") | ward + pharmacy (~$600K), 2 nurses + 1 doctor, EHR + LAB AUTOLINE + SCRIBE (~$570K tech) | ~$29K salaries + $12K upkeep (lowest drains) | small staff at ~2x effective speed captures flu+bacteria+virus (~$285K) ≈ **$285K** | ≈ **$245K** | Lowest recurring costs, burnout-immune, and compounds with the free era baselines into the auto-eras; brittle vs volume spikes (no bed depth) |

Nets land within ~10% of each other by design — all three are viable, they
just spend different resources (lives risk vs capital vs flexibility) and
peak in different eras (A early, C mid, B late). Final equality is a
playtest/simulation job (principle 1), not a spreadsheet promise.

### 3d. Fairness rails (no death spirals)

1. **Income floor**: copays trickle even on a catastrophic shift; a shift
   can never gross $0.
2. **Catch-up grant**: the era grant's struggle factor (3a) is the gentle
   rubber band — capped so flawless play still nets more total money.
3. **County bailout**: if budget < cheapest hire ($6K x inflation) at
   cool-off start, top up to `BAILOUT_FLOOR` (= 1 nurse + 1 shift of
   salaries). First bailout per run is free; each subsequent one dings the
   end-of-run star rating (visible, so it's a rail, not a strategy).
4. **Soft debt, never hard locks**: salaries/upkeep settle at shift end but
   cannot push budget below $0 — the shortfall carries as ACCOUNTS PAYABLE
   deducted from the next shift's income. No action is ever blocked by
   debt; the drain pressure is felt, not paralyzing.
5. **One bad round costs ONE resource**: ICU transfers cost lives, never
   money (private wing excepted, by explicit opt-in); financial misses cost
   money, never lives. No compounding cross-resource spiral (principle 9).
6. **Ledger legibility** (principle 10): the SHIFT REPORT gains an
   income/expense ledger — reimbursements + copays + grants above the line;
   salaries, upkeep, purchases below; NET in big 8-bit type, color-coded.
   The ERA REPORT (docs/ERAS.md) totals the era's ledger so the economy
   teaches itself.

### 3e. Rescaled tech prices (supersedes the toy prices in TECH_TREE/ERAS)

Quoted at x1.0 inflation; era inflation applies at purchase time via
`inflatedCost()`. Already-implemented prices kept where they exist
(scribe $120K, priorAuth $180K, labRouter $300K).

| Tech | New price | | Tech | New price |
|---|---|---|---|---|
| CRASH CART | $40K | | REVCYCLE BOT | $200K |
| MAINFRAME HIS | $80K | | AI TRIAGE KIOSK | $250K |
| PULSE-OX MONITORS | $60K | | AGENTIC ROUTER (labRouter) | $300K |
| PIONEER EMR | $120K | | MED-DRONE BAY | $500K |
| EHR TERMINAL | $200K | | HOME WARD LINK | $400K |
| E-PRESCRIBE HUB | $100K | | BIOPRINT VAT | $700K |
| TELEHEALTH KIOSK | $180K | | GENE-EDIT SUITE | $600K |
| PATIENT PORTAL | $120K | | NANO-SWARM INFUSER | $900K |
| LAB AUTOLINE | $250K | | REGEN POD | $800K |
| IMAGING AI | $350K | | AMBIENT CARE CORE | $1.2M |
| FLOW COMMAND | $300K | | NANOBOT IMMUNE SWARM | free (Y3K) |
| WARD WEARABLES | $150K | | AMBIENT SCRIBE | $120K (as shipped) |

Also: **`START_BUDGET` 600 → $500,000** (seed grant: buys 1 ward + 2 nurses
+ working capital, OR a leaner build + early tech — the first interesting
decision happens before shift 1).

## Part 4 — Implementation sketch (one PR, vanilla JS)

- **`js/constants.js`**: add `salary` to `STAFF_TYPES`; `UPKEEP_RATE`,
  `BUILD_ESCALATION`, `COPAY`, `PAYOUT_OUTCOME_MULT`, `ERA_GRANT_BASE`,
  `PRIVATE_WING`, `BAILOUT_FLOOR`; rescale `START_BUDGET` and
  `UPGRADE_TYPES` costs per 3e.
- **sim (`js/sim.js`)**: copay credit on arrival; outcome multiplier at
  discharge; end-of-shift `settleLedger()` (salaries + upkeep, accounts-
  payable carry, returns a ledger object); era-up grant hook (reads
  livesLost); private-wing flags on payout + ICU-transfer paths.
- **shop/UI (`js/ui.js`)**: escalated build price display
  (`cost * 1.5^owned`, then inflation); private-wing toggle in the cool-off
  bar; bailout toast; salary/upkeep preview on hire/build tooltips ("costs
  $4K/shift").
- **shift report**: ledger block (3d.6) appended to the existing popup;
  era report totals per `docs/ERAS.md`.
- **save**: persist accounts payable, bailout count, private-wing state.
- Owner note: `js/` belongs to the implementation agent — this doc is the
  spec; constants named above are suggestions, not diffs.

## Open design questions

1. **Salary scale** — flat per-shift wages (proposed) vs. wages that rise
   with era inflation only (proposed) vs. also with staff experience/level
   (if a leveling system lands later)?
2. **Upkeep forgiveness** — should an unstaffed room's upkeep drop to 1%
   ("mothballed"), giving a manual lever to shed drains in a crisis, at the
   cost of a 1-shift reactivation delay?
3. **Private wing tuning** — x1.3/$75K is a first guess; the lever should
   be taken ~half the time by a skilled player (if always/never, it's not
   a decision — principle 7).
4. **Grant flavor beat** — the HITECH grant doubling as the 2000s era grant
   is a strong teaching moment; worth a dedicated info-card line ("the US
   government paid hospitals ~$30B to adopt EHRs — your grant just did the
   same")?
5. **Does escalation apply to Break Rooms?** Probably exempt (support room,
   already capped at 2 counted) — exempting it keeps the anti-spam rule
   aimed at treatment capacity only.
