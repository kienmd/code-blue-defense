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
 *  3. The DECISION drives presentation + routing (the floating
 *     callout, priority color), while the MECHANICAL effect is a
 *     fixed 30% complexity shred (UPGRADE_TYPES.labRouter
 *     .complexityShred). Keeping the shred percentage constant
 *     means game balance is deterministic and auditable even when
 *     a live, non-deterministic LLM is plugged in: the AI decides
 *     WHAT the patient has; the game decides how much that
 *     knowledge is worth.
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
