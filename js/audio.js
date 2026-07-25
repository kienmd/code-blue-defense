/* ============================================================
 * Audio — tiny chiptune synth (WebAudio square/saw/sine tones).
 * ensureAudio() is called on first user gesture; playSfx(name)
 * is safe to call anytime (no-ops without an AudioContext).
 * ============================================================ */

let audioCtx = null;

function ensureAudio() {
  if (!audioCtx) {
    try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) { /* no audio */ }
  }
}

function tone(freq, dur, type = 'square', vol = 0.035, when = 0) {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = type; osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start(t0); osc.stop(t0 + dur + 0.02);
}

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
};

function playSfx(name) { (SFX[name] || (() => {}))(); }
