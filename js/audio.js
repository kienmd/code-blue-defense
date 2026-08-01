/* ============================================================
 * Audio — tiny chiptune synth (WebAudio square/saw/sine tones)
 * + a looping intro theme driven by a step sequencer.
 *
 * ensureAudio() must run inside a user gesture (autoplay policy);
 * every sound is a no-op without it. Mute state persists in
 * localStorage and zeroes the master gain (music keeps ticking,
 * silently, so unmute is instant).
 * ============================================================ */

let audioCtx = null;
let masterGain = null;   // everything routes through this (mute)
let musicGain = null;    // music-only sub-mix (ducking hook)
let muted = false;
try { muted = localStorage.getItem('cbd_muted') === '1'; } catch (_) { /* private mode */ }

function ensureAudio() {
  if (audioCtx) return;
  try {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = muted ? 0 : 1;
    masterGain.connect(audioCtx.destination);
    musicGain = audioCtx.createGain();
    musicGain.gain.value = 0.9;
    musicGain.connect(masterGain);
  } catch (_) { /* no audio */ }
}

function isMuted() { return muted; }
function setMuted(m) {
  muted = m;
  try { localStorage.setItem('cbd_muted', m ? '1' : '0'); } catch (_) { /* ignore */ }
  if (masterGain) masterGain.gain.value = m ? 0 : 1;
}

/* Duck the theme under speech (narration hook). */
function duckMusic(on) {
  if (!musicGain) return;
  musicGain.gain.linearRampToValueAtTime(on ? 0.25 : 0.9, audioCtx.currentTime + 0.25);
}

/* ---------- Tones ---------- */
function toneAt(freq, dur, type, vol, t0, dest) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(dest || masterGain || audioCtx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

function tone(freq, dur, type = 'square', vol = 0.035, when = 0) {
  if (!audioCtx) return;
  toneAt(freq, dur, type, vol, audioCtx.currentTime + when);
}

/* ---------- SFX ---------- */
const SFX = {
  discharge: () => { tone(660, 0.08); tone(880, 0.1, 'square', 0.035, 0.08); tone(1180, 0.14, 'square', 0.03, 0.18); },
  transfer:  () => { tone(680, 0.22, 'square', 0.05); tone(510, 0.22, 'square', 0.05, 0.24); tone(680, 0.3, 'square', 0.05, 0.48); },
  place:     () => tone(440, 0.07),
  buy:       () => { tone(590, 0.06); tone(790, 0.08, 'square', 0.035, 0.06); },
  burnout:   () => tone(110, 0.5, 'sawtooth', 0.05),
  siren:     () => { tone(680, 0.22, 'square', 0.045); tone(510, 0.22, 'square', 0.045, 0.24); tone(680, 0.22, 'square', 0.045, 0.48); },
  beep:      () => tone(880, 0.05, 'sine', 0.03),
  diagnose:  () => { tone(740, 0.05, 'sine', 0.03); tone(990, 0.07, 'sine', 0.03, 0.05); },
  denied:    () => tone(160, 0.12, 'square', 0.04),
  select:    () => tone(520, 0.04, 'sine', 0.025),
  assign:    () => { tone(520, 0.05); tone(700, 0.06, 'square', 0.03, 0.05); },
  era:       () => {                       // decade card sting: rising triad + shimmer
    tone(392, 0.14, 'square', 0.045);
    tone(523, 0.14, 'square', 0.045, 0.14);
    tone(659, 0.22, 'square', 0.045, 0.28);
    tone(1046, 0.3, 'triangle', 0.03, 0.42);
  },
  // paper rustle: quick noisy down-chirp as the report slides up
  paper: () => {
    tone(2200, 0.03, 'sawtooth', 0.02);
    tone(1500, 0.03, 'sawtooth', 0.02, 0.03);
    tone(900, 0.05, 'sawtooth', 0.018, 0.06);
    tone(1900, 0.03, 'sawtooth', 0.015, 0.1);
  },
};

const _sfxWarned = new Set();
function playSfx(name) {
  const fn = SFX[name];
  if (!fn) {                       // never crash gameplay, but never hide the typo either
    if (!_sfxWarned.has(name)) { _sfxWarned.add(name); console.warn(`[sfx] unknown sound "${name}"`); }
    return;
  }
  fn();
}

/* ---------- Intro theme ----------
 * Hopeful hospital-heroic loop, 4 bars of 8th notes at 132 BPM:
 * square lead, triangle bass on the C-Am-F-G turnaround, and a
 * soft sine heartbeat (lub-dub) at the top of every bar.
 * 0 = rest. All synthesized; no audio files.
 */
const N = {
  C3: 130.8, F3: 174.6, G3: 196.0, A2: 110.0, G2: 98.0, F2: 87.3,
  C4: 261.6, D4: 293.7, E4: 329.6, F4: 349.2, G4: 392.0, A4: 440.0, B4: 493.9,
  C5: 523.3, D5: 587.3, E5: 659.3, F5: 698.5, G5: 784.0, A5: 880.0, B5: 987.8, C6: 1046.5,
};

const THEME = {
  bpm: 132,
  // 8 steps per bar x 4 bars
  lead: [
    N.C5, 0,    N.E5, N.G5, N.C6, 0,    N.G5, N.E5,   // C — reach up
    N.A4, 0,    N.C5, N.E5, N.A5, 0,    N.E5, N.C5,   // Am — answer
    N.F4, N.A4, N.C5, N.A4, N.F5, 0,    N.C5, N.A4,   // F — swell
    N.G4, N.B4, N.D5, N.B4, N.G5, N.F5, N.E5, N.D5,   // G — walk back home
  ],
  bass: [
    N.C3, 0, 0, 0, N.G3, 0, 0, 0,
    N.A2, 0, 0, 0, N.A2, 0, 0, 0,
    N.F2, 0, 0, 0, N.F3, 0, 0, 0,
    N.G2, 0, 0, 0, N.G3, 0, 0, 0,
  ],
};

let musicTimer = null;
let musicStep = 0;
let musicNextT = 0;

function scheduleThemeStep(step, t) {
  const lead = THEME.lead[step];
  const bass = THEME.bass[step];
  if (lead) toneAt(lead, 0.16, 'square', 0.028, t, musicGain);
  if (bass) toneAt(bass, 0.3, 'triangle', 0.05, t, musicGain);
  const inBar = step % 8;
  if (inBar === 0) {                       // heartbeat: lub…
    toneAt(65, 0.09, 'sine', 0.09, t, musicGain);
  } else if (inBar === 1) {                // …dub
    toneAt(52, 0.11, 'sine', 0.07, t, musicGain);
  }
}

function startMusic() {
  ensureAudio();
  if (!audioCtx || musicTimer) return;
  musicStep = 0;
  musicNextT = audioCtx.currentTime + 0.15;
  const stepDur = 60 / THEME.bpm / 2;      // 8th notes
  musicTimer = setInterval(() => {
    while (musicNextT < audioCtx.currentTime + 0.5) {
      scheduleThemeStep(musicStep, musicNextT);
      musicStep = (musicStep + 1) % THEME.lead.length;
      musicNextT += stepDur;
    }
  }, 150);
}

function stopMusic() {
  clearInterval(musicTimer);
  musicTimer = null;
  stopGameMusic();
}

/* ---------- In-game music ----------
 * A subtle low-volume bed that runs during play, era-flavored:
 * tempo and lead waveform read the CURRENT ERA each step (1950s =
 * slow triangle waltz feel, AI eras = brisk square/saw arps), and
 * the cool-off phase drops to a sparser half-density variation.
 * Same synth, same musicGain (narrator ducking + SND toggle apply).
 */
const GAME_BASS = [N.C3, 0, N.G2, 0, N.A2, 0, N.F2, 0, N.C3, 0, N.G3, 0, N.A2, 0, N.G2, 0];
const GAME_ARP  = [N.C4, N.E4, N.G4, N.E4, N.A4, N.C5, N.E5, N.C5, N.F4, N.A4, N.C5, N.A4, N.G4, N.B4, N.D5, N.B4];

let gameMusicTimer = null;
let gameMusicStep = 0;
let gameMusicNextT = 0;

function eraMusicParams() {
  const era = (typeof currentEra === 'function') ? currentEra() : null;
  const idx = era ? ERAS.indexOf(era) : 0;
  return {
    bpm: Math.min(168, 96 + idx * 6),                       // decades speed up
    wave: idx < 4 ? 'triangle' : (idx < 8 ? 'square' : 'sawtooth'),
    sparse: (typeof G !== 'undefined' && G.phase === 'cooloff'),
  };
}

function scheduleGameStep(step, t) {
  const p = eraMusicParams();
  const bass = GAME_BASS[step % GAME_BASS.length];
  const arp = GAME_ARP[step % GAME_ARP.length];
  if (bass) toneAt(bass, 0.28, 'triangle', 0.03, t, musicGain);
  // cool-off: bass-only every other note — a sparser shop-phase bed
  if (!p.sparse && arp && step % 2 === 0) toneAt(arp, 0.12, p.wave, 0.014, t, musicGain);
  return 60 / p.bpm / 2;
}

function startGameMusic() {
  ensureAudio();
  if (!audioCtx || gameMusicTimer) return;
  stopMusic();                                              // never over the intro theme
  gameMusicStep = 0;
  gameMusicNextT = audioCtx.currentTime + 0.2;
  gameMusicTimer = setInterval(() => {
    while (gameMusicNextT < audioCtx.currentTime + 0.5) {
      const stepDur = scheduleGameStep(gameMusicStep, gameMusicNextT);
      gameMusicStep = (gameMusicStep + 1) % 16;
      gameMusicNextT += stepDur;
    }
  }, 150);
}

function stopGameMusic() {
  clearInterval(gameMusicTimer);
  gameMusicTimer = null;
}
