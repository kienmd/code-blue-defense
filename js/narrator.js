/* ============================================================
 * Narrator — a distinguished old British gentleman talks the
 * player through the night. Nature-documentary gravitas, ER chaos.
 *
 * Same seam pattern as js/agentic.js — three tiers, degrade gracefully:
 *   1. ElevenLabs TTS  — needs a key (window.ELEVENLABS_API_KEY or
 *      the menu input, persisted to localStorage). Clips are cached
 *      by line id and calls are hard-capped per session.
 *   2. speechSynthesis — free/offline, best-effort en-GB male voice.
 *   3. Subtitle only   — the game is fully playable in silence.
 * Subtitles ALWAYS render, whichever tier speaks.
 * ============================================================ */

const ELEVENLABS_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb';   // "George" — warm British premade
const ELEVENLABS_MODEL = 'eleven_turbo_v2_5';
const NARRATOR_MAX_TTS_CALLS = 30;                    // per-session bill guard

/* ---------- The script (line id -> old-British-gent copy) ---------- */
const NARRATION = {
  intro:          "Good evening, and welcome to Code Blue General. Do try not to lose anyone.",
  firstPatient:   "Ah. Our first guest of the evening. They appear... unwell.",
  firstDiagnosis: "A diagnosis! Marvellous. Now we know precisely what we are up against.",
  firstDischarge: "Cured, and walking out under their own steam. A triumph of modern medicine, if I may say so.",
  firstTransfer:  "To intensive care, then. We did what we could. We shall do better.",
  firstBurnout:   "That one has, as the young people say, quite lost the plot. A break room might be prudent.",
  sporeOutbreak:  "Spores in the waiting room. How dreadfully Victorian. Isolate them, with haste.",
  finalShift:     "The final shift. History will remember what you do next.",
  win:            "All shifts complete. Simply magnificent. The board sends its regards.",
  lose:           "The intensive care unit is full. A sombre night. Even the finest hospitals have them.",
  // Era transitions — always spoken, one per decade.
  'era_1950s':    "The nineteen-fifties. Paper charts, starched caps, and surgeons with remarkable confidence.",
  'era_1960s':    "The sixties. We have learned to restart a heart. The crash cart is practically a member of staff.",
  'era_1970s':    "The seventies. The CT scanner sees all — and the paramedics have splendid sideburns.",
  'era_1980s':    "The eighties. Machines that go beep, on every finger. Progress has a soundtrack now.",
  'era_1990s':    "The nineties. X-ray film is retiring, and something called an electronic record is being attempted.",
  'era_2000s':    "The new millennium. The chart has gone digital. The fax machine remains, out of spite.",
  'era_2010s':    "The twenty-tens. The doctor will see you now — on video. The machines have started reading the scans.",
  'era_2020s':    "The A.I. decade. It listens, it writes the note, it files the claim. I confess a certain professional envy.",
  'era_20??s':    "The future. The agents run the floor, and the humans supervise. We are, all of us, guessing.",
};

/* ---------- State ---------- */
const narrator = {
  said: new Set(),          // once-per-run policy (reset by narratorReset)
  queue: [],
  speaking: false,
  ttsCalls: 0,
  clipCache: new Map(),     // line id -> object URL (session-lifetime; saves re-billing)
  subtitleTimer: null,
};

function narratorKey() {
  if (typeof window.ELEVENLABS_API_KEY === 'string' && window.ELEVENLABS_API_KEY) {
    return window.ELEVENLABS_API_KEY;
  }
  try { return localStorage.getItem('cbd_11labs_key') || null; } catch (_) { return null; }
}

function narratorReset() {
  narrator.said.clear();
  narrator.queue.length = 0;
}

/* ---------- Public entry: narrate('lineId', { always }) ---------- */
function narrate(id, opts = {}) {
  const text = NARRATION[id];
  if (!text) return;
  if (!opts.always && narrator.said.has(id)) return;
  narrator.said.add(id);
  narrator.queue.push({ id, text });
  pumpNarration();
}

function pumpNarration() {
  if (narrator.speaking || !narrator.queue.length) return;
  const line = narrator.queue.shift();
  narrator.speaking = true;
  showSubtitle(line.text);
  speakLine(line)
    .catch(() => { /* narration must never break the game */ })
    .then(() => {
      narrator.speaking = false;
      if (typeof duckMusic === 'function') duckMusic(false);
      pumpNarration();
    });
}

async function speakLine(line) {
  if (typeof isMuted === 'function' && isMuted()) return;   // subtitle already shown
  if (typeof duckMusic === 'function') duckMusic(true);

  // Tier 1: ElevenLabs
  const key = narratorKey();
  if (key) {
    try {
      const url = await elevenLabsClip(line, key);
      if (url) { await playClip(url); return; }
    } catch (_) { /* fall through */ }
  }

  // Tier 2: browser speechSynthesis with an en-GB male-ish voice
  if ('speechSynthesis' in window) {
    const spoke = await speakWithSynthesis(line.text);
    if (spoke) return;
  }

  // Tier 3: subtitle only — hold roughly reading time
  await new Promise(res => setTimeout(res, Math.min(5000, 1200 + line.text.length * 45)));
}

async function elevenLabsClip(line, key) {
  if (narrator.clipCache.has(line.id)) return narrator.clipCache.get(line.id);
  if (narrator.ttsCalls >= NARRATOR_MAX_TTS_CALLS) return null;   // bill guard
  narrator.ttsCalls++;
  const resp = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}?output_format=mp3_44100_64`,
    {
      method: 'POST',
      headers: { 'xi-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: line.text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.55, similarity_boost: 0.75, style: 0.35 },
      }),
    },
  );
  if (!resp.ok) throw new Error(`TTS ${resp.status}`);
  const url = URL.createObjectURL(await resp.blob());
  narrator.clipCache.set(line.id, url);
  return url;
}

function playClip(url) {
  return new Promise(resolve => {
    const a = new Audio(url);
    a.onended = resolve;
    a.onerror = resolve;
    a.play().catch(resolve);
  });
}

function speakWithSynthesis(text) {
  return new Promise(resolve => {
    try {
      const voices = speechSynthesis.getVoices();
      const gb = voices.filter(v => (v.lang || '').startsWith('en-GB'));
      const male = gb.find(v => /daniel|george|arthur|male/i.test(v.name)) || gb[0]
        || voices.find(v => (v.lang || '').startsWith('en')) || null;
      const u = new SpeechSynthesisUtterance(text);
      if (male) u.voice = male;
      u.rate = 0.92;
      u.pitch = 0.75;                       // lower: distinguished, unhurried
      u.onend = () => resolve(true);
      u.onerror = () => resolve(false);
      speechSynthesis.speak(u);
    } catch (_) { resolve(false); }
  });
}

/* ---------- Subtitles (always on) ---------- */
function showSubtitle(text) {
  const elSub = document.getElementById('subtitle');
  if (!elSub) return;
  elSub.textContent = `\u201C${text}\u201D`;
  elSub.classList.remove('hidden');
  clearTimeout(narrator.subtitleTimer);
  narrator.subtitleTimer = setTimeout(
    () => elSub.classList.add('hidden'),
    Math.min(9000, 2500 + text.length * 55),
  );
}
