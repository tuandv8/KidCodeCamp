// Sound utility - tạo âm thanh bằng Web Audio API
// (Không cần file âm thanh, mọi thứ sinh ra theo thời gian thực)

let audioCtx: AudioContext | null = null;
let muted = false;

function getCtx(): AudioContext | null {
  if (muted) return null;
  if (!audioCtx) {
    try {
      const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (Ctx) audioCtx = new Ctx();
    } catch {
      return null;
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function setMuted(m: boolean) {
  muted = m;
  if (m && audioCtx) {
    audioCtx.close().catch(() => {});
    audioCtx = null;
  }
}

export function isMuted() {
  return muted;
}

interface ToneOptions {
  freq?: number;
  type?: OscillatorType;
  duration?: number;
  volume?: number;
  attack?: number;
  release?: number;
  detune?: number;
  delay?: number;
  pitchEnd?: number;
}

function tone(opts: ToneOptions) {
  const ctx = getCtx();
  if (!ctx) return;
  const {
    freq = 440,
    type = 'sine',
    duration = 0.2,
    volume = 0.3,
    attack = 0.01,
    release = 0.05,
    detune = 0,
    delay = 0,
    pitchEnd,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.detune.value = detune;

  const startTime = ctx.currentTime + delay;
  const endTime = startTime + duration;
  const peakTime = startTime + attack;

  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, peakTime);
  gain.gain.linearRampToValueAtTime(volume * 0.5, peakTime + duration * 0.3);
  gain.gain.exponentialRampToValueAtTime(0.001, endTime + release);

  if (pitchEnd !== undefined) {
    osc.frequency.linearRampToValueAtTime(pitchEnd, endTime);
  }

  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startTime);
  osc.stop(endTime + release + 0.05);
}

// Click / tap
export function playClick() {
  tone({ freq: 600, type: 'triangle', duration: 0.05, volume: 0.15 });
}

// Correct
export function playCorrect() {
  tone({ freq: 523.25, duration: 0.1, volume: 0.25, type: 'sine' }); // C5
  tone({ freq: 659.25, duration: 0.1, volume: 0.25, type: 'sine', delay: 0.1 }); // E5
  tone({ freq: 783.99, duration: 0.2, volume: 0.25, type: 'sine', delay: 0.2 }); // G5
}

// Wrong
export function playWrong() {
  tone({ freq: 220, type: 'sawtooth', duration: 0.15, volume: 0.2 });
  tone({ freq: 196, type: 'sawtooth', duration: 0.2, volume: 0.2, delay: 0.15 });
}

// Win / level complete
export function playWin() {
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((f, i) => {
    tone({ freq: f, duration: 0.15, volume: 0.25, type: 'triangle', delay: i * 0.12 });
  });
}

// Star / reward
export function playStar() {
  tone({ freq: 1200, type: 'triangle', duration: 0.08, volume: 0.2 });
  tone({ freq: 1600, type: 'triangle', duration: 0.12, volume: 0.2, delay: 0.08 });
}

// Button hover
export function playHover() {
  tone({ freq: 800, type: 'sine', duration: 0.03, volume: 0.08 });
}

// Tick (countdown)
export function playTick() {
  tone({ freq: 1000, type: 'sine', duration: 0.04, volume: 0.15 });
}

// Pop
export function playPop() {
  tone({ freq: 400, type: 'sine', duration: 0.06, volume: 0.2, pitchEnd: 800 });
}

// Move
export function playMove() {
  tone({ freq: 500, type: 'square', duration: 0.05, volume: 0.1 });
}

// Fail
export function playFail() {
  tone({ freq: 300, type: 'sawtooth', duration: 0.3, volume: 0.2, pitchEnd: 100 });
}

// Magic / achievement unlock
export function playMagic() {
  const notes = [440, 554.37, 659.25, 880];
  notes.forEach((f, i) => {
    tone({ freq: f, duration: 0.2, volume: 0.2, type: 'sine', delay: i * 0.08, attack: 0.02 });
  });
}