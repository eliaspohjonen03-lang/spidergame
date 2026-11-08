// Hiljaiset, syntetisoidut äänet Web Audio -rajapinnalla. Ei äänitiedostoja.
import { getData } from '../store/store';

let ctx: AudioContext | null = null;

function ac(): AudioContext | null {
  const s = getData().settings;
  if (!s.sound) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function vol() {
  return getData().settings.volume;
}

function tone(c: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = 'sine') {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain * vol(), start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  o.connect(g).connect(c.destination);
  o.start(start);
  o.stop(start + dur + 0.05);
}

function noise(c: AudioContext, start: number, dur: number, gain: number, freq: number) {
  const len = Math.ceil(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = freq;
  f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = gain * vol();
  src.connect(f).connect(g).connect(c.destination);
  src.start(start);
}

export const sfx = {
  move() {
    const c = ac();
    if (c) noise(c, c.currentTime, 0.09, 0.35, 1800);
  },
  deal() {
    const c = ac();
    if (!c) return;
    for (let i = 0; i < 10; i++) noise(c, c.currentTime + i * 0.035, 0.05, 0.22, 2400);
  },
  run() {
    const c = ac();
    if (!c) return;
    [784, 988, 1175, 1568].forEach((f, i) => tone(c, f, c.currentTime + i * 0.07, 0.9, 0.08));
  },
  win() {
    const c = ac();
    if (!c) return;
    const notes = [523, 659, 784, 1047, 988, 1175, 1568];
    notes.forEach((f, i) => tone(c, f, c.currentTime + i * 0.13, 1.4, 0.07, 'triangle'));
  },
  lose() {
    const c = ac();
    if (!c) return;
    [523, 466, 392, 330].forEach((f, i) => tone(c, f, c.currentTime + i * 0.22, 1.1, 0.06, 'triangle'));
  },
  nope() {
    const c = ac();
    if (c) tone(c, 180, c.currentTime, 0.12, 0.08, 'sine');
  },
};
