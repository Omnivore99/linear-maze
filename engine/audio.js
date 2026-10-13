/* The Linear Maze — engine/audio.js
 * Every sound is synthesised with WebAudio, so the game ships with no audio
 * files. Packs can add sounds with LM.audio.define(name, (t, opt, kit) => {...}).
 * Audio starts on the first key press or click (browser autoplay rules).
 */
'use strict';
(function () {
  const LM = window.LM;
  const A = (LM.audio = { ctx: null, master: null, sfx: null, amb: null, muted: false, noiseBuf: null, last: {}, sounds: {} });

  try {
    A.muted = localStorage.getItem('linear-maze-muted') === '1';
  } catch (e) {}

  A.unlock = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    try {
      A.ctx = new AC();
    } catch (e) {
      return;
    }
    const c = A.ctx;
    A.master = c.createGain();
    A.master.gain.value = A.muted ? 0 : 0.55;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    A.master.connect(comp).connect(c.destination);
    A.sfx = c.createGain();
    A.sfx.connect(A.master);
    A.amb = c.createGain();
    A.amb.gain.value = 0.0;
    A.amb.connect(A.master);
    const len = c.sampleRate;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    A.noiseBuf = buf;
    if (A.pendingAmbience) A.setAmbience(A.pendingAmbience);
  };

  A.setMuted = function (m) {
    A.muted = m;
    try {
      localStorage.setItem('linear-maze-muted', m ? '1' : '0');
    } catch (e) {}
    if (A.master) A.master.gain.setTargetAtTime(m ? 0 : 0.55, A.ctx.currentTime, 0.05);
  };

  // ------------------------------------------------------------ building blocks
  function out(opt) {
    // optional distance attenuation: opt.vol in 0..1
    const g = A.ctx.createGain();
    g.gain.value = opt && opt.vol != null ? opt.vol : 1;
    g.connect(A.sfx);
    return g;
  }
  function noise(t, dest, o) {
    const c = A.ctx;
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = o.type || 'lowpass';
    f.frequency.setValueAtTime(o.freq || 1000, t);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t + (o.dur || 0.2));
    f.Q.value = o.q || 0.7;
    const g = c.createGain();
    const atk = o.attack || 0.002;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.3, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + (o.dur || 0.2));
    src.connect(f).connect(g).connect(dest);
    src.start(t, Math.random() * 0.5);
    src.stop(t + atk + (o.dur || 0.2) + 0.05);
  }
  function tone(t, dest, o) {
    const c = A.ctx;
    const osc = c.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0 || 440, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(o.f1, t + (o.dur || 0.2));
    if (o.detune) osc.detune.value = o.detune;
    const g = c.createGain();
    const atk = o.attack || 0.003;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(o.gain || 0.2, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + atk + (o.dur || 0.2));
    osc.connect(g).connect(dest);
    osc.start(t);
    osc.stop(t + atk + (o.dur || 0.2) + 0.05);
  }
  const kit = { noise, tone };

  A.define = function (name, fn) {
    A.sounds[name] = fn;
  };

  A.play = function (name, opt) {
    if (!A.ctx || A.muted) return;
    const fn = A.sounds[name];
    if (!fn) return;
    const now = A.ctx.currentTime;
    const thr = opt && opt.throttle != null ? opt.throttle : 0.028;
    if (A.last[name] && now - A.last[name] < thr) return;
    A.last[name] = now;
    if (opt && opt.vol != null && opt.vol < 0.03) return;
    try {
      fn(now, out(opt), opt || {}, kit);
    } catch (e) {
      /* never let audio break the game */
    }
  };

  // ------------------------------------------------------------ ambience drone
  let ambNodes = [];
  A.setAmbience = function (spec) {
    A.pendingAmbience = spec;
    if (!A.ctx) return;
    const c = A.ctx, t = c.currentTime;
    ambNodes.forEach((n) => {
      try {
        n.stop(t + 1.2);
      } catch (e) {}
    });
    ambNodes = [];
    A.amb.gain.cancelScheduledValues(t);
    A.amb.gain.setValueAtTime(A.amb.gain.value, t);
    A.amb.gain.linearRampToValueAtTime(0, t + 0.8);
    if (!spec) return;
    const startAt = t + 0.9;
    A.amb.gain.linearRampToValueAtTime(spec.gain || 0.05, startAt + 2.5);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = spec.cutoff || 260;
    lp.connect(A.amb);
    for (const det of [0, 7, -5]) {
      const o = c.createOscillator();
      o.type = spec.wave || 'sawtooth';
      o.frequency.value = (spec.base || 55) * (det === 0 ? 1 : 1.5);
      o.detune.value = det;
      const g = c.createGain();
      g.gain.value = det === 0 ? 0.5 : 0.18;
      o.connect(g).connect(lp);
      o.start(startAt);
      ambNodes.push(o);
    }
    // slow "breathing" wind
    const src = c.createBufferSource();
    src.buffer = A.noiseBuf;
    src.loop = true;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = spec.wind || 420;
    bp.Q.value = 0.8;
    const wg = c.createGain();
    wg.gain.value = 0.35;
    const lfo = c.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = c.createGain();
    lfoG.gain.value = (spec.wind || 420) * 0.5;
    lfo.connect(lfoG).connect(bp.frequency);
    src.connect(bp).connect(wg).connect(A.amb);
    src.start(startAt);
    lfo.start(startAt);
    ambNodes.push(src, lfo);
  };

  // ------------------------------------------------------------ core sound library
  const S = A.define;
  S('pistol', (t, o) => {
    noise(t, o, { freq: 4200, freqEnd: 500, dur: 0.11, gain: 0.5 });
    tone(t, o, { type: 'square', f0: 190, f1: 60, dur: 0.08, gain: 0.18 });
  });
  S('scatter', (t, o) => {
    noise(t, o, { freq: 2600, freqEnd: 200, dur: 0.32, gain: 0.8 });
    tone(t, o, { type: 'sine', f0: 110, f1: 38, dur: 0.22, gain: 0.5 });
  });
  S('smg', (t, o) => {
    noise(t, o, { freq: 5200, freqEnd: 900, dur: 0.06, gain: 0.35 });
    tone(t, o, { type: 'square', f0: 260, f1: 120, dur: 0.04, gain: 0.08 });
  });
  S('arc', (t, o) => {
    tone(t, o, { type: 'sawtooth', f0: 1800, f1: 160, dur: 0.22, gain: 0.16 });
    tone(t, o, { type: 'square', f0: 900, f1: 1400, dur: 0.12, gain: 0.06 });
    noise(t, o, { type: 'highpass', freq: 3000, dur: 0.15, gain: 0.12 });
  });
  S('launcher', (t, o) => {
    tone(t, o, { type: 'sine', f0: 160, f1: 50, dur: 0.25, gain: 0.5 });
    noise(t, o, { freq: 900, freqEnd: 150, dur: 0.25, gain: 0.35 });
  });
  S('enemyShot', (t, o) => {
    tone(t, o, { type: 'triangle', f0: 720, f1: 240, dur: 0.12, gain: 0.12 });
    noise(t, o, { freq: 2000, dur: 0.05, gain: 0.08 });
  });
  S('hit', (t, o) => {
    noise(t, o, { freq: 1600, freqEnd: 400, dur: 0.06, gain: 0.3 });
    tone(t, o, { type: 'square', f0: 140, f1: 70, dur: 0.05, gain: 0.08 });
  });
  S('wall', (t, o) => noise(t, o, { type: 'bandpass', freq: 2400, dur: 0.04, gain: 0.12, q: 2 }));
  S('enemyDie', (t, o) => {
    noise(t, o, { freq: 1200, freqEnd: 120, dur: 0.35, gain: 0.45 });
    tone(t, o, { type: 'sawtooth', f0: 220, f1: 40, dur: 0.3, gain: 0.12 });
  });
  S('explode', (t, o) => {
    noise(t, o, { freq: 1800, freqEnd: 60, dur: 0.9, gain: 1.0, attack: 0.004 });
    tone(t, o, { type: 'sine', f0: 90, f1: 28, dur: 0.6, gain: 0.8 });
  });
  S('pickup', (t, o) => {
    tone(t, o, { type: 'triangle', f0: 660, dur: 0.07, gain: 0.18 });
    tone(t + 0.06, o, { type: 'triangle', f0: 990, dur: 0.1, gain: 0.18 });
  });
  S('coin', (t, o) => {
    tone(t, o, { type: 'square', f0: 1320, dur: 0.05, gain: 0.07 });
    tone(t + 0.045, o, { type: 'square', f0: 1980, dur: 0.12, gain: 0.07 });
  });
  S('heal', (t, o) => {
    for (let i = 0; i < 3; i++) tone(t + i * 0.06, o, { type: 'sine', f0: 520 * (1 + i * 0.26), dur: 0.14, gain: 0.14 });
  });
  S('key', (t, o) => {
    for (let i = 0; i < 4; i++) tone(t + i * 0.05, o, { type: 'triangle', f0: 880 * Math.pow(1.19, i), dur: 0.1, gain: 0.12 });
  });
  S('door', (t, o) => {
    noise(t, o, { freq: 500, freqEnd: 180, dur: 0.35, gain: 0.25, attack: 0.04 });
    tone(t, o, { type: 'sine', f0: 70, f1: 50, dur: 0.3, gain: 0.15 });
  });
  S('locked', (t, o) => {
    tone(t, o, { type: 'square', f0: 140, dur: 0.06, gain: 0.12 });
    tone(t + 0.08, o, { type: 'square', f0: 110, dur: 0.09, gain: 0.12 });
  });
  S('hurt', (t, o) => {
    tone(t, o, { type: 'sawtooth', f0: 300, f1: 90, dur: 0.18, gain: 0.25 });
    noise(t, o, { freq: 900, dur: 0.12, gain: 0.25 });
  });
  S('shieldHit', (t, o) => {
    tone(t, o, { type: 'sine', f0: 1400, f1: 700, dur: 0.15, gain: 0.15 });
    noise(t, o, { type: 'highpass', freq: 4000, dur: 0.08, gain: 0.1 });
  });
  S('dash', (t, o) => noise(t, o, { type: 'bandpass', freq: 600, freqEnd: 2400, dur: 0.18, gain: 0.25, attack: 0.02, q: 1.2 }));
  S('ui', (t, o) => tone(t, o, { type: 'triangle', f0: 880, dur: 0.04, gain: 0.08 }));
  S('open', (t, o) => {
    noise(t, o, { type: 'bandpass', freq: 300, freqEnd: 900, dur: 0.4, gain: 0.25, attack: 0.05, q: 4 });
    tone(t + 0.25, o, { type: 'triangle', f0: 523, dur: 0.12, gain: 0.1 });
    tone(t + 0.33, o, { type: 'triangle', f0: 784, dur: 0.18, gain: 0.1 });
  });
  S('tick', (t, o) => tone(t, o, { type: 'square', f0: 1600 + Math.random() * 300, dur: 0.015, gain: 0.05 }));
  S('win', (t, o) => {
    [523, 659, 784, 1046].forEach((f, i) => tone(t + i * 0.08, o, { type: 'square', f0: f, dur: 0.16, gain: 0.08 }));
  });
  S('lose', (t, o) => {
    tone(t, o, { type: 'triangle', f0: 330, f1: 160, dur: 0.4, gain: 0.12 });
  });
  S('trap', (t, o) => {
    tone(t, o, { type: 'square', f0: 2200, dur: 0.02, gain: 0.08 });
    noise(t + 0.03, o, { type: 'bandpass', freq: 1500, dur: 0.06, gain: 0.2, q: 3 });
  });
  S('alarm', (t, o) => {
    for (let i = 0; i < 3; i++) {
      tone(t + i * 0.32, o, { type: 'square', f0: 880, f1: 660, dur: 0.26, gain: 0.08 });
    }
  });
  S('dart', (t, o) => noise(t, o, { type: 'bandpass', freq: 3000, freqEnd: 1200, dur: 0.08, gain: 0.25, q: 2 }));
  S('recharge', (t, o) => tone(t, o, { type: 'sawtooth', f0: 200, f1: 1200, dur: 0.5, gain: 0.07 }));
  S('splash', (t, o) => noise(t, o, { type: 'bandpass', freq: 800, freqEnd: 300, dur: 0.25, gain: 0.25, attack: 0.01, q: 0.8 }));
  S('fall', (t, o) => tone(t, o, { type: 'sine', f0: 600, f1: 60, dur: 0.6, gain: 0.2 }));
  S('spikes', (t, o) => {
    noise(t, o, { type: 'highpass', freq: 2500, dur: 0.05, gain: 0.12 });
    tone(t, o, { type: 'square', f0: 400, dur: 0.03, gain: 0.04 });
  });
  S('altar', (t, o) => {
    [392, 494, 587, 784].forEach((f, i) => tone(t + i * 0.12, o, { type: 'sine', f0: f, dur: 0.9, gain: 0.07, attack: 0.05 }));
  });
  S('swing', (t, o) => noise(t, o, { type: 'bandpass', freq: 1200, freqEnd: 400, dur: 0.12, gain: 0.2, q: 1.5 }));
  S('charge', (t, o) => tone(t, o, { type: 'sawtooth', f0: 80, f1: 260, dur: 0.5, gain: 0.12 }));
  S('nova', (t, o) => {
    tone(t, o, { type: 'sine', f0: 140, f1: 40, dur: 0.5, gain: 0.5 });
    noise(t, o, { freq: 3000, freqEnd: 200, dur: 0.4, gain: 0.4 });
  });
  S('warn', (t, o) => tone(t, o, { type: 'triangle', f0: 300, f1: 900, dur: 0.5, gain: 0.07 }));
  S('break', (t, o) => {
    noise(t, o, { type: 'bandpass', freq: 700, freqEnd: 250, dur: 0.2, gain: 0.4, q: 1.5 });
  });
  S('empty', (t, o) => tone(t, o, { type: 'square', f0: 1100, dur: 0.02, gain: 0.05 }));
  S('switch', (t, o) => {
    noise(t, o, { type: 'bandpass', freq: 2200, dur: 0.03, gain: 0.15, q: 3 });
    noise(t + 0.06, o, { type: 'bandpass', freq: 1600, dur: 0.03, gain: 0.15, q: 3 });
  });
  S('descend', (t, o) => {
    [196, 247, 294, 392].forEach((f, i) => tone(t + i * 0.14, o, { type: 'triangle', f0: f, dur: 0.5, gain: 0.08 }));
  });
})();
