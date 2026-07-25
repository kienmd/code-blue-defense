/* ============================================================
 * Narrator — a distinguished old British gentleman talks the
 * player through the night. Nature-documentary gravitas, ER chaos.
 *
 * Voice policy (by design, not fallback): the browser's built-in
 * speechSynthesis with the natural en-US system voice as default,
 * pinned in localStorage; the topbar VOICE button cycles the best
 * few available voices so the player picks their favorite. Always-on
 * subtitles. An ElevenLabs TTS tier exists below as a disabled seam
 * (NARRATOR_TTS_ENABLED) — a possible future upgrade; no key is
 * wired anywhere.
 * ============================================================ */

const NARRATOR_TTS_ENABLED = false;                   // ElevenLabs seam: off by design
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
  // Era transitions — always spoken, one per era (keys match ERAS labels).
  'era_1950s':    "The nineteen-fifties. Paper charts, starched caps, and surgeons with remarkable confidence.",
  'era_1960s':    "The sixties. We have learned to restart a heart. The crash cart is practically a member of staff.",
  'era_1970s-80s': "The seventies and eighties. The CT scanner sees all, machines beep on every finger, and the paramedics have splendid sideburns.",
  'era_1990s':    "The nineties. X-ray film is retiring, and something called an electronic record is being attempted.",
  'era_2000s':    "The new millennium. The chart has gone digital. The fax machine remains, out of spite.",
  'era_2010s':    "The twenty-tens. The doctor will see you now — on video. The machines have started reading the scans.",
  'era_2020s':    "The A.I. decade. It listens, it writes the note, it files the claim. I confess a certain professional envy.",
  'era_2030s':    "The twenty-thirties. The agents run the floor, and the humans supervise. We are, all of us, guessing.",
  'era_2040s':    "The twenty-forties. The hospital has lost its walls. The drones, I am told, do not unionize.",
  'era_2050s':    "The twenty-fifties. Organs printed to order, genes spell-checked. Repair, not replace.",
  'era_2075':     "Twenty-seventy-five. The body shop. Aging has filed an appeal, and lost.",
  'era_2100':     "The year twenty-one hundred. Medicine is infrastructure. Mostly, the hospital hums.",
  'era_Y3K':      "The year three thousand. Certified fantasy, total care. One human remains on staff. It appears to be you.",
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
  if (!NARRATOR_TTS_ENABLED) return null;
  if (typeof window.ELEVENLABS_API_KEY === 'string' && window.ELEVENLABS_API_KEY) {
    return window.ELEVENLABS_API_KEY;
  }
  return null;
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

  // Disabled seam: ElevenLabs TTS (future upgrade; narratorKey()
  // returns null while NARRATOR_TTS_ENABLED is false).
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

/* Voice policy: default to the natural en-US system voice (the user
 * prefers it over the en-GB one), pinned in localStorage so it never
 * changes between sessions. A VOICE button in the topbar cycles
 * through the best few available system voices — the player picks
 * their favorite themselves. */
const VOICE_PREFERENCE = [/^alex$/i, /^samantha/i, /^daniel/i, /^karen/i, /^moira/i, /us english/i, /uk english/i];

function narratorVoiceCandidates() {
  const voices = speechSynthesis.getVoices();
  const en = voices.filter(v => (v.lang || '').replace('_', '-').startsWith('en'));
  const picked = [];
  for (const rx of VOICE_PREFERENCE) {
    const v = en.find(v => rx.test(v.name) && !picked.includes(v));
    if (v) picked.push(v);
    if (picked.length >= 4) break;
  }
  for (const v of en) {                     // pad with whatever's around
    if (picked.length >= 4) break;
    if (!picked.includes(v)) picked.push(v);
  }
  return picked;
}

function pickNarratorVoice() {
  const candidates = narratorVoiceCandidates();
  if (!candidates.length) return null;
  let pinned = null;
  try { pinned = localStorage.getItem('cbd_voice'); } catch (_) { /* ignore */ }
  if (pinned) {
    const v = speechSynthesis.getVoices().find(v => v.name === pinned);
    if (v) return v;
  }
  const chosen = candidates[0];
  try { localStorage.setItem('cbd_voice', chosen.name); } catch (_) { /* ignore */ }
  return chosen;
}

/* Cycle to the next candidate voice; returns its display name. */
function cycleNarratorVoice() {
  const candidates = narratorVoiceCandidates();
  if (!candidates.length) return null;
  const cur = pickNarratorVoice();
  const idx = Math.max(0, candidates.findIndex(v => cur && v.name === cur.name));
  const next = candidates[(idx + 1) % candidates.length];
  try { localStorage.setItem('cbd_voice', next.name); } catch (_) { /* ignore */ }
  return next.name;
}

function narratorVoiceName() {
  const v = pickNarratorVoice();
  return v ? v.name.split(' ')[0].toUpperCase() : 'AUTO';
}

// Voice lists load async in some browsers; warm the cache when they land.
if ('speechSynthesis' in window && speechSynthesis.addEventListener) {
  speechSynthesis.addEventListener('voiceschanged', pickNarratorVoice, { once: true });
}

function speakWithSynthesis(text) {
  return new Promise(resolve => {
    try {
      const voice = pickNarratorVoice();
      const u = new SpeechSynthesisUtterance(text);
      if (voice) u.voice = voice;
      u.rate = 0.95;
      u.pitch = 0.85;                       // measured, unhurried
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
