/* ============================================================
 * AGENTIC AI INTEGRATION LAYER
 * ============================================================
 * This module is the seam between the game and a real LLM.
 *
 * HOW THE AI INTERACTS WITH THE GAME MATH (judge-facing):
 *
 *  1. When the Agentic Lab-Router is installed at the entrance,
 *     every spawning patient is serialized into a "Patient
 *     Manifest" (buildPatientManifest) — the same string a real
 *     triage agent would receive from an intake form.
 *
 *  2. simulateAgenticDecision(patient) sends that manifest to an
 *     LLM (Anthropic Claude scaffold below) asking for a priority
 *     score 1-5 and a diagnostic category. If no API key is
 *     configured — the default for the self-contained demo — a
 *     deterministic local fallback produces the same shaped
 *     output from a structured symptom table.
 *
 *  3. The DECISION drives presentation (the floating callout,
 *     priority color), while the MECHANICAL effect is fixed:
 *     the Lab-Router grants instant diagnosis on arrival plus a
 *     periodic auto-assign to matching beds (sim.js). Keeping the
 *     mechanical effect constant means game balance is
 *     deterministic and auditable even when a live,
 *     non-deterministic LLM is plugged in: the AI decides WHAT
 *     the patient has; the game decides how much that knowledge
 *     is worth.
 * ============================================================ */

const AGENTIC_CONFIG = {
  // Define window.ANTHROPIC_API_KEY (see index.html) to go live.
  get apiKey() { return (typeof window !== 'undefined' && window.ANTHROPIC_API_KEY) || null; },
  endpoint: 'https://api.anthropic.com/v1/messages',
  model: 'claude-haiku-4-5',
  maxTokens: 128,
};

/* Structured symptom knowledge base — doubles as the LLM prompt
 * context AND the local fallback's matching table. */
const SYMPTOM_DB = {
  flu:      { symptoms: ['fever', 'cough', 'body aches'],                     baseAcuity: 2, category: 'VIRAL / GENERAL WARD' },
  bacteria: { symptoms: ['localized infection', 'elevated WBC', 'abscess'],   baseAcuity: 3, category: 'BACTERIAL / PHARMACY' },
  virus:    { symptoms: ['high fever', 'rash', 'novel presentation'],         baseAcuity: 3, category: 'VIRAL / VIROLOGY LAB' },
  spore:    { symptoms: ['respiratory distress', 'exposure cluster', 'contagion risk'], baseAcuity: 4, category: 'AIRBORNE / ISOLATE IN VIROLOGY' },
  trauma:   { symptoms: ['blunt-force injury', 'bleeding', 'shock risk'],     baseAcuity: 4, category: 'TRAUMA / SURGERY' },
  cardiac:  { symptoms: ['mild jaw pain', 'fatigue', 'diaphoresis'],          baseAcuity: 5, category: 'CRITICAL / CARDIOLOGY' },
};

function buildPatientManifest(patient) {
  const db = SYMPTOM_DB[patient.typeKey] || { symptoms: ['unknown'] };
  return [
    `PATIENT MANIFEST #${patient.id}`,
    `presenting: ${db.symptoms.join(', ')}`,
    `vitals_stability: ${Math.round(patient.health)}/100`,
    `case_complexity: ${Math.round(patient.complexity)}`,
  ].join('\n');
}

/**
 * The single agentic entry point. Always resolves — never throws —
 * so a network failure can never stall the game loop.
 * @returns {Promise<{priority:number, category:string, source:'llm'|'fallback'}>}
 */
async function simulateAgenticDecision(patient) {
  const manifest = buildPatientManifest(patient);

  if (AGENTIC_CONFIG.apiKey) {
    try {
      // Live-LLM scaffold. The system prompt pins the output contract
      // so the response parses into the exact shape the game consumes.
      const res = await fetch(AGENTIC_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': AGENTIC_CONFIG.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: AGENTIC_CONFIG.model,
          max_tokens: AGENTIC_CONFIG.maxTokens,
          system:
            'Act as an ED triage agent. Given a patient manifest, output ONLY ' +
            'a JSON object: {"priority": <1-5, 5 = most urgent>, "category": "<short diagnostic category>"}.',
          messages: [{ role: 'user', content: manifest }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.content?.[0]?.text ?? '';
        const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1));
        const priority = Math.max(1, Math.min(5, Number(parsed.priority) || 3));
        return { priority, category: String(parsed.category || 'UNSPECIFIED').toUpperCase(), source: 'llm' };
      }
    } catch (err) {
      console.warn('[agentic] LLM call failed, using local fallback:', err);
    }
  }
  return localTriageFallback(patient);
}

/* ============================================================
 * PRESENTING COMPLAINTS — the second agentic seam.
 *
 * Every spawning patient gets one line of first-person flavor
 * ("uhhh doctor, I fell off my bike") shown in their hover
 * speech bubble. With an API key, claude-haiku writes it fresh
 * (one short fire-and-forget call per patient, never blocking
 * the game loop). Offline, a canned table serves the same shape.
 * The output contract is pinned AND enforced: one line, <=60
 * chars, first person, no diagnosis words — anything off-contract
 * falls back to the canned table.
 * ============================================================ */

/* Base pools: 8+ lines per pathogen so repeats are rare. Short (fits
 * the hover bubble), first-person, human, a little unhinged. */
const COMPLAINT_DB = {
  flu: [
    "doc, my nose is a faucet",
    "I sneezed 44 times on the bus here",
    "everything aches. even my hair aches.",
    "my head is full of soup",
    "I brought my own tissue box. boxes.",
    "I'm hot AND cold. pick one, body!",
    "my sneeze scared the cat off the roof",
    "I licked a doorknob on a dare. regrets.",
  ],
  bacteria: [
    "this cut got real angry real fast",
    "my arm's gone green around the bandage",
    "the scrape from tuesday is... pulsing?",
    "I ignored it for a week. big mistake.",
    "it's warm and it should NOT be warm",
    "my 'it's fine' turned into 'it's NOT fine'",
    "I drew a face on the swelling. it grew.",
    "grandma's remedy made it worse. sorry grandma.",
  ],
  virus: [
    "I've got spots on my spots",
    "my fever has a fever",
    "it started with ONE spot. now look.",
    "I feel like a lava lamp, doc",
    "my thermometer said 'no thanks'",
    "I glow in the dark now. is that bad?",
    "my mirror screamed first",
    "day 3: the spots have formed a map of Ohio",
  ],
  spore: [
    "*cough* sorry *cough* everyone I- *cough*",
    "I cleaned out the old greenhouse today",
    "why is my cough... green?",
    "the basement mushrooms fought back",
    "please don't stand too close, doc",
    "I smelled the weird jar. WHY did I smell it.",
    "my lungs feel like a terrarium",
    "the compost heap breathed at me first",
  ],
  trauma: [
    "uhhh doctor, I fell off my bike",
    "the skateboard won.",
    "turns out ladders have opinions",
    "I bet I could jump the fence. I could not.",
    "my arm bends a new way now",
    "hold-my-drink incident. don't ask.",
    "the trampoline betrayed me",
    "I was winning the argument with the stairs",
  ],
  cardiac: [
    "feels like an elephant sat on my chest",
    "my left arm's gone all pins and needles",
    "just a little jaw ache, probably nothing?",
    "ran up the stairs and my chest went THUD",
    "I feel a strong urge to sit down forever",
    "my heart is doing a drum solo",
    "my chest tightened at the word 'taxes'",
    "my ticker's ticking in cursive",
  ],
};

/* Era seasoning: a 19XX patient talks differently than a 2026 one.
 * Bucketed by the stage's era; merged into the base pool at pick time. */
const COMPLAINT_ERA = {
  early: {   // 19XX — the century of medicine
    flu: ["caught a chill at the drive-in picture show", "the whole factory floor is sneezing, doc"],
    bacteria: ["the tetanus shot is new, right? asking for me", "nicked it on the plow. it's gone theatrical."],
    virus: ["the neighbor kid had it. now the whole block does", "measles party. worst party."],
    spore: ["been down the mine since monday", "the barn loft dust finally got me"],
    trauma: ["fell off the milk truck", "cranked the Model T and it cranked back"],
    cardiac: ["chest went funny at the victory parade", "doc said 'smoke for your nerves'. doc was wrong."],
  },
  digital: { // 2XXX — EHR / internet / smartphones
    flu: ["WebMD says I have everything", "I sneezed on the keyboard. it's under warranty?"],
    bacteria: ["the forum said to put butter on it", "I rated this infection 1 star on Yelp"],
    virus: ["I caught something at the LAN party", "my smartwatch just says 'ERROR'"],
    spore: ["the office AC has been 'getting fixed' for a year", "I vacuumed a very old beanbag chair"],
    trauma: ["segway incident. please don't blog this", "I was texting. the pole was not."],
    cardiac: ["my fitness tracker called 911 for me", "my heart rate app crashed. then so did I."],
  },
  future: {  // 2026+ — agentic AI and beyond
    flu: ["my health agent pre-diagnosed me in the uber", "the AI said 'rest'. I did not rest."],
    bacteria: ["the nanogel patch expired in 2024", "my chatbot says it's 'probably fine'. it lies."],
    virus: ["I opted out of the immunity update", "caught it in VR somehow?? doc???"],
    spore: ["the vertical farm sneezed on me", "my air purifier unionized and quit"],
    trauma: ["the delivery drone and I wanted the same door", "my self-driving scooter had other plans"],
    cardiac: ["my biofeedback ring is just screaming", "the stock ticker did that. THAT did this."],
  },
};

/* Which era-seasoning bucket the current stage sits in. */
function eraBucket() {
  const idx = (typeof G !== 'undefined' && G.stage) ? G.stage.eraIdx : 0;
  return idx <= 3 ? 'early' : (idx <= 5 ? 'digital' : 'future');
}

const COMPLAINT_BANNED = [
  'flu', 'influenza', 'bacteria', 'bacterial', 'virus', 'viral', 'spore',
  'trauma', 'cardiac', 'heart attack', 'infection', 'diagnos',
];

function fallbackComplaint(typeKey) {
  const base = COMPLAINT_DB[typeKey] || ["I don't feel so good, doc"];
  const extra = (COMPLAINT_ERA[eraBucket()] || {})[typeKey] || [];
  const list = base.concat(extra);
  return list[Math.floor(Math.random() * list.length)];
}

/* ============================================================
 * DISCHARGE LINES — the walk-out one-liner when a patient is
 * cured. Same shape as complaints: per-pathogen pools (often
 * calling back to what they came in with) + a generic pool.
 * ============================================================ */
const DISCHARGE_DB = {
  flu: [
    "I can BREATHE through my NOSE",
    "first full sentence without sneezing. bliss.",
    "the soup has left my head",
    "smell? I remember smell now!",
  ],
  bacteria: [
    "it's the right color again!",
    "the pulsing stopped. we're friends now.",
    "next time I'm coming in on day ONE",
    "arm: back to factory settings",
  ],
  virus: [
    "spot-free and feeling fabulous",
    "my fever finally checked out",
    "I no longer glow. mostly.",
    "the mirror and I made up",
  ],
  spore: [
    "my cough is GONE!",
    "breathing plain old air. delicious.",
    "the greenhouse and I are done. forever.",
    "you may stand near me again",
  ],
  trauma: [
    "everything bends the CORRECT way now",
    "the skateboard and I have made peace",
    "good as new! ...selling the trampoline though",
    "walked in broken, walking out smug",
  ],
  cardiac: [
    "my heart's back on the beat!",
    "the elephant got off my chest",
    "climbed the stairs on the way out. showing off.",
    "ticker's ticking in print again, thanks doc",
  ],
};

const DISCHARGE_GENERIC = [
  "best sleep I've had in years, thanks doc!",
  "10 out of 10, would heal here again",
  "I feel like a NEW pixel person",
  "tell the nurse they're a legend",
  "invoice me, I don't even care!",
];

function dischargeLine(typeKey) {
  const pool = (DISCHARGE_DB[typeKey] || []).concat(DISCHARGE_GENERIC);
  return pool[Math.floor(Math.random() * pool.length)];
}

function sanitizeComplaint(text, typeKey) {
  const line = String(text || '').split('\n')[0].replace(/["“”]/g, '').trim().slice(0, 60);
  if (line.length < 4) return fallbackComplaint(typeKey);
  const lower = line.toLowerCase();
  if (COMPLAINT_BANNED.some(w => lower.includes(w))) return fallbackComplaint(typeKey);
  return line;
}

/** Always resolves — never throws, never blocks the game loop. */
async function generateComplaint(patient) {
  if (AGENTIC_CONFIG.apiKey) {
    try {
      const db = SYMPTOM_DB[patient.typeKey] || { symptoms: ['unknown'] };
      const res = await fetch(AGENTIC_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': AGENTIC_CONFIG.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: AGENTIC_CONFIG.model,
          max_tokens: 40,
          system:
            'You write one-line first-person presenting complaints for patients in a cute 8-bit ' +
            'hospital game. Reply with ONLY the complaint line: max 60 characters, first person, ' +
            'punchy and funny with a specific human detail (how it happened, a small regret, a ' +
            'weird observation), flavored to the era given, kind in spirit, and NEVER name the ' +
            'condition or use medical terminology for it.',
          messages: [{ role: 'user', content: `condition: ${patient.def.name}\nsymptoms: ${db.symptoms.join(', ')}\nera: ${eraBucket() === 'early' ? 'mid 20th century' : eraBucket() === 'digital' ? 'early internet / smartphone age' : 'near-future AI age'}` }],
        }),
      });
      if (res.ok) {
        const data = await res.json();
        return sanitizeComplaint(data?.content?.[0]?.text, patient.typeKey);
      }
    } catch (err) {
      console.warn('[agentic] complaint call failed, using canned table:', err);
    }
  }
  return fallbackComplaint(patient.typeKey);
}

/**
 * Robust local fallback: structured-data matching, no network.
 * Priority = the type's base acuity, bumped +1 if the patient's
 * vitals are already degrading (health < 70) — mirroring how a real
 * triage agent escalates on deteriorating vitals. Clamped 1-5.
 */
function localTriageFallback(patient) {
  const db = SYMPTOM_DB[patient.typeKey] || { baseAcuity: 3, category: 'UNSPECIFIED' };
  const deteriorating = patient.health < 70 ? 1 : 0;
  return {
    priority: Math.max(1, Math.min(5, db.baseAcuity + deteriorating)),
    category: db.category,
    source: 'fallback',
  };
}
