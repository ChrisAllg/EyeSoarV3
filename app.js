/**
 * Visual Spot — enhancements per user's last requests:
 *  - Drift fraction increases with every 500 points until capped (up to 60% drifters).
 *  - Drift speed has variance.
 *  - Size variance: spawned patches may be smaller (never bigger than base size) within safe limits.
 *  - Level progression: avg points/hit >= 25 promotes to level 2; level 2 increases difficulty (fade durations lengthened, scoring exponent increased)
 *  - Gabor rendering improved to follow scientific Gabor formula and parameters; mean luminance & Michelson-style contrast used; conservative clamping applied.
 *  - Default background changed to #a6a6a6 (in index.html/styles.css).
 *
 * Notes on "scientific" Gabor:
 *  - We use G(x,y) = mean * (1 + C * G_env(x',y') * cos(2π x' / λ + φ))
 *    where G_env is Gaussian envelope exp(-(x'^2 + y'^2)/(2σ^2))
 *  - We clamp λ and σ to size-relative sensible ranges and set a minimum rendering contrast so the pattern is always detectable as a Gabor (not a flat disc).
 *  - Segmentation (quantization) is optional; scientific usage usually uses continuous Gabors (segmentation=0) — default is 0 now in UI.
 *
 * Files included: index.html (above), styles.css (above), this app.js
 */

(() => {
  // DOM refs
  const startScreen = document.getElementById('start-screen');
  const gameShell = document.getElementById('game-shell');
  const settingsPanel = document.getElementById('settings-panel');
  const endScreen = document.getElementById('end-screen');

  const openSettingsBtn = document.getElementById('open-settings');
  const phoneToggleBtn = document.getElementById('phone-toggle');

  const modeTimeBtn = document.getElementById('mode-time');
  const modeInfiniteBtn = document.getElementById('mode-infinite');
  const modeQuestContinueBtn = document.getElementById('mode-quest-continue');

  const hsTimeEl = document.getElementById('hs-time');
  const hsInfEl = document.getElementById('hs-infinite');

  const scoreEl = document.getElementById('score');
  const avgEl = document.getElementById('avg');
  const hitsEl = document.getElementById('hits');
  const missesEl = document.getElementById('misses');
  const timeLeftEl = document.getElementById('time-left');
  const currentModeEl = document.getElementById('current-mode');
  const earliestEl = document.getElementById('earliest');

  const pauseResumeBtn = document.getElementById('pause-resume');
  const backToMenuBtn = document.getElementById('back-to-menu');
  const settingsInGameBtn = document.getElementById('settings-in-game');
  const questPanelToggleBtn = document.getElementById('quest-panel-toggle');

  const gameArea = document.getElementById('game-area');
  const toastArea = document.getElementById('game-toast');
  const speechLayer = document.getElementById('speech-layer');
  const questPanel = document.getElementById('quest-panel');
  const questObjectivesEl = document.getElementById('quest-objectives');

  // settings inputs
  const patchTypeSel = document.getElementById('patch-type');
  const spawnSecsInput = document.getElementById('spawn-secs');
  const spawnSecsVal = document.getElementById('spawn-secs-val');
  const patchSizeInput = document.getElementById('patch-size');
  const patchSizeVal = document.getElementById('patch-size-val');
  const bgColorInput = document.getElementById('bg-color');
  const brightnessInput = document.getElementById('brightness');
  const brightnessVal = document.getElementById('brightness-val');
  const missPenaltyInput = document.getElementById('miss-penalty');

  const musicToggle = document.getElementById('music-toggle');
  const musicVol = document.getElementById('music-vol');
  const musicVolVal = document.getElementById('music-vol-val');

  const lambdaInput = document.getElementById('lambda');
  const lambdaVal = document.getElementById('lambda-val');
  const orientJitterInput = document.getElementById('orient-jitter');
  const orientJitterVal = document.getElementById('orient-jitter-val');
  const contrastInput = document.getElementById('contrast');
  const contrastVal = document.getElementById('contrast-val');
  const sigmaInput = document.getElementById('sigma');
  const sigmaVal = document.getElementById('sigma-val');
  const segmentationSel = document.getElementById('segmentation');

  const settingsSaveBtn = document.getElementById('settings-save');
  const settingsCancelBtn = document.getElementById('settings-cancel');
  const questResetBtn = document.getElementById('quest-reset');

  const endScoreEl = document.getElementById('end-score');
  const endAvgEl = document.getElementById('end-avg');
  const endHitsEl = document.getElementById('end-hits');
  const endMissesEl = document.getElementById('end-misses');
  const endEarliestEl = document.getElementById('end-earliest');
  const endRetryBtn = document.getElementById('end-retry');
  const endMenuBtn = document.getElementById('end-menu');

  // Time Attack customization panel
  const timeAttackCustomizeBtn = document.getElementById('time-attack-customize');
  const timeAttackPanel = document.getElementById('time-attack-panel');
  const taNormalCheck = document.getElementById('ta-normal');
  const taFadersCheck = document.getElementById('ta-faders');
  const taDriftersCheck = document.getElementById('ta-drifters');
  const taLinesCheck = document.getElementById('ta-lines');
  const taShrinkingCheck = document.getElementById('ta-shrinking');
  const taSaveBtn = document.getElementById('ta-save');
  const taCancelBtn = document.getElementById('ta-cancel');

  // WebAudio
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;

  // Music state - single instance per mode (prevents multiple starts on resume)
  const musicState = { playing: false, mode: null, nodes: [], timerId: null, gain: null };

  // short "start" jingle (same as before)
  function playStartSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const masterGain = audioCtx.createGain();
    masterGain.gain.setValueAtTime(0.0001, now);
    masterGain.gain.exponentialRampToValueAtTime(0.6, now + 0.03);
    masterGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
    masterGain.connect(audioCtx.destination);

    const freqs = [440, 660, 880];
    freqs.forEach((f, i) => {
      const t = now + i * 0.12;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      const filt = audioCtx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.setValueAtTime(3000, t);
      o.connect(filt);
      filt.connect(g);
      g.connect(masterGain);
      o.start(t);
      o.stop(t + 1.0);
    });

    const t0 = now + 0.04;
    const o2 = audioCtx.createOscillator();
    const g2 = audioCtx.createGain();
    o2.type = 'triangle';
    o2.frequency.setValueAtTime(1320, t0);
    g2.gain.setValueAtTime(0.0001, t0);
    g2.gain.exponentialRampToValueAtTime(0.06, t0 + 0.03);
    g2.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.1);
    const filt2 = audioCtx.createBiquadFilter();
    filt2.type = 'lowpass';
    filt2.frequency.setValueAtTime(4500, t0);
    o2.connect(filt2);
    filt2.connect(g2);
    g2.connect(masterGain);
    o2.start(t0);
    o2.stop(t0 + 1.1);
  }

  function playDeathSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Tragic, foreshadowing death knell - low cello-like chord
    const osc1 = audioCtx.createOscillator();
    const osc2 = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    const filter = audioCtx.createBiquadFilter();
    
    osc1.type = 'sine';
    osc2.type = 'triangle';
    osc1.frequency.setValueAtTime(110, now); // Low A
    osc2.frequency.setValueAtTime(165, now); // E (fifth)
    
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, now);
    filter.Q.value = 3;
    
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.35, now + 0.1);
    gain.gain.setValueAtTime(0.35, now + 1.2);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
    
    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 3.6);
    osc2.stop(now + 3.6);
    
    // Add reversed chime for ethereal effect
    setTimeout(() => {
      const chime = audioCtx.createOscillator();
      const chimeGain = audioCtx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(1320, audioCtx.currentTime);
      chime.frequency.exponentialRampToValueAtTime(660, audioCtx.currentTime + 0.8);
      chimeGain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
      chimeGain.gain.exponentialRampToValueAtTime(0.15, audioCtx.currentTime + 0.05);
      chimeGain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.9);
      chime.connect(chimeGain);
      chimeGain.connect(audioCtx.destination);
      chime.start(audioCtx.currentTime);
      chime.stop(audioCtx.currentTime + 1);
    }, 200);
  }

  function playHitSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(720, now);
    osc.frequency.exponentialRampToValueAtTime(960, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.15, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.7);
  }

  function playMissSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.12);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1200, now);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  // Music functions (longer Time Attack loop, single start per mode)
  function startMusic(mode) {
    if (!audioCtx) return;
    if (musicState.playing && musicState.mode === mode) return; // don't restart same track
    stopMusic();

    musicState.gain = audioCtx.createGain();
    musicState.gain.gain.value = Number(musicVol.value || 0.45);
    musicState.gain.connect(audioCtx.destination);
    musicState.mode = mode;
    musicState.playing = true;
    musicState.nodes = [];

    if (mode === 'menu') {
      // Epic emotional JRPG menu theme - "A Journey Beyond Sight"
      // Inspired by classics like FF6, Chrono Trigger - tells a story of adventure, loss, hope
      const bpm = 72; // Slow, contemplative
      const beatMs = 60000 / bpm;
      
      // Sustained string pad (emotional foundation)
      const strings = audioCtx.createOscillator();
      const stringsGain = audioCtx.createGain();
      const stringsFilter = audioCtx.createBiquadFilter();
      strings.type = 'sawtooth';
      strings.frequency.value = 110; // A2
      stringsFilter.type = 'lowpass';
      stringsFilter.frequency.value = 1200;
      stringsFilter.Q.value = 2;
      stringsGain.gain.value = 0.04;
      strings.connect(stringsFilter);
      stringsFilter.connect(stringsGain);
      stringsGain.connect(musicState.gain);
      strings.start();
      musicState.nodes.push(strings, stringsGain, stringsFilter);

      // Warm pad harmony (fifth)
      const harmPad = audioCtx.createOscillator();
      const harmGain = audioCtx.createGain();
      harmPad.type = 'triangle';
      harmPad.frequency.value = 165; // E3
      harmGain.gain.value = 0.03;
      harmPad.connect(harmGain);
      harmGain.connect(musicState.gain);
      harmPad.start();
      musicState.nodes.push(harmPad, harmGain);

      // Melodic progression (8-bar phrase that loops)
      const melody = [
        // Bar 1-2: Opening (A minor, contemplative)
        {note: 'A4', dur: 2, delay: 0},
        {note: 'C5', dur: 1, delay: 2},
        {note: 'E5', dur: 1, delay: 3},
        // Bar 3-4: Development (tension)
        {note: 'D5', dur: 1.5, delay: 4},
        {note: 'C5', dur: 0.5, delay: 5.5},
        {note: 'B4', dur: 2, delay: 6},
        // Bar 5-6: Resolve with hope
        {note: 'C5', dur: 1, delay: 8},
        {note: 'A4', dur: 1, delay: 9},
        {note: 'G4', dur: 2, delay: 10},
        // Bar 7-8: Return home
        {note: 'E4', dur: 1.5, delay: 12},
        {note: 'A4', dur: 2.5, delay: 13.5}
      ];
      
      const noteFreqs = {
        'E4': 329.63, 'G4': 392.00, 'A4': 440.00, 'B4': 493.88,
        'C5': 523.25, 'D5': 587.33, 'E5': 659.25
      };

      let loopCount = 0;
      function schedulePhrase() {
        const phraseStart = audioCtx.currentTime + 0.1;
        melody.forEach(({note, dur, delay}) => {
          const t = phraseStart + delay * (60/bpm);
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const filter = audioCtx.createBiquadFilter();
          
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(noteFreqs[note], t);
          
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2400, t);
          filter.Q.value = 1;
          
          // Gentle attack and release
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.08, t + 0.15);
          gain.gain.setValueAtTime(0.08, t + dur * (60/bpm) - 0.3);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + dur * (60/bpm));
          
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(musicState.gain);
          osc.start(t);
          osc.stop(t + dur * (60/bpm) + 0.1);
          musicState.nodes.push(osc, gain, filter);
        });
        
        loopCount++;
        if (musicState.playing && musicState.mode === 'menu') {
          musicState.timerId = setTimeout(schedulePhrase, 16 * (60000/bpm));
        }
      }
      
      schedulePhrase();

      // Soft bass notes on downbeats (every 4 beats)
      let bassStep = 0;
      const bassPattern = [220, 220, 165, 220]; // A, A, E, A
      const bassTimer = setInterval(() => {
        if (!musicState.playing || musicState.mode !== 'menu') return;
        const t = audioCtx.currentTime;
        const freq = bassPattern[bassStep % bassPattern.length];
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const filter = audioCtx.createBiquadFilter();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, t);
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(400, t);
        
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.06, t + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(musicState.gain);
        osc.start(t);
        osc.stop(t + 2);
        
        bassStep++;
      }, 4 * beatMs);
      
      musicState.nodes.push(bassTimer);
    } else if (mode === 'time') {
      // A longer, varied "battle" loop ~ 24s using scheduled intervals
      const bpm = 100;
      const beatMs = 60000 / bpm;
      const loopBeats = 48; // longer loop for variation
      let step = 0;
      musicState.timerId = setInterval(() => {
        const now = audioCtx.currentTime;
        // bass on strong beats
        if (step % 4 === 0) {
          const bass = audioCtx.createOscillator();
          const bGain = audioCtx.createGain();
          bass.type = 'sawtooth';
          const base = 110;
          const n = base * Math.pow(2, ((step / 4) % 8 - 4) / 12);
          bass.frequency.setValueAtTime(n, now);
          bGain.gain.setValueAtTime(0.0001, now);
          bGain.gain.exponentialRampToValueAtTime(0.09, now + 0.02);
          bGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
          const bf = audioCtx.createBiquadFilter();
          bf.type = 'lowpass';
          bf.frequency.setValueAtTime(700, now);
          bass.connect(bf);
          bf.connect(bGain);
          bGain.connect(musicState.gain);
          bass.start(now);
          bass.stop(now + 0.95);
          musicState.nodes.push(bass, bGain, bf);
        }
        // arpeggio pattern with variation
        {
          const arp = audioCtx.createOscillator();
          const ag = audioCtx.createGain();
          arp.type = 'square';
          const arpPattern = [0, 4, 7, 11, 7, 4, 0, -2];
          const root = 220;
          const semitone = arpPattern[step % arpPattern.length];
          const freq = root * Math.pow(2, semitone / 12);
          arp.frequency.setValueAtTime(freq, now);
          ag.gain.setValueAtTime(0.0001, now);
          ag.gain.exponentialRampToValueAtTime(0.11, now + 0.02);
          ag.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
          const fil = audioCtx.createBiquadFilter();
          fil.type = 'lowpass';
          fil.frequency.setValueAtTime(2200 - ((step % 8) * 30), now);
          arp.connect(fil);
          fil.connect(ag);
          ag.connect(musicState.gain);
          arp.start(now);
          arp.stop(now + 0.9);
          musicState.nodes.push(arp, ag, fil);
        }
        // percussion-ish accents every 6 steps
        if (step % 6 === 0) {
          const click = audioCtx.createOscillator();
          const cg = audioCtx.createGain();
          click.type = 'triangle';
          click.frequency.setValueAtTime(1200, now);
          cg.gain.setValueAtTime(0.0001, now);
          cg.gain.exponentialRampToValueAtTime(0.07, now + 0.005);
          cg.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);
          const filt = audioCtx.createBiquadFilter();
          filt.type = 'highpass';
          filt.frequency.setValueAtTime(900, now);
          click.connect(filt);
          filt.connect(cg);
          cg.connect(musicState.gain);
          click.start(now);
          click.stop(now + 0.14);
          musicState.nodes.push(click, cg, filt);
        }
        step = (step + 1) % loopBeats;
      }, beatMs / 2);
    } else if (mode === 'infinite') {
      // Infinite - crystalline ambient (bell + pad)
      const padOsc = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      padOsc.type = 'sine';
      padOsc.frequency.value = 110;
      padGain.gain.value = 0.03;
      padOsc.connect(padGain);
      padGain.connect(musicState.gain);
      padOsc.start();
      musicState.nodes.push(padOsc, padGain);

      const bellNotes = [880, 660, 990, 1188, 880, 740, 990, 660];
      let idx = 0;
      musicState.timerId = setInterval(() => {
        const now = audioCtx.currentTime;
        const f = bellNotes[idx % bellNotes.length];
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now);
        g.gain.setValueAtTime(0.0001, now);
        g.gain.exponentialRampToValueAtTime(0.12, now + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.0);
        const filt = audioCtx.createBiquadFilter();
        filt.type = 'highpass';
        filt.frequency.setValueAtTime(300, now);
        o.connect(filt);
        filt.connect(g);
        g.connect(musicState.gain);
        o.start(now);
        o.stop(now + 1.9);
        musicState.nodes.push(o, g, filt);
        idx++;
      }, 1000);
    } else if (mode === 'quest') {
      // Quest: slightly heroic pattern with occasional bell motifs
      const bpm = 92;
      const beatMs = 60000 / bpm;
      let step = 0;
      musicState.timerId = setInterval(() => {
        const now = audioCtx.currentTime;
        // soft brass-like saw pad stab
        const saw = audioCtx.createOscillator();
        const sg = audioCtx.createGain();
        saw.type = 'sawtooth';
        const root = 196; // G3
        const seq = [0, 5, 7, 10, 7, 5, 3, 2];
        const freq = root * Math.pow(2, seq[step % seq.length]/12);
        saw.frequency.setValueAtTime(freq, now);
        sg.gain.setValueAtTime(0.0001, now);
        sg.gain.exponentialRampToValueAtTime(0.06, now + 0.02);
        sg.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
        saw.connect(sg); sg.connect(musicState.gain);
        saw.start(now); saw.stop(now + 0.7);
        musicState.nodes.push(saw, sg);

        // gentle bell every 4 beats
        if (step % 4 === 0) {
          const bell = audioCtx.createOscillator();
          const bg = audioCtx.createGain();
          bell.type = 'triangle';
          bell.frequency.setValueAtTime(784, now); // G5 bell
          bg.gain.setValueAtTime(0.0001, now);
          bg.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
          bg.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
          bell.connect(bg); bg.connect(musicState.gain);
          bell.start(now); bell.stop(now + 1.6);
          musicState.nodes.push(bell, bg);
        }
        step++;
      }, beatMs);
    }
  }

  function stopMusic() {
    if (!audioCtx) return;
    if (musicState.timerId) {
      clearInterval(musicState.timerId);
      musicState.timerId = null;
    }
    if (musicState.nodes && musicState.nodes.length) {
      for (const n of musicState.nodes) {
        try { if (n && typeof n.stop === 'function') n.stop(); } catch (e) {}
        try { if (n && typeof n.disconnect === 'function') n.disconnect(); } catch (e) {}
      }
    }
    if (musicState.gain) {
      try { musicState.gain.disconnect(); } catch (e) {}
      musicState.gain = null;
    }
    musicState.nodes = [];
    musicState.playing = false;
    musicState.mode = null;
  }

  // --- game state & settings ---
  let spawnTimer = null;
  let running = false;
  let paused = false;
  let activeTargets = new Set();

  let score = 0;
  let hits = 0;
  let misses = 0;
  let totalPointsFromHits = 0;

  let mode = null;
  let timeLimit = 60;
  let timeRemaining = 0;
  let timeTicker = null;
  let sessionStartTime = null;
  let driftEnabled = false;
  let earliestHit = 0;
  let streakCount = 0; // consecutive hits with >=20 pts
  let streakMaxAchieved = 0;
  let avgBelow10Announced = false;
  let avgWasBelow15 = false;
  let thresholdsHit = new Set(); // e.g., 30,40,50

  // Quest state
  let questState = null; // { level, story, objectives: [{id, text, done, type, target}], started }

  let phoneMode = false;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  
  if (isMobileDevice) phoneMode = true;

  // Line obstacles state
  let lineObstacles = [];
  let lineSpawnTimer = null;
  
  // Edge Creeper state
  let edgeCreepers = [];
  let edgeCreepSpawnTimer = null;
  
  // Parallel party event system
  let partyEventTimer = null;
  let consecutiveMisses = 0;
  
  // Party system state
  let party = []; // Active combat party
  let partyMaxSize = 4;
  let heroRoster = []; // Full roster including active, away, and deceased
  let fallenHeroes = []; // Memorial for deceased heroes
  let partyLeader = null; // Reference to current party leader
  let awayParty = []; // Characters on away missions/MIA
  let secondaryParty = []; // Optional secondary active party

  const defaultSettings = {
    patchType: 'gabor',
    spawnSecs: 1.2,
    patchSize: 88,
    bgColor: '#a6a6a6',
    brightness: 1.0,
    missPenalty: 50,
    lambda: 12,
    orientJitter: 30,
    contrast: 0.18,
    sigma: 30,
    segmentation: '0', // scientific default: continuous gabor
    maxPerfectScore: 50,
    scoringExp: 8.0,
    maxConcurrent: 6,
    fadeMinSecs: 20,
    fadeMaxSecs: 30,
    driftBaseFraction: 0.10,
    driftIncrementPer500: 0.10,
    driftMaxFraction: 0.60,
    driftSpeedPxPerSec: 6,
    musicEnabled: true,
    musicVolume: 0.45,
    level: 1,
    faderEnabled: false,
    faderMinVis: 25,
    faderMaxVis: 35,
    faderFraction: 0.0,
    lineObstaclesEnabled: false,
    linePenalty: 100,
    lineSpawnIntervalSecs: 8,
    edgeCreepersEnabled: false,
    edgeCreepPenalty: 200,
    edgeCreepDamage: 50,
    pointRange: '50-0', // 50-0, 60-10, 70-20, 80-30, 90-40, 100-50
    missStreakPenalty: 10, // Additional penalty per consecutive miss
    sessionStats: { totalScore: 0, totalHits: 0, totalMisses: 0, bestAvg: 0 },
    timeAttackSettings: {
      normalPatches: true,
      faders: true,
      drifters: true,
      lines: false,
      shrinking: true,
      edgeCreepers: false,
    },
    infiniteSettings: {
      normalPatches: true,
      faders: true,
      drifters: true,
      lines: true,
      edgeCreepers: true,
      autoEvolve: true, // Enemies and difficulty evolve with score
    },
  };
  const settings = Object.assign({}, defaultSettings, loadSettings());

  function loadSettings() {
    try {
      const raw = localStorage.getItem('visualspot.settings.v5');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }
  function saveSettingsToStorage() {
    localStorage.setItem('visualspot.settings.v5', JSON.stringify(settings));
  }
  function getHighScores() {
    try {
      const raw = localStorage.getItem('visualspot.highscores.v5');
      return raw ? JSON.parse(raw) : { time: 0, infiniteAvg: 0 };
    } catch (e) { return { time: 0, infiniteAvg: 0 }; }
  }
  function saveHighScores(hs) {
    localStorage.setItem('visualspot.highscores.v5', JSON.stringify(hs));
  }
  function updateHighScoreDisplays() {
    const hs = getHighScores();
    hsTimeEl.textContent = hs.time > 0 ? hs.time : '—';
    hsInfEl.textContent = hs.infiniteAvg > 0 ? hs.infiniteAvg.toFixed(2) : '—';
  }

  // Quest persistence
  function loadQuestState() {
    try {
      const raw = localStorage.getItem('visualspot.quest.v1');
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || typeof obj !== 'object') return null;
      return obj;
    } catch (e) { return null; }
  }
  function saveQuestState() {
    if (!questState) return;
    const toSave = {
      level: questState.level,
      story: questState.story,
      objectives: questState.objectives.map(o => ({ id:o.id, type:o.type, target:o.target, done:o.done, text:o.text })),
    };
    localStorage.setItem('visualspot.quest.v1', JSON.stringify(toSave));
    updateQuestContinueButton();
  }
  function clearQuestState() {
    try { localStorage.removeItem('visualspot.quest.v1'); } catch (e) {}
    updateQuestContinueButton();
  }
  function updateQuestContinueButton() {
    const has = !!loadQuestState();
    if (modeQuestContinueBtn) modeQuestContinueBtn.classList.toggle('hidden', !has);
  }

  // --- speech bubble system ---
  function showSpeech(text, emoji = '🦉', opts = {}) {
    if (!speechLayer) return;
    const el = document.createElement('div');
    el.className = 'speech-bubble';
    const icon = document.createElement('div');
    icon.className = 'speech-icon';
    icon.textContent = emoji;
    const body = document.createElement('div');
    body.className = 'speech-text';
    body.textContent = text;
    el.appendChild(icon); el.appendChild(body);
    speechLayer.appendChild(el);
    const ttl = opts.ttlMs || 1600;
    setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(-10px)'; setTimeout(()=> el.remove(), 240); }, ttl);
  }

  // encouragement message pools
  const Cast = ['🦉','🧭','🛡️','🛠️','🔮','🦅','🧙','🦊','🐉','🧑\u200d🎨'];
  function pickCast(){ return Cast[Math.floor(Math.random()*Cast.length)]; }

  const Msg = {
    streak:[
      "You're on a roll!",
      'Flow state engaged!',
      'Keep threading the needle!',
      'Laser focus!',
      'Rhythm unlocked!',
      'Eyes sharp, heart steady!',
      'Perfect tempo!',
      'You found the signal!',
      'Momentum rising!',
      'Chain those sights!'
    ],
    recovery:[
      'Your eyes are getting sharper!',
      'Back in focus!',
      'Clarity restored!',
      'Calm and precise.',
      'You centered the gaze.',
      'Vision stabilized.',
      'Welcome back to the groove.',
      'That’s the target zone!',
      'Precision reclaimed!',
      'Lock acquired.'
    ],
    lowAvg:[
      'I believe in you!',
      'Breathe. Reset. Focus.',
      'Come on! Open your eyes!',
      'Tiny moves, big gains.',
      'Patience makes precision.',
      'You’ve got this.',
      'Let the noise pass.',
      'Find the contrast.',
      'Relax the stare.',
      'We rise again.'
    ],
    hi30:[ 'Eagle eye!', 'Sharp as steel!', 'Clean lock!', 'Nice clarity!', 'That was crisp!' ],
    hi40:[ 'Hawk vision!', 'Crystal hit!', 'Beautiful timing!', 'Super clean!', 'Signature strike!' ],
    hi50:[ 'Falcon focus!', 'Godlike clarity!', 'Surgical hit!', 'Elite timing!', 'Legendary glance!' ],
    driftOn:[ 'The winds stir… targets drift.', 'Movement awakening… stay light.', 'They begin to wander.', 'Drift enabled — ride it.', 'Follow the flow.' ],
  };

  function playStreakSound(){ if(!audioCtx) return; const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); o.type='sine'; o.frequency.setValueAtTime(660,t); o.frequency.exponentialRampToValueAtTime(990,t+0.12); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.18,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+0.4); o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.42); }
  function playWhoosh(){ if(!audioCtx) return; const t=audioCtx.currentTime; const o=audioCtx.createOscillator(); const g=audioCtx.createGain(); const f=audioCtx.createBiquadFilter(); o.type='triangle'; o.frequency.setValueAtTime(220,t); o.frequency.exponentialRampToValueAtTime(440,t+0.25); g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.22,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.5); f.type='highpass'; f.frequency.setValueAtTime(400,t); o.connect(f); f.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.5); }

  function driftCue(){
    gameArea.classList.add('drift-cue');
    playWhoosh();
    const msg = Msg.driftOn[Math.floor(Math.random()*Msg.driftOn.length)];
    showSpeech(msg, '🌬️');
    setTimeout(()=> gameArea.classList.remove('drift-cue'), 950);
  }

  // helpers
  function hexToRgb(hex) {
    if (!hex) return [0,0,0];
    const h = hex.replace('#','');
    if (h.length === 3) {
      return [parseInt(h[0]+h[0],16), parseInt(h[1]+h[1],16), parseInt(h[2]+h[2],16)];
    }
    const bigint = parseInt(h, 16);
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
  }
  function rgbLuminance([r,g,b]) {
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }

  function populateSettingsUI() {
    patchTypeSel.value = settings.patchType;
    spawnSecsInput.value = settings.spawnSecs;
    spawnSecsVal.textContent = Number(settings.spawnSecs).toFixed(2);
    patchSizeInput.value = settings.patchSize;
    patchSizeVal.textContent = settings.patchSize;
    bgColorInput.value = settings.bgColor;
    brightnessInput.value = settings.brightness;
    brightnessVal.textContent = Number(settings.brightness).toFixed(2);
    missPenaltyInput.value = settings.missPenalty;
    musicToggle.checked = settings.musicEnabled !== false;
    musicVol.value = settings.musicVolume || 0.45;
    musicVolVal.textContent = Number(musicVol.value).toFixed(2);

    lambdaInput.value = settings.lambda;
    lambdaVal.textContent = settings.lambda;
    orientJitterInput.value = settings.orientJitter;
    orientJitterVal.textContent = settings.orientJitter;
    contrastInput.value = settings.contrast;
    contrastVal.textContent = Number(settings.contrast).toFixed(2);
    sigmaInput.value = settings.sigma;
    sigmaVal.textContent = settings.sigma;
    segmentationSel.value = settings.segmentation || '0';
  }

  function applyArenaDimensions() {
    if (phoneMode) {
      const w = Math.min(window.innerWidth - 40, 390);
      const h = Math.max(420, Math.min(window.innerHeight - 140, 844 - 120));
      gameShell.style.width = `${w}px`;
      gameShell.style.height = `${h + 64}px`;
      gameArea.style.width = `${w}px`;
      gameArea.style.height = `${h}px`;
      phoneToggleBtn.textContent = 'Phone Screen: On';
    } else {
      gameShell.style.width = '';
      gameShell.style.height = '';
      gameArea.style.width = '';
      gameArea.style.height = '';
      phoneToggleBtn.textContent = 'Phone Screen: Off';
    }
    gameArea.style.background = settings.bgColor;
    document.documentElement.style.setProperty('--bg', settings.bgColor);
  }

  function showIndicator(text, x, y, positive = true) {
    const el = document.createElement('div');
    el.className = 'indicator ' + (positive ? 'positive' : 'negative');
    el.textContent = text;
    el.style.left = `${Math.round(x - 24)}px`;
    el.style.top = `${Math.round(y - 16)}px`;
    gameArea.appendChild(el);
    if (positive) playHitSound();
    else playMissSound();
    setTimeout(() => el.remove(), 900);
  }

  function computeCurrentDriftFraction() {
    // base + increment per 500 pts reached, capped
    const base = settings.driftBaseFraction || 0.10;
    const inc = settings.driftIncrementPer500 || 0.10;
    const steps = Math.floor(score / 500);
    const f = Math.min(settings.driftMaxFraction || 0.6, base + steps * inc);
    return f;
  }

  function maybeLevelUpIfQualified() {
    const avg = hits > 0 ? (totalPointsFromHits / hits) : 0;
    // if avg > 25 and level < 2 then promote
    if (avg >= 25 && settings.level < 2) {
      settings.level = 2;
      // make game harder: increase fade durations (slower visibility) and increase scoring exponent slightly
      settings.fadeMinSecs = Math.round(settings.fadeMinSecs * 1.25);
      settings.fadeMaxSecs = Math.round(settings.fadeMaxSecs * 1.25);
      settings.scoringExp = (settings.scoringExp || 8.0) + 1.0;
      // buff: also slightly increase contrast (retain user-set values but give a small boost)
      settings.contrast = Math.min(1.0, Number(settings.contrast) * 1.05);
      saveSettingsToStorage();
      // notify player
      const rect = gameArea.getBoundingClientRect();
      showIndicator('Level 2 Unlocked', rect.width/2, 40, true);
    }
  }

  function updateHeader() {
    scoreEl.textContent = String(score);
    hitsEl.textContent = String(hits);
    missesEl.textContent = String(misses);
    const avg = hits > 0 ? (totalPointsFromHits / hits) : 0;
    avgEl.textContent = avg.toFixed(2);
    earliestEl.textContent = String(earliestHit);
    
    // Update session stats
    if (!settings.sessionStats) settings.sessionStats = { totalScore: 0, totalHits: 0, totalMisses: 0, bestAvg: 0 };
    settings.sessionStats.totalScore = Math.max(settings.sessionStats.totalScore || 0, score);
    settings.sessionStats.totalHits += (hits - (settings.sessionStats._lastHits || 0));
    settings.sessionStats.totalMisses += (misses - (settings.sessionStats._lastMisses || 0));
    settings.sessionStats._lastHits = hits;
    settings.sessionStats._lastMisses = misses;
    if (avg > (settings.sessionStats.bestAvg || 0)) settings.sessionStats.bestAvg = avg;
    saveSettingsToStorage();

    // enable drift when hitting 500 points (driftEnabled used at spawn time selection)
    if (!driftEnabled && score >= 500) {
      driftEnabled = true;
      const rect = gameArea.getBoundingClientRect();
      showIndicator('Drift Enabled', rect.width/2, 40, true);
      driftCue();
    }
    
    // Enable faders at 1000 points, increase fraction every 500
    if (score >= 1000 && mode !== 'time') {
      if (!settings.faderEnabled) {
        settings.faderEnabled = true;
        showSpeech('The veil shifts... patches now fade in and out.', '👁️', {ttlMs: 2200});
      }
      const faderStep = Math.floor((score - 1000) / 500);
      settings.faderFraction = Math.min(0.95, 0.15 + faderStep * 0.15);
    }
    
    // Enable line obstacles at 2000 points
    if (score >= 2000 && !settings.lineObstaclesEnabled && mode !== 'quest' && mode !== 'time') {
      settings.lineObstaclesEnabled = true;
      startLineObstacles();
      showSpeech('Beware... The Dark sends forth its tendrils.', '⚡', {ttlMs: 2200});
    }

    maybeLevelUpIfQualified();

    // Recovery encouragement: went below 15, then back above 20
    if (avg < 15) avgWasBelow15 = true;
    if (avgWasBelow15 && avg >= 20) {
      avgWasBelow15 = false;
      showSpeech(Msg.recovery[Math.floor(Math.random()*Msg.recovery.length)], pickCast());
      playStreakSound();
    }

    // Low average encouragement (only once until recovery above 15)
    if (!avgBelow10Announced && avg <= 10 && hits >= 5) {
      avgBelow10Announced = true;
      showSpeech(Msg.lowAvg[Math.floor(Math.random()*Msg.lowAvg.length)], pickCast());
    }
    if (avg > 15) avgBelow10Announced = false;

    // Update quest objectives display if active
    if (questState && questState.active) updateQuestObjectivesUI();
  }

  // --- Gabor generator using scientific-style formulation ---
  function createGaborCanvas(size, lambda, thetaRad, phase, sigma, contrast, brightness, segmentationCount, bgHex) {
    const canvas = document.createElement('canvas');
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    canvas.width = Math.ceil(size * dpr);
    canvas.height = Math.ceil(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const cx = w/2, cy = h/2;
    const twoPi = Math.PI * 2;
    const cosT = Math.cos(thetaRad);
    const sinT = Math.sin(thetaRad);

    // mean luminance (from background) in 0..255
    const bgRgb = hexToRgb(bgHex || settings.bgColor || '#a6a6a6');
    const meanLum = Math.round(rgbLuminance(bgRgb));

    // clamp lambda conservatively for scientific fidelity: at least 3 px, at most size/4 to allow multiple cycles
    const lambdaMax = Math.max(3, Math.floor(size / 4));
    const lambdaClamped = Math.max(3, Math.min(lambda, lambdaMax));

    // sigma clamped to sane fraction of size: [size*0.12, size*0.5]
    const sigmaMin = Math.max(4, Math.floor(size * 0.12));
    const sigmaMax = Math.max(sigmaMin, Math.floor(size * 0.5));
    const sigmaClamped = Math.max(sigmaMin, Math.min(sigma, sigmaMax));

    // rendering contrast (ensure minimal so pattern appears as Gabor), user contrast still controls scoring
    const minRenderContrast = 0.05;
    const contrastRender = Math.max(minRenderContrast, Math.min(1.0, contrast));

    // segmentation clamp: 0 (continuous) or 4..8
    let segCnt = Math.round(Number(segmentationCount) || 0);
    if (segCnt > 0 && segCnt < 4) segCnt = 4;
    if (segCnt > 8) segCnt = 8;

    // precompute DPR scaled params
    const lambdaD = lambdaClamped * dpr;
    const sigmaD = sigmaClamped * dpr;

    const img = ctx.createImageData(w, h);
    const data = img.data;

    // Gabor: I(x,y) = meanLum * (1 + contrastRender * gauss * cos(2π * x' / λ + φ))
    for (let y=0;y<h;y++){
      for (let x=0;x<w;x++){
        const dx = x - cx;
        const dy = y - cy;
        // rotate coordinates
        const xr = dx * cosT + dy * sinT;
        // gaussian envelope
        const gauss = Math.exp(-(dx*dx + dy*dy) / (2 * sigmaD * sigmaD));
        // sinusoidal carrier
        const grating = Math.cos(twoPi * xr / lambdaD + phase);
        // compute luminance via Michelson-style modulation around meanLum
        let lum = Math.round(meanLum * (1 + contrastRender * gauss * grating));
        // clamp to avoid hard extremes which can look like outlines
        lum = Math.max(4, Math.min(251, lum));
        const idx = (y * w + x) * 4;
        data[idx] = data[idx+1] = data[idx+2] = lum;
        data[idx+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // segmentation: conservative quantize + light smoothing if requested
    if (segCnt >= 4) {
      const src = ctx.getImageData(0, 0, w, h).data;
      const out = new Uint8ClampedArray(src.length);
      // quantize
      for (let i=0;i<src.length;i+=4) {
        const lum = src[i];
        const norm = lum / 255;
        const level = Math.round(norm * (segCnt - 1));
        const q = Math.round((level / (segCnt - 1)) * 255);
        src[i] = src[i+1] = src[i+2] = q;
      }
      // one 3x3 box blur pass
      for (let yy=0; yy<h; yy++) {
        for (let xx=0; xx<w; xx++) {
          let sum=0, count=0;
          for (let oy=-1; oy<=1; oy++) {
            for (let ox=-1; ox<=1; ox++) {
              const nx = xx+ox, ny = yy+oy;
              if (nx>=0 && nx<w && ny>=0 && ny<h) {
                const idx = (ny*w + nx)*4;
                sum += src[idx];
                count++;
              }
            }
          }
          const avg = Math.round(sum/count);
          const outIdx = (yy*w + xx)*4;
          out[outIdx] = out[outIdx+1] = out[outIdx+2] = avg;
          out[outIdx+3] = 255;
        }
      }
      ctx.putImageData(new ImageData(out, w, h), 0, 0);
    }

    // No shading, outlines, or vignettes — pure Gabor output.
    return canvas;
  }

  // Create target with size variance (smaller than base only) and drift chance dynamic
  function createTargetInstance() {
    // base size
    const baseSize = Math.max(28, Math.min(220, Number(settings.patchSize)));
    // size multiplier between 0.6 and 1.0 (never bigger)
    const sizeMul = 0.6 + Math.random() * 0.4;
    const size = Math.max(28, Math.round(baseSize * sizeMul));

    const type = settings.patchType;
    const el = document.createElement('div');
    el.className = 'target';
    if (type === 'circle') el.classList.add('circle');
    el.style.width = `${size}px`;
    el.style.height = `${size}px`;

    const pad = 12;
    const rect = gameArea.getBoundingClientRect();
    const maxLeft = Math.max(0, rect.width - size - pad);
    const maxTop = Math.max(0, rect.height - size - pad);
    const left = pad + Math.round(Math.random() * maxLeft);
    const top = pad + Math.round(Math.random() * maxTop);
    el.style.left = `${left}px`;
    el.style.top = `${top}px`;
    
    // Determine if this is a fader patch
    let isFader = settings.faderEnabled && Math.random() < settings.faderFraction;
    
    // Time Attack mode: use custom settings instead of score-based
    if (mode === 'time') {
      isFader = settings.timeAttackSettings.faders && Math.random() < 0.3;
    }

    // segmentation choice: 0 (continuous) or 4..8
    let segChoice = Math.round(Number(settings.segmentation) || 0);
    if (segChoice > 0 && segChoice < 4) segChoice = 4;
    if (segChoice > 8) segChoice = 8;

    if (type === 'gabor') {
      // ensure no container rim/shadow
      el.style.boxShadow = 'none';
      el.style.border = '0';

      const base = Math.random() * Math.PI;
      const jitterDeg = Number(settings.orientJitter) || 30;
      const jitter = (Math.random() * 2 - 1) * (jitterDeg * Math.PI / 180);
      const theta = base + jitter;
      const phase = Math.random() * Math.PI * 2;

      // clamp wavelength and sigma based on this size
      const requestedLambda = Number(settings.lambda);
      const maxLambda = Math.max(3, Math.floor(size / 4));
      const clampedLambda = Math.max(3, Math.min(requestedLambda, maxLambda));
      const sigmaVal = Math.max(Math.floor(size * 0.12), Math.min(Number(settings.sigma), Math.floor(size * 0.5)));

      const canvas = createGaborCanvas(
        size,
        clampedLambda,
        theta,
        phase,
        sigmaVal,
        Number(settings.contrast),
        Number(settings.brightness),
        segChoice,
        settings.bgColor
      );
      canvas.style.display = 'block';
      canvas.style.width = `${size}px`;
      canvas.style.height = `${size}px`;
      canvas.style.borderRadius = '0';
      el.appendChild(canvas);
    } else {
      el.classList.add('circle');
      el.style.background = `radial-gradient(circle at 35% 30%, rgba(0,0,0,0.04), rgba(0,0,0,0.00) 30%)`;
    }

    gameArea.appendChild(el);

    // fade: determine type (normal vs fader)
    let fadeDurMs, maxVisScore;
    if (isFader) {
      // Fader: fades IN to a peak visibility (25-35 pts worth), then fades OUT
      const peakVis = settings.faderMinVis + Math.random() * (settings.faderMaxVis - settings.faderMinVis);
      maxVisScore = Math.round(peakVis);
      // Total duration: longer to allow fade in + fade out
      fadeDurMs = Math.round((settings.fadeMinSecs + Math.random() * (settings.fadeMaxSecs - settings.fadeMinSecs)) * 1400);
    } else {
      // Normal: standard fade with random between fadeMin..fadeMax, with a chance for extra-slow ones
      let fadeSecs = settings.fadeMinSecs + Math.random() * (settings.fadeMaxSecs - settings.fadeMinSecs);
      if (Math.random() < 0.12) fadeSecs = settings.fadeMaxSecs + Math.random() * (settings.fadeMaxSecs * 0.8);
      fadeDurMs = Math.max(10, Math.round(fadeSecs * 1000));
    }
    const start = performance.now();
    let removed = false;

    // Determine if this instance will drift: dynamic drift fraction based on score
    const driftFractionNow = computeCurrentDriftFraction();
    let willDrift = false;
    let driftVel = { x: 0, y: 0 };
    
    // Time Attack: use custom settings
    if (mode === 'time') {
      willDrift = settings.timeAttackSettings.drifters && Math.random() < 0.4;
    } else if (Math.random() < driftFractionNow) {
      willDrift = true;
    }
    
    if (willDrift) {
      const angle = Math.random() * Math.PI * 2;
      // speed variance scaled by score tiers (makes higher-tier drifters a bit faster)
      const baseSpeed = settings.driftSpeedPxPerSec || 6;
      const speed = (baseSpeed * 0.5) + Math.random() * (baseSpeed * 1.6);
      driftVel.x = Math.cos(angle) * speed;
      driftVel.y = Math.sin(angle) * speed;
    }

    function computeScore(elapsedMs) {
      const progress = Math.min(1, Math.max(0, elapsedMs / fadeDurMs));
      const exp = Number(settings.scoringExp) || 8.0;
      const raw = Math.pow(1 - progress, exp);
      const pts = Math.max(1, Math.round(settings.maxPerfectScore * raw));
      return pts;
    }

    function onClick(ev) {
      ev.stopPropagation();
      if (removed) return;
      removed = true;
      activeTargets.delete(instance);
      const now = performance.now();
      const elapsed = Math.max(0, now - start);
      const pts = computeScore(elapsed);
      score += pts;
      hits += 1;
      totalPointsFromHits += pts;
      consecutiveMisses = 0; // Reset miss streak
      // earliest hit tracking
      if (pts > earliestHit) earliestHit = pts;
      // Streaks: consecutive hits with >=20
      if (pts >= 20) { streakCount++; if (streakCount > streakMaxAchieved) streakMaxAchieved = streakCount; if (streakCount === 3 || streakCount === 5 || streakCount === 7) { showSpeech(Msg.streak[Math.floor(Math.random()*Msg.streak.length)], '🔥'); playStreakSound(); } } else { streakCount = 0; }
      // High single-hit thresholds one-time cheers
      [30,40,50,60,70].forEach(th => {
        if (pts >= th && !thresholdsHit.has(th)) {
          thresholdsHit.add(th);
          const key = th>=50? 'hi50' : (th>=40? 'hi40' : 'hi30');
          showSpeech(Msg[key][Math.floor(Math.random()*Msg[key].length)], '🏅');
        }
      });
      
      // Trigger good event on exceptional performance
      if (pts >= 35 && Math.random() < 0.3) {
        triggerGoodEvent();
      }
      
      showIndicator('+' + pts, left + size/2, top + size/2, true);
      updateHeader();
      // Quest progress hooks
      questOnHit(pts);
      el.remove();
      if (instance._raf) cancelAnimationFrame(instance._raf);
      playHitSound();
    }

    el.addEventListener('pointerdown', onClick);

    function onMiss() {
      if (removed) return;
      removed = true;
      activeTargets.delete(instance);
      const basePenalty = Number(settings.missPenalty) || 0;
      const streakPenalty = consecutiveMisses * (settings.missStreakPenalty || 10);
      const totalPenalty = basePenalty + streakPenalty;
      score = Math.max(0, score - totalPenalty);
      misses += 1;
      consecutiveMisses++;
      streakCount = 0;
      showIndicator('-' + totalPenalty, left + size/2, top + size/2, false);
      updateHeader();
      questOnMiss();
      damageParty(10); // Damage party on miss
      
      // Trigger bad event on poor performance
      if (Math.random() < 0.2) {
        triggerBadEvent();
      }
      
      el.remove();
      if (instance._raf) cancelAnimationFrame(instance._raf);
      playMissSound();
    }

    function step(now) {
      if (removed) return;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / fadeDurMs);
      
      let visual;
      if (isFader) {
        // Fader: fade in to 50% progress, then fade out
        if (progress < 0.5) {
          // Fade in: 0 to peak
          visual = Math.pow(progress * 2, 0.9);
        } else {
          // Fade out: peak to 0
          visual = Math.pow(1 - (progress - 0.5) * 2, 0.9);
        }
        // Scale visual to maxVisScore / maxPerfectScore
        const scaleFactor = maxVisScore / settings.maxPerfectScore;
        visual = visual * scaleFactor;
      } else {
        // Normal: fade in over full duration
        visual = Math.pow(progress, 0.9);
      }
      
      el.style.opacity = String(Math.max(0.02, visual));
      const scale = 1 - progress * 0.06;
      const tilt = Math.sin(progress * Math.PI * 2) * 0.6;
      el.style.transform = `scale(${scale}) rotate(${tilt}deg)`;

      if (driftEnabled && willDrift) {
        const dt = Math.max(0.001, (now - (instance._lastTime || now)) / 1000);
        instance._lastTime = now;
        let newLeft = parseFloat(el.style.left) + driftVel.x * dt;
        let newTop = parseFloat(el.style.top) + driftVel.y * dt;
        const rectNow = gameArea.getBoundingClientRect();
        const minLeft = 6;
        const minTop = 6;
        const maxLeftBound = Math.max(6, rectNow.width - size - 6);
        const maxTopBound = Math.max(6, rectNow.height - size - 6);
        if (newLeft < minLeft || newLeft > maxLeftBound) { driftVel.x *= -1; newLeft = Math.min(Math.max(newLeft, minLeft), maxLeftBound); }
        if (newTop < minTop || newTop > maxTopBound) { driftVel.y *= -1; newTop = Math.min(Math.max(newTop, minTop), maxTopBound); }
        el.style.left = `${newLeft}px`;
        el.style.top = `${newTop}px`;
      }

      if (progress >= 1) {
        onMiss();
        return;
      }
      instance._raf = requestAnimationFrame(step);
    }

    const instance = {
      el,
      destroy: () => {
        if (!removed) {
          removed = true;
          activeTargets.delete(instance);
          if (instance._raf) cancelAnimationFrame(instance._raf);
          el.remove();
        }
      },
      _raf: null,
      _lastTime: null,
    };

    activeTargets.add(instance);
    instance._raf = requestAnimationFrame(step);
    return instance;
  }

  // spawn control
  function startSpawning() {
    stopSpawning();
    running = true;
    paused = false;
    sessionStartTime = performance.now();
    driftEnabled = (score >= 500); // global toggle; per-target still uses dynamic fraction
    consecutiveMisses = 0; // Reset miss streak

    // start music for current mode if enabled
    if (settings.musicEnabled) {
      startMusic(mode);
      if (musicState.gain) musicState.gain.gain.setValueAtTime(Number(musicVol.value || 0.45), audioCtx ? audioCtx.currentTime : 0);
    }

    const freqMs = Math.max(50, Math.round(Number(settings.spawnSecs) * 1000));
    spawnTimer = setInterval(() => {
      if (activeTargets.size >= settings.maxConcurrent) return;
      createTargetInstance();
    }, freqMs);
    
    // Start Edge Creepers if enabled
    if (settings.edgeCreepersEnabled || (mode === 'quest' && score >= 1500)) {
      startEdgeCreepers();
    }
    
    // Start parallel party events for Quest mode
    if (mode === 'quest') {
      startPartyEvents();
    }
    
    pauseResumeBtn.textContent = 'Pause';
  }

  function stopSpawning() {
    running = false;
    if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
    pauseResumeBtn.textContent = 'Resume';
    stopMusic();
    stopEdgeCreepers();
    stopPartyEvents();
  }

  function clearAllTargets() {
    for (const t of Array.from(activeTargets)) {
      try { t.destroy(); } catch (e) {}
    }
    activeTargets.clear();
  }

  // empty-space miss
  gameArea.addEventListener('pointerdown', (ev) => {
    const target = ev.target;
    if (target.closest && target.closest('.target')) return;
    if (target.classList && target.classList.contains('edge-creeper')) return;
    const rect = gameArea.getBoundingClientRect();
    const x = ev.clientX - rect.left;
    const y = ev.clientY - rect.top;
    
    // Base penalty + streak penalty
    const basePenalty = Number(settings.missPenalty) || 0;
    const streakPenalty = consecutiveMisses * (settings.missStreakPenalty || 10);
    const totalPenalty = basePenalty + streakPenalty;
    
    score = Math.max(0, score - totalPenalty);
    misses += 1;
    consecutiveMisses++;
    
    showIndicator('-' + totalPenalty, x, y, false);
    updateHeader();
    damageParty(10); // Damage party on empty space miss too
    playMissSound();
  });

  // timers
  function startTimer(seconds) {
    timeRemaining = seconds;
    timeLeftEl.textContent = `Time: ${timeRemaining}s`;
    timeLeftEl.style.display = 'inline-block';
    if (timeTicker) clearInterval(timeTicker);
    timeTicker = setInterval(() => {
      if (paused) return;
      timeRemaining -= 1;
      timeLeftEl.textContent = `Time: ${timeRemaining}s`;
      if (timeRemaining <= 0) {
        clearInterval(timeTicker);
        endGame();
      }
    }, 1000);
  }
  function stopTimer() {
    if (timeTicker) clearInterval(timeTicker);
    timeLeftEl.textContent = '';
  }

  function showMissionBriefing(selectedMode, callback) {
    const overlay = document.createElement('div');
    overlay.className = 'story-dialog-overlay mission-briefing';
    
    const dialog = document.createElement('div');
    dialog.className = 'story-dialog mission-dialog';
    
    // Mission title
    const title = document.createElement('div');
    title.className = 'mission-title jrpg';
    title.textContent = selectedMode === 'time' ? 'Time Attack Mission' : 
                        selectedMode === 'infinite' ? 'Infinite Struggle' : 'Quest Level ' + (questState?.level || 1);
    
    // Objectives
    const objectives = document.createElement('div');
    objectives.className = 'mission-objectives';
    objectives.innerHTML = '<div class="section-title">Objectives:</div>';
    
    if (selectedMode === 'time') {
      objectives.innerHTML += '<ul><li>Score as many points as possible in 60 seconds</li><li>Hit targets early for maximum points</li><li>Avoid clicking empty space</li></ul>';
    } else if (selectedMode === 'quest' && questState) {
      objectives.innerHTML += '<ul>';
      questState.objectives.forEach(obj => {
        objectives.innerHTML += `<li>${obj.text}</li>`;
      });
      objectives.innerHTML += '</ul>';
    } else {
      objectives.innerHTML += '<ul><li>Survive as long as possible</li><li>Maximize average points per hit</li><li>Watch for evolving challenges</li></ul>';
    }
    
    // Expected enemies
    const enemies = document.createElement('div');
    enemies.className = 'mission-enemies';
    enemies.innerHTML = '<div class="section-title">Expected Threats:</div>';
    const enemyList = [];
    if (settings.timeAttackSettings?.normalPatches !== false) enemyList.push('Gabor Patches');
    if (settings.timeAttackSettings?.faders) enemyList.push('Faders');
    if (settings.timeAttackSettings?.drifters) enemyList.push('Drifters');
    if (settings.timeAttackSettings?.lines) enemyList.push('Dark Tendrils');
    if (settings.lineObstaclesEnabled) enemyList.push('Dark Tendrils');
    enemies.innerHTML += `<div class="enemy-types">${enemyList.join(', ') || 'Unknown'}</div>`;
    
    // Party status
    const status = document.createElement('div');
    status.className = 'party-status-check';
    status.innerHTML = '<div class="section-title">Party Status:</div>';
    
    if (party && party.length > 0) {
      party.forEach(m => {
        const hpPercent = Math.round((m.hp / m.maxHp) * 100);
        const moralePercent = Math.round((m.morale / m.maxMorale) * 100);
        status.innerHTML += `
          <div class="member-status">
            <span class="member-icon">${m.emoji}</span>
            <span class="member-name">${m.name}</span>
            <span class="member-hp">HP: ${hpPercent}%</span>
            <span class="member-morale">Morale: ${moralePercent}%</span>
          </div>
        `;
      });
    }
    
    // Pre-mission dialogue
    const dialogue = document.createElement('div');
    dialogue.className = 'mission-dialogue';
    
    if (party && party.length >= 2) {
      const speaker = party[Math.floor(Math.random() * party.length)];
      const quotes = [
        `${speaker.name}: "Stay focused. Watch for the subtlest movements."`,
        `${speaker.name}: "Trust your instincts. The pattern will reveal itself."`,
        `${speaker.name}: "Remember your training. Early detection is everything."`,
        `${speaker.name}: "The darkness tests our sight. We will not falter."`,
      ];
      dialogue.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    }
    
    // Deploy button
    const deployBtn = document.createElement('button');
    deployBtn.className = 'btn mission-deploy';
    deployBtn.textContent = 'Deploy Mission';
    deployBtn.onclick = () => {
      overlay.remove();
      if (callback) callback();
    };
    
    dialog.appendChild(title);
    dialog.appendChild(objectives);
    dialog.appendChild(enemies);
    dialog.appendChild(status);
    dialog.appendChild(dialogue);
    dialog.appendChild(deployBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function showPostBattleCarnageReport(missionData) {
    const overlay = document.createElement('div');
    overlay.className = 'story-dialog-overlay pbcr-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'story-dialog pbcr-dialog';
    
    const title = document.createElement('div');
    title.className = 'mission-title jrpg';
    title.textContent = 'Post-Battle Carnage Report';
    
    // Summary stats
    const summary = document.createElement('div');
    summary.className = 'pbcr-summary';
    summary.innerHTML = `
      <div class="pbcr-stat"><span>Final Score:</span> <span class="value">${missionData.score}</span></div>
      <div class="pbcr-stat"><span>Total Hits:</span> <span class="value">${missionData.hits}</span></div>
      <div class="pbcr-stat"><span>Total Misses:</span> <span class="value">${missionData.misses}</span></div>
      <div class="pbcr-stat"><span>Average Points/Hit:</span> <span class="value">${missionData.avgPts.toFixed(2)}</span></div>
      <div class="pbcr-stat"><span>Earliest Hit:</span> <span class="value">${missionData.earliestHit}</span></div>
    `;
    
    // Party performance
    if (party && party.length > 0) {
      const perfSection = document.createElement('div');
      perfSection.className = 'party-performance';
      perfSection.innerHTML = '<div class="section-title">Party Performance:</div>';
      
      party.forEach(m => {
        const dmgDealt = m.totalDamageDealt || 0;
        const dmgTaken = m.totalDamageTaken || 0;
        const healing = m.totalHealing || 0;
        const crits = m.criticalHits || 0;
        
        perfSection.innerHTML += `
          <div class="member-perf">
            <div class="member-header">${m.emoji} ${m.name}</div>
            <div class="perf-stats">
              <span>Damage: ${dmgDealt}</span>
              <span>Taken: ${dmgTaken}</span>
              ${healing > 0 ? `<span>Healing: ${healing}</span>` : ''}
              ${crits > 0 ? `<span>Crits: ${crits}</span>` : ''}
            </div>
          </div>
        `;
      });
      
      summary.appendChild(perfSection);
    }
    
    // Morale change
    const moraleChange = missionData.moraleChange || 0;
    const moraleDiv = document.createElement('div');
    moraleDiv.className = 'morale-change ' + (moraleChange >= 0 ? 'positive' : 'negative');
    moraleDiv.innerHTML = `<span>Morale Change:</span> <span class="value">${moraleChange >= 0 ? '+' : ''}${moraleChange}</span>`;
    
    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn';
    continueBtn.textContent = 'Continue';
    continueBtn.onclick = () => {
      overlay.remove();
      // Trigger post-mission events
      if (Math.random() < 0.3) {
        triggerBetweenMissionEvent();
      }
    };
    
    dialog.appendChild(title);
    dialog.appendChild(summary);
    dialog.appendChild(moraleDiv);
    dialog.appendChild(continueBtn);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function triggerBetweenMissionEvent() {
    if (!party || party.length === 0) return;
    
    const eventType = Math.random();
    
    if (eventType < 0.2) {
      // Tavern rest event
      const choices = [
        { text: 'Rest at the tavern (+20 HP all, -100 gold)', gold: -100, hp: 20 },
        { text: 'Skip rest and press on', gold: 0, hp: 0 }
      ];
      showDecisionEvent(
        'The party arrives at a roadside tavern...',
        '🏛️',
        choices,
        (choice) => {
          if (choice.hp > 0) {
            party.forEach(m => {
              m.hp = Math.min(m.maxHp, m.hp + choice.hp);
              m.morale = Math.min(m.maxMorale, m.morale + 5);
            });
            showSpeech('The party rests and recovers.', '✨', {ttlMs: 1800});
          } else {
            showSpeech('The journey continues without pause.', '👣', {ttlMs: 1400});
          }
          updatePartyUI();
        }
      );
    } else if (eventType < 0.35 && party.length > 0) {
      // Special mission offer
      const volunteer = party[Math.floor(Math.random() * party.length)];
      showDecisionEvent(
        `${volunteer.name} discovers a lead on a personal matter. Let them investigate?`,
        volunteer.emoji,
        [
          { text: 'Let them go (MIA risk, potential rewards)', action: 'mia' },
          { text: 'Keep the party together', action: 'stay' }
        ],
        (choice) => {
          if (choice.action === 'mia' && Math.random() < 0.4) {
            handleMIA(volunteer, 'personal mission');
          } else if (choice.action === 'mia') {
            showSpeech(`${volunteer.name} returns quickly with valuable intel!`, '📜', {ttlMs: 1800});
            volunteer.xp += 50;
          } else {
            volunteer.morale = Math.max(0, volunteer.morale - 5);
            showSpeech(`${volunteer.name} reluctantly stays with the group.`, '😔', {ttlMs: 1400});
          }
          updatePartyUI();
        }
      );
    } else if (eventType < 0.45 && party.length >= 2) {
      // Relationship event
      const m1 = party[Math.floor(Math.random() * party.length)];
      const m2 = party.filter(m => m.id !== m1.id)[Math.floor(Math.random() * (party.length - 1))];
      const currentRel = m1.relationships[m2.name] || 0;
      
      if (currentRel < -100) {
        showStoryDialog(
          `${m1.name} and ${m2.name} argue bitterly. Their conflict threatens the party's unity.`,
          '⚡',
          () => {
            m1.morale = Math.max(0, m1.morale - 10);
            m2.morale = Math.max(0, m2.morale - 10);
            party.forEach(m => {
              if (m.id !== m1.id && m.id !== m2.id) {
                m.morale = Math.max(0, m.morale - 5);
              }
            });
            updatePartyUI();
          }
        );
      } else if (currentRel > 300) {
        showStoryDialog(
          `${m1.name} and ${m2.name} share a quiet moment, strengthening their bond.`,
          '💞',
          () => {
            m1.relationships[m2.name] = Math.min(999, currentRel + 50);
            m2.relationships[m1.name] = Math.min(999, (m2.relationships[m1.name] || 0) + 50);
            m1.morale = Math.min(m1.maxMorale, m1.morale + 10);
            m2.morale = Math.min(m2.maxMorale, m2.morale + 10);
            updatePartyUI();
          }
        );
      }
    }
  }

  function showDecisionEvent(text, emoji, choices, onDecide) {
    const overlay = document.createElement('div');
    overlay.className = 'story-dialog-overlay decision-event';
    
    const dialog = document.createElement('div');
    dialog.className = 'story-dialog';
    
    const icon = document.createElement('div');
    icon.className = 'story-icon';
    icon.textContent = emoji;
    
    const textBox = document.createElement('div');
    textBox.className = 'story-text';
    textBox.textContent = text;
    
    const choicesBox = document.createElement('div');
    choicesBox.className = 'decision-choices';
    
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.className = 'btn decision-btn';
      btn.textContent = choice.text;
      btn.onclick = () => {
        overlay.remove();
        if (onDecide) onDecide(choice);
      };
      choicesBox.appendChild(btn);
    });
    
    dialog.appendChild(icon);
    dialog.appendChild(textBox);
    dialog.appendChild(choicesBox);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  // start game
  // start game
  function startGame(selectedMode) {
    // Show mission briefing first
    showMissionBriefing(selectedMode, () => {
      // ensure audio context unlocked & play start jingle
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          playStartSound();
          // small delay for jingle to complete a bit before starting
          setTimeout(() => {
            mode = selectedMode;
            startSpawning();
          }, 420);
        });
      } else {
        playStartSound();
        mode = selectedMode;
        setTimeout(() => startSpawning(), 420);
      }

      score = 0; hits = 0; misses = 0; totalPointsFromHits = 0; earliestHit = 0; streakCount = 0; streakMaxAchieved = 0; thresholdsHit = new Set(); avgBelow10Announced=false; avgWasBelow15=false;
      
      // Reset/heal party for Quest Mode
      if (selectedMode === 'quest' && party.length > 0) {
        party.forEach(m => {
          m.hp = m.maxHp;
          m.mp = m.maxMp;
          m.statusEffects = m.statusEffects.filter(e => e === '✨'); // Keep revival buff
          if (m.mood === 'dead') m.mood = 'determined';
          // Reset combat stats
          m.totalDamageDealt = 0;
          m.totalDamageTaken = 0;
          m.totalHealing = 0;
          m.criticalHits = 0;
          m.enemiesKilled = 0;
          m.missedActions = 0;
        });
      }
      
      updateHeader();
      currentModeEl.textContent = `Mode: ${selectedMode === 'time' ? 'Time Attack' : selectedMode === 'infinite' ? 'Infinite' : 'Quest'}`;

      startScreen.classList.add('hidden');
      settingsPanel.classList.add('hidden');
      gameShell.classList.remove('hidden');
      endScreen.classList.add('hidden');

      applyArenaDimensions();
      questPanel.classList.add('hidden');
      if (selectedMode === 'time') {
        startTimer(timeLimit);
        // Apply Time Attack settings
        if (settings.timeAttackSettings.lines) {
          settings.lineObstaclesEnabled = true;
          startLineObstacles();
        } else {
          settings.lineObstaclesEnabled = false;
          stopLineObstacles();
        }
      } else {
        stopTimer();
      }
      if (selectedMode === 'quest') {
        ensureQuest();
        questState.active = true;
        questPanel.classList.remove('hidden');
        if (questPanelToggleBtn) questPanelToggleBtn.textContent = 'Objectives: On';
        updateQuestObjectivesUI();
        showSpeech(questState.story.intro, questState.story.mentorEmoji);
        // Initialize party for Quest Mode
        if (party.length === 0) initializeParty();
        updatePartyUI();
      }
    });
  }

  function endGame() {
    stopSpawning();
    stopTimer();
    clearAllTargets();
    
    const avg = hits > 0 ? (totalPointsFromHits / hits) : 0;
    
    // Calculate morale change
    let moraleChange = 0;
    if (avg >= 30) moraleChange = 15;
    else if (avg >= 20) moraleChange = 5;
    else if (avg < 10) moraleChange = -10;
    
    // Prepare mission data for PBCR
    const missionData = {
      score,
      hits,
      misses,
      avgPts: avg,
      earliestHit,
      moraleChange
    };
    
    // Show PBCR if in quest mode
    if (mode === 'quest' && party.length > 0) {
      showPostBattleCarnageReport(missionData);
    }
    
    endScoreEl.textContent = String(score);
    endAvgEl.textContent = avg.toFixed(2);
    endEarliestEl.textContent = String(earliestHit);
    endHitsEl.textContent = String(hits);
    endMissesEl.textContent = String(misses);
    document.getElementById('end-extra').textContent = mode === 'time' ? `Mode: Time Attack (${timeLimit}s)` : `Mode: Infinite — stopped`;

    const hs = getHighScores();
    if (mode === 'time') {
      if (score > (hs.time || 0)) hs.time = score;
    } else {
      if (avg > (hs.infiniteAvg || 0)) hs.infiniteAvg = avg;
    }
    saveHighScores(hs);
    updateHighScoreDisplays();

    endScreen.classList.remove('hidden');
    gameShell.classList.add('hidden');
    // stop any quest activity view
    if (questState) questState.active = false;
  }

  // --- Line obstacle system ---
  function startLineObstacles() {
    if (lineSpawnTimer) return;
    const intervalMs = (settings.lineSpawnIntervalSecs || 8) * 1000;
    lineSpawnTimer = setInterval(() => {
      if (paused || !running) return;
      createLineObstacle();
    }, intervalMs);
  }

  function stopLineObstacles() {
    if (lineSpawnTimer) {
      clearInterval(lineSpawnTimer);
      lineSpawnTimer = null;
    }
    lineObstacles.forEach(line => {
      if (line.el) line.el.remove();
      if (line.timer) clearInterval(line.timer);
    });
    lineObstacles = [];
  }

  // --- Edge Creeper system ---
  function startEdgeCreepers() {
    if (edgeCreepSpawnTimer) return;
    const intervalMs = 12000 + Math.random() * 8000; // 12-20 seconds
    edgeCreepSpawnTimer = setInterval(() => {
      if (paused || !running) return;
      createEdgeCreeper();
    }, intervalMs);
  }

  function stopEdgeCreepers() {
    if (edgeCreepSpawnTimer) {
      clearInterval(edgeCreepSpawnTimer);
      edgeCreepSpawnTimer = null;
    }
    edgeCreepers.forEach(creep => {
      if (creep.el) creep.el.remove();
      if (creep.timer) clearInterval(creep.timer);
    });
    edgeCreepers = [];
  }

  function createEdgeCreeper() {
    const rect = gameArea.getBoundingClientRect();
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    
    const creepSize = Math.random() < 0.33 ? 2 : (Math.random() < 0.5 ? 3 : 1);
    const bgRgb = hexToRgb(settings.bgColor);
    const variance = 8;
    const creepColor = `rgb(${Math.max(0, bgRgb[0] - variance)}, ${Math.max(0, bgRgb[1] - variance)}, ${Math.max(0, bgRgb[2] - variance)})`;
    
    const el = document.createElement('div');
    el.className = 'edge-creeper';
    el.style.position = 'absolute';
    el.style.width = `${creepSize}px`;
    el.style.height = `${creepSize}px`;
    el.style.background = creepColor;
    el.style.opacity = '0.25';
    el.style.zIndex = '9999';
    el.style.pointerEvents = 'auto';
    el.style.cursor = 'crosshair';
    
    let startX, startY, endX, endY, currentX, currentY;
    const edgeOffset = -2; // Slightly outside game area
    const duration = 8000 + Math.random() * 4000; // 8-12 seconds to traverse
    
    if (side === 0) { // Top edge, left to right
      startX = 0;
      startY = edgeOffset;
      endX = rect.width;
      endY = edgeOffset;
    } else if (side === 1) { // Right edge, top to bottom
      startX = rect.width - edgeOffset;
      startY = 0;
      endX = rect.width - edgeOffset;
      endY = rect.height;
    } else if (side === 2) { // Bottom edge, right to left
      startX = rect.width;
      startY = rect.height - edgeOffset;
      endX = 0;
      endY = rect.height - edgeOffset;
    } else { // Left edge, bottom to top
      startX = edgeOffset;
      startY = rect.height;
      endX = edgeOffset;
      endY = 0;
    }
    
    currentX = startX;
    currentY = startY;
    el.style.left = `${currentX}px`;
    el.style.top = `${currentY}px`;
    
    gameArea.appendChild(el);
    
    const startTime = performance.now();
    let removed = false;
    
    const creepObj = {
      el,
      removed: false,
      side,
    };
    
    function onClick(ev) {
      ev.stopPropagation();
      if (removed) return;
      removed = true;
      creepObj.removed = true;
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Score based on how early detected
      const [maxPts, minPts] = settings.pointRange.split('-').map(Number);
      const pts = Math.round(maxPts - (progress * (maxPts - minPts)));
      
      score += pts;
      hits++;
      totalPointsFromHits += pts;
      
      const x = parseFloat(el.style.left);
      const y = parseFloat(el.style.top);
      showIndicator('+' + pts, x + 10, y + 10, true);
      updateHeader();
      
      el.remove();
      edgeCreepers = edgeCreepers.filter(c => c !== creepObj);
    }
    
    el.addEventListener('pointerdown', onClick);
    
    function animate(now) {
      if (removed || paused) return;
      
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      currentX = startX + (endX - startX) * progress;
      currentY = startY + (endY - startY) * progress;
      
      el.style.left = `${currentX}px`;
      el.style.top = `${currentY}px`;
      
      // Increase visibility as it progresses
      el.style.opacity = String(0.25 + progress * 0.4);
      
      if (progress >= 1 && !removed) {
        // Reached end - massive penalty
        removed = true;
        creepObj.removed = true;
        
        const penalty = settings.edgeCreepPenalty || 200;
        score = Math.max(0, score - penalty);
        misses++;
        
        showIndicator('-' + penalty, rect.width / 2, rect.height / 2, false);
        updateHeader();
        
        // Damage party
        if (mode === 'quest') {
          damageParty(settings.edgeCreepDamage || 50);
          showSpeech('An Edge Creeper breached the perimeter!', '🐛', {ttlMs: 1800});
        }
        
        el.remove();
        edgeCreepers = edgeCreepers.filter(c => c !== creepObj);
        return;
      }
      
      requestAnimationFrame(animate);
    }
    
    requestAnimationFrame(animate);
    edgeCreepers.push(creepObj);
  }

  function createLineObstacle() {
    const rect = gameArea.getBoundingClientRect();
    const type = Math.random() < 0.4 ? 'straight' : (Math.random() < 0.6 ? 'zigzag' : 'wave');
    
    // Determine start and end
    const side = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    let startX, startY, endX, endY;
    
    if (side === 0) { // top to bottom
      startX = Math.random() * rect.width;
      startY = 0;
      endX = Math.random() * rect.width;
      endY = rect.height;
    } else if (side === 1) { // right to left
      startX = rect.width;
      startY = Math.random() * rect.height;
      endX = 0;
      endY = Math.random() * rect.height;
    } else if (side === 2) { // bottom to top
      startX = Math.random() * rect.width;
      startY = rect.height;
      endX = Math.random() * rect.width;
      endY = 0;
    } else { // left to right
      startX = 0;
      startY = Math.random() * rect.height;
      endX = rect.width;
      endY = Math.random() * rect.height;
    }

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '1';

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Very subtle color close to background for hard-to-see effect
    const bgRgb = hexToRgb(settings.bgColor);
    const offset = 8; // small difference from background
    const lineColor = `rgb(${Math.max(0, bgRgb[0] - offset)}, ${Math.max(0, bgRgb[1] - offset)}, ${Math.max(0, bgRgb[2] - offset)})`;
    
    path.setAttribute('stroke', lineColor);
    path.setAttribute('stroke-width', '2');
    path.setAttribute('fill', 'none');
    path.setAttribute('opacity', '0.15'); // very subtle
    
    let pathD;
    if (type === 'straight') {
      pathD = `M ${startX} ${startY} L ${endX} ${endY}`;
    } else if (type === 'zigzag') {
      const midX1 = startX + (endX - startX) * 0.33;
      const midY1 = startY + (endY - startY) * 0.33 + (Math.random() - 0.5) * 80;
      const midX2 = startX + (endX - startX) * 0.66;
      const midY2 = startY + (endY - startY) * 0.66 + (Math.random() - 0.5) * 80;
      pathD = `M ${startX} ${startY} L ${midX1} ${midY1} L ${midX2} ${midY2} L ${endX} ${endY}`;
    } else { // wave
      const ctrlX1 = startX + (endX - startX) * 0.25;
      const ctrlY1 = startY + (endY - startY) * 0.25 + Math.sin(Math.random() * Math.PI) * 60;
      const ctrlX2 = startX + (endX - startX) * 0.75;
      const ctrlY2 = startY + (endY - startY) * 0.75 + Math.sin(Math.random() * Math.PI + Math.PI) * 60;
      pathD = `M ${startX} ${startY} C ${ctrlX1} ${ctrlY1}, ${ctrlX2} ${ctrlY2}, ${endX} ${endY}`;
    }
    
    path.setAttribute('d', pathD);
    svg.appendChild(path);
    gameArea.appendChild(svg);

    const growthDuration = 3000 + Math.random() * 2000; // 3-5 seconds to complete
    const startTime = performance.now();
    let completed = false;

    const lineObj = {
      el: svg,
      type,
      completed: false,
      timer: null,
    };

    function animate(now) {
      if (!running || completed) return;
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / growthDuration);
      
      // Animate stroke-dasharray to grow the line
      const pathLength = path.getTotalLength();
      path.setAttribute('stroke-dasharray', pathLength);
      path.setAttribute('stroke-dashoffset', pathLength * (1 - progress));

      if (progress >= 1 && !completed) {
        completed = true;
        lineObj.completed = true;
        // Line reached its destination - penalize player
        score = Math.max(0, score - (settings.linePenalty || 100));
        updateHeader();
        playMissSound();
        showSpeech('A tendril pierced through!', '⚡', {ttlMs: 1200});
        
        // Flash and remove
        svg.style.opacity = '0.4';
        setTimeout(() => {
          svg.style.opacity = '0';
          setTimeout(() => {
            svg.remove();
            lineObstacles = lineObstacles.filter(l => l !== lineObj);
          }, 300);
        }, 600);
        return;
      }

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    lineObstacles.push(lineObj);
  }

  // --- Parallel Party Event System (The party's JRPG quest) ---
  function startPartyEvents() {
    if (partyEventTimer || mode !== 'quest') return;
    
    function triggerRandomPartyEvent() {
      if (!running || paused || !party || party.length === 0) return;
      
      const eventType = Math.random();
      
      if (eventType < 0.4) {
        // Combat event
        triggerPartyCombatEvent();
      } else if (eventType < 0.7) {
        // Travel/encounter event
        triggerPartyTravelEvent();
      } else {
        // Random/humorous event
        triggerPartyRandomEvent();
      }
      
      // Schedule next event in 15-30 seconds
      const nextDelay = 15000 + Math.random() * 15000;
      partyEventTimer = setTimeout(triggerRandomPartyEvent, nextDelay);
    }
    
    // Start first event
    const initialDelay = 10000 + Math.random() * 5000;
    partyEventTimer = setTimeout(triggerRandomPartyEvent, initialDelay);
  }
  
  function stopPartyEvents() {
    if (partyEventTimer) {
      clearTimeout(partyEventTimer);
      partyEventTimer = null;
    }
  }
  
  function triggerPartyCombatEvent() {
    const enemies = [
      { name: 'Goblin', emoji: '👺', threat: 'low' },
      { name: 'Troll', emoji: '🧌', threat: 'medium' },
      { name: 'Brigand', emoji: '🗡️', threat: 'low' },
      { name: 'Shadow Beast', emoji: '👹', threat: 'high' },
      { name: 'Corrupted Knight', emoji: '⚔️', threat: 'high' },
      { name: 'Wild Boar', emoji: '🐗', threat: 'low' },
      { name: 'Bandit Captain', emoji: '🏴‍☠️', threat: 'medium' },
      { name: 'Spectral Warrior', emoji: '👻', threat: 'medium' },
      { name: 'Dire Wolf', emoji: '🐺', threat: 'medium' },
      { name: 'Dark Cultist', emoji: '🔮', threat: 'medium' },
    ];
    
    const encounterTypes = ['was ambushed by', 'encountered', 'was challenged by', 'stumbled upon', 'was attacked by'];
    const numbers = ['a', 'a pair of', 'a band of', 'a group of', 'several', 'a horde of'];
    
    const enemy = enemies[Math.floor(Math.random() * enemies.length)];
    const encounterType = encounterTypes[Math.floor(Math.random() * encounterTypes.length)];
    const number = Math.random() < 0.3 ? 'a' : numbers[Math.floor(Math.random() * numbers.length)];
    const plural = number === 'a' ? '' : 's';
    
    const activeMember = party[Math.floor(Math.random() * party.length)];
    
    const victoryActions = [
      'slayed', 'defeated', 'vanquished', 'struck down', 'obliterated', 
      'dispatched', 'eliminated', 'crushed', 'overwhelmed', 'outmaneuvered'
    ];
    const victoryAction = victoryActions[Math.floor(Math.random() * victoryActions.length)];
    
    // Determine outcome based on threat and party status
    const partyStrength = party.reduce((sum, m) => sum + (m.hp / m.maxHp) * m.level, 0) / party.length;
    const threatValue = enemy.threat === 'high' ? 0.8 : (enemy.threat === 'medium' ? 0.5 : 0.3);
    const victoryChance = Math.min(0.95, partyStrength / (threatValue + 0.5));
    
    if (Math.random() < victoryChance) {
      // Victory
      showSpeech(`${activeMember.name} ${victoryAction} ${number} ${enemy.name}${plural}!`, enemy.emoji, {ttlMs: 2000});
      
      // Rewards
      activeMember.xp += 15 + Math.floor(Math.random() * 25);
      activeMember.totalDamageDealt += 10 + Math.floor(Math.random() * 30);
      activeMember.enemiesKilled++;
      if (Math.random() < 0.2) activeMember.criticalHits++;
      
      party.forEach(m => {
        m.morale = Math.min(m.maxMorale, m.morale + 3);
        if (Math.random() < 0.15) {
          m.hp = Math.min(m.maxHp, m.hp + 5);
        }
      });
      
      // Relationship boost with active member
      party.forEach(m => {
        if (m.id !== activeMember.id && Math.random() < 0.3) {
          m.relationships[activeMember.name] = Math.min(999, (m.relationships[activeMember.name] || 0) + 10);
        }
      });
      
      if (activeMember.xp >= activeMember.xpToNext) {
        levelUpMember(activeMember);
      }
    } else {
      // Defeat/damage
      const damageAmount = enemy.threat === 'high' ? 25 : (enemy.threat === 'medium' ? 15 : 8);
      activeMember.hp = Math.max(0, activeMember.hp - damageAmount);
      activeMember.totalDamageTaken += damageAmount;
      
      const struggles = ['struggled against', 'was wounded by', 'barely survived', 'retreated from'];
      const struggle = struggles[Math.floor(Math.random() * struggles.length)];
      
      showSpeech(`Party ${struggle} ${number} ${enemy.name}${plural}! (-${damageAmount} HP)`, '⚠️', {ttlMs: 2000});
      
      party.forEach(m => m.morale = Math.max(0, m.morale - 5));
      
      if (activeMember.hp <= 0) {
        handlePartyDeath(activeMember);
      }
    }
    
    updatePartyUI();
  }
  
  function triggerPartyTravelEvent() {
    const goodEvents = [
      { text: 'discovered a hidden spring', emoji: '💧', morale: 5, hp: 10 },
      { text: 'found an abandoned camp with supplies', emoji: '🏕️', morale: 8, hp: 5 },
      { text: 'met a friendly traveler who shared food', emoji: '🍞', morale: 10, hp: 8 },
      { text: 'discovered ancient ruins with treasure', emoji: '🏛️', morale: 12, xp: 30 },
      { text: 'found a shortcut through the mountains', emoji: '⛰️', morale: 7 },
      { text: 'witnessed a beautiful sunrise', emoji: '🌅', morale: 6 },
      { text: 'rescued a merchant from bandits', emoji: '🛡️', morale: 15, xp: 20 },
      { text: 'found rare herbs', emoji: '🌿', hp: 12 },
    ];
    
    const badEvents = [
      { text: 'got lost in dense fog', emoji: '🌫️', morale: -8 },
      { text: 'encountered a landslide', emoji: '⛰️', morale: -5, hp: -10 },
      { text: 'was caught in a sudden storm', emoji: '⛈️', morale: -6, hp: -5 },
      { text: 'stumbled into a bog', emoji: '🌾', morale: -7, hp: -8 },
      { text: 'ran out of fresh water', emoji: '💧', morale: -10, hp: -12 },
      { text: 'faced exhausting terrain', emoji: '🏔️', morale: -5, hp: -6 },
    ];
    
    const isGood = Math.random() < 0.6;
    const event = isGood ? 
      goodEvents[Math.floor(Math.random() * goodEvents.length)] :
      badEvents[Math.floor(Math.random() * badEvents.length)];
    
    showSpeech(`Party ${event.text}!`, event.emoji, {ttlMs: 1800});
    
    party.forEach(m => {
      if (event.morale) m.morale = Math.max(0, Math.min(m.maxMorale, m.morale + event.morale));
      if (event.hp) m.hp = Math.max(0, Math.min(m.maxHp, m.hp + event.hp));
      if (event.xp) m.xp += event.xp;
    });
    
    updatePartyUI();
  }
  
  function triggerPartyRandomEvent() {
    const member = party[Math.floor(Math.random() * party.length)];
    
    const randomEvents = [
      { text: 'ate a suspicious mushroom', emoji: '🍄', effects: ['poisoned', -10] },
      { text: 'tripped over a root', emoji: '🌳', effects: ['embarrassed', -3] },
      { text: 'told an awful joke', emoji: '😆', effects: ['morale', -2, 'others', 5] },
      { text: 'found a lucky coin', emoji: '🪙', effects: ['morale', 8] },
      { text: 'practiced their combat skills', emoji: '⚔️', effects: ['xp', 15] },
      { text: 'had a prophetic dream', emoji: '💭', effects: ['morale', 10] },
      { text: 'argued about the map direction', emoji: '🗺️', effects: ['morale', -5] },
      { text: 'shared stories around the campfire', emoji: '🔥', effects: ['bonds', 10] },
      { text: 'lost their favorite item', emoji: '😢', effects: ['morale', -12] },
      { text: 'performed an inspiring song', emoji: '🎵', effects: ['morale', 15] },
      { text: 'accidentally activated a magic trap', emoji: '✨', effects: ['hp', -15] },
      { text: 'discovered a talking animal', emoji: '🦊', effects: ['morale', 8] },
      { text: 'got their boot stuck in mud', emoji: '👢', effects: ['morale', -4] },
      { text: 'found an ancient inscription', emoji: '📜', effects: ['xp', 20] },
    ];
    
    const event = randomEvents[Math.floor(Math.random() * randomEvents.length)];
    
    showSpeech(`${member.name} ${event.text}!`, event.emoji, {ttlMs: 1800});
    
    const effects = event.effects;
    if (effects[0] === 'poisoned') {
      member.hp = Math.max(0, member.hp + effects[1]);
      member.statusEffects.push('🤢');
    } else if (effects[0] === 'embarrassed') {
      member.morale = Math.max(0, member.morale + effects[1]);
    } else if (effects[0] === 'morale') {
      if (effects[2] === 'others') {
        party.forEach(m => {
          if (m.id !== member.id) m.morale = Math.min(m.maxMorale, m.morale + effects[3]);
        });
        member.morale = Math.max(0, member.morale + effects[1]);
      } else {
        member.morale = Math.max(0, Math.min(member.maxMorale, member.morale + effects[1]));
      }
    } else if (effects[0] === 'xp') {
      member.xp += effects[1];
      if (member.xp >= member.xpToNext) levelUpMember(member);
    } else if (effects[0] === 'hp') {
      member.hp = Math.max(0, Math.min(member.maxHp, member.hp + effects[1]));
    } else if (effects[0] === 'bonds') {
      party.forEach(m => {
        if (m.id !== member.id) {
          m.relationships[member.name] = Math.min(999, (m.relationships[member.name] || 0) + effects[1]);
        }
      });
    }
    
    updatePartyUI();
  }

  // --- Story dialog system with text sounds ---
  function showStoryDialog(text, emoji, onDismiss) {
    if (!audioCtx) return;
    
    // Pause gameplay
    const wasPaused = paused;
    if (!paused && running) {
      paused = true;
      if (audioCtx) audioCtx.suspend();
    }

    const overlay = document.createElement('div');
    overlay.className = 'story-dialog-overlay';
    
    const dialog = document.createElement('div');
    dialog.className = 'story-dialog';
    
    const icon = document.createElement('div');
    icon.className = 'story-icon';
    icon.textContent = emoji;
    
    const textBox = document.createElement('div');
    textBox.className = 'story-text';
    
    const continueHint = document.createElement('div');
    continueHint.className = 'story-continue';
    continueHint.textContent = '(Click to continue)';
    
    dialog.appendChild(icon);
    dialog.appendChild(textBox);
    dialog.appendChild(continueHint);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Text typewriter effect with sound
    let charIndex = 0;
    const typingInterval = 40; // ms per character
    
    function typeNextChar() {
      if (charIndex < text.length) {
        textBox.textContent += text[charIndex];
        
        // Text sound (soft blip)
        if (charIndex % 2 === 0) { // every other character for performance
          const t = audioCtx.currentTime;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800 + Math.random() * 100, t);
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.03, t + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(t);
          osc.stop(t + 0.1);
        }
        
        charIndex++;
        setTimeout(typeNextChar, typingInterval);
      } else {
        // Typing complete, show continue hint
        continueHint.style.opacity = '1';
      }
    }

    typeNextChar();

    // Click to dismiss
    overlay.addEventListener('click', () => {
      overlay.remove();
      
      // Resume if it wasn't paused before
      if (!wasPaused && running) {
        paused = false;
        if (audioCtx) audioCtx.resume();
      }
      
      if (onDismiss) onDismiss();
    });
  }

  // --- Party system ---
  function generatePartyMember(level = 1) {
    const maleNames = ['Aldric', 'Brennan', 'Corwin', 'Darian', 'Eldon', 'Fendrel', 'Gareth', 'Hadrian', 'Iven', 'Jorath', 'Kael', 'Lucan', 'Magnus', 'Nolan', 'Orin'];
    const femaleNames = ['Aeliana', 'Brynn', 'Celeste', 'Deirdre', 'Elara', 'Faye', 'Gwyneth', 'Helena', 'Isolde', 'Lyra', 'Mira', 'Nova', 'Ophelia', 'Petra', 'Quinn'];
    const classes = ['Warrior', 'Ranger', 'Cleric', 'Mage', 'Paladin', 'Rogue', 'Bard', 'Monk'];
    const maleEmojis = ['🧔', '👨', '🧑', '👦', '🤵', '🧙‍♂️', '🥷', '🦸‍♂️', '🤴', '👨‍🦰', '👨‍🦱', '👨‍🦳'];
    const femaleEmojis = ['👩', '👧', '🧕', '👰', '🧙‍♀️', '🦸‍♀️', '👸', '👩‍🦰', '👩‍🦱', '👩‍🦳', '🧝‍♀️'];
    
    const isMale = Math.random() < 0.5;
    const name = isMale ? maleNames[Math.floor(Math.random() * maleNames.length)] : femaleNames[Math.floor(Math.random() * femaleNames.length)];
    const cls = classes[Math.floor(Math.random() * classes.length)];
    const emoji = isMale ? maleEmojis[Math.floor(Math.random() * maleEmojis.length)] : femaleEmojis[Math.floor(Math.random() * femaleEmojis.length)];
    
    const backstories = [
      'seeking redemption',
      'haunted by the past',
      'driven by vengeance',
      'protecting the innocent',
      'searching for truth',
      'fleeing from darkness',
      'honoring fallen comrades',
      'searching for a lost love',
    ];
    
    const baseHp = 100;
    const baseMp = 50;
    
    return {
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      gender: isMale ? 'male' : 'female',
      class: cls,
      level,
      rank: 1,
      jobTitle: cls,
      adjective: '',
      emoji,
      maxHp: baseHp + (level - 1) * 20,
      hp: baseHp + (level - 1) * 20,
      maxMp: baseMp + (level - 1) * 10,
      mp: baseMp + (level - 1) * 10,
      morale: 100,
      maxMorale: 100,
      backstory: backstories[Math.floor(Math.random() * backstories.length)],
      mood: 'calm',
      statusEffects: [],
      emotionalEffects: [], // New: grief, rage, vengeance, etc.
      traumaLevel: 0,
      fearScore: Math.floor(Math.random() * 30), // New: affects desertion chance
      loyaltyScore: 50 + Math.floor(Math.random() * 50), // New: affects betrayal chance
      relationships: {}, // { memberName: score } where score is -999 to 999
      role: null,
      partyStatus: 'active', // active, mia, awol, deserter, betrayer, deceased, memorial
      miaTimer: null, // Timestamp when MIA started
      miaReturnTime: null, // When they'll return or need rescue
      awayMissions: [], // Track missions they've done while away
      xp: 0,
      xpToNext: 100 * level,
      totalDamageDealt: 0,
      totalDamageTaken: 0,
      totalHealing: 0,
      criticalHits: 0,
      enemiesKilled: 0,
      missedActions: 0,
      gear: { weapon: 'Basic ' + cls + ' Weapon', armor: 'Cloth Armor' },
      skills: [],
      spells: cls === 'Cleric' || cls === 'Mage' ? ['Cure'] : [],
      hiddenAgenda: Math.random() < 0.15 ? ['Spy', 'Redemption Seeker', 'Vengeful'][Math.floor(Math.random() * 3)] : null,
      deathTimestamp: null,
      causeOfDeath: null,
      ripMessage: null,
    };
  }

  function initializeParty() {
    party = [];
    heroRoster = [];
    for (let i = 0; i < partyMaxSize; i++) {
      const member = generatePartyMember();
      party.push(member);
      heroRoster.push(member);
    }
    
    // Generate relationships with numeric scores (-999 to 999)
    party.forEach((member, i) => {
      party.forEach((other, j) => {
        if (i !== j) {
          const rel = Math.random();
          let score;
          if (rel < 0.1) {
            score = -200 - Math.floor(Math.random() * 100); // Dislikes: -200 to -300
            member.relationships[other.name] = score;
          } else if (rel < 0.2) {
            score = 300 + Math.floor(Math.random() * 200); // Friends: 300 to 500
            member.relationships[other.name] = score;
          } else if (rel < 0.25 && member.gender !== other.gender) {
            score = 400 + Math.floor(Math.random() * 300); // Attracted: 400 to 700
            member.relationships[other.name] = score;
          } else {
            score = -50 + Math.floor(Math.random() * 150); // Neutral: -50 to 100
            member.relationships[other.name] = score;
          }
        }
      });
    });
    
    // Assign roles
    const roles = ['Party Leader', 'Spiritual Leader', 'Military Leader', 'Chief Medical Officer'];
    const assignedRoles = new Set();
    
    party.forEach(member => {
      if (Math.random() < 0.3 && assignedRoles.size < roles.length) {
        const availableRoles = roles.filter(r => !assignedRoles.has(r));
        if (availableRoles.length > 0) {
          const role = availableRoles[Math.floor(Math.random() * availableRoles.length)];
          member.role = role;
          assignedRoles.add(role);
        }
      }
    });
    
    // Ensure Party Leader exists
    if (!party.some(m => m.role === 'Party Leader')) {
      party[0].role = 'Party Leader';
    }
    partyLeader = party.find(m => m.role === 'Party Leader');
    
    // Apply leader buffs
    applyLeadershipBuffs();
  }

  function updatePartyUI() {
    const partyContainer = document.getElementById('party-container');
    if (!partyContainer) return;
    
    partyContainer.innerHTML = '';
    party.forEach(member => {
      const card = document.createElement('div');
      card.className = 'party-card';
      if (member.hp <= 0) card.classList.add('dead');
      
      const statusEmojis = member.statusEffects.join(' ');
      const roleText = member.role ? `<div class="party-role">${member.role}</div>` : '';
      const jobDisplay = member.adjective ? `${member.adjective} ${member.jobTitle}` : member.jobTitle;
      const moralePercent = Math.round((member.morale / member.maxMorale) * 100);
      const moraleColor = moralePercent >= 70 ? '#7EE7B8' : (moralePercent >= 40 ? '#FFD700' : '#FF9E9E');
      
      card.innerHTML = `
        <div class="party-header">
          <div class="party-emoji">${member.emoji}</div>
          <div class="party-info">
            <div class="party-name">${member.name} ${statusEmojis}</div>
            <div class="party-class">${jobDisplay} Lv${member.level}</div>
            ${roleText}
          </div>
        </div>
        <div class="party-hp-bar">
          <div class="party-hp-fill" style="width: ${Math.max(0, (member.hp / member.maxHp) * 100)}%"></div>
          <span class="party-hp-text">${Math.max(0, member.hp)}/${member.maxHp}</span>
        </div>
        <div class="party-morale-bar">
          <div class="party-morale-fill" style="width: ${moralePercent}%; background: ${moraleColor}"></div>
          <span class="party-morale-text">Morale: ${moralePercent}%</span>
        </div>
        <div class="party-mood">${member.mood}</div>
      `;
      
      partyContainer.appendChild(card);
    });
    
    // Check for deaths and handle them
    party.forEach(member => {
      if (member.hp <= 0 && member.mood !== 'dead') {
        member.mood = 'dead';
        handlePartyDeath(member);
      }
    });
  }

  function damageParty(amount = 10) {
    if (mode !== 'quest') return;
    
    // Damage random party members
    const numAffected = Math.random() < 0.6 ? 1 : (Math.random() < 0.7 ? 2 : party.length);
    const affected = [];
    
    if (numAffected >= party.length) {
      // Area attack - all members
      party.forEach(m => {
        m.hp = Math.max(0, m.hp - amount);
        affected.push(m);
      });
    } else {
      // Random individuals
      const shuffled = [...party].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numAffected && i < shuffled.length; i++) {
        shuffled[i].hp = Math.max(0, shuffled[i].hp - amount);
        affected.push(shuffled[i]);
      }
    }
    
    updatePartyUI();
    
    // Check for wipe
    const allDead = party.every(m => m.hp <= 0);
    if (allDead) {
      showStoryDialog('Your party has fallen... The Dark claims another soul.', '💀', () => {
        // Reset level/battle
        endGame();
      });
    }
  }

  function healParty(amount = 20) {
    party.forEach(m => {
      m.hp = Math.min(m.maxHp, m.hp + amount);
    });
    updatePartyUI();
  }

  function triggerGoodEvent() {
    if (mode !== 'quest' || party.length === 0) return;
    
    const eventChance = Math.random();
    const aliveMemberIndices = party.map((m, i) => m.hp > 0 ? i : -1).filter(i => i >= 0);
    if (aliveMemberIndices.length === 0) return;
    
    if (eventChance < 0.4) {
      // Healing event
      const healerIdx = aliveMemberIndices[Math.floor(Math.random() * aliveMemberIndices.length)];
      const healer = party[healerIdx];
      const healAmount = 15 + Math.floor(Math.random() * 20);
      
      const injured = party.filter((m, i) => i !== healerIdx && m.hp > 0 && m.hp < m.maxHp);
      if (injured.length > 0) {
        const target = injured[Math.floor(Math.random() * injured.length)];
        target.hp = Math.min(target.maxHp, target.hp + healAmount);
        target.statusEffects = target.statusEffects.filter(s => s !== '🩹');
        
        const rel = healer.relationships[target.name] || 'neutral';
        const emoji = rel === 'friends' || rel === 'attracted' ? '💚' : '✨';
        showSpeech(`${healer.name} heals ${target.name} (+${healAmount} HP)`, emoji, {ttlMs: 1400});
        
        if (rel === 'neutral' && Math.random() < 0.3) {
          healer.relationships[target.name] = 'friends';
          target.relationships[healer.name] = 'friends';
        }
      } else if (healer.hp < healer.maxHp) {
        healer.hp = Math.min(healer.maxHp, healer.hp + healAmount);
        showSpeech(`${healer.name} heals themselves (+${healAmount} HP)`, '✨', {ttlMs: 1200});
      }
    } else if (eventChance < 0.6) {
      // Morale boost
      const boosterIdx = aliveMemberIndices[Math.floor(Math.random() * aliveMemberIndices.length)];
      const booster = party[boosterIdx];
      party.forEach(m => {
        if (m.hp > 0) {
          m.morale = Math.min(m.maxMorale, m.morale + 10);
          if (m.traumaLevel > 0) m.traumaLevel = Math.max(0, m.traumaLevel - 1);
        }
      });
      showSpeech(`${booster.name}: "We've got this! Stay focused!"`, '💪', {ttlMs: 1600});
    } else if (eventChance < 0.75) {
      // XP gain
      const gainIdx = aliveMemberIndices[Math.floor(Math.random() * aliveMemberIndices.length)];
      const member = party[gainIdx];
      const xpGain = 20 + Math.floor(Math.random() * 30);
      member.xp += xpGain;
      
      if (member.xp >= member.xpToNext) {
        levelUpMember(member);
      }
    } else {
      // Status clear
      party.forEach(m => {
        if (m.hp > 0 && m.statusEffects.length > 0) {
          m.statusEffects = [];
          m.mood = 'relieved';
        }
      });
      showSpeech('The party feels refreshed!', '🌟', {ttlMs: 1200});
    }
    
    updatePartyUI();
  }

  function triggerBadEvent() {
    if (mode !== 'quest' || party.length === 0) return;
    
    const eventChance = Math.random();
    const aliveMemberIndices = party.map((m, i) => m.hp > 0 ? i : -1).filter(i => i >= 0);
    if (aliveMemberIndices.length === 0) return;
    
    if (eventChance < 0.3) {
      // Injury/status effect
      const victimIdx = aliveMemberIndices[Math.floor(Math.random() * aliveMemberIndices.length)];
      const victim = party[victimIdx];
      const injuries = ['🩹', '🤕', '💔', '😵'];
      const injury = injuries[Math.floor(Math.random() * injuries.length)];
      
      if (!victim.statusEffects.includes(injury)) {
        victim.statusEffects.push(injury);
        victim.mood = 'pained';
        showSpeech(`${victim.name} is injured!`, '⚠️', {ttlMs: 1200});
      }
    } else if (eventChance < 0.5) {
      // Morale damage
      party.forEach(m => {
        if (m.hp > 0) {
          m.morale = Math.max(0, m.morale - 15);
          m.traumaLevel = Math.min(10, m.traumaLevel + 1);
        }
      });
      
      if (Math.random() < 0.3 && party.some(m => m.role === 'Party Leader' && m.hp > 0)) {
        const leader = party.find(m => m.role === 'Party Leader' && m.hp > 0);
        party.forEach(m => m.morale = Math.min(m.maxMorale, m.morale + 20));
        showSpeech(`${leader.name}: "Don't lose hope! We press on!"`, '🛡️', {ttlMs: 1800});
      } else {
        showSpeech('Despair creeps into the party...', '😰', {ttlMs: 1400});
      }
    } else if (eventChance < 0.7) {
      // PTSD/trauma for high trauma members
      const traumatized = party.filter(m => m.hp > 0 && m.traumaLevel >= 5);
      if (traumatized.length > 0) {
        const victim = traumatized[Math.floor(Math.random() * traumatized.length)];
        victim.statusEffects.push('😱');
        victim.mood = 'traumatized';
        victim.morale = Math.max(0, victim.morale - 30);
        showSpeech(`${victim.name} is overwhelmed by trauma...`, '😱', {ttlMs: 1800});
      }
    }
    
    updatePartyUI();
  }

  function levelUpMember(member) {
    member.level++;
    member.xp -= member.xpToNext;
    member.xpToNext = Math.floor(member.xpToNext * 1.5);
    member.maxHp += 20;
    member.hp = member.maxHp;
    member.maxMp += 10;
    member.mp = member.maxMp;
    member.morale = member.maxMorale;
    
    // Job progression
    if (member.level % 5 === 0) {
      promoteJob(member);
    }
    
    // Add skills/spells
    if (member.level % 3 === 0) {
      const newSkills = ['Focus Aura', 'Eagle Eye', 'Clarity', 'Perception Boost', 'Vision Surge'];
      const newSpell = newSkills[Math.floor(Math.random() * newSkills.length)];
      if (!member.skills.includes(newSpell)) {
        member.skills.push(newSpell);
        showSpeech(`${member.name} learned ${newSpell}!`, '📖', {ttlMs: 1600});
      }
    }
    
    showSpeech(`${member.name} reached level ${member.level}!`, '⬆️', {ttlMs: 1600});
    updatePartyUI();
  }

  function promoteJob(member) {
    const promotions = {
      'Warrior': ['Knight', 'Champion', 'Warlord'],
      'Ranger': ['Tracker', 'Pathfinder', 'Sentinel'],
      'Cleric': ['Priest', 'Bishop', 'Saint'],
      'Mage': ['Wizard', 'Archmage', 'Sage'],
      'Paladin': ['Crusader', 'Templar', 'Divine Knight'],
      'Rogue': ['Assassin', 'Shadow', 'Phantom'],
      'Bard': ['Minstrel', 'Virtuoso', 'Maestro'],
      'Monk': ['Abbot', 'Master', 'Enlightened'],
    };
    
    const adjectives = ['Brave', 'Wise', 'Swift', 'Dark', 'Light', 'Noble', 'Cunning', 'Fierce'];
    
    member.rank++;
    const baseClass = Object.keys(promotions).find(k => 
      k === member.class || promotions[k].includes(member.jobTitle)
    ) || member.class;
    
    const rankPath = promotions[baseClass] || [];
    if (member.rank <= rankPath.length) {
      member.jobTitle = rankPath[member.rank - 1];
    }
    
    if (member.level >= 15 && !member.adjective) {
      member.adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
      
      // Adjective affects relationships
      party.forEach(other => {
        if (other.name !== member.name) {
          if (member.adjective === 'Dark' && other.adjective === 'Light') {
            if (Math.random() < 0.5) {
              member.relationships[other.name] = 'dislikes';
              other.relationships[member.name] = 'dislikes';
            } else {
              showSpeech(`${member.name} and ${other.name} find mutual respect in their differences.`, '🤝', {ttlMs: 1800});
            }
          }
        }
      });
    }
    
    const title = member.adjective ? `${member.adjective} ${member.jobTitle}` : member.jobTitle;
    showSpeech(`${member.name} promoted to ${title}!`, '🎖️', {ttlMs: 1800});
  }

  function applyLeadershipBuffs() {
    if (!partyLeader || partyLeader.hp <= 0 || partyLeader.partyStatus !== 'active') return;
    
    // Leader applies passive buffs to entire party
    const leadershipBonus = Math.floor(partyLeader.level * 0.1);
    party.forEach(m => {
      if (m.partyStatus === 'active' && m.hp > 0) {
        m.morale = Math.min(m.maxMorale, m.morale + leadershipBonus);
      }
    });
  }

  function handleLeaderIncapacitation() {
    if (!partyLeader) return;
    
    // Party suffers morale collapse when leader falls
    showStoryDialog(
      `${partyLeader.name} has fallen! The party's resolve wavers...`,
      '⚠️',
      () => {
        party.forEach(m => {
          if (m.partyStatus === 'active' && m.hp > 0) {
            m.morale = Math.max(0, m.morale - 30);
            m.statusEffects.push('💔');
          }
        });
        
        // Designate new leader from most senior member
        const activeSenior = party
          .filter(m => m.partyStatus === 'active' && m.hp > 0 && m.id !== partyLeader.id)
          .sort((a, b) => b.level - a.level);
        
        if (activeSenior.length > 0) {
          const newLeader = activeSenior[0];
          newLeader.role = 'Acting Party Leader';
          partyLeader = newLeader;
          showSpeech(`${newLeader.name} takes command!`, '⚔️', {ttlMs: 2000});
          applyLeadershipBuffs();
        }
        
        updatePartyUI();
      }
    );
  }

  function handleMemberDeath(deadMember, cause = 'combat') {
    deadMember.partyStatus = 'deceased';
    deadMember.deathTimestamp = Date.now();
    deadMember.causeOfDeath = cause;
    deadMember.mood = 'dead';
    
    // Trigger emotional reactions from other party members
    party.forEach(m => {
      if (m.id === deadMember.id || m.hp <= 0) return;
      
      const relationshipScore = m.relationships[deadMember.name] || 0;
      
      // Determine emotional effect based on relationship strength
      let emotionEffect = null;
      let duration = 1; // missions
      let moraleImpact = -15;
      
      if (relationshipScore >= 500) { // Close friend/lover
        emotionEffect = Math.random() < 0.5 ? '😢 Grief' : '😡 Rage';
        duration = 3;
        moraleImpact = -40;
        m.traumaLevel = Math.min(10, m.traumaLevel + 3);
      } else if (relationshipScore >= 300) { // Friend
        emotionEffect = '💔 Sorrow';
        duration = 2;
        moraleImpact = -25;
        m.traumaLevel = Math.min(10, m.traumaLevel + 2);
      } else if (relationshipScore <= -200) { // Enemy/Dislike
        if (Math.random() < 0.3) {
          emotionEffect = '😏 Relieved';
          moraleImpact = 5;
        } else {
          moraleImpact = -5;
        }
      } else { // Neutral/acquaintance
        moraleImpact = -10;
        m.traumaLevel = Math.min(10, m.traumaLevel + 1);
      }
      
      m.morale = Math.max(0, m.morale + moraleImpact);
      
      if (emotionEffect) {
        m.emotionalEffects.push({ effect: emotionEffect, duration, source: deadMember.name });
        m.statusEffects.push(emotionEffect.split(' ')[0]);
        
        // Show reaction dialogue
        const reactions = {
          '😢 Grief': [`${m.name}: "No... ${deadMember.name}..."`, `${m.name} collapses in grief...`],
          '😡 Rage': [`${m.name}: "I'll avenge you, ${deadMember.name}!"`, `${m.name}'s eyes burn with fury!`],
          '💔 Sorrow': [`${m.name}: "Rest well, ${deadMember.name}..."`, `${m.name} fights back tears...`],
          '😏 Relieved': [`${m.name}: "One less problem."`, `${m.name} shows no remorse.`]
        };
        
        if (reactions[emotionEffect]) {
          const msg = reactions[emotionEffect][Math.floor(Math.random() * reactions[emotionEffect].length)];
          showSpeech(msg, m.emoji, {ttlMs: 2200});
        }
      }
    });
    
    // Play death sound
    playDeathSound();
    
    // Move to fallen heroes after delay
    setTimeout(() => {
      // Find strongest positive relationship for R.I.P. message
      const relationships = Object.entries(deadMember.relationships)
        .map(([name, score]) => ({ name, score }))
        .filter(r => r.score > 0)
        .sort((a, b) => b.score - a.score);
      
      const closest = relationships.length > 0 ? relationships[0] : null;
      const survivor = closest ? party.find(m => m.name === closest.name) : null;
      
      if (survivor) {
        deadMember.ripMessage = `${survivor.name}: "${deadMember.name}, your memory lights our path forward."`;
      } else {
        deadMember.ripMessage = `"May their courage never be forgotten."`;
      }
      
      fallenHeroes.push(deadMember);
      
      // Check if this was the party leader
      if (partyLeader && partyLeader.id === deadMember.id) {
        handleLeaderIncapacitation();
      }
    }, 2500);
    
    updatePartyUI();
  }

  function handleBetrayal(betrayer, victim) {
    showStoryDialog(
      `${betrayer.name} strikes ${victim.name} from behind! Blood spills as trust shatters...`,
      '⚔️💔',
      () => {
        // Immediate mechanical damage
        const damage = Math.floor(victim.maxHp * 0.5);
        victim.hp = Math.max(0, victim.hp - damage);
        victim.statusEffects.push('🩹 Shattered');
        
        // Severe injury effect lasting multiple missions
        victim.emotionalEffects.push({ 
          effect: '💔 Betrayed', 
          duration: 999, // Permanent
          source: betrayer.name 
        });
        
        // Relationship destruction
        victim.relationships[betrayer.name] = -999;
        
        // Party-wide morale collapse
        party.forEach(m => {
          if (m.id !== betrayer.id) {
            m.morale = Math.max(0, m.morale - 50);
            m.relationships[betrayer.name] = Math.min(m.relationships[betrayer.name] || 0, -500);
          }
        });
        
        // Mark betrayer
        betrayer.partyStatus = 'betrayer';
        betrayer.role = 'Traitor';
        
        // Remove betrayer from active party
        const idx = party.findIndex(m => m.id === betrayer.id);
        if (idx >= 0) party.splice(idx, 1);
        
        showSpeech(`${betrayer.name} has betrayed the party and fled!`, '💀', {ttlMs: 3000});
        
        // Check if victim died
        if (victim.hp <= 0) {
          handleMemberDeath(victim, 'betrayal');
        }
        
        updatePartyUI();
      }
    );
  }

  function handleMIA(member, reason = 'separated') {
    member.partyStatus = 'mia';
    member.miaTimer = Date.now();
    member.miaReturnTime = Date.now() + (30000 + Math.random() * 60000); // 30-90 seconds
    
    const idx = party.findIndex(m => m.id === member.id);
    if (idx >= 0) {
      party.splice(idx, 1);
      awayParty.push(member);
    }
    
    showStoryDialog(
      `${member.name} is missing! They must be found before it's too late...`,
      '🔍',
      () => {
        party.forEach(m => {
          m.morale = Math.max(0, m.morale - 10);
        });
        updatePartyUI();
      }
    );
    
    // Set up auto-return timer
    setTimeout(() => {
      if (member.partyStatus === 'mia') {
        returnMIAMember(member);
      }
    }, member.miaReturnTime - member.miaTimer);
  }

  function returnMIAMember(member) {
    member.partyStatus = 'active';
    member.miaTimer = null;
    
    // Level up from experiences
    member.level++;
    member.xp = 0;
    member.xpToNext = Math.floor(member.xpToNext * 1.5);
    member.maxHp += 20;
    member.hp = member.maxHp;
    
    // New gear
    const gearUpgrades = ['Veteran Blade', 'Survivor\'s Armor', 'Wanderer\'s Cloak'];
    member.gear.weapon = gearUpgrades[Math.floor(Math.random() * gearUpgrades.length)];
    
    // Remove from away party
    const idx = awayParty.findIndex(m => m.id === member.id);
    if (idx >= 0) awayParty.splice(idx, 1);
    
    // Add back to party if space
    if (party.length < partyMaxSize) {
      party.push(member);
    }
    
    showStoryDialog(
      `${member.name} returns, weathered but wiser! "I've seen things out there..."`,
      member.emoji,
      () => {
        party.forEach(m => {
          m.morale = Math.min(m.maxMorale, m.morale + 20);
        });
        updatePartyUI();
      }
    );
  }

  function handlePartyDeath(deadMember) {
    // Use new comprehensive death handler
    handleMemberDeath(deadMember, 'combat');
    
    // Keep original morale/relationship logic for compatibility
    // Morale impact based on relationships
    party.forEach(m => {
      if (m.name === deadMember.name || m.hp <= 0) return;
      
      const relationshipScore = m.relationships[deadMember.name] || 0;
      if (relationshipScore >= 300) {
        m.morale = Math.max(0, m.morale - 40);
        m.traumaLevel = Math.min(10, m.traumaLevel + 3);
        m.mood = 'grieving';
        m.statusEffects.push('💔');
        showSpeech(`${m.name}: "No... ${deadMember.name}..."`, '😢', {ttlMs: 2000});
      } else if (relationshipScore <= -200) {
        if (Math.random() < 0.3) {
          showSpeech(`${m.name}: "One less problem."`, '😏', {ttlMs: 1400});
          // Cynical but respected
          party.forEach(other => {
            if (other.name !== m.name && other.hp > 0) {
              const currentRel = other.relationships[m.name] || 0;
              if (currentRel >= -50 && currentRel <= 100 && Math.random() < 0.4) {
                other.relationships[m.name] = Math.max(-200, currentRel - 50);
              }
            }
          });
        }
      } else {
        m.morale = Math.max(0, m.morale - 15);
        m.traumaLevel = Math.min(10, m.traumaLevel + 1);
      }
    });
    
    // Leader speech for morale recovery
    setTimeout(() => {
      const leader = party.find(m => m.role === 'Party Leader' && m.hp > 0);
      if (leader && Math.random() < 0.6) {
        party.forEach(m => {
          if (m.hp > 0) {
            m.morale = Math.min(m.maxMorale, m.morale + 30);
            m.traumaLevel = Math.max(0, m.traumaLevel - 1);
          }
        });
        showSpeech(`${leader.name}: "${deadMember.name} wouldn't want us to give up. We fight on!"`, '⚔️', {ttlMs: 2200});
      }
    }, 2500);
    
    // Small chance of revival
    if (Math.random() < 0.05 && score >= 500) {
      setTimeout(() => {
        deadMember.hp = Math.floor(deadMember.maxHp * 0.3);
        deadMember.level++;
        deadMember.adjective = 'Reborn';
        deadMember.statusEffects = ['✨'];
        showSpeech(`${deadMember.name} rises again, transformed!`, '🌟', {ttlMs: 2400});
        updatePartyUI();
      }, 4000);
    } else {
      // Burial/replacement after delay
      setTimeout(() => {
        const avgLevel = party.reduce((sum, m) => sum + m.level, 0) / party.length;
        const replacementLevel = Math.random() < 0.1 ? Math.ceil(avgLevel) : Math.max(1, Math.floor(avgLevel * 0.6));
        const newMember = generatePartyMember(replacementLevel);
        
        // Set relationships with existing party
        party.forEach(m => {
          if (m.name !== deadMember.name) {
            const rel = Math.random();
            if (rel < 0.1) {
              newMember.relationships[m.name] = -200 - Math.floor(Math.random() * 100);
              m.relationships[newMember.name] = -200 - Math.floor(Math.random() * 100);
            } else {
              newMember.relationships[m.name] = -50 + Math.floor(Math.random() * 150);
              m.relationships[newMember.name] = -50 + Math.floor(Math.random() * 150);
            }
          }
        });
        
        const deadIdx = party.findIndex(m => m.name === deadMember.name);
        party[deadIdx] = newMember;
        
        showSpeech(`${newMember.name} joins the party.`, newMember.emoji, {ttlMs: 1800});
        updatePartyUI();
      }, 5000);
    }
  }

  // UI binding
  function bindUI() {
    modeTimeBtn.addEventListener('click', () => startGame('time'));
    modeInfiniteBtn.addEventListener('click', () => startGame('infinite'));
    const modeQuestBtn = document.getElementById('mode-quest');
    if (modeQuestBtn) modeQuestBtn.addEventListener('click', () => startGame('quest'));
    if (modeQuestContinueBtn) modeQuestContinueBtn.addEventListener('click', () => startGame('quest'));

    openSettingsBtn.addEventListener('click', () => {
      startScreen.classList.add('hidden');
      settingsPanel.classList.remove('hidden');
      timeAttackPanel.classList.add('hidden');
      populateSettingsUI();
    });

    if (timeAttackCustomizeBtn && timeAttackPanel) {
      timeAttackCustomizeBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        settingsPanel.classList.add('hidden');
        timeAttackPanel.classList.remove('hidden');
        
        // Populate current settings
        if (taNormalCheck) taNormalCheck.checked = settings.timeAttackSettings.normalPatches;
        if (taFadersCheck) taFadersCheck.checked = settings.timeAttackSettings.faders;
        if (taDriftersCheck) taDriftersCheck.checked = settings.timeAttackSettings.drifters;
        if (taLinesCheck) taLinesCheck.checked = settings.timeAttackSettings.lines;
        if (taShrinkingCheck) taShrinkingCheck.checked = settings.timeAttackSettings.shrinking;
      });
      
      if (taSaveBtn) {
        taSaveBtn.addEventListener('click', () => {
          settings.timeAttackSettings.normalPatches = taNormalCheck ? taNormalCheck.checked : true;
          settings.timeAttackSettings.faders = taFadersCheck ? taFadersCheck.checked : true;
          settings.timeAttackSettings.drifters = taDriftersCheck ? taDriftersCheck.checked : true;
          settings.timeAttackSettings.lines = taLinesCheck ? taLinesCheck.checked : false;
          settings.timeAttackSettings.shrinking = taShrinkingCheck ? taShrinkingCheck.checked : true;
          saveSettingsToStorage();
          timeAttackPanel.classList.add('hidden');
          startScreen.classList.remove('hidden');
        });
      }
      
      if (taCancelBtn) {
        taCancelBtn.addEventListener('click', () => {
          timeAttackPanel.classList.add('hidden');
          startScreen.classList.remove('hidden');
        });
      }
    }

    phoneToggleBtn.addEventListener('click', () => {
      phoneMode = !phoneMode;
      applyArenaDimensions();
    });
    
    // Hide phone toggle on actual mobile devices
    if (isMobileDevice) {
      phoneToggleBtn.style.display = 'none';
    }

    pauseResumeBtn.addEventListener('click', () => {
      if (!running) return;
      paused = !paused;
      pauseResumeBtn.textContent = paused ? 'Resume' : 'Pause';
      
      // Freeze ALL game mechanics when paused
      if (paused) {
        // Pause spawning
        if (spawnTimer) {
          clearInterval(spawnTimer);
          spawnTimer = null;
        }
        // Pause all active target animations
        activeTargets.forEach(target => {
          if (target._raf) {
            cancelAnimationFrame(target._raf);
            target._pausedRaf = target._raf;
            target._raf = null;
          }
        });
        // Pause audio
        if (audioCtx) audioCtx.suspend();
        // Pause line obstacles
        if (lineSpawnTimer) {
          clearInterval(lineSpawnTimer);
        }
        // Pause Edge Creepers
        if (edgeCreepSpawnTimer) {
          clearInterval(edgeCreepSpawnTimer);
        }
        // Pause party events
        if (partyEventTimer) {
          clearTimeout(partyEventTimer);
          partyEventTimer = null;
        }
      } else {
        // Resume spawning
        startSpawning();
        // Resume audio
        if (audioCtx) audioCtx.resume();
        // Resume line obstacles if enabled
        if (settings.lineObstaclesEnabled) {
          startLineObstacles();
        }
        // Resume Edge Creepers if enabled
        if (settings.edgeCreepersEnabled || (mode === 'quest' && score >= 1500)) {
          startEdgeCreepers();
        }
        // Resume party events if Quest mode
        if (mode === 'quest') {
          startPartyEvents();
        }
      }
    });

    backToMenuBtn.addEventListener('click', () => {
      stopSpawning();
      stopTimer();
      clearAllTargets();
      gameShell.classList.add('hidden');
      startScreen.classList.remove('hidden');
      updateHeader();
      questPanel.classList.add('hidden');
      if (settings.musicEnabled) startMusic('menu');
      updateQuestContinueButton();
    });

    settingsInGameBtn.addEventListener('click', () => {
      settingsPanel.classList.remove('hidden');
      populateSettingsUI();
    });

    if (questPanelToggleBtn) {
      questPanelToggleBtn.addEventListener('click', () => {
        const hidden = questPanel.classList.toggle('hidden');
        questPanelToggleBtn.textContent = hidden ? 'Objectives: Off' : 'Objectives: On';
      });
    }

    spawnSecsInput.addEventListener('input', (e) => {
      settings.spawnSecs = Number(e.target.value);
      spawnSecsVal.textContent = Number(settings.spawnSecs).toFixed(2);
      if (running) { stopSpawning(); startSpawning(); }
    });

    patchSizeInput.addEventListener('input', (e) => {
      settings.patchSize = Number(e.target.value);
      patchSizeVal.textContent = settings.patchSize;
    });

    bgColorInput.addEventListener('input', (e) => { settings.bgColor = e.target.value; applyArenaDimensions(); });
    brightnessInput.addEventListener('input', (e) => { settings.brightness = Number(e.target.value); brightnessVal.textContent = Number(settings.brightness).toFixed(2); });
    missPenaltyInput.addEventListener('input', (e) => { settings.missPenalty = Number(e.target.value); });

    musicToggle.addEventListener('change', () => {
      settings.musicEnabled = musicToggle.checked;
      if (!settings.musicEnabled) stopMusic();
      else if (running && !musicState.playing) startMusic(mode);
    });
    musicVol.addEventListener('input', (e) => {
      settings.musicVolume = Number(e.target.value);
      musicVolVal.textContent = Number(e.target.value).toFixed(2);
      if (musicState.gain) musicState.gain.gain.setValueAtTime(settings.musicVolume, audioCtx.currentTime);
    });

    patchTypeSel.addEventListener('change', (e) => { settings.patchType = e.target.value; });
    lambdaInput.addEventListener('input', (e) => { settings.lambda = Number(e.target.value); lambdaVal.textContent = settings.lambda; });
    orientJitterInput.addEventListener('input', (e) => { settings.orientJitter = Number(e.target.value); orientJitterVal.textContent = settings.orientJitter; });
    contrastInput.addEventListener('input', (e) => { settings.contrast = Number(e.target.value); contrastVal.textContent = Number(settings.contrast).toFixed(2); });
    sigmaInput.addEventListener('input', (e) => { settings.sigma = Number(e.target.value); sigmaVal.textContent = settings.sigma; });
    segmentationSel.addEventListener('change', (e) => { settings.segmentation = e.target.value; });

    settingsSaveBtn.addEventListener('click', () => {
      settings.patchType = patchTypeSel.value;
      settings.musicEnabled = musicToggle.checked;
      settings.musicVolume = Number(musicVol.value);
      saveSettingsToStorage();
      settingsPanel.classList.add('hidden');
      if (running) { stopSpawning(); startSpawning(); }
    });
    settingsCancelBtn.addEventListener('click', () => { settingsPanel.classList.add('hidden'); });
    if (questResetBtn) {
      questResetBtn.addEventListener('click', () => {
        clearQuestState();
        questState = generateQuest();
        saveQuestState();
        if (questState && questState.active) {
          updateQuestObjectivesUI();
        }
        showSpeech('Quest reset. New trail ahead!', '🦉');
        updateQuestContinueButton();
      });
    }
    
    // Reset to default settings button
    const settingsResetBtn = document.getElementById('settings-reset');
    if (settingsResetBtn) {
      settingsResetBtn.addEventListener('click', () => {
        if (confirm('Reset all settings to defaults? This cannot be undone.')) {
          Object.assign(settings, defaultSettings);
          saveSettingsToStorage();
          populateSettingsUI();
          applyArenaDimensions();
          showSpeech('Settings reset to defaults.', '🔄');
        }
      });
    }

    endRetryBtn.addEventListener('click', () => { endScreen.classList.add('hidden'); startGame(mode || 'time'); });
    endMenuBtn.addEventListener('click', () => { endScreen.classList.add('hidden'); startScreen.classList.remove('hidden'); gameShell.classList.add('hidden'); if (settings.musicEnabled) startMusic('menu'); });

    document.addEventListener('keydown', (ev) => { if (ev.code === 'Space' && running) { paused = !paused; pauseResumeBtn.textContent = paused ? 'Resume' : 'Pause'; if (audioCtx) paused ? audioCtx.suspend() : audioCtx.resume(); } });
    window.addEventListener('resize', () => applyArenaDimensions());
  }

  // initialize
  populateSettingsUI();
  updateHighScoreDisplays();
  bindUI();
  applyArenaDimensions();
  setInterval(updateHeader, 300);
  updateQuestContinueButton();

  // unlock audio on first gesture
  window.addEventListener('pointerdown', () => {
    if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    // Start menu music once unlocked if at menu
    if (settings.musicEnabled && startScreen && !startScreen.classList.contains('hidden')) {
      startMusic('menu');
    }
  }, { once: true, passive: true });

  // expose API for debug
  window.VisualSpot = { settings, startGame, endGame, saveSettingsToStorage };

  // --- Quest Mode implementation ---
  function ensureQuest(){
    if (questState) return;
    const saved = loadQuestState();
    if (saved) {
      questState = saved;
      questState.active = false;
    } else {
      questState = generateQuest();
      saveQuestState();
    }
  }

  function generateQuest(){
    const villains = [
      { name:'The Fallen King', emoji:'👑' },
      { name:'Shade Weaver', emoji:'🕸️' },
      { name:'The Hollow Duke', emoji:'🕯️' },
      { name:'Night Seraph', emoji:'🦇' },
      { name:'Ash Herald', emoji:'🔥' }
    ];
    const motives = [
      'to glimpse a lost love once more',
      'to bind the skies to their will',
      'to undo a promise made in anguish',
      'to pierce the veil of time',
      'to eclipse every light but their own'
    ];
    const mentor = { name:'Eira the Ocularist', emoji:'🦉' };
    const v = villains[Math.floor(Math.random()*villains.length)];
    const m = motives[Math.floor(Math.random()*motives.length)];
    const story = {
      mentorEmoji: mentor.emoji,
      intro:`${mentor.name}: The EyeSoar stirs. ${v.name} ${m}. Sharpen your sight.`,
      mid:`Footsteps in the mist… ${v.name} seeks the EyeSoar.`,
      clear:`Level cleared! The trail brightens.`,
      finale:`You stand before ${v.name}. The EyeSoar hums with your focus.`
    };
    return { level:1, active:false, story, objectives: makeObjectives(1) };
  }

  function makeObjectives(level){
    // Scale targets with level
    const scoreTarget = 200 + (level-1)*150;
    const earliestTarget = 30 + Math.min(20, (level-1)*5);
    const streakTarget = Math.min(7, 3 + Math.floor((level-1)/1));
    const hitsTarget = 10 + (level-1)*6;
    const list = [
      { id:'score', type:'scoreAtLeast', target:scoreTarget, done:false, text:`Reach score ≥ ${scoreTarget}` },
      { id:'earliest', type:'earliestAtLeast', target:earliestTarget, done:false, text:`Earliest hit ≥ ${earliestTarget}` },
      { id:'streak', type:'streakAtLeast', target:streakTarget, done:false, text:`Streak of ≥20 pts x ${streakTarget}` },
      { id:'hits', type:'hitsAtLeast', target:hitsTarget, done:false, text:`Total hits ≥ ${hitsTarget}` }
    ];
    return list;
  }

  function updateQuestObjectivesUI(){
    if (!questState) return;
    questObjectivesEl.innerHTML = '';
    questState.objectives.forEach(o => {
      const li = document.createElement('li');
      if (o.done) li.classList.add('done');
      li.setAttribute('data-tip', objectiveTooltip(o));
      const chk = document.createElement('div'); chk.className='chk';
      const txt = document.createElement('div'); txt.className='txt'; txt.textContent = o.text;
      li.appendChild(chk); li.appendChild(txt);
      questObjectivesEl.appendChild(li);
    });
  }

  function objectiveTooltip(o){
    switch(o.type){
      case 'scoreAtLeast': return `Reach a total score of at least ${o.target} this run.`;
      case 'earliestAtLeast': return `Achieve a single click worth ≥ ${o.target} points.`;
      case 'streakAtLeast': return `Chain ${o.target} consecutive clicks each worth ≥ 20 points.`;
      case 'hitsAtLeast': return `Land at least ${o.target} total hits.`;
      default: return 'Keep sharpening your focus to progress.';
    }
  }

  function questCheckCompletion(){
    if (!questState || !questState.active) return;
    const allDone = questState.objectives.every(o=>o.done);
    if (allDone) {
      showSpeech(questState.story.clear, '🎖️');
      questState.level++;
      if (questState.level > 5) {
        showSpeech(questState.story.finale, '🏆', { ttlMs: 2400 });
        // stop quest after brief flourish
        setTimeout(()=> { endGame(); clearQuestState(); }, 1600);
      } else {
        questState.objectives = makeObjectives(questState.level);
        updateQuestObjectivesUI();
        saveQuestState();
      }
    }
  }

  function questOnHit(pts){
    if (!questState || !questState.active) return;
    questState.objectives.forEach(o => {
      if (o.done) return;
      if (o.type==='scoreAtLeast' && score >= o.target) o.done = true;
      if (o.type==='earliestAtLeast' && earliestHit >= o.target) o.done = true;
      if (o.type==='streakAtLeast' && streakMaxAchieved >= o.target) o.done = true;
      if (o.type==='hitsAtLeast' && hits >= o.target) o.done = true;
    });
    updateQuestObjectivesUI();
    questCheckCompletion();
    saveQuestState();
  }
  function questOnMiss(){ if (!questState || !questState.active) return; /* currently no regressions */ }

})();