// ============================================================
// Audio — effets sonores + musique d'ambiance procédurale
// (style Minecraft : nappes douces, notes de piano éparses)
// 100 % Web Audio API : aucun fichier requis. Si vous déposez
// une piste dans /sounds/music.mp3 (ex: générée via Suno),
// elle est jouée à la place de la musique procédurale.
// ============================================================

const SFX_VOL_KEY = 'endoclicker_sfx_vol';
const MUSIC_VOL_KEY = 'endoclicker_music_vol';
const CUSTOM_MUSIC = '/sounds/music.mp3';
const DEFAULT_VOL = 70;

// Volume 0-100 persistant (avec migration depuis l'ancien format on/off)
function readVolume(key) {
  const v = parseInt(localStorage.getItem(key), 10);
  if (!Number.isNaN(v)) return Math.min(100, Math.max(0, v));
  const legacy = localStorage.getItem(key.replace('_vol', ''));
  if (legacy === 'off') return 0;
  if (legacy === 'on') return DEFAULT_VOL;
  return DEFAULT_VOL;
}

let ctx = null;
let masterGain, sfxGain, musicGain;
let musicStarted = false;


let customAudio = null;
let customAvailable = null; // null = pas encore testé

export function getSfxVolume() {
  return readVolume(SFX_VOL_KEY);
}
export function getMusicVolume() {
  return readVolume(MUSIC_VOL_KEY);
}
export function isSfxOn() {
  return getSfxVolume() > 0;
}
export function isMusicOn() {
  return getMusicVolume() > 0;
}

function applyVolumes() {
  const sfx = getSfxVolume() / 100;
  const music = getMusicVolume() / 100;
  if (sfxGain) sfxGain.gain.value = sfx * 0.5;
  if (musicGain) musicGain.gain.value = music * 0.32;
  if (customAudio) customAudio.volume = music * 0.5;
}

export function setSfxVolume(v) {
  localStorage.setItem(SFX_VOL_KEY, String(v));
  applyVolumes();
  if (v > 0 && ctx) playClick(); // retour sonore du réglage
}

export function setMusicVolume(v) {
  localStorage.setItem(MUSIC_VOL_KEY, String(v));
  applyVolumes();
  if (v <= 0) {
    stopMusic();
  } else if (!musicStarted) {
    startMusic();
  }
}

function ensureCtx() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.9;
    masterGain.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.5;
    sfxGain.connect(masterGain);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.32;
    musicGain.connect(masterGain);
    applyVolumes();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---------- Effets sonores ----------

function blip(freq, { type = 'sine', dur = 0.1, vol = 0.08, delay = 0 } = {}) {
  const c = ensureCtx();
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(sfxGain);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function playClick() {
  if (!isSfxOn()) return;
  // Petite variation de hauteur pour éviter la répétition mécanique
  blip(480 + Math.random() * 90, { dur: 0.07, vol: 0.05 });
}

export function playPurchase() {
  if (!isSfxOn()) return;
  blip(392, { dur: 0.12 });
  blip(523.25, { dur: 0.18, delay: 0.09 }); // G4 → C5
}

export function playAchievement() {
  if (!isSfxOn()) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
    blip(f, { dur: 0.25, vol: 0.06, delay: i * 0.09 })
  ); // C5 E5 G5 C6
}

export function playApple() {
  if (!isSfxOn()) return;
  [880, 1174.66, 1567.98].forEach((f, i) =>
    blip(f, { dur: 0.3, vol: 0.05, delay: i * 0.06 })
  ); // scintillement
}

// ---------- Musique (ambiance façon C418 / Minecraft) ----------
// Nappes d'accords qui se succèdent + phrases de piano douces et espacées,
// avec beaucoup de silence entre elles. Pentatonie majeure de Do enrichie.

// Progression nostalgique : Cmaj7 → Am7 → Fmaj7 → G
const CHORDS = [
  [261.63, 329.63, 392.0, 493.88], // Cmaj7 (Do Mi Sol Si)
  [220.0, 261.63, 329.63, 392.0], // Am7 (La Do Mi Sol)
  [174.61, 220.0, 261.63, 329.63], // Fmaj7 (Fa La Do Mi)
  [196.0, 246.94, 293.66, 392.0], // G (Sol Si Ré Sol)
];
const CHORD_DURATION = 11_000;

// Gamme mélodique (Do majeur, registre médium-aigu)
const MELODY_SCALE = [523.25, 587.33, 659.25, 783.99, 880.0, 987.77, 1046.5];

let chordTimer = null;
let phraseTimer = null;
let lastPhrase = null;

// Accord en nappe : sinus doux qui gonfle et s'éteint lentement
function playChordPad(freqs) {
  freqs.forEach((f, i) => {
    const t = ctx.currentTime + i * 0.15; // léger écart de déclenchement
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    o.detune.value = (i - 1.5) * 3; // micro-désaccord chaleureux

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.02, t + 3);
    g.gain.setValueAtTime(0.02, t + CHORD_DURATION / 1000 - 3);
    g.gain.linearRampToValueAtTime(0.0001, t + CHORD_DURATION / 1000);

    o.connect(g);
    g.connect(musicGain);
    o.start(t);
    o.stop(t + CHORD_DURATION / 1000 + 0.5);
    // Libère le gain une fois l'oscillateur mort (pas d'accumulation)
    o.onended = () => {
      try {
        g.disconnect();
        o.disconnect();
      } catch {
        /* déjà déconnecté */
      }
    };
  });
}

function scheduleChords() {
  const step = () => {
    if (!musicStarted || !isMusicOn()) return;
    playChordPad(CHORDS[chordIdx % CHORDS.length]);
    chordIdx++;
    chordTimer = setTimeout(step, CHORD_DURATION);
  };
  step();
}

// Note de piano douce : triangle + harmonique, filtre doux, longue décroissance.
// IMPORTANT : le réseau d'écho (delay/feedback) est déconnecté une fois la
// note terminée — sinon il s'accumule dans le graphe audio et le CPU explose
// au fil des heures (lag progressif du navigateur).
function playPianoNote(freq, when = 0) {
  const t = ctx.currentTime + when;

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1400;

  const o1 = ctx.createOscillator();
  o1.type = 'triangle';
  o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = 'sine';
  o2.frequency.value = freq * 2; // harmonique claire mais discrète
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;

  // Écho spatial (delay + feedback)
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.45;
  const fb = ctx.createGain();
  fb.gain.value = 0.42;
  const wet = ctx.createGain();
  wet.gain.value = 0.4;

  o1.connect(g);
  o2.connect(g2);
  g2.connect(g);
  g.connect(lp);
  lp.connect(musicGain);
  lp.connect(delay);
  delay.connect(fb);
  fb.connect(delay);
  delay.connect(wet);
  wet.connect(musicGain);

  o1.start(t);
  o2.start(t);
  o1.stop(t + 3.8);
  o2.stop(t + 3.8);

  // Nettoyage du sous-graphe une fois la note morte
  o1.onended = () => {
    try {
      o1.disconnect();
      o2.disconnect();
      g.disconnect();
      g2.disconnect();
      lp.disconnect();
      delay.disconnect();
      fb.disconnect();
      wet.disconnect();
    } catch {
      /* déjà déconnecté */
    }
  };
}

// Phrase mélodique : 2-5 notes avec mouvement conjoint (très C418),
// parfois reprise de la phrase précédente en écho
function schedulePhrases() {
  const step = () => {
    if (!musicStarted || !isMusicOn()) return;

    let notes;
    if (lastPhrase && Math.random() < 0.3) {
      notes = lastPhrase; // répétition : effet « on se souvient du motif »
    } else {
      notes = [];
      const length = 2 + ((Math.random() * 3) | 0);
      let degree = (Math.random() * MELODY_SCALE.length) | 0;
      for (let i = 0; i < length; i++) {
        notes.push(MELODY_SCALE[degree]);
        // mouvement conjoint : ±1 degré le plus souvent, saut rare
        const move =
          Math.random() < 0.15
            ? (Math.random() < 0.5 ? -2 : 2)
            : (Math.random() < 0.5 ? -1 : 1);
        degree = Math.min(
          MELODY_SCALE.length - 1,
          Math.max(0, degree + move)
        );
      }
      lastPhrase = notes;
    }

    let when = 0;
    notes.forEach((f) => {
      playPianoNote(f, when);
      when += 0.7 + Math.random() * 1.1; // notes espacées, pas mécaniques
    });

    // Beaucoup de silence entre les phrases (respiration)
    phraseTimer = setTimeout(step, (when + 2.5 + Math.random() * 4) * 1000);
  };
  step();
}

async function checkCustomMusic() {
  if (customAvailable !== null) return customAvailable;
  try {
    const res = await fetch(CUSTOM_MUSIC, { method: 'HEAD' });
    customAvailable = res.ok;
  } catch {
    customAvailable = false;
  }
  return customAvailable;
}

export async function startMusic() {
  if (musicStarted || !isMusicOn()) return;
  ensureCtx();
  musicStarted = true;

  // Piste personnalisée (ex: générée via Suno) si présente
  if (await checkCustomMusic()) {
    customAudio = new Audio(CUSTOM_MUSIC);
    customAudio.loop = true;
    customAudio.volume = (getMusicVolume() / 100) * 0.5;
    try {
      await customAudio.play();
    } catch {
      /* autoplay refusé : retentera au prochain clic */
    }
    return;
  }

  // Sinon : ambiance procédurale façon C418
  chordIdx = 0;
  lastPhrase = null;
  scheduleChords();
  schedulePhrases();
}

export function stopMusic() {
  musicStarted = false;
  clearTimeout(chordTimer);
  clearTimeout(phraseTimer);
  chordTimer = null;
  phraseTimer = null;
  lastPhrase = null;
  // NB: oscillateurs et nappes se nettoient seuls via onended
  if (customAudio) {
    customAudio.pause();
    customAudio = null;
  }
}

// Démarre la musique à la première interaction (politique autoplay)
let firstGestureBound = false;
export function bindFirstGesture() {
  if (firstGestureBound) return;
  firstGestureBound = true;
  const handler = () => {
    if (isMusicOn()) startMusic();
    window.removeEventListener('pointerdown', handler);
  };
  window.addEventListener('pointerdown', handler);
}
