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

const COMPLAINT_DB = {
  flu: [
    "doc, my nose is a faucet",
    "I sneezed 44 times on the bus here",
    "everything aches and I'm freezing",
    "my head is full of soup",
    "I brought my own tissue box. boxes.",
  ],
  bacteria: [
    "this cut got real angry real fast",
    "my arm's gone green around the bandage",
    "the scrape from tuesday is... pulsing?",
    "I ignored it for a week. big mistake.",
    "it's warm and it should NOT be warm",
  ],
  virus: [
    "I've got spots on my spots",
    "my fever has a fever",
    "I googled it. don't ask what it said.",
    "it started with ONE spot. now look.",
    "I feel like a lava lamp, doc",
  ],
  spore: [
    "*cough* sorry *cough* everyone I- *cough*",
    "I cleaned out the old greenhouse today",
    "why is my cough... green?",
    "the basement mushrooms fought back",
    "please don't stand too close, doc",
  ],
  trauma: [
    "uhhh doctor, I fell off my bike",
    "the skateboard won.",
    "turns out ladders have opinions",
    "I bet I could jump the fence. I could not.",
    "my arm bends a new way now",
  ],
  cardiac: [
    "feels like an elephant sat on my chest",
    "my left arm's gone all pins and needles",
    "just a little jaw ache, probably nothing?",
    "ran up the stairs and my chest went THUD",
    "I feel a strong urge to sit down forever",
  ],
};

const COMPLAINT_BANNED = [
  'flu', 'influenza', 'bacteria', 'bacterial', 'virus', 'viral', 'spore',
  'trauma', 'cardiac', 'heart attack', 'infection', 'diagnos',
];

function fallbackComplaint(typeKey) {
  const list = COMPLAINT_DB[typeKey] || ["I don't feel so good, doc"];
  return list[Math.floor(Math.random() * list.length)];
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
            'funny but kind, and NEVER name the condition or use medical terminology for it.',
          messages: [{ role: 'user', content: `condition: ${patient.def.name}\nsymptoms: ${db.symptoms.join(', ')}` }],
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
