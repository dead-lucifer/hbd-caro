(function () {
  "use strict";

  const AC = window.AudioContext || window.webkitAudioContext;
  let ctx = null;
  let master = null;
  let musicBus = null;
  let sfxBus = null;
  let reverb = null;
  let started = false;
  let muted = false;
  let chordTimer = null;
  let sparkleTimer = null;

  const MUSIC_LEVEL = 0.55;
  const SFX_LEVEL = 0.7;

  // Fmaj9 -> Am7 -> Dm9 -> Bbmaj7, slow and warm
  const CHORDS = [
    [41, 53, 57, 60, 64, 67],
    [45, 52, 55, 60, 64, 67],
    [38, 50, 53, 57, 60, 64],
    [46, 53, 57, 58, 62, 65],
  ];
  const BELL_NOTES = [72, 74, 76, 79, 81, 84];
  const CHORD_SECONDS = 6;

  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // "Happy Birthday to You" in F, split across the 5 balloons. [midi, beats]
  const SONG = [
    [[72, 0.75], [72, 0.25], [74, 1], [72, 1], [77, 1], [76, 2]],
    [[72, 0.75], [72, 0.25], [74, 1], [72, 1], [79, 1], [77, 2]],
    [[72, 0.75], [72, 0.25], [84, 1], [81, 1]],
    [[77, 1], [76, 1], [74, 2]],
    [[82, 0.75], [82, 0.25], [81, 1], [77, 1], [79, 1], [77, 2.5]],
  ];
  const BEAT = 0.3;
  let phraseBus = null;

  function makeImpulse(seconds, decay) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  function noiseBuffer(seconds) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function init() {
    if (ctx || !AC) return !!ctx;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = makeImpulse(3.2, 2.6);
    const wet = ctx.createGain();
    wet.gain.value = 0.45;
    reverb.connect(wet).connect(master);

    musicBus = ctx.createGain();
    musicBus.gain.value = 0;
    const warm = ctx.createBiquadFilter();
    warm.type = "lowpass";
    warm.frequency.value = 1400;
    warm.Q.value = 0.4;
    musicBus.connect(warm);
    warm.connect(master);
    warm.connect(reverb);

    sfxBus = ctx.createGain();
    sfxBus.gain.value = SFX_LEVEL;
    sfxBus.connect(master);
    sfxBus.connect(reverb);
    return true;
  }

  function padNote(midi, at, dur, level) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 1.8);
    g.gain.setValueAtTime(level, at + dur - 1.6);
    g.gain.linearRampToValueAtTime(0, at + dur + 1.2);
    g.connect(musicBus);

    [-6, 6].forEach((cents) => {
      const o = ctx.createOscillator();
      o.type = "triangle";
      o.frequency.value = hz(midi);
      o.detune.value = cents;
      o.connect(g);
      o.start(at);
      o.stop(at + dur + 1.4);
    });
  }

  function playChord(index) {
    const at = ctx.currentTime + 0.05;
    CHORDS[index % CHORDS.length].forEach((m, i) => {
      padNote(m, at, CHORD_SECONDS, i === 0 ? 0.05 : 0.028);
    });
  }

  function bell(midi, at, level, bus) {
    const o = ctx.createOscillator();
    const o2 = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o2.type = "sine";
    o.frequency.value = hz(midi);
    o2.frequency.value = hz(midi) * 2.01;
    const g2 = ctx.createGain();
    g2.gain.value = 0.18;
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(level, at + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 1.6);
    o.connect(g);
    o2.connect(g2).connect(g);
    g.connect(bus || sfxBus);
    o.start(at);
    o2.start(at);
    o.stop(at + 1.7);
    o2.stop(at + 1.7);
  }

  function duckMusic(seconds) {
    if (!musicBus) return;
    const t = ctx.currentTime;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL * 0.3, t, 0.08);
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL, t + seconds, 0.6);
  }

  function playPhrase(index) {
    const notes = SONG[Math.min(index, SONG.length - 1)];
    const t0 = ctx.currentTime + 0.06;

    if (phraseBus) {
      phraseBus.gain.setTargetAtTime(0, t0, 0.03);
    }
    phraseBus = ctx.createGain();
    phraseBus.gain.value = 1;
    phraseBus.connect(sfxBus);

    let t = t0;
    let total = 0;
    notes.forEach(([m, beats]) => {
      bell(m, t, 0.2, phraseBus);
      bell(m - 12, t, 0.07, phraseBus);
      t += beats * BEAT;
      total += beats * BEAT;
    });
    if (index === SONG.length - 1) {
      [65, 69, 72, 77].forEach((m) => bell(m, t - 2.5 * BEAT, 0.06, phraseBus));
    }
    duckMusic(total + 0.4);
  }

  function startMusic() {
    let i = 0;
    playChord(i);
    chordTimer = setInterval(() => {
      i += 1;
      playChord(i);
    }, CHORD_SECONDS * 1000);

    const sparkle = () => {
      if (ctx && !muted) {
        const n = BELL_NOTES[Math.floor(Math.random() * BELL_NOTES.length)];
        bell(n, ctx.currentTime + 0.02, 0.05, musicBus);
      }
      sparkleTimer = setTimeout(sparkle, 1800 + Math.random() * 2600);
    };
    sparkleTimer = setTimeout(sparkle, 2200);

    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setValueAtTime(0, ctx.currentTime);
    musicBus.gain.linearRampToValueAtTime(MUSIC_LEVEL, ctx.currentTime + 3);
  }

  function start() {
    if (!init()) return;
    if (ctx.state === "suspended") ctx.resume();
    if (started) return;
    started = true;
    startMusic();
    updateToggle();
  }

  function ready() {
    if (!ctx) return false;
    if (ctx.state === "suspended") ctx.resume();
    return true;
  }

  const sfx = {
    whoosh() {
      if (!ready()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.35);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 1.2;
      bp.frequency.setValueAtTime(500, t);
      bp.frequency.exponentialRampToValueAtTime(3200, t + 0.25);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.35, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      src.connect(bp).connect(g).connect(sfxBus);
      src.start(t);
    },

    pop(step) {
      if (!ready()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.12);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 900;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
      src.connect(hp).connect(g).connect(sfxBus);
      src.start(t);

      const o = ctx.createOscillator();
      const og = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(420, t);
      o.frequency.exponentialRampToValueAtTime(90, t + 0.12);
      og.gain.setValueAtTime(0.35, t);
      og.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
      o.connect(og).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.16);

      playPhrase(step || 0);
    },

    sparkle() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [72, 76, 79, 84, 88].forEach((m, i) => bell(m, t + i * 0.07, 0.12));
    },

    chime() {
      if (!ready()) return;
      const t = ctx.currentTime;
      bell(79, t, 0.12);
      bell(84, t + 0.12, 0.1);
    },

    swish() {
      if (!ready()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.6);
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.setValueAtTime(300, t);
      lp.frequency.exponentialRampToValueAtTime(2400, t + 0.45);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.12, t + 0.2);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      src.connect(lp).connect(g).connect(sfxBus);
      src.start(t);
      bell(76, t + 0.18, 0.07);
    },

    tap() {
      if (!ready()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(880, t);
      o.frequency.exponentialRampToValueAtTime(660, t + 0.08);
      g.gain.setValueAtTime(0.14, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.14);
    },

    nope() {
      if (!ready()) return;
      const t = ctx.currentTime;
      // lid knock-knock
      [0, 0.09].forEach((d) => {
        const src = ctx.createBufferSource();
        src.buffer = noiseBuffer(0.08);
        const bp = ctx.createBiquadFilter();
        bp.type = "bandpass";
        bp.frequency.value = 700;
        bp.Q.value = 3;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.7, t + d);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.07);
        src.connect(bp).connect(g).connect(sfxBus);
        src.start(t + d);
      });
      // sad little "aww"
      [[76, 0.2], [75, 0.42], [74, 0.64]].forEach(([m, d], i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(hz(m), t + d);
        if (i === 2) o.frequency.linearRampToValueAtTime(hz(m - 1), t + d + 0.5);
        const len = i === 2 ? 0.6 : 0.2;
        g.gain.setValueAtTime(0, t + d);
        g.gain.linearRampToValueAtTime(0.22, t + d + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, t + d + len);
        o.connect(g).connect(sfxBus);
        o.start(t + d);
        o.stop(t + d + len + 0.05);
      });
    },

    found() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [[72, 0], [76, 0.1], [79, 0.2], [84, 0.32]].forEach(([m, d]) => bell(m, t + d, 0.2));
      [72, 76, 79, 84].forEach((m) => bell(m, t + 0.5, 0.1));
      [88, 91].forEach((m, i) => bell(m, t + 0.62 + i * 0.08, 0.08));
      duckMusic(1.6);
    },

    answer(i) {
      if (!ready()) return;
      const t = ctx.currentTime + 0.04;
      const motifs = [
        [[72, 0], [76, 0.11], [79, 0.22], [84, 0.36]],
        [[77, 0], [81, 0.1], [77, 0.2], [84, 0.3], [89, 0.44]],
        [[69, 0], [72, 0.14], [76, 0.28], [74, 0.42], [81, 0.58]],
      ];
      motifs[(i || 0) % motifs.length].forEach(([m, d]) => {
        bell(m, t + d, 0.22);
        bell(m - 12, t + d, 0.06);
      });
      duckMusic(1.4);
    },

    pick() {
      if (!ready()) return;
      const t = ctx.currentTime;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(520, t);
      o.frequency.exponentialRampToValueAtTime(780, t + 0.07);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
      o.connect(g).connect(sfxBus);
      o.start(t);
      o.stop(t + 0.12);
    },

    open() {
      if (!ready()) return;
      const t = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = noiseBuffer(0.8);
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.Q.value = 0.8;
      bp.frequency.setValueAtTime(400, t);
      bp.frequency.exponentialRampToValueAtTime(5000, t + 0.5);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      src.connect(bp).connect(g).connect(sfxBus);
      src.start(t);
      [69, 72, 76, 81, 84, 88].forEach((m, i) => bell(m, t + 0.3 + i * 0.06, 0.1));
    },

    finale() {
      if (!ready()) return;
      const t = ctx.currentTime;
      [65, 69, 72, 76].forEach((m) => bell(m, t, 0.09));
      [77, 81, 84, 88, 89].forEach((m, i) => bell(m, t + 0.25 + i * 0.09, 0.1));
    },
  };

  function updateToggle() {
    const btn = document.getElementById("sound-toggle");
    if (!btn) return;
    btn.hidden = !started;
    btn.textContent = muted ? "🔇" : "🔊";
    btn.setAttribute("aria-label", muted ? "unmute sound" : "mute sound");
  }

  function toggle() {
    muted = !muted;
    if (ctx) {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.08);
    }
    updateToggle();
  }

  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend();
    else ctx.resume();
  });

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (t instanceof Element && t.closest("#sound-toggle")) {
      e.stopPropagation();
      toggle();
    }
  });

  window.Sound = Object.assign({ start, toggle }, sfx);
})();
