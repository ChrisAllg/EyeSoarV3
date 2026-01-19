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
  const taDriftersCheck = document.getElementById('ta-drifters');
  const taLinesCheck = document.getElementById('ta-lines');
  const taShrinkingCheck = document.getElementById('ta-shrinking');
  const taEdgeCreepersCheck = document.getElementById('ta-edge-stalkers');
  const taRandomCheck = document.getElementById('ta-random');
  const taTimeLimitInput = document.getElementById('ta-time-limit');
  const taTimeLimitVal = document.getElementById('ta-time-limit-val');
  const timeAttackDurationSpan = document.getElementById('time-attack-duration');
  const taSaveBtn = document.getElementById('ta-save');
  const taCancelBtn = document.getElementById('ta-cancel');

  // Infinite Struggle customization panel
  const infiniteCustomizeBtn = document.getElementById('infinite-customize');
  const infinitePanel = document.getElementById('infinite-panel');
  const infAutoEvolveCheck = document.getElementById('inf-auto-evolve');
  const infNormalCheck = document.getElementById('inf-normal');
  const infDriftersCheck = document.getElementById('inf-drifters');
  const infLinesCheck = document.getElementById('inf-lines');
  const infShrinkingCheck = document.getElementById('inf-shrinking');
  const infEdgeCreepersCheck = document.getElementById('inf-edge-stalkers');
  const infSaveBtn = document.getElementById('inf-save');
  const infCancelBtn = document.getElementById('inf-cancel');

  // Side Quests
  const sideQuestsPanel = document.getElementById('side-quests-panel');
  const sqMissionsEl = document.getElementById('sq-missions');
  const sqTimerEl = document.getElementById('sq-timer');

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

  // Tendril hit sound: Deep, resonant creature defeat (Hydra/Kraken/Leviathan)
  function playTendrilHitSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Add variance to prevent repetitiveness
    const variance = 0.9 + Math.random() * 0.2; // 0.9-1.1x pitch variance
    
    // Deep rumbling bass (creature's death roar)
    const bass = audioCtx.createOscillator();
    const bassGain = audioCtx.createGain();
    bass.type = 'sawtooth';
    bass.frequency.setValueAtTime(55 * variance, now); // Deep rumble
    bass.frequency.exponentialRampToValueAtTime(35 * variance, now + 0.5);
    bassGain.gain.setValueAtTime(0.0001, now);
    bassGain.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
    bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    bass.connect(bassGain);
    bassGain.connect(audioCtx.destination);
    bass.start(now);
    bass.stop(now + 0.8);
    
    // Mid-range growl (creature texture)
    const mid = audioCtx.createOscillator();
    const midGain = audioCtx.createGain();
    mid.type = 'square';
    mid.frequency.setValueAtTime(110 * variance, now);
    mid.frequency.exponentialRampToValueAtTime(65 * variance, now + 0.4);
    midGain.gain.setValueAtTime(0.0001, now);
    midGain.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
    midGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);
    mid.connect(midGain);
    midGain.connect(audioCtx.destination);
    mid.start(now + 0.05);
    mid.stop(now + 0.7);
    
    // High splash/impact (defeating blow)
    const splash = audioCtx.createOscillator();
    const splashGain = audioCtx.createGain();
    const splashFilter = audioCtx.createBiquadFilter();
    splash.type = 'sine';
    splash.frequency.setValueAtTime(880 * variance, now);
    splash.frequency.exponentialRampToValueAtTime(440 * variance, now + 0.15);
    splashFilter.type = 'highpass';
    splashFilter.frequency.setValueAtTime(600, now);
    splashGain.gain.setValueAtTime(0.0001, now);
    splashGain.gain.exponentialRampToValueAtTime(0.15, now + 0.01);
    splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    splash.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(audioCtx.destination);
    splash.start(now);
    splash.stop(now + 0.3);
  }

  // Edge Stalker hit sound: Wet, squishy slime defeat
  function playEdgeCreeperHitSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Add variance to prevent repetitiveness
    const variance = 0.85 + Math.random() * 0.3; // 0.85-1.15x pitch variance
    
    // Low squelch (slime body)
    const squelch = audioCtx.createOscillator();
    const squelchGain = audioCtx.createGain();
    squelch.type = 'triangle';
    squelch.frequency.setValueAtTime(140 * variance, now);
    squelch.frequency.exponentialRampToValueAtTime(65 * variance, now + 0.18);
    squelchGain.gain.setValueAtTime(0.0001, now);
    squelchGain.gain.exponentialRampToValueAtTime(0.16, now + 0.01);
    squelchGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
    squelch.connect(squelchGain);
    squelchGain.connect(audioCtx.destination);
    squelch.start(now);
    squelch.stop(now + 0.3);
    
    // Wet pop (slime burst)
    const pop = audioCtx.createOscillator();
    const popGain = audioCtx.createGain();
    pop.type = 'sine';
    pop.frequency.setValueAtTime(320 * variance, now + 0.05);
    pop.frequency.exponentialRampToValueAtTime(180 * variance, now + 0.12);
    popGain.gain.setValueAtTime(0.0001, now + 0.05);
    popGain.gain.exponentialRampToValueAtTime(0.14, now + 0.06);
    popGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    pop.connect(popGain);
    popGain.connect(audioCtx.destination);
    pop.start(now + 0.05);
    pop.stop(now + 0.22);
    
    // Subtle splash (goo splatter)
    const splash = audioCtx.createOscillator();
    const splashGain = audioCtx.createGain();
    const splashFilter = audioCtx.createBiquadFilter();
    splash.type = 'sawtooth';
    splash.frequency.setValueAtTime(580 * variance, now + 0.08);
    splash.frequency.exponentialRampToValueAtTime(220 * variance, now + 0.2);
    splashFilter.type = 'bandpass';
    splashFilter.frequency.setValueAtTime(400, now);
    splashFilter.Q.value = 3;
    splashGain.gain.setValueAtTime(0.0001, now + 0.08);
    splashGain.gain.exponentialRampToValueAtTime(0.10, now + 0.09);
    splashGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.24);
    splash.connect(splashFilter);
    splashFilter.connect(splashGain);
    splashGain.connect(audioCtx.destination);
    splash.start(now + 0.08);
    splash.stop(now + 0.26);
  }

  // Edge Stalker spawn sound: Very subtle, organic slime emergence
  function playEdgeCreeperSpawnSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Add variance for natural variation
    const variance = 0.9 + Math.random() * 0.2; // 0.9-1.1x pitch variance
    
    // Extremely subtle low bubble/gurgle (slime emerging)
    const bubble = audioCtx.createOscillator();
    const bubbleGain = audioCtx.createGain();
    const bubbleFilter = audioCtx.createBiquadFilter();
    bubble.type = 'sine';
    bubble.frequency.setValueAtTime(80 * variance, now);
    bubble.frequency.exponentialRampToValueAtTime(120 * variance, now + 0.15);
    bubbleFilter.type = 'lowpass';
    bubbleFilter.frequency.setValueAtTime(300, now);
    bubbleFilter.Q.value = 2;
    bubbleGain.gain.setValueAtTime(0.0001, now);
    bubbleGain.gain.exponentialRampToValueAtTime(0.05, now + 0.05); // Very quiet
    bubbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);
    bubble.connect(bubbleFilter);
    bubbleFilter.connect(bubbleGain);
    bubbleGain.connect(audioCtx.destination);
    bubble.start(now);
    bubble.stop(now + 0.35);
    
    // Subtle wet texture (slime surface tension)
    const texture = audioCtx.createOscillator();
    const textureGain = audioCtx.createGain();
    const textureFilter = audioCtx.createBiquadFilter();
    texture.type = 'triangle';
    texture.frequency.setValueAtTime(200 * variance, now + 0.08);
    texture.frequency.exponentialRampToValueAtTime(150 * variance, now + 0.25);
    textureFilter.type = 'bandpass';
    textureFilter.frequency.setValueAtTime(250, now);
    textureFilter.Q.value = 4;
    textureGain.gain.setValueAtTime(0.0001, now + 0.08);
    textureGain.gain.exponentialRampToValueAtTime(0.04, now + 0.12); // Very subtle
    textureGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
    texture.connect(textureFilter);
    textureFilter.connect(textureGain);
    textureGain.connect(audioCtx.destination);
    texture.start(now + 0.08);
    texture.stop(now + 0.3);
  }

  function playTendrilSpawnSound() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    
    // Add variance for natural variation
    const variance = 0.9 + Math.random() * 0.2; // 0.9-1.1x pitch variance
    
    // Subtle whisper/wisp sound (tendril growing from darkness)
    const whisper = audioCtx.createOscillator();
    const whisperGain = audioCtx.createGain();
    const whisperFilter = audioCtx.createBiquadFilter();
    whisper.type = 'sine';
    whisper.frequency.setValueAtTime(120 * variance, now);
    whisper.frequency.exponentialRampToValueAtTime(180 * variance, now + 0.2);
    whisper.frequency.exponentialRampToValueAtTime(100 * variance, now + 0.4);
    whisperFilter.type = 'highpass';
    whisperFilter.frequency.setValueAtTime(150, now);
    whisperFilter.Q.value = 1;
    whisperGain.gain.setValueAtTime(0.0001, now);
    whisperGain.gain.exponentialRampToValueAtTime(0.03, now + 0.1); // Very quiet
    whisperGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
    whisper.connect(whisperFilter);
    whisperFilter.connect(whisperGain);
    whisperGain.connect(audioCtx.destination);
    whisper.start(now);
    whisper.stop(now + 0.5);
    
    // Subtle rustling (tendril moving through space)
    const rustle = audioCtx.createOscillator();
    const rustleGain = audioCtx.createGain();
    const rustleFilter = audioCtx.createBiquadFilter();
    rustle.type = 'sawtooth';
    rustle.frequency.setValueAtTime(60 * variance, now + 0.1);
    rustle.frequency.exponentialRampToValueAtTime(90 * variance, now + 0.35);
    rustleFilter.type = 'lowpass';
    rustleFilter.frequency.setValueAtTime(200, now);
    rustleFilter.Q.value = 3;
    rustleGain.gain.setValueAtTime(0.0001, now + 0.1);
    rustleGain.gain.exponentialRampToValueAtTime(0.02, now + 0.15); // Very subtle
    rustleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);
    rustle.connect(rustleFilter);
    rustleFilter.connect(rustleGain);
    rustleGain.connect(audioCtx.destination);
    rustle.start(now + 0.1);
    rustle.stop(now + 0.45);
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

  // Phone mode is now DEFAULT (easier for most users), can toggle to fullscreen
  let phoneMode = true;
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);

  // Line obstacles state
  let lineObstacles = [];
  let lineSpawnTimer = null;
  
  // Edge Stalker state
  let edgeStalkers = [];
  let edgeCreepSpawnTimer = null;
  
  // DEBUG MODE (toggle to make ALL enemies visible during development)
  let DEBUG_MODE = false; // Toggle with button in main menu
  
  // Parallel party event system
  let partyEventTimer = null;
  let consecutiveMisses = 0;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SIDE QUESTS SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════════
  const SIDE_QUEST_DURATION = 30000; // 30 seconds to complete all quests
  let sideQuestsActive = [];
  let sideQuestTimer = null;
  let sideQuestTimeRemaining = 0;
  let sideQuestStartTime = 0;
  let rapidHitsWindow = []; // Track recent hits for rapid-fire quests
  
  // Side quest definitions (20 distinct missions)
  const SIDE_QUEST_POOL = [
    {id: 'rapid-5', icon: '⚡', text: 'Get 5 hits within 3 seconds', check: () => rapidHitsWindow.length >= 5},
    {id: 'rapid-7', icon: '⚡⚡', text: 'Get 7 hits within 3 seconds', check: () => rapidHitsWindow.length >= 7},
    {id: 'high-value-30', icon: '💎', text: 'Get a hit worth 30+ points', check: () => false, onHit: (pts) => pts >= 30},
    {id: 'high-value-40', icon: '💎💎', text: 'Get a hit worth 40+ points', check: () => false, onHit: (pts) => pts >= 40},
    {id: 'no-miss-15s', icon: '🛡️', text: 'No misses for 15 seconds', check: () => false, duration: 15000},
    {id: 'no-miss-20s', icon: '🛡️🛡️', text: 'No misses for 20 seconds', check: () => false, duration: 20000},
    {id: 'score-streak', icon: '🎯', text: 'Gain 150 score in 5 seconds', check: () => false, scoreGoal: 150, window: 5000},
    {id: 'score-streak-big', icon: '🎯🎯', text: 'Gain 250 score in 8 seconds', check: () => false, scoreGoal: 250, window: 8000},
    {id: 'early-3', icon: '👁️', text: 'Get 3 "earliest" hits in a row', check: () => false, needEarliestStreak: 3},
    {id: 'early-5', icon: '👁️👁️', text: 'Get 5 "earliest" hits in a row', check: () => false, needEarliestStreak: 5},
    {id: 'tendril-2', icon: '⚡', text: 'Defeat 2 Tendrils', check: () => false, needTendrilKills: 2},
    {id: 'tendril-3', icon: '⚡⚡', text: 'Defeat 3 Tendrils', check: () => false, needTendrilKills: 3},
    {id: 'edge-creep-2', icon: '🐛', text: 'Defeat 2 Edge Stalkers', check: () => false, needEdgeCreepKills: 2},
    {id: 'edge-creep-3', icon: '🐛🐛', text: 'Defeat 3 Edge Stalkers', check: () => false, needEdgeCreepKills: 3},
    {id: 'drifter-5', icon: '💨', text: 'Defeat 5 Drifters', check: () => false, needDrifterKills: 5},
    {id: 'perfect-10', icon: '⭐', text: 'Get 10 hits without missing', check: () => false, needHitStreak: 10},
    {id: 'perfect-15', icon: '⭐⭐', text: 'Get 15 hits without missing', check: () => false, needHitStreak: 15},
    {id: 'combo-20', icon: '🔥', text: 'Reach a 20-hit combo', check: () => consecutiveHits >= 20},
    {id: 'combo-30', icon: '🔥🔥', text: 'Reach a 30-hit combo', check: () => consecutiveHits >= 30},
  ];
  
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
    lineObstaclesEnabled: false,
    linePenalty: 100,
    lineSpawnIntervalSecs: 8,
    edgeStalkersEnabled: false,
    edgeCreepPenalty: 200,
    edgeCreepDamage: 50,
    pointRange: '50-0', // 50-0, 60-10, 70-20, 80-30, 90-40, 100-50
    missStreakPenalty: 10, // Additional penalty per consecutive miss
    sessionStats: { totalScore: 0, totalHits: 0, totalMisses: 0, bestAvg: 0 },
    timeAttackSettings: {
      normalPatches: true,
      drifters: true,
      lines: false,
      shrinking: true,
      edgeStalkers: false,
      random: false, // Random enemy selection
      timeLimit: 1, // Time limit in minutes (1-10)
    },
    infiniteSettings: {
      normalPatches: false,
      drifters: false,
      shrinking: false,
      lines: false,
      edgeStalkers: false,
      autoEvolve: false, // DEFAULT: Manual selection (Progressive is opt-in)
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
    
    // Populate Time Attack settings
    if (taNormalCheck) taNormalCheck.checked = settings.timeAttackSettings.normalPatches !== false;
    if (taDriftersCheck) taDriftersCheck.checked = settings.timeAttackSettings.drifters !== false;
    if (taLinesCheck) taLinesCheck.checked = settings.timeAttackSettings.lines === true;
    if (taShrinkingCheck) taShrinkingCheck.checked = settings.timeAttackSettings.shrinking !== false;
    if (taEdgeCreepersCheck) taEdgeCreepersCheck.checked = settings.timeAttackSettings.edgeStalkers === true;
    if (taRandomCheck) taRandomCheck.checked = settings.timeAttackSettings.random === true;
    if (taTimeLimitInput) taTimeLimitInput.value = settings.timeAttackSettings.timeLimit || 1;
    if (taTimeLimitVal) taTimeLimitVal.textContent = settings.timeAttackSettings.timeLimit || 1;
    
    // Populate Infinite Struggle settings
    if (infAutoEvolveCheck) infAutoEvolveCheck.checked = settings.infiniteSettings.autoEvolve === true;
    if (infNormalCheck) infNormalCheck.checked = settings.infiniteSettings.normalPatches === true;
    if (infDriftersCheck) infDriftersCheck.checked = settings.infiniteSettings.drifters === true;
    if (infLinesCheck) infLinesCheck.checked = settings.infiniteSettings.lines === true;
    if (infShrinkingCheck) infShrinkingCheck.checked = settings.infiniteSettings.shrinking === true;
    if (infEdgeCreepersCheck) infEdgeCreepersCheck.checked = settings.infiniteSettings.edgeStalkers === true;
  }

  function applyArenaDimensions() {
    if (phoneMode) {
      // Phone mode: constrained dimensions
      const w = Math.min(window.innerWidth - 40, 390);
      const h = Math.max(420, Math.min(window.innerHeight - 140, 844 - 120));
      gameShell.style.width = `${w}px`;
      gameShell.style.height = `${h + 64}px`;
      gameArea.style.width = `${w}px`;
      gameArea.style.height = `${h}px`;
      phoneToggleBtn.textContent = 'Fullscreen: Off';
    } else {
      // Fullscreen mode: fill entire viewport
      gameShell.style.width = '100%';
      gameShell.style.height = '100vh';
      gameArea.style.width = '100%';
      gameArea.style.height = '';
      phoneToggleBtn.textContent = 'Fullscreen: On';
    }
    gameArea.style.background = settings.bgColor;
    // CRITICAL: Inset game area by 5px on all sides to create Edge Stalker gutter
    gameArea.style.padding = '5px';
    gameArea.style.boxSizing = 'border-box';
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

    // NOTE: Progressive unlock logic moved to checkProgressiveUnlocks() called from spawning loop
    // to prevent duplicate spawn timer creation

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

  // ENEMY TYPE DEFINITIONS (deterministic, separated from UI)
  const EnemyTypes = {
    NORMAL: 'normal',        // Standard fade-in Gabor patches
    DRIFTER: 'drifter',      // Moving targets
    SHRINKER: 'shrinker',    // Size changes over time
    TENDRIL: 'tendril',      // Line obstacles (handled separately)
    EDGE_STALKER: 'edge_stalker' // Edge-crawling threats
  };

  // Get active enemy pool based on current mode and settings
  function getActiveEnemyPool() {
    const pool = [];
    
    if (mode === 'time') {
      // Time Attack: Check if Random mode is enabled
      if (settings.timeAttackSettings.random) {
        // Random mode: All enemy types available
        pool.push(EnemyTypes.NORMAL);
        pool.push(EnemyTypes.DRIFTER);
        pool.push(EnemyTypes.SHRINKER);
        
        if (DEBUG_MODE) {
          console.log('[ENEMY AUDIT] Time Attack RANDOM mode pool:', pool.map(t => t.toUpperCase()));
        }
      } else {
        // Manual selection: ALL user-selected enemies available immediately (NO score requirements)
        // Normal Gabor Patches always included as baseline
        if (settings.timeAttackSettings.normalPatches || true) pool.push(EnemyTypes.NORMAL);
        if (settings.timeAttackSettings.drifters) pool.push(EnemyTypes.DRIFTER);
        if (settings.timeAttackSettings.shrinking) pool.push(EnemyTypes.SHRINKER);
        // Tendrils and Edge Stalkers spawn separately via their own systems
        
        if (DEBUG_MODE) {
          console.log('[ENEMY AUDIT] Time Attack pool (ALL IMMEDIATE):', pool.map(t => t.toUpperCase()));
        }
      }
    } else if (mode === 'infinite') {
      if (settings.infiniteSettings.autoEvolve) {
        // Progressive evolution based on score (ONLY when Progressive is checked)
        pool.push(EnemyTypes.NORMAL);
        if (score >= 500) pool.push(EnemyTypes.DRIFTER);
        if (score >= 1200) pool.push(EnemyTypes.SHRINKER);
        
        if (DEBUG_MODE) {
          console.log('[ENEMY AUDIT] Infinite Progressive pool:', pool.map(t => t.toUpperCase()), `(score: ${score})`);
        }
      } else {
        // Manual selection: ALL selected enemies available immediately (NO score requirements)
        pool.push(EnemyTypes.NORMAL); // Always include Gabor
        if (settings.infiniteSettings.drifters) pool.push(EnemyTypes.DRIFTER);
        if (settings.infiniteSettings.shrinking) pool.push(EnemyTypes.SHRINKER);
        
        if (DEBUG_MODE) {
          console.log('[ENEMY AUDIT] Infinite Manual pool (ALL IMMEDIATE):', pool.map(t => t.toUpperCase()));
        }
      }
    } else if (mode === 'quest') {
      // Quest mode: NO score-based unlocking, controlled by mission/level progression
      // For now, all types available (missions will control what appears)
      pool.push(EnemyTypes.NORMAL);
      pool.push(EnemyTypes.DRIFTER);
      pool.push(EnemyTypes.SHRINKER);
      
      if (DEBUG_MODE) {
        console.log('[ENEMY AUDIT] Quest pool (mission-controlled):', pool.map(t => t.toUpperCase()));
      }
    }
    
    // Pool will always have at least NORMAL (Gabor Patches)
    return pool;
  }

  // Randomly select enemy type from active pool
  function selectEnemyType() {
    const pool = getActiveEnemyPool();
    
    // Pool always has at least NORMAL (Gabor Patches), so this should never happen
    // But keep a safety check just in case
    if (pool.length === 0) {
      console.warn('[SAFETY CHECK] Empty pool detected, defaulting to NORMAL');
      return EnemyTypes.NORMAL;
    }
    
    const selectedType = pool[Math.floor(Math.random() * pool.length)];
    
    if (DEBUG_MODE) {
      console.log(`[ENEMY AUDIT] ✓ Spawning: ${selectedType.toUpperCase()} (from pool of ${pool.length} types)`);
    }
    
    return selectedType;
  }

  // Create target with size variance (smaller than base only) and enemy type selection
  function createTargetInstance() {
    // Determine enemy type FIRST (deterministic selection)
    const enemyType = selectEnemyType();
    
    // base size
    const baseSize = Math.max(28, Math.min(220, Number(settings.patchSize)));
    // size multiplier based on enemy type
    let sizeMul;
    if (enemyType === EnemyTypes.SHRINKER) {
      // Shrinkers have MORE size variance
      sizeMul = 0.4 + Math.random() * 0.6; // 40% to 100%
    } else {
      // Others have normal variance
      sizeMul = 0.6 + Math.random() * 0.4; // 60% to 100%
    }
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
    
    // Determine fade behavior based on enemy type (NOT score-based)
    const isDrifter = (enemyType === EnemyTypes.DRIFTER);
    const isShrinker = (enemyType === EnemyTypes.SHRINKER);

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
    
    // DEBUG MODE: Make target highly visible
    if (DEBUG_MODE) {
      el.style.background = 'red';
      el.style.opacity = '1';
      el.style.boxShadow = '0 0 10px yellow, 0 0 20px red, inset 0 0 20px yellow';
      el.style.border = '3px solid yellow';
      el.style.zIndex = '10000';
      // Clear Gabor canvas if present
      if (type === 'gabor') {
        const canvas = el.querySelector('canvas');
        if (canvas) canvas.style.display = 'none';
      }
    }

    // All patches fade in over time (no more fader type)
    let fadeDurMs;
    // Normal: standard fade with random between fadeMin..fadeMax, with a chance for extra-slow ones
    let fadeSecs = settings.fadeMinSecs + Math.random() * (settings.fadeMaxSecs - settings.fadeMinSecs);
    if (Math.random() < 0.12) fadeSecs = settings.fadeMaxSecs + Math.random() * (settings.fadeMaxSecs * 0.8);
    fadeDurMs = Math.max(10, Math.round(fadeSecs * 1000));
    
    const start = performance.now();
    let removed = false;

    // Drift logic: based on enemy type, NOT score
    let willDrift = isDrifter;
    let driftVel = { x: 0, y: 0 };
    
    if (willDrift) {
      const angle = Math.random() * Math.PI * 2;
      // speed variance scaled by difficulty
      const baseSpeed = settings.driftSpeedPxPerSec || 6;
      const speed = (baseSpeed * 0.5) + Math.random() * (baseSpeed * 1.6);
      driftVel.x = Math.cos(angle) * speed;
      driftVel.y = Math.sin(angle) * speed;
    }
    
    // Shrinker size animation parameters
    let shrinkPhase = 0; // For animating size changes
    const shrinkFrequency = 0.5 + Math.random() * 1.5; // Pulses per second

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
      
      // Track rapid hits for side quests (3-second window)
      const hitTime = Date.now();
      rapidHitsWindow.push(hitTime);
      rapidHitsWindow = rapidHitsWindow.filter(t => hitTime - t < 3000);
      
      // Side quest tracking
      let earliestStreak = 0;
      let hitStreak = hits - misses; // Simple hit streak (no misses)
      checkSideQuests({
        hit: true,
        points: pts,
        hitStreak,
        earliestStreak: pts >= 40 ? consecutiveHits : 0, // Track "earliest" hits
        drifterKill: instance.type === EnemyTypes.DRIFTER
      });
      
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
      
      // Stop animation loop FIRST
      if (instance._raf) cancelAnimationFrame(instance._raf);
      
      // Remove immediately (no death animation)
      el.remove();
      
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
      
      // Standard fade-in for all patches
      const visual = Math.pow(progress, 0.9);
      el.style.opacity = String(Math.max(0.02, visual));
      
      // Scale and rotation based on enemy type
      let scale, tilt;
      if (isShrinker) {
        // Shrinker: pulsing size animation
        shrinkPhase += (now - (instance._lastTime || now)) / 1000;
        const pulseMagnitude = 0.15; // 15% size variation
        const pulse = Math.sin(shrinkPhase * Math.PI * 2 * shrinkFrequency) * pulseMagnitude;
        scale = 1 + pulse - progress * 0.06;
        tilt = Math.sin(shrinkPhase * Math.PI) * 1.2; // More dramatic tilt
      } else {
        // Normal scaling
        scale = 1 - progress * 0.06;
        tilt = Math.sin(progress * Math.PI * 2) * 0.6;
      }
      
      el.style.transform = `scale(${scale}) rotate(${tilt}deg)`;

      // Drift movement (only if isDrifter)
      if (isDrifter && willDrift) {
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
      type: enemyType, // CRITICAL: Track enemy type for side quest and scoring
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

  // Progressive unlock tracking - prevents duplicate triggers
  let unlocksTriggered = {
    drift500: false,
    shrinker1200: false,
    edgeStalkers1500: false,
    tendrils2000: false
  };
  
  function resetProgressiveUnlocks() {
    unlocksTriggered = {
      drift500: false,
      shrinker1200: false,
      edgeStalkers1500: false,
      tendrils2000: false
    };
  }
  
  function checkProgressiveUnlocks() {
    // Only check if game is actually running and not paused
    if (!running || paused) return;
    
    // Only perform unlocks in Infinite mode with Progressive (auto-evolve) enabled
    if (mode !== 'infinite' || !settings.infiniteSettings.autoEvolve) return;
    
    // Drift at 500 points
    if (score >= 500 && !unlocksTriggered.drift500 && !driftEnabled) {
      unlocksTriggered.drift500 = true;
      driftEnabled = true;
      const rect = gameArea.getBoundingClientRect();
      showIndicator('Drift Enabled', rect.width/2, 40, true);
      showSpeech('Movement patterns shift... Drifter Patches emerge!', '🌀', {ttlMs: 2400});
      driftCue();
    }
    
    // Shrinker Patches at 1200 points
    if (score >= 1200 && !unlocksTriggered.shrinker1200) {
      unlocksTriggered.shrinker1200 = true;
      showSpeech('Size fluctuations detected... Shrinking Patches appear!', '🔄', {ttlMs: 2400});
    }
    
    // Edge Stalkers at 1500 points
    if (score >= 1500 && !unlocksTriggered.edgeStalkers1500 && !edgeCreepSpawnTimer) {
      unlocksTriggered.edgeStalkers1500 = true;
      startEdgeCreepers();
      showSpeech('Edge stalkers approach from the periphery...', '🐛', {ttlMs: 2400});
    }
    
    // Tendrils at 2000 points
    if (score >= 2000 && !unlocksTriggered.tendrils2000 && !lineSpawnTimer) {
      unlocksTriggered.tendrils2000 = true;
      startLineObstacles();
      showSpeech('Beware... The Dark sends forth its tendrils.', '⚡', {ttlMs: 2400});
    }
  }

  // spawn control
  function startSpawning() {
    stopSpawning();
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VALIDATION: Gabor Patches (NORMAL) are always available, so pool is never truly empty
    // This check is now informational only
    // ═══════════════════════════════════════════════════════════════════════════════
    const enemyPool = getActiveEnemyPool();
    const hasTendrils = shouldSpawnTendrils();
    const hasEdgeCreepers = shouldSpawnEdgeCreepers();
    const totalEnemyTypes = enemyPool.length + (hasTendrils ? 1 : 0) + (hasEdgeCreepers ? 1 : 0);
    
    // Log enemy configuration for debugging
    if (DEBUG_MODE || totalEnemyTypes === 1) {
      console.log('[SESSION START] Enemy configuration:');
      console.log('  - Main pool:', enemyPool.map(e => e.toUpperCase()));
      console.log('  - Tendrils:', hasTendrils ? 'YES' : 'NO');
      console.log('  - Edge Stalkers:', hasEdgeCreepers ? 'YES' : 'NO');
      console.log('  - Total types:', totalEnemyTypes);
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    
    running = true;
    paused = false;
    sessionStartTime = performance.now();
    driftEnabled = (score >= 500); // global toggle; per-target still uses dynamic fraction
    consecutiveMisses = 0; // Reset miss streak

    // Resume audio context if suspended (ensures sounds work)
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(err => console.warn('Could not resume audio:', err));
    }

    // start music for current mode if enabled
    if (settings.musicEnabled) {
      startMusic(mode);
      if (musicState.gain) musicState.gain.gain.setValueAtTime(Number(musicVol.value || 0.45), audioCtx ? audioCtx.currentTime : 0);
    }

    const freqMs = Math.max(50, Math.round(Number(settings.spawnSecs) * 1000));
    spawnTimer = setInterval(() => {
      if (paused || !running) return; // Don't spawn if paused
      if (activeTargets.size >= settings.maxConcurrent) return;
      
      // Check for progressive unlocks (only triggers once per threshold)
      checkProgressiveUnlocks();
      
      createTargetInstance();
    }, freqMs);
    
    // Start Tendrils if enabled for this mode
    if (shouldSpawnTendrils()) {
      startLineObstacles();
    }
    
    // Start Edge Stalkers if enabled for this mode
    console.log('[EDGE STALKER DEBUG] Game start - checking if Edge Stalkers should spawn...');
    if (shouldSpawnEdgeCreepers()) {
      console.log('[EDGE STALKER DEBUG] ✓ Edge Stalkers ENABLED - starting spawn timer...');
      startEdgeCreepers();
    } else {
      console.log('[EDGE STALKER DEBUG] ✗ Edge Stalkers DISABLED - skipping spawn timer');
    }
    
    // Start parallel party events for Quest mode
    if (mode === 'quest') {
      startPartyEvents();
    }
    
    // Start Side Quests (appears in all game modes)
    if (sideQuestsPanel) {
      sideQuestsPanel.style.display = 'block';
      startSideQuests();
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // VISUAL VERIFICATION MODE - Shows active enemy types on screen
    // ═══════════════════════════════════════════════════════════════════════════════
    if (DEBUG_MODE) {
      // Remove existing overlay if present
      const existingOverlay = document.getElementById('enemy-audit-overlay');
      if (existingOverlay) existingOverlay.remove();
      
      const overlay = document.createElement('div');
      overlay.id = 'enemy-audit-overlay';
      overlay.style.position = 'fixed';
      overlay.style.top = '10px';
      overlay.style.right = '10px';
      overlay.style.background = 'rgba(0,0,0,0.8)';
      overlay.style.color = '#00ff00';
      overlay.style.padding = '10px';
      overlay.style.fontFamily = 'monospace';
      overlay.style.fontSize = '12px';
      overlay.style.zIndex = '999999';
      overlay.style.border = '2px solid #00ff00';
      overlay.style.borderRadius = '4px';
      overlay.style.pointerEvents = 'none';
      
      const updateOverlay = () => {
        if (!running) return;
        const currentPool = getActiveEnemyPool();
        overlay.innerHTML = 
          '<strong>🔍 ENEMY AUDIT MODE</strong><br>' +
          '<strong>Mode:</strong> ' + mode.toUpperCase() + '<br>' +
          '<strong>Score:</strong> ' + score + '<br>' +
          '<strong>Main Pool:</strong><br>' +
          (currentPool.length > 0 ? currentPool.map(t => '  • ' + t.toUpperCase()).join('<br>') : '  (empty)') + '<br>' +
          '<strong>Tendrils:</strong> ' + (shouldSpawnTendrils() ? '✓ YES' : '✗ NO') + '<br>' +
          '<strong>Edge Stalkers:</strong> ' + (shouldSpawnEdgeCreepers() ? '✓ YES' : '✗ NO');
        
        if (running) requestAnimationFrame(updateOverlay);
      };
      
      document.body.appendChild(overlay);
      updateOverlay();
    }
    // ═══════════════════════════════════════════════════════════════════════════════
    
    pauseResumeBtn.textContent = '⏸';
    pauseResumeBtn.title = 'Pause';
  }

  function stopSpawning() {
    running = false;
    if (spawnTimer) { clearInterval(spawnTimer); spawnTimer = null; }
    pauseResumeBtn.textContent = '▶️';
    pauseResumeBtn.title = 'Resume';
    stopMusic();
    stopLineObstacles(); // Stop and remove all Tendrils
    stopEdgeCreepers();
    stopPartyEvents();
    stopSideQuests(); // Stop side quests
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
    // Ignore clicks on targets, edge creepers, and SVG elements (Tendrils)
    if (target.closest && target.closest('.target')) return;
    if (target.classList && target.classList.contains('edge-stalker')) return;
    if (target.tagName === 'svg' || target.tagName === 'path') return; // Tendrils
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
    
    // Side quest tracking for miss
    checkSideQuests({miss: true});
    
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
    
    if (selectedMode === 'time') {
      title.textContent = 'Time Attack Mission Brief';
    } else if (selectedMode === 'infinite') {
      title.textContent = 'Infinite Struggle Deployment';
    } else if (selectedMode === 'quest' && questState) {
      title.textContent = `Quest Level ${questState.level} - Mission Brief`;
    } else {
      title.textContent = 'Mission Briefing';
    }
    
    // Objectives
    const objectives = document.createElement('div');
    objectives.className = 'mission-objectives';
    objectives.innerHTML = '<div class="section-title">Primary Objectives:</div>';
    
    if (selectedMode === 'time') {
      objectives.innerHTML += '<ul><li>Score maximum points in 60 seconds</li><li>Hit targets early for maximum points</li><li>Avoid clicking empty space</li><li>Maintain focus and reaction speed</li></ul>';
    } else if (selectedMode === 'quest' && questState) {
      objectives.innerHTML += '<ul>';
      questState.objectives.forEach(obj => {
        objectives.innerHTML += `<li>${obj.text}</li>`;
      });
      objectives.innerHTML += '</ul>';
    } else {
      objectives.innerHTML += '<ul><li>Survive as long as possible</li><li>Maximize average points per hit</li><li>Watch for evolving challenges</li><li>Detect anomalies early</li></ul>';
    }
    
    // Expected enemies/threats
    const enemies = document.createElement('div');
    enemies.className = 'mission-enemies';
    enemies.innerHTML = '<div class="section-title">Threat Assessment:</div>';
    
    const enemyPool = getActiveEnemyPool();
    const threatList = [];
    
    enemyPool.forEach(type => {
      switch(type) {
        case EnemyTypes.NORMAL:
          threatList.push('Standard Gabor Patches (fade-in)');
          break;
        case EnemyTypes.DRIFTER:
          threatList.push('Drifter Patches (moving targets)');
          break;
        case EnemyTypes.SHRINKER:
          threatList.push('Shrinker Patches (size variance)');
          break;
      }
    });
    
    if (shouldSpawnTendrils()) {
      threatList.push('Dark Tendrils (line obstacles)');
    }
    if (shouldSpawnEdgeCreepers()) {
      threatList.push('Edge Stalkers (peripheral stalkers)');
    }
    
    if (threatList.length === 0) {
      enemies.innerHTML += '<div class="enemy-types">No active threats configured</div>';
    } else {
      enemies.innerHTML += `<div class="enemy-types">${threatList.join(' • ')}</div>`;
    }
    
    // Party status (for Quest mode)
    const status = document.createElement('div');
    status.className = 'party-status-check';
    
    if (selectedMode === 'quest' && party && party.length > 0) {
      status.innerHTML = '<div class="section-title">Party Combat Readiness:</div>';
      
      party.forEach(m => {
        const hpPercent = Math.round((m.hp / m.maxHp) * 100);
        const moralePercent = Math.round((m.morale / m.maxMorale) * 100);
        const statusClass = hpPercent < 30 ? 'critical' : (hpPercent < 60 ? 'warning' : 'healthy');
        const statusEmojis = m.statusEffects.join(' ');
        
        status.innerHTML += `
          <div class="member-status ${statusClass}">
            <span class="member-icon">${m.emoji}</span>
            <div class="member-details">
              <div class="member-name">${m.name} ${statusEmojis}</div>
              <div class="member-bars">
                <div class="mini-bar">
                  <span class="bar-label">HP:</span>
                  <div class="bar-fill-container">
                    <div class="bar-fill hp" style="width: ${hpPercent}%"></div>
                  </div>
                  <span class="bar-value">${hpPercent}%</span>
                </div>
                <div class="mini-bar">
                  <span class="bar-label">Morale:</span>
                  <div class="bar-fill-container">
                    <div class="bar-fill morale" style="width: ${moralePercent}%"></div>
                  </div>
                  <span class="bar-value">${moralePercent}%</span>
                </div>
              </div>
            </div>
          </div>
        `;
      });
    } else {
      status.innerHTML = '<div class="section-title">Solo Operation</div><div class="solo-note">You operate alone as the Seer. Your vision is their shield.</div>';
    }
    
    // Pre-mission dialogue
    const dialogue = document.createElement('div');
    dialogue.className = 'mission-dialogue';
    
    if (party && party.length >= 2 && selectedMode === 'quest') {
      const speaker = party[Math.floor(Math.random() * party.length)];
      const quotes = [
        `${speaker.name}: "Stay focused. Watch for the subtlest movements."`,
        `${speaker.name}: "Trust your instincts. The pattern will reveal itself."`,
        `${speaker.name}: "Remember your training. Early detection is everything."`,
        `${speaker.name}: "The darkness tests our sight. We will not falter."`,
        `${speaker.name}: "Every anomaly we miss is a wound on our brothers and sisters."`,
        `${speaker.name}: "Focus sharp, reactions faster. Let's go."`,
      ];
      dialogue.textContent = quotes[Math.floor(Math.random() * quotes.length)];
    } else if (selectedMode === 'time') {
      dialogue.textContent = 'One minute. Maximum focus. Show them what you can see.';
    } else {
      dialogue.textContent = 'The veil between worlds thins. Open your eyes.';
    }
    
    // Deploy button
    const deployBtn = document.createElement('button');
    deployBtn.className = 'btn mission-deploy';
    deployBtn.textContent = '⚔️ Deploy Mission';
    deployBtn.onclick = () => {
      overlay.remove();
      if (callback) callback();
    };
    
    dialog.appendChild(title);
    dialog.appendChild(objectives);
    dialog.appendChild(enemies);
    if (selectedMode === 'quest' || (party && party.length > 0)) {
      dialog.appendChild(status);
    }
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
    
    const title = document.createElement('h2');
    title.className = 'pbcr-title';
    title.textContent = '📋 Post-Battle Carnage Report';
    
    const missionHeader = document.createElement('div');
    missionHeader.className = 'mission-header';
    const partySurvived = party && party.length > 0 && party.some(m => m.hp > 0);
    const missionResult = !partySurvived ? '💀 DEFEATED' :
                           missionData.avgPts >= 25 ? '🏆 VICTORY' : 
                           missionData.avgPts >= 15 ? '⚔️ SURVIVED' : 
                           '💀 COSTLY';
    missionHeader.innerHTML = `
      <div class="result-badge ${!partySurvived ? 'defeated' : missionData.avgPts >= 25 ? 'victory' : missionData.avgPts >= 15 ? 'survived' : 'costly'}">
        ${missionResult}
      </div>
      <div class="mission-mode">${mode === 'time' ? 'Time Attack' : mode === 'infinite' ? 'Infinite Struggle' : 'Quest Mission'}</div>
    `;
    
    // Summary stats
    const summary = document.createElement('div');
    summary.className = 'pbcr-summary';
    summary.innerHTML = `
      <div class="pbcr-stat-grid">
        <div class="pbcr-stat highlight">
          <span class="stat-label">Final Score</span>
          <span class="stat-value">${missionData.score}</span>
        </div>
        <div class="pbcr-stat">
          <span class="stat-label">Total Hits</span>
          <span class="stat-value">${missionData.hits}</span>
        </div>
        <div class="pbcr-stat ${missionData.misses > missionData.hits ? 'warning' : ''}">
          <span class="stat-label">Total Misses</span>
          <span class="stat-value">${missionData.misses}</span>
        </div>
        <div class="pbcr-stat highlight">
          <span class="stat-label">Avg Points/Hit</span>
          <span class="stat-value">${missionData.avgPts.toFixed(2)}</span>
        </div>
        <div class="pbcr-stat">
          <span class="stat-label">Earliest Hit</span>
          <span class="stat-value">${missionData.earliestHit}</span>
        </div>
        <div class="pbcr-stat">
          <span class="stat-label">Accuracy</span>
          <span class="stat-value">${missionData.hits > 0 ? Math.round((missionData.hits / (missionData.hits + missionData.misses)) * 100) : 0}%</span>
        </div>
      </div>
    `;
    
    // Party performance (for Quest mode)
    if (mode === 'quest' && party && party.length > 0) {
      const perfSection = document.createElement('div');
      perfSection.className = 'party-performance';
      perfSection.innerHTML = '<div class="section-title">⚔️ Party Combat Report:</div>';
      
      party.forEach(m => {
        const dmgDealt = m.totalDamageDealt || 0;
        const dmgTaken = m.totalDamageTaken || 0;
        const healing = m.totalHealing || 0;
        const crits = m.criticalHits || 0;
        const kills = m.enemiesKilled || 0;
        
        const performanceClass = dmgDealt > 100 ? 'excellent' : dmgDealt > 50 ? 'good' : 'normal';
        
        perfSection.innerHTML += `
          <div class="member-perf ${performanceClass}">
            <div class="member-header">
              <span class="member-icon-perf">${m.emoji}</span>
              <div class="member-info-perf">
                <div class="member-name-perf">${m.name}</div>
                <div class="member-class-perf">${m.class} Lv${m.level}</div>
              </div>
            </div>
            <div class="perf-stats">
              ${dmgDealt > 0 ? `<span class="perf-badge damage">⚔️ Damage: ${dmgDealt}</span>` : ''}
              ${dmgTaken > 0 ? `<span class="perf-badge taken">🩹 Taken: ${dmgTaken}</span>` : ''}
              ${healing > 0 ? `<span class="perf-badge healing">✨ Healing: ${healing}</span>` : ''}
              ${crits > 0 ? `<span class="perf-badge crit">💥 Crits: ${crits}</span>` : ''}
              ${kills > 0 ? `<span class="perf-badge kills">💀 Kills: ${kills}</span>` : ''}
              ${dmgDealt === 0 && dmgTaken === 0 ? `<span class="perf-badge inactive">No combat activity</span>` : ''}
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
    
    let moraleText = '';
    if (moraleChange >= 15) {
      moraleText = '🎉 Party Morale Soaring!';
    } else if (moraleChange >= 5) {
      moraleText = '😊 Party Morale Improved';
    } else if (moraleChange > -5) {
      moraleText = '😐 Party Morale Stable';
    } else if (moraleChange > -15) {
      moraleText = '😟 Party Morale Declining';
    } else {
      moraleText = '😱 Party Morale Collapsing!';
    }
    
    moraleDiv.innerHTML = `
      <span>${moraleText}</span>
      <span class="morale-value">${moraleChange >= 0 ? '+' : ''}${moraleChange}</span>
    `;
    
    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn pbcr-continue';
    continueBtn.textContent = '➡️ Continue';
    continueBtn.onclick = () => {
      overlay.remove();
      // Trigger post-mission events
      if (mode === 'quest' && Math.random() < 0.3) {
        triggerBetweenMissionEvent();
      }
    };
    
    dialog.appendChild(title);
    dialog.appendChild(missionHeader);
    dialog.appendChild(summary);
    if (mode === 'quest') {
      dialog.appendChild(moraleDiv);
    }
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
      consecutiveMisses = 0; consecutiveHits = 0; rapidHitsWindow = []; driftEnabled = false;
      
      // Clean up any leftover pause modal from previous game
      if (typeof pauseModalOverlay !== 'undefined' && pauseModalOverlay) {
        pauseModalOverlay.remove();
        pauseModalOverlay = null;
      }
      
      // CRITICAL: Reset progressive unlock tracking to prevent duplicate spawns
      resetProgressiveUnlocks();
      
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
        // Set time limit from settings (convert minutes to seconds)
        timeLimit = (settings.timeAttackSettings.timeLimit || 1) * 60;
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

  // --- Line obstacle system (Tendrils) ---
  function startLineObstacles() {
    // Only start if explicitly enabled in mode settings
    if (!shouldSpawnTendrils()) return;
    if (lineSpawnTimer) return;
    
    const intervalMs = (settings.lineSpawnIntervalSecs || 8) * 1000;
    lineSpawnTimer = setInterval(() => {
      if (paused || !running) return;
      createLineObstacle();
    }, intervalMs);
  }
  
  function shouldSpawnTendrils() {
    if (mode === 'time') {
      // Time Attack: Random mode enables all, otherwise check manual selection
      if (settings.timeAttackSettings.random) {
        return true; // Random mode: all enemy types enabled
      } else {
        return settings.timeAttackSettings.lines === true;
      }
    } else if (mode === 'infinite') {
      if (settings.infiniteSettings.autoEvolve) {
        // Progressive mode: unlock at 2000 score
        return score >= 2000;
      } else {
        // Manual selection: Spawn immediately if selected (NO score requirement)
        return settings.infiniteSettings.lines === true;
      }
    } else if (mode === 'quest') {
      // Quest mode: mission-controlled, no score requirements
      return true;
    }
    return false;
  }

  function stopLineObstacles() {
    if (lineSpawnTimer) {
      clearInterval(lineSpawnTimer);
      lineSpawnTimer = null;
    }
    // Remove all SVG tendrils from DOM
    lineObstacles.forEach(line => {
      if (line.el) {
        line.el.remove();
      }
      if (line.timer) clearInterval(line.timer);
    });
    lineObstacles = [];
    
    // Safety: Remove any orphaned SVG elements
    const allSvgs = gameArea.querySelectorAll('svg');
    allSvgs.forEach(svg => {
      if (svg.classList.contains('tendril-svg')) {
        svg.remove();
      }
    });
  }

  // --- Edge Stalker system ---
  function startEdgeCreepers() {
    if (!shouldSpawnEdgeCreepers()) return;
    if (edgeCreepSpawnTimer) return;
    
    const intervalMs = 15000 + Math.random() * 8000; // 15-23 seconds between spawns
    
    edgeCreepSpawnTimer = setInterval(() => {
      if (paused || !running) return;
      createEdgeCreeper();
    }, intervalMs);
    
    // Spawn first one after a short delay (3-5 seconds) for Infinite mode
    if (mode === 'infinite') {
      const initialDelay = 3000 + Math.random() * 2000;
      setTimeout(() => {
        if (running && !paused) createEdgeCreeper();
      }, initialDelay);
    }
  }
  
  function shouldSpawnEdgeCreepers() {
    console.log('[EDGE STALKER] Checking shouldSpawnEdgeCreepers...');
    console.log('[EDGE STALKER] Mode:', mode);
    console.log('[EDGE STALKER] Settings:', JSON.stringify(settings.timeAttackSettings), JSON.stringify(settings.infiniteSettings));
    
    let result = false;
    if (mode === 'time') {
      // Time Attack: Random mode enables all, otherwise check manual selection
      if (settings.timeAttackSettings.random) {
        result = true; // Random mode: all enemy types enabled
      } else {
        result = settings.timeAttackSettings.edgeStalkers === true;
      }
    } else if (mode === 'infinite') {
      if (settings.infiniteSettings.autoEvolve) {
        // Progressive mode: unlock at 1500 score
        result = score >= 1500;
      } else {
        // Manual selection: Spawn immediately if selected (NO score requirement)
        result = settings.infiniteSettings.edgeStalkers === true;
      }
    } else if (mode === 'quest') {
      // Quest mode: mission-controlled, no score requirements
      result = true;
    }
    
    console.log('[EDGE STALKER] Result:', result);
    
    if (DEBUG_MODE) {
      console.log(`[EDGE STALKER DEBUG] shouldSpawnEdgeCreepers() = ${result} (mode: ${mode}, score: ${score})`);
      if (mode === 'time') {
        console.log('[EDGE STALKER DEBUG] Time Attack mode - random:', settings.timeAttackSettings.random, 'edgeStalkers:', settings.timeAttackSettings.edgeStalkers);
      } else if (mode === 'infinite') {
        console.log('[EDGE STALKER DEBUG] Infinite mode - autoEvolve:', settings.infiniteSettings.autoEvolve, 'edgeStalkers:', settings.infiniteSettings.edgeStalkers);
      }
    }
    
    return result;
  }

  function stopEdgeCreepers() {
    if (edgeCreepSpawnTimer) {
      clearInterval(edgeCreepSpawnTimer);
      edgeCreepSpawnTimer = null;
    }
    // Clear all active edge creepers
    edgeStalkers.forEach(creep => {
      if (creep.el) {
        creep.el.remove();
      }
      if (creep.animationFrame) {
        cancelAnimationFrame(creep.animationFrame);
      }
    });
    edgeStalkers = [];
    
    // Safety: Remove any orphaned edge creeper elements
    const allCreepers = gameArea.querySelectorAll('.edge-stalker');
    allCreepers.forEach(el => el.remove());
  }

  function createEdgeCreeper() {
    const rect = gameArea.getBoundingClientRect();
    
    // Randomly select which edge (0=top, 1=right, 2=bottom, 3=left)
    const side = Math.floor(Math.random() * 4);
    
    // Create container for slime
    const container = document.createElement('div');
    container.className = 'edge-stalker';
    container.style.position = 'absolute';
    container.style.zIndex = '10000';
    container.style.pointerEvents = 'auto';
    container.style.cursor = 'default';
    // Container size will be set based on edge orientation below
    
    // Create SVG slime shape (organic blob with bell curve profile)
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    // SVG dimensions depend on edge orientation
    const isVertical = (side === 1 || side === 3);
    svg.setAttribute('width', isVertical ? '16' : '48');
    svg.setAttribute('height', isVertical ? '48' : '16');
    svg.style.overflow = 'visible';
    svg.style.pointerEvents = 'none';
    svg.style.position = 'absolute';
    
    // Create organic blob shape using path (bell curve profile)
    const blob = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Use different path for horizontal vs vertical edges
    const d = isVertical 
      ? 'M 8,4 Q 2,12 2,24 Q 2,36 8,44 Q 14,36 14,24 Q 14,12 8,4 Z'  // Vertical blob: 16w × 48h
      : 'M 4,8 Q 12,2 24,2 Q 36,2 44,8 Q 36,14 24,14 Q 12,14 4,8 Z';  // Horizontal blob: 48w × 16h
    
    blob.setAttribute('d', d);
    blob.setAttribute('fill', 'rgb(255,255,255)');
    blob.setAttribute('opacity', '1.0');
    
    svg.appendChild(blob);
    container.appendChild(svg);
    
    // Movement parameters
    let startPos, endPos, currentPos, targetPos, axis;
    const duration = 15000 + Math.random() * 10000; // 15-25 seconds
    const padding = 10;
    const edgeLength = side % 2 === 0 ? rect.width : rect.height;
    
    // Randomize start position (first 30% of edge)
    startPos = padding + Math.random() * (edgeLength * 0.3);
    endPos = edgeLength - 48 - padding;
    
    // Position container at edge, SVG offset to extend half outside
    if (side === 0) {
      // TOP EDGE
      axis = 'horizontal';
      container.style.width = '48px';
      container.style.height = '24px';
      container.style.top = '0';
      container.style.left = startPos + 'px';
      svg.style.top = '-8px';
      svg.style.left = '0';
    } else if (side === 1) {
      // RIGHT EDGE
      axis = 'vertical';
      container.style.width = '20px';
      container.style.height = '48px';
      container.style.right = '0';
      container.style.top = startPos + 'px';
      svg.style.right = '-8px';
      svg.style.top = '0';
    } else if (side === 2) {
      // BOTTOM EDGE
      axis = 'horizontal';
      container.style.width = '48px';
      container.style.height = '24px';
      container.style.bottom = '0';
      container.style.left = startPos + 'px';
      svg.style.bottom = '-8px';
      svg.style.left = '0';
    } else {
      // LEFT EDGE
      axis = 'vertical';
      container.style.width = '20px';
      container.style.height = '48px';
      container.style.left = '0';
      container.style.top = startPos + 'px';
      svg.style.left = '-8px';
      svg.style.top = '0';
    }
    
    currentPos = startPos;
    targetPos = startPos;
    
    // Apply initial scale (starts small)
    svg.style.transform = 'scale(0.25)';
    
    gameArea.appendChild(container);
    playEdgeCreeperSpawnSound();
    
    const startTime = performance.now();
    let removed = false;
    let isStretching = false;
    let pauseUntil = startTime;
    let alarmPlayed = false;
    
    const creepObj = {
      el: container,
      removed: false,
      side,
      startTime,
      animationFrame: null,
      alarmPlayed: false
    };
    
    function onClick(ev) {
      ev.stopPropagation();
      if (removed) return;
      removed = true;
      creepObj.removed = true;
      if (creepObj.animationFrame) cancelAnimationFrame(creepObj.animationFrame);
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      
      // Score INVERSE of progress: Earlier = MORE points
      const maxPts = 50;
      const minPts = 5;
      const pts = Math.round(minPts + ((1 - progress) * (maxPts - minPts)));
      
      score += pts;
      hits++;
      totalPointsFromHits += pts;
      consecutiveMisses = 0;
      
      checkSideQuests({edgeCreepKill: true});
      
      // White explosion
      const explosion = document.createElement('div');
      explosion.style.position = 'absolute';
      explosion.style.left = container.style.left;
      explosion.style.top = container.style.top;
      explosion.style.right = container.style.right;
      explosion.style.bottom = container.style.bottom;
      explosion.style.width = '60px';
      explosion.style.height = '60px';
      explosion.style.borderRadius = '50%';
      explosion.style.background = 'rgba(255,255,255,0.9)';
      explosion.style.pointerEvents = 'none';
      explosion.style.zIndex = '10001';
      explosion.style.animation = 'creeperExplosionClick 0.4s ease-out';
      gameArea.appendChild(explosion);
      setTimeout(() => explosion.remove(), 400);
      
      const containerRect = container.getBoundingClientRect();
      const clickX = containerRect.left + containerRect.width/2 - rect.left;
      const clickY = containerRect.top + containerRect.height/2 - rect.top;
      showIndicator('+' + pts, clickX, clickY, true);
      updateHeader();
      playEdgeCreeperHitSound();
      
      container.remove();
      edgeStalkers = edgeStalkers.filter(c => c !== creepObj);
    }
    
    container.addEventListener('pointerdown', onClick);
    
    function animateSlimeCrawl() {
      if (removed) {
        if (creepObj.animationFrame) cancelAnimationFrame(creepObj.animationFrame);
        return;
      }
      if (paused || !running) {
        creepObj.animationFrame = requestAnimationFrame(animateSlimeCrawl);
        return;
      }
      
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Play alarm at 80% progress
      if (!alarmPlayed && progress >= 0.8) {
        alarmPlayed = true;
        creepObj.alarmPlayed = true;
        // Use spawn sound as alarm for now (or could create dedicated alarm sound)
        playEdgeCreeperSpawnSound();
      }
      
      // Calculate overall target position based on progress
      const overallTarget = startPos + (endPos - startPos) * progress;
      
      // STEPPING BEHAVIOR
      if (now >= pauseUntil) {
        if (!isStretching) {
          isStretching = true;
          const stepSize = (Math.random() < 0.5 ? 1 : 2) * (3 + Math.random() * 4);
          targetPos = Math.min(overallTarget, currentPos + stepSize);
        } else {
          isStretching = false;
          const pauseDuration = 200 + Math.random() * 600;
          pauseUntil = now + pauseDuration;
        }
      }
      
      // SMOOTH MOVEMENT - always move toward overallTarget
      const distanceToTarget = overallTarget - currentPos;
      if (Math.abs(distanceToTarget) > 0.5) {
        // Smooth interpolation toward time-based target
        currentPos += distanceToTarget * 0.15;
      } else {
        currentPos = overallTarget;
      }
      
      // SIZE GROWTH CURVE: 25% → 100%
      const scale = 0.25 + (0.75 * progress);
      
      // SHAPE ANIMATION
      if (isStretching) {
        const stretchProgress = Math.min(1, (targetPos - currentPos) / 8);
        const scaleX = scale * (1 + 0.5 * stretchProgress);
        const scaleY = scale * (1 - 0.3 * stretchProgress);
        svg.style.transform = `scale(${scaleX}, ${scaleY})`;
      } else {
        const pulsePhase = Math.sin((elapsed / 1000) * Math.PI * 2);
        const pulseScale = scale * (1 + pulsePhase * 0.06);
        svg.style.transform = `scale(${pulseScale})`;
      }
      
      // Update position
      if (axis === 'horizontal') {
        container.style.left = currentPos + 'px';
      } else {
        container.style.top = currentPos + 'px';
      }
      
      // Continue or breach
      if (!removed && progress < 1) {
        creepObj.animationFrame = requestAnimationFrame(animateSlimeCrawl);
      } else if (!removed) {
        // Reached end - breach!
        if (mode === 'quest') {
          damageParty(settings.edgeCreepDamage || 50);
          showSpeech('An Edge Stalker breached the perimeter!', '🐛', {ttlMs: 1800});
        } else {
          showSpeech('Edge Stalker breach!', '⚠️', {ttlMs: 1200});
        }
        
        // Large explosion
        const explosion = document.createElement('div');
        explosion.style.position = 'absolute';
        explosion.style.left = container.style.left;
        explosion.style.top = container.style.top;
        explosion.style.right = container.style.right;
        explosion.style.bottom = container.style.bottom;
        explosion.style.width = '100px';
        explosion.style.height = '100px';
        explosion.style.borderRadius = '50%';
        explosion.style.background = 'rgba(255,255,255,0.9)';
        explosion.style.pointerEvents = 'none';
        explosion.style.zIndex = '10001';
        explosion.style.animation = 'creeperExplosionBreach 0.6s ease-out';
        gameArea.appendChild(explosion);
        setTimeout(() => explosion.remove(), 600);
        
        playMissSound();
        
        container.remove();
        edgeStalkers = edgeStalkers.filter(c => c !== creepObj);
        return;
      }
    }
    
    edgeStalkers.push(creepObj);
    creepObj.animationFrame = requestAnimationFrame(animateSlimeCrawl);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TENDRIL SYSTEM - Complete Reimplementation
  // ═══════════════════════════════════════════════════════════════════════════════
  //
  // TENDRILS are edge-to-edge spatial threats that test:
  // - Contour integration (following curves)
  // - Orientation detection
  // - Motion prediction
  // - Peripheral awareness
  //
  // Four distinct types with unique path generation:
  // 1. STRAIGHT - Direct line with random orientation
  // 2. ZIGZAG - Piecewise linear segments with direction changes
  // 3. WAVE - Smooth sinusoidal curves
  // 4. IRREGULAR - Perlin-like noise-based organic curves
  //
  // Each Tendril features:
  // - Layered rendering (highlight + body + shadow)
  // - Dynamic thickness variance along length
  // - Growth animation from origin edge
  // - Visibility curve (low → high over time)
  // - Point value decay (high → low over time)
  // - Proper hit detection along curve path
  //
  function createLineObstacle() {
    if (DEBUG_MODE) console.log('[TENDRIL] === Creating new Tendril ===');
    
    const rect = gameArea.getBoundingClientRect();
    
    // Select Tendril type - all four types have equal probability
    const rand = Math.random();
    let type;
    if (rand < 0.25) type = 'straight';
    else if (rand < 0.5) type = 'zigzag';
    else if (rand < 0.75) type = 'wave';
    else type = 'irregular';
    
    if (DEBUG_MODE) console.log(`[TENDRIL] Type: ${type.toUpperCase()}`);
    
    // Determine origin edge (tendril will grow from this edge to opposite edge)
    const originEdge = Math.floor(Math.random() * 4); // 0=top, 1=right, 2=bottom, 3=left
    const edgeNames = ['TOP', 'RIGHT', 'BOTTOM', 'LEFT'];
    
    if (DEBUG_MODE) console.log(`[TENDRIL] Origin edge: ${edgeNames[originEdge]}`);
    
    // Generate path points based on type
    let pathPoints;
    if (type === 'straight') {
      pathPoints = generateStraightTendril(rect, originEdge);
    } else if (type === 'zigzag') {
      pathPoints = generateZigzagTendril(rect, originEdge);
    } else if (type === 'wave') {
      pathPoints = generateWaveTendril(rect, originEdge);
    } else {
      pathPoints = generateIrregularTendril(rect, originEdge);
    }
    
    // Create SVG container
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.position = 'absolute';
    svg.style.left = '0';
    svg.style.top = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '10';
    
    // Create three layers: shadow, body, highlight
    const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const bodyPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const highlightPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    
    // Convert points to SVG path d attribute
    const pathD = pointsToPathD(pathPoints);
    shadowPath.setAttribute('d', pathD);
    bodyPath.setAttribute('d', pathD);
    highlightPath.setAttribute('d', pathD);
    
    // Styling - layered rendering for contour detection
    const bgRgb = hexToRgb(settings.bgColor);
    
    if (DEBUG_MODE) {
      // Debug mode: bright colors for visibility
      shadowPath.setAttribute('stroke', '#FF0000');
      shadowPath.setAttribute('stroke-width', '4');
      bodyPath.setAttribute('stroke', '#00FF00');
      bodyPath.setAttribute('stroke-width', '3');
      highlightPath.setAttribute('stroke', '#FFFF00');
      highlightPath.setAttribute('stroke-width', '1.5');
    } else {
      // Normal mode: subtle layered rendering
      // Shadow: darker than background
      const shadowR = Math.max(0, bgRgb[0] - 20);
      const shadowG = Math.max(0, bgRgb[1] - 20);
      const shadowB = Math.max(0, bgRgb[2] - 20);
      shadowPath.setAttribute('stroke', `rgb(${shadowR},${shadowG},${shadowB})`);
      shadowPath.setAttribute('stroke-width', '2.5');
      shadowPath.setAttribute('opacity', '0.4');
      
      // Body: slightly different from background
      const bodyR = Math.max(0, bgRgb[0] - 12);
      const bodyG = Math.max(0, bgRgb[1] - 12);
      const bodyB = Math.max(0, bgRgb[2] - 12);
      bodyPath.setAttribute('stroke', `rgb(${bodyR},${bodyG},${bodyB})`);
      bodyPath.setAttribute('stroke-width', '2');
      bodyPath.setAttribute('opacity', '0.5');
      
      // Highlight: lighter edge
      const highlightR = Math.min(255, bgRgb[0] + 15);
      const highlightG = Math.min(255, bgRgb[1] + 15);
      const highlightB = Math.min(255, bgRgb[2] + 15);
      highlightPath.setAttribute('stroke', `rgb(${highlightR},${highlightG},${highlightB})`);
      highlightPath.setAttribute('stroke-width', '1');
      highlightPath.setAttribute('opacity', '0.6');
    }
    
    // All paths have no fill
    shadowPath.setAttribute('fill', 'none');
    bodyPath.setAttribute('fill', 'none');
    highlightPath.setAttribute('fill', 'none');
    
    // Append in order: shadow → body → highlight
    svg.appendChild(shadowPath);
    svg.appendChild(bodyPath);
    svg.appendChild(highlightPath);
    
    // Create invisible hit detection path (wider than visible path)
    const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    hitPath.setAttribute('d', pathD);
    hitPath.setAttribute('stroke', 'transparent');
    hitPath.setAttribute('stroke-width', '12'); // Wide hit area
    hitPath.setAttribute('fill', 'none');
    hitPath.style.pointerEvents = 'stroke';
    hitPath.style.cursor = 'default'; // Don't reveal position with cursor change
    svg.appendChild(hitPath);
    
    // Debug visualization of hit area
    if (DEBUG_MODE) {
      const debugHit = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      debugHit.setAttribute('d', pathD);
      debugHit.setAttribute('stroke', 'rgba(255,0,255,0.3)');
      debugHit.setAttribute('stroke-width', '12');
      debugHit.setAttribute('fill', 'none');
      debugHit.style.pointerEvents = 'none';
      svg.appendChild(debugHit);
    }
    
    gameArea.appendChild(svg);
    
    // Play subtle spawn sound
    playTendrilSpawnSound();
    
    // Animation parameters
    const growthDuration = 4000 + Math.random() * 3000; // 4-7 seconds to fully grow
    const lifetimeDuration = growthDuration + 6000; // Lives 6 seconds after growth
    const startTime = performance.now();
    let pausedAt = 0;
    let totalPausedTime = 0;
    let clicked = false;
    let expired = false;
    
    // Get total path length for animation
    const pathLength = bodyPath.getTotalLength();
    
    // Initialize with invisible stroke
    shadowPath.setAttribute('stroke-dasharray', pathLength);
    shadowPath.setAttribute('stroke-dashoffset', pathLength);
    bodyPath.setAttribute('stroke-dasharray', pathLength);
    bodyPath.setAttribute('stroke-dashoffset', pathLength);
    highlightPath.setAttribute('stroke-dasharray', pathLength);
    highlightPath.setAttribute('stroke-dashoffset', pathLength);
    
    const lineObj = {
      el: svg,
      type,
      clicked: false,
      expired: false,
      pathPoints,
    };
    
    // Debug info overlay
    let debugText;
    if (DEBUG_MODE) {
      debugText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      debugText.setAttribute('x', pathPoints[Math.floor(pathPoints.length / 2)].x);
      debugText.setAttribute('y', pathPoints[Math.floor(pathPoints.length / 2)].y - 10);
      debugText.setAttribute('fill', 'yellow');
      debugText.setAttribute('font-size', '12');
      debugText.setAttribute('font-family', 'monospace');
      debugText.style.pointerEvents = 'none';
      svg.appendChild(debugText);
    }
    
    // Click handler
    hitPath.addEventListener('click', (e) => {
      if (clicked || expired) return;
      e.stopPropagation();
      clicked = true;
      lineObj.clicked = true;
      
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / lifetimeDuration);
      
      // Scoring: Point value decreases over time (50 → 10)
      const maxPts = 50;
      const minPts = 10;
      const pts = Math.round(maxPts - (progress * (maxPts - minPts)));
      
      score += pts;
      hits++;
      totalPointsFromHits += pts;
      consecutiveMisses = 0;
      
      // Side quest tracking for Tendril kill
      checkSideQuests({tendrilKill: true});
      
      console.log(`[TENDRIL] ✓ HIT! Type: ${type}, Progress: ${(progress * 100).toFixed(1)}%, Points: ${pts}`);
      
      // Visual feedback at click position
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      // Keep indicator within game area bounds
      const safeX = Math.max(30, Math.min(rect.width - 30, clickX));
      const safeY = Math.max(30, Math.min(rect.height - 30, clickY));
      showIndicator('+' + pts, safeX, safeY, true);
      updateHeader();
      playTendrilHitSound(); // Unique sound for Tendrils
      
      // RED FADE-OUT (FF6/Chrono Trigger style)
      svg.classList.add('dying-red');
      setTimeout(() => {
        svg.remove();
        lineObstacles = lineObstacles.filter(l => l !== lineObj);
      }, 600); // Match red-fade animation duration
    });
    
    // Animation loop
    function animate(now) {
      if (clicked || expired) return;
      if (paused || !running) {
        if (!pausedAt) {
          pausedAt = now;
        }
        requestAnimationFrame(animate);
        return;
      }
      
      // Track pause time
      if (pausedAt) {
        totalPausedTime += (now - pausedAt);
        pausedAt = 0;
      }
      
      const elapsed = now - startTime - totalPausedTime;
      const growthProgress = Math.min(1, elapsed / growthDuration);
      const lifetimeProgress = Math.min(1, elapsed / lifetimeDuration);
      
      // Growth animation (stroke-dashoffset reveals the path)
      const dashOffset = pathLength * (1 - growthProgress);
      shadowPath.setAttribute('stroke-dashoffset', dashOffset);
      bodyPath.setAttribute('stroke-dashoffset', dashOffset);
      highlightPath.setAttribute('stroke-dashoffset', dashOffset);
      
      // Visibility curve: starts low, increases over time
      if (!DEBUG_MODE) {
        let visibility;
        if (lifetimeProgress < 0.3) {
          // First 30%: fade in from barely visible
          visibility = 0.2 + (lifetimeProgress / 0.3) * 0.3; // 0.2 → 0.5
        } else {
          // After 30%: gradually become more visible
          visibility = 0.5 + ((lifetimeProgress - 0.3) / 0.7) * 0.4; // 0.5 → 0.9
        }
        
        shadowPath.setAttribute('opacity', String(visibility * 0.4));
        bodyPath.setAttribute('opacity', String(visibility * 0.5));
        highlightPath.setAttribute('opacity', String(visibility * 0.6));
      }
      
      // Dynamic thickness variance (subtle pulsing along length)
      const pulsePhase = (elapsed / 1000) * Math.PI; // 1 second cycle
      const thicknessVariance = 1 + Math.sin(pulsePhase) * 0.15; // ±15%
      
      if (!DEBUG_MODE) {
        shadowPath.setAttribute('stroke-width', String(2.5 * thicknessVariance));
        bodyPath.setAttribute('stroke-width', String(2 * thicknessVariance));
        highlightPath.setAttribute('stroke-width', String(1 * thicknessVariance));
      }
      
      // Debug info
      if (DEBUG_MODE && debugText) {
        const currentPts = Math.round(50 - (lifetimeProgress * 40));
        const visPercent = (lifetimeProgress * 100).toFixed(0);
        debugText.textContent = `${type} | ${currentPts}pts | ${visPercent}%`;
      }
      
      // Expiration check
      if (lifetimeProgress >= 1 && !expired) {
        expired = true;
        lineObj.expired = true;
        
        // Penalty for missing
        const penalty = settings.linePenalty || 100;
        score = Math.max(0, score - penalty);
        misses++;
        
        console.log(`[TENDRIL] ✗ EXPIRED! Type: ${type}, Penalty: -${penalty}`);
        
        showIndicator('-' + penalty, rect.width / 2, rect.height / 2, false);
        updateHeader();
        playMissSound();
        
        if (mode === 'quest') {
          damageParty(25);
          showSpeech('A tendril pierced through!', '⚡', {ttlMs: 1800});
        } else {
          showSpeech('Tendril breach!', '⚡', {ttlMs: 1200});
        }
        
        // WHITE LIGHTNING FILL (JRPG-style)
        svg.classList.add('lightning-flash');
        
        // Remove after animation
        setTimeout(() => {
          svg.remove();
          lineObstacles = lineObstacles.filter(l => l !== lineObj);
        }, 500); // Match lightning animation duration
        return;
      }
      
      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
    lineObstacles.push(lineObj);
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // TENDRIL PATH GENERATORS - Each type has unique generation logic
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Helper: Convert array of {x, y} points to SVG path d attribute
  function pointsToPathD(points) {
    if (points.length === 0) return '';
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x} ${points[i].y}`;
    }
    return d;
  }
  
  // TYPE 1: STRAIGHT TENDRIL
  // Perfectly straight line from one edge point to opposite edge point
  // Orientation varies (not just horizontal/vertical)
  function generateStraightTendril(rect, originEdge) {
    let startX, startY, endX, endY;
    
    if (originEdge === 0) { // Top → Bottom
      startX = Math.random() * rect.width;
      startY = 0;
      endX = Math.random() * rect.width;
      endY = rect.height;
    } else if (originEdge === 1) { // Right → Left
      startX = rect.width;
      startY = Math.random() * rect.height;
      endX = 0;
      endY = Math.random() * rect.height;
    } else if (originEdge === 2) { // Bottom → Top
      startX = Math.random() * rect.width;
      startY = rect.height;
      endX = Math.random() * rect.width;
      endY = 0;
    } else { // Left → Right
      startX = 0;
      startY = Math.random() * rect.height;
      endX = rect.width;
      endY = Math.random() * rect.height;
    }
    
    return [
      { x: startX, y: startY },
      { x: endX, y: endY }
    ];
  }
  
  // TYPE 2: ZIGZAG TENDRIL
  // Piecewise linear segments with direction changes
  // Creates angular, jagged path across screen
  function generateZigzagTendril(rect, originEdge) {
    let startX, startY, endX, endY;
    const isHorizontal = originEdge === 1 || originEdge === 3;
    
    if (originEdge === 0) { // Top → Bottom
      startX = Math.random() * rect.width;
      startY = 0;
      endX = Math.random() * rect.width;
      endY = rect.height;
    } else if (originEdge === 1) { // Right → Left
      startX = rect.width;
      startY = Math.random() * rect.height;
      endX = 0;
      endY = Math.random() * rect.height;
    } else if (originEdge === 2) { // Bottom → Top
      startX = Math.random() * rect.width;
      startY = rect.height;
      endX = Math.random() * rect.width;
      endY = 0;
    } else { // Left → Right
      startX = 0;
      startY = Math.random() * rect.height;
      endX = rect.width;
      endY = Math.random() * rect.height;
    }
    
    // Generate 3-5 zigzag points between start and end
    const numZigs = 3 + Math.floor(Math.random() * 3); // 3-5 segments
    const points = [{ x: startX, y: startY }];
    
    for (let i = 1; i < numZigs; i++) {
      const t = i / numZigs;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      
      // Add perpendicular offset for zigzag effect
      const offsetMagnitude = (Math.random() - 0.5) * 120; // ±60px
      if (isHorizontal) {
        points.push({ x: baseX, y: baseY + offsetMagnitude });
      } else {
        points.push({ x: baseX + offsetMagnitude, y: baseY });
      }
    }
    
    points.push({ x: endX, y: endY });
    return points;
  }
  
  // TYPE 3: WAVE TENDRIL
  // Smooth sinusoidal curve
  // Continuous curvature with varying amplitude and frequency
  function generateWaveTendril(rect, originEdge) {
    let startX, startY, endX, endY;
    const isHorizontal = originEdge === 1 || originEdge === 3;
    
    if (originEdge === 0) { // Top → Bottom
      startX = Math.random() * rect.width;
      startY = 0;
      endX = Math.random() * rect.width;
      endY = rect.height;
    } else if (originEdge === 1) { // Right → Left
      startX = rect.width;
      startY = Math.random() * rect.height;
      endX = 0;
      endY = Math.random() * rect.height;
    } else if (originEdge === 2) { // Bottom → Top
      startX = Math.random() * rect.width;
      startY = rect.height;
      endX = Math.random() * rect.width;
      endY = 0;
    } else { // Left → Right
      startX = 0;
      startY = Math.random() * rect.height;
      endX = rect.width;
      endY = Math.random() * rect.height;
    }
    
    // Generate smooth wave with multiple points
    const numPoints = 30; // Smooth curve
    const points = [];
    const frequency = 1.5 + Math.random() * 2; // 1.5-3.5 waves
    const amplitude = 40 + Math.random() * 60; // 40-100px amplitude
    const phase = Math.random() * Math.PI * 2; // Random phase shift
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      
      // Sinusoidal offset perpendicular to main direction
      const waveOffset = Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude;
      
      if (isHorizontal) {
        points.push({ x: baseX, y: baseY + waveOffset });
      } else {
        points.push({ x: baseX + waveOffset, y: baseY });
      }
    }
    
    return points;
  }
  
  // TYPE 4: IRREGULAR TENDRIL
  // Organic, noise-based curve
  // Non-repeating, slightly "alive" appearance
  function generateIrregularTendril(rect, originEdge) {
    let startX, startY, endX, endY;
    const isHorizontal = originEdge === 1 || originEdge === 3;
    
    if (originEdge === 0) { // Top → Bottom
      startX = Math.random() * rect.width;
      startY = 0;
      endX = Math.random() * rect.width;
      endY = rect.height;
    } else if (originEdge === 1) { // Right → Left
      startX = rect.width;
      startY = Math.random() * rect.height;
      endX = 0;
      endY = Math.random() * rect.height;
    } else if (originEdge === 2) { // Bottom → Top
      startX = Math.random() * rect.width;
      startY = rect.height;
      endX = Math.random() * rect.width;
      endY = 0;
    } else { // Left → Right
      startX = 0;
      startY = Math.random() * rect.height;
      endX = rect.width;
      endY = Math.random() * rect.height;
    }
    
    // Generate irregular curve using smoothed random offsets
    const numPoints = 25;
    const points = [];
    const noiseScale = 50 + Math.random() * 40; // 50-90px variation
    
    // Generate random control points
    const controlPoints = [];
    for (let i = 0; i <= 8; i++) {
      controlPoints.push((Math.random() - 0.5) * 2); // -1 to 1
    }
    
    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;
      const baseX = startX + (endX - startX) * t;
      const baseY = startY + (endY - startY) * t;
      
      // Sample smoothed noise at this t value
      const noiseT = t * (controlPoints.length - 1);
      const idx = Math.floor(noiseT);
      const frac = noiseT - idx;
      
      // Linear interpolation between control points
      let noise;
      if (idx >= controlPoints.length - 1) {
        noise = controlPoints[controlPoints.length - 1];
      } else {
        noise = controlPoints[idx] * (1 - frac) + controlPoints[idx + 1] * frac;
      }
      
      // Apply cubic smoothing
      noise = noise * noise * noise;
      
      const offset = noise * noiseScale;
      
      if (isHorizontal) {
        points.push({ x: baseX, y: baseY + offset });
      } else {
        points.push({ x: baseX + offset, y: baseY });
      }
    }
    
    return points;
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

  // ═══════════════════════════════════════════════════════════════════════════════
  // SIDE QUESTS SYSTEM - Appear in all game modes
  // ═══════════════════════════════════════════════════════════════════════════════
  
  function startSideQuests() {
    // Pick 3 random quests from the pool
    const shuffled = [...SIDE_QUEST_POOL].sort(() => Math.random() - 0.5);
    sideQuestsActive = shuffled.slice(0, 3).map(q => ({
      ...q,
      completed: false,
      startTime: Date.now(),
      scoreAtStart: q.scoreGoal ? score : null,
      streakAtStart: q.needHitStreak || q.needEarliestStreak ? 0 : null,
      killCount: 0
    }));
    
    sideQuestTimeRemaining = SIDE_QUEST_DURATION;
    sideQuestStartTime = Date.now();
    
    // Render quests
    updateSideQuestsUI();
    
    // Start countdown timer
    if (sideQuestTimer) clearInterval(sideQuestTimer);
    sideQuestTimer = setInterval(() => {
      if (paused || !running) return;
      
      sideQuestTimeRemaining = Math.max(0, SIDE_QUEST_DURATION - (Date.now() - sideQuestStartTime));
      updateSideQuestsUI();
      
      // Time's up - refresh quests
      if (sideQuestTimeRemaining <= 0) {
        startSideQuests();
      }
    }, 100);
  }
  
  function updateSideQuestsUI() {
    if (!sqMissionsEl || !sqTimerEl) return;
    
    const seconds = Math.ceil(sideQuestTimeRemaining / 1000);
    sqTimerEl.textContent = `${seconds}s`;
    
    sqMissionsEl.innerHTML = sideQuestsActive.map(q => `
      <div class="sq-mission ${q.completed ? 'completed' : ''}">
        <span class="icon">${q.completed ? '✓' : q.icon}</span>
        <span class="text">${q.text}</span>
      </div>
    `).join('');
  }
  
  function checkSideQuests(context = {}) {
    sideQuestsActive.forEach(q => {
      if (q.completed) return;
      
      let complete = false;
      
      // Check various completion conditions
      if (q.check && q.check()) {
        complete = true;
      } else if (context.hit && q.onHit) {
        complete = q.onHit(context.points || 0);
      } else if (context.tendrilKill && q.needTendrilKills) {
        q.killCount++;
        complete = q.killCount >= q.needTendrilKills;
      } else if (context.edgeCreepKill && q.needEdgeCreepKills) {
        q.killCount++;
        complete = q.killCount >= q.needEdgeCreepKills;
      } else if (context.drifterKill && q.needDrifterKills) {
        q.killCount++;
        complete = q.killCount >= q.needDrifterKills;
      } else if (context.hitStreak && q.needHitStreak) {
        complete = context.hitStreak >= q.needHitStreak;
      } else if (context.earliestStreak && q.needEarliestStreak) {
        complete = context.earliestStreak >= q.needEarliestStreak;
      } else if (q.scoreGoal && q.window) {
        const elapsed = Date.now() - q.startTime;
        const scoreGained = score - q.scoreAtStart;
        if (elapsed <= q.window && scoreGained >= q.scoreGoal) {
          complete = true;
        } else if (elapsed > q.window) {
          // Window expired, reset
          q.scoreAtStart = score;
          q.startTime = Date.now();
        }
      } else if (q.duration) {
        // No-miss quests
        const elapsed = Date.now() - q.startTime;
        if (context.miss) {
          // Reset timer on miss
          q.startTime = Date.now();
        } else if (elapsed >= q.duration) {
          complete = true;
        }
      }
      
      if (complete) {
        q.completed = true;
        score += 100; // Bonus for completing side quest
        showSpeech('Side Quest Complete! +100 bonus', '⭐', {ttlMs: 1500});
        playStreakSound();
        updateHeader();
      }
    });
    
    updateSideQuestsUI();
  }
  
  function stopSideQuests() {
    if (sideQuestTimer) {
      clearInterval(sideQuestTimer);
      sideQuestTimer = null;
    }
    sideQuestsActive = [];
    if (sideQuestsPanel) sideQuestsPanel.style.display = 'none';
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
        if (taDriftersCheck) taDriftersCheck.checked = settings.timeAttackSettings.drifters;
        if (taLinesCheck) taLinesCheck.checked = settings.timeAttackSettings.lines;
        if (taShrinkingCheck) taShrinkingCheck.checked = settings.timeAttackSettings.shrinking;
        if (taEdgeCreepersCheck) taEdgeCreepersCheck.checked = settings.timeAttackSettings.edgeStalkers || false;
        if (taRandomCheck) taRandomCheck.checked = settings.timeAttackSettings.random || false;
        if (taTimeLimitInput) {
          taTimeLimitInput.value = settings.timeAttackSettings.timeLimit || 1;
          if (taTimeLimitVal) taTimeLimitVal.textContent = settings.timeAttackSettings.timeLimit || 1;
        }
      });
      
      // Update time limit display when slider changes
      if (taTimeLimitInput && taTimeLimitVal) {
        taTimeLimitInput.addEventListener('input', () => {
          taTimeLimitVal.textContent = taTimeLimitInput.value;
        });
      }
      
      // MUTUAL EXCLUSIVITY: Random vs Manual Selection
      // When Random is checked, uncheck all manual selections
      if (taRandomCheck) {
        taRandomCheck.addEventListener('change', () => {
          if (taRandomCheck.checked) {
            // Uncheck all manual selections when Random is enabled
            if (taDriftersCheck) taDriftersCheck.checked = false;
            if (taLinesCheck) taLinesCheck.checked = false;
            if (taShrinkingCheck) taShrinkingCheck.checked = false;
            if (taEdgeCreepersCheck) taEdgeCreepersCheck.checked = false;
          }
        });
      }
      
      // When any manual selection is checked, uncheck Random
      const taManualCheckboxes = [taDriftersCheck, taLinesCheck, taShrinkingCheck, taEdgeCreepersCheck];
      taManualCheckboxes.forEach(checkbox => {
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            if (checkbox.checked && taRandomCheck) {
              taRandomCheck.checked = false;
            }
          });
        }
      });
      
      if (taSaveBtn) {
        taSaveBtn.addEventListener('click', () => {
          settings.timeAttackSettings.normalPatches = taNormalCheck ? taNormalCheck.checked : true;
          settings.timeAttackSettings.drifters = taDriftersCheck ? taDriftersCheck.checked : true;
          settings.timeAttackSettings.lines = taLinesCheck ? taLinesCheck.checked : false;
          settings.timeAttackSettings.shrinking = taShrinkingCheck ? taShrinkingCheck.checked : true;
          settings.timeAttackSettings.edgeStalkers = taEdgeCreepersCheck ? taEdgeCreepersCheck.checked : false;
          settings.timeAttackSettings.random = taRandomCheck ? taRandomCheck.checked : false;
          settings.timeAttackSettings.timeLimit = taTimeLimitInput ? parseInt(taTimeLimitInput.value) : 1;
          
          // Update the main menu button text
          if (timeAttackDurationSpan) {
            timeAttackDurationSpan.textContent = settings.timeAttackSettings.timeLimit;
          }
          
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

    // Infinite Struggle customization
    if (infiniteCustomizeBtn && infinitePanel) {
      infiniteCustomizeBtn.addEventListener('click', () => {
        startScreen.classList.add('hidden');
        settingsPanel.classList.add('hidden');
        timeAttackPanel.classList.add('hidden');
        infinitePanel.classList.remove('hidden');
        
        // Populate current settings
        if (infAutoEvolveCheck) infAutoEvolveCheck.checked = settings.infiniteSettings.autoEvolve;
        if (infNormalCheck) infNormalCheck.checked = settings.infiniteSettings.normalPatches;
        if (infDriftersCheck) infDriftersCheck.checked = settings.infiniteSettings.drifters;
        if (infLinesCheck) infLinesCheck.checked = settings.infiniteSettings.lines;
        if (infShrinkingCheck) infShrinkingCheck.checked = settings.infiniteSettings.shrinking;
        if (infEdgeCreepersCheck) infEdgeCreepersCheck.checked = settings.infiniteSettings.edgeStalkers || false;
      });
      
      // MUTUAL EXCLUSIVITY: Progressive vs Manual Selection
      // When Progressive is checked, uncheck all manual selections
      if (infAutoEvolveCheck) {
        infAutoEvolveCheck.addEventListener('change', () => {
          if (infAutoEvolveCheck.checked) {
            // Uncheck all manual selections when Progressive is enabled
            if (infDriftersCheck) infDriftersCheck.checked = false;
            if (infLinesCheck) infLinesCheck.checked = false;
            if (infShrinkingCheck) infShrinkingCheck.checked = false;
            if (infEdgeCreepersCheck) infEdgeCreepersCheck.checked = false;
          }
        });
      }
      
      // When any manual selection is checked, uncheck Progressive
      const manualCheckboxes = [infDriftersCheck, infLinesCheck, infShrinkingCheck, infEdgeCreepersCheck];
      manualCheckboxes.forEach(checkbox => {
        if (checkbox) {
          checkbox.addEventListener('change', () => {
            if (checkbox.checked && infAutoEvolveCheck) {
              infAutoEvolveCheck.checked = false;
            }
          });
        }
      });
      
      if (infSaveBtn) {
        infSaveBtn.addEventListener('click', () => {
          settings.infiniteSettings.autoEvolve = infAutoEvolveCheck ? infAutoEvolveCheck.checked : false;
          settings.infiniteSettings.normalPatches = infNormalCheck ? infNormalCheck.checked : false;
          settings.infiniteSettings.drifters = infDriftersCheck ? infDriftersCheck.checked : false;
          settings.infiniteSettings.lines = infLinesCheck ? infLinesCheck.checked : false;
          settings.infiniteSettings.shrinking = infShrinkingCheck ? infShrinkingCheck.checked : false;
          settings.infiniteSettings.edgeStalkers = infEdgeCreepersCheck ? infEdgeCreepersCheck.checked : false;
          saveSettingsToStorage();
          infinitePanel.classList.add('hidden');
          startScreen.classList.remove('hidden');
        });
      }
      
      if (infCancelBtn) {
        infCancelBtn.addEventListener('click', () => {
          infinitePanel.classList.add('hidden');
          startScreen.classList.remove('hidden');
        });
      }
    }

    phoneToggleBtn.addEventListener('click', () => {
      phoneMode = !phoneMode;
      applyArenaDimensions();
    });
    
    // Debug mode toggle
    const debugToggleBtn = document.getElementById('debug-toggle');
    if (debugToggleBtn) {
      debugToggleBtn.addEventListener('click', () => {
        DEBUG_MODE = !DEBUG_MODE;
        debugToggleBtn.textContent = DEBUG_MODE ? 'Debug: On' : 'Debug: Off';
        debugToggleBtn.style.background = DEBUG_MODE ? 'rgba(255, 0, 0, 0.2)' : 'var(--bg-dark)';
        debugToggleBtn.style.color = DEBUG_MODE ? 'yellow' : '';
        
        // Show notification
        const notif = document.createElement('div');
        notif.className = 'debug-notification';
        notif.textContent = DEBUG_MODE ? '🔴 Debug Mode: All enemies now bright red/yellow' : '✓ Debug Mode: Off';
        notif.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: ' + (DEBUG_MODE ? 'yellow' : 'white') + '; padding: 20px 40px; border-radius: 8px; font-size: 18px; z-index: 100000; border: 2px solid ' + (DEBUG_MODE ? 'red' : 'green') + ';';
        document.body.appendChild(notif);
        setTimeout(() => notif.remove(), 2000);
      });
    }
    
    // Hide phone toggle on actual mobile devices
    if (isMobileDevice) {
      phoneToggleBtn.style.display = 'none';
    }

    // Vision health tips for pause modal
    const visionTips = [
      "Take regular breaks using the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds.",
      "Blink frequently to prevent dry eyes. We blink less when focusing on screens.",
      "Adjust your screen brightness to match your surroundings to reduce eye strain.",
      "Position your screen 20-26 inches from your eyes, slightly below eye level.",
      "Use artificial tears if your eyes feel dry during extended screen time.",
      "Ensure proper lighting - avoid glare and overly bright or dim environments.",
      "Consider the 10-10-10 rule: every 10 minutes, look 10 feet away for 10 seconds.",
      "Stay hydrated - drinking water helps maintain moisture in your eyes.",
      "Adjust text size and contrast for comfortable reading without squinting.",
      "Get regular eye exams to detect vision changes early.",
      "Reduce blue light exposure in the evening to improve sleep quality.",
      "Practice eye exercises: roll your eyes, focus near and far, trace figure-8s.",
      "Keep your screen clean to reduce glare and improve clarity.",
      "Use the palm method: rub hands together, cup over closed eyes for 30 seconds.",
      "Maintain good posture to reduce neck strain which can affect vision.",
      "Eat foods rich in omega-3, vitamin A, and lutein for eye health.",
      "Limit screen time before bed to improve sleep and reduce eye fatigue.",
      "Use a humidifier in dry environments to prevent eye irritation.",
      "Avoid rubbing your eyes - it can cause irritation and spread germs.",
      "Give your eyes a workout: practice focusing on objects at varying distances."
    ];

    let pauseModalOverlay = null;

    function showPauseModal() {
      // Remove any existing modal first
      if (pauseModalOverlay) {
        pauseModalOverlay.remove();
      }
      
      const overlay = document.createElement('div');
      overlay.className = 'story-dialog-overlay pause-modal-overlay';
      overlay.style.background = 'rgba(0,0,0,0.85)';
      overlay.style.pointerEvents = 'none'; // Don't block clicks outside dialog
      pauseModalOverlay = overlay;
      
      const dialog = document.createElement('div');
      dialog.className = 'story-dialog pause-modal';
      dialog.style.maxWidth = '500px';
      dialog.style.padding = '24px';
      dialog.style.pointerEvents = 'auto'; // Allow clicks on dialog
      
      const title = document.createElement('div');
      title.className = 'pause-title';
      title.style.fontSize = '24px';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '16px';
      title.style.textAlign = 'center';
      title.textContent = '⏸ Game Paused';
      
      const tip = document.createElement('div');
      tip.className = 'vision-tip';
      tip.style.fontSize = '15px';
      tip.style.lineHeight = '1.6';
      tip.style.marginBottom = '20px';
      tip.style.padding = '16px';
      tip.style.background = 'rgba(110,168,255,0.1)';
      tip.style.borderRadius = '8px';
      tip.style.borderLeft = '4px solid var(--accent)';
      
      const randomTip = visionTips[Math.floor(Math.random() * visionTips.length)];
      tip.innerHTML = `<strong>👁️ Vision Health Tip:</strong><br>${randomTip}`;
      
      const resumeBtn = document.createElement('button');
      resumeBtn.className = 'btn';
      resumeBtn.style.width = '100%';
      resumeBtn.style.padding = '12px';
      resumeBtn.textContent = '▶️ Resume Game';
      resumeBtn.onclick = () => {
        hidePauseModal();
        // Manually unpause without triggering click event
        resumeGame();
      };
      
      dialog.appendChild(title);
      dialog.appendChild(tip);
      dialog.appendChild(resumeBtn);
      overlay.appendChild(dialog);
      document.body.appendChild(overlay);
    }

    function hidePauseModal() {
      if (pauseModalOverlay) {
        pauseModalOverlay.remove();
        pauseModalOverlay = null;
      }
    }

    function resumeGame() {
      if (!paused || !running) return;
      
      paused = false;
      pauseResumeBtn.textContent = '⏸';
      pauseResumeBtn.title = 'Pause';
      
      // Resume what was running before pause
      const pausedState = window._pausedState || {};
      
      // Resume spawning if it was active
      if (pausedState.hadSpawnTimer) {
        const freqMs = settings.spawnSecs * 1000;
        spawnTimer = setInterval(() => {
          if (paused || !running) return;
          if (activeTargets.size >= settings.maxConcurrent) return;
          checkProgressiveUnlocks();
          createTargetInstance();
        }, freqMs);
      }
      
      // Resume Tendrils if they were active and should still spawn
      if (pausedState.hadLineSpawnTimer && shouldSpawnTendrils()) {
        startLineObstacles();
      }
      
      // Resume Edge Stalkers if they were active and should still spawn
      if (pausedState.hadEdgeCreepSpawnTimer && shouldSpawnEdgeCreepers()) {
        startEdgeCreepers();
      }
      
      // Resume party events if active
      if (pausedState.hadPartyEventTimer && mode === 'quest') {
        startPartyEvents();
      }
      
      // Resume audio
      if (audioCtx) audioCtx.resume();
      
      window._pausedState = null;
    }

    pauseResumeBtn.addEventListener('click', () => {
      if (!running) return;
      
      if (!paused) {
        // PAUSING
        paused = true;
        pauseResumeBtn.textContent = '▶️';
        pauseResumeBtn.title = 'Resume';
        
        // Show pause modal with vision tip
        showPauseModal();
        
        // Track what was running before pause
        window._pausedState = {
          hadSpawnTimer: !!spawnTimer,
          hadLineSpawnTimer: !!lineSpawnTimer,
          hadEdgeCreepSpawnTimer: !!edgeCreepSpawnTimer,
          hadPartyEventTimer: !!partyEventTimer
        };
        
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
          lineSpawnTimer = null;
        }
        // Pause Edge Stalkers
        if (edgeCreepSpawnTimer) {
          clearInterval(edgeCreepSpawnTimer);
          edgeCreepSpawnTimer = null;
        }
        // Pause party events
        if (partyEventTimer) {
          clearTimeout(partyEventTimer);
          partyEventTimer = null;
        }
        // Pause timer countdown (Time Attack mode)
        if (timeTicker) {
          // Timer will continue but not decrement due to paused check in tick function
        }
      } else {
        // RESUMING
        hidePauseModal();
        resumeGame();
      }
    });

    backToMenuBtn.addEventListener('click', () => {
      // CRITICAL: Stop ALL spawning before returning to menu
      hidePauseModal(); // Remove pause modal if showing
      paused = false; // Reset pause state
      running = false; // Stop game
      stopSpawning(); // This clears all timers
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
        questPanel.classList.toggle('hidden');
        // Icon button doesn't need text updates
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

    document.addEventListener('keydown', (ev) => { 
      if (ev.code === 'Space' && running) { 
        ev.preventDefault();
        pauseResumeBtn.click(); // Use the button's click handler for consistency
      } 
    });
    window.addEventListener('resize', () => applyArenaDimensions());
  }

  // initialize
  populateSettingsUI();
  updateHighScoreDisplays();
  bindUI();
  
  // Initialize Time Attack duration display
  if (timeAttackDurationSpan) {
    timeAttackDurationSpan.textContent = settings.timeAttackSettings.timeLimit || 1;
  }
  
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

  function showLevelCompleteModal(completedLevel, onContinue) {
    // Pause game
    paused = true;
    running = false;
    
    const overlay = document.createElement('div');
    overlay.className = 'story-dialog-overlay mission-briefing';
    overlay.style.zIndex = '99999';
    
    const dialog = document.createElement('div');
    dialog.className = 'story-dialog';
    dialog.style.maxWidth = '500px';
    
    dialog.innerHTML = `
      <div class="mission-title jrpg">\ud83c\udf96\ufe0f Level ${completedLevel} Complete!</div>
      <div class="mission-dialogue" style="margin: 20px 0; font-size: 15px;">
        <p>Objectives achieved. The party regroups and prepares for the next challenge.</p>
        <p style="color: var(--good); font-weight: 700;">Party healed +50 HP</p>
      </div>
      <div class="decision-buttons">
        <button class="btn decision-btn" id="level-continue-btn">Continue to Level ${completedLevel + 1}</button>
      </div>
    `;
    
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
    
    document.getElementById('level-continue-btn').addEventListener('click', () => {
      overlay.remove();
      paused = false;
      running = true;
      if (onContinue) onContinue();
    });
  }

  function objectiveTooltip(o){
    switch(o.type){
      case 'scoreAtLeast': return `Reach a total score of at least ${o.target} this run.`;
      case 'earliestAtLeast': return `Achieve a single click worth \u2265 ${o.target} points.`;
      case 'streakAtLeast': return `Chain ${o.target} consecutive clicks each worth \u2265 20 points.`;
      case 'hitsAtLeast': return `Land at least ${o.target} total hits.`;
      default: return 'Keep sharpening your focus to progress.';
    }
  }

  function questCheckCompletion(){
    if (!questState || !questState.active) return;
    const allDone = questState.objectives.every(o=>o.done);
    if (allDone) {
      showSpeech(questState.story.clear, '🎖️');
      
      // Show level completion modal
      if (questState.level >= 5) {
        // Final victory
        showSpeech(questState.story.finale, '🏆', { ttlMs: 2400 });
        setTimeout(()=> { endGame(); clearQuestState(); }, 1600);
      } else {
        // Level complete - show modal and advance
        showLevelCompleteModal(questState.level, () => {
          questState.level++;
          questState.objectives = makeObjectives(questState.level);
          updateQuestObjectivesUI();
          saveQuestState();
          
          // Heal party between levels
          healParty(50);
          showSpeech(`Level ${questState.level} - ${questState.story.intro}`, '⚔️', {ttlMs: 2200});
        });
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