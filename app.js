/**
 * EyeSoar - Advanced Vision Training Game
 * Complete UI redesign with RPG-inspired interface
 * Mobile-first, cross-platform compatible
 */

(() => {
  'use strict';

  // =================================================================
  // DOM REFERENCES (New Screen System)
  // =================================================================
  
  // Screens
  const splashScreen = document.getElementById('splash-screen');
  const mainMenuScreen = document.getElementById('main-menu-screen');
  const settingsScreen = document.getElementById('settings-screen');
  const timeAttackSettingsScreen = document.getElementById('time-attack-settings-screen');
  const infiniteSettingsScreen = document.getElementById('infinite-settings-screen');
  const heroRosterScreen = document.getElementById('hero-roster-screen');
  const gameShell = document.getElementById('game-shell');
  const pauseScreen = document.getElementById('pause-screen');
  
  // Splash Screen
  const splashStartBtn = document.getElementById('splash-start');
  
  // Main Menu
  const menuTimeAttackBtn = document.getElementById('menu-time-attack');
  const menuInfiniteBtn = document.getElementById('menu-infinite');
  const menuQuestBtn = document.getElementById('menu-quest');
  const menuHeroRosterBtn = document.getElementById('menu-hero-roster');
  const menuSettingsBtn = document.getElementById('menu-settings');
  const hsTimeEl = document.getElementById('hs-time');
  const hsInfiniteEl = document.getElementById('hs-infinite');
  
  // Settings Screen
  const settingFullscreen = document.getElementById('setting-fullscreen');
  const settingBgColor = document.getElementById('setting-bg-color');
  const settingPatchType = document.getElementById('setting-patch-type');
  const settingPatchSize = document.getElementById('setting-patch-size');
  const settingPatchSizeVal = document.getElementById('setting-patch-size-val');
  const settingBrightness = document.getElementById('setting-brightness');
  const settingBrightnessVal = document.getElementById('setting-brightness-val');
  const settingLambda = document.getElementById('setting-lambda');
  const settingLambdaVal = document.getElementById('setting-lambda-val');
  const settingContrast = document.getElementById('setting-contrast');
  const settingContrastVal = document.getElementById('setting-contrast-val');
  const settingSigma = document.getElementById('setting-sigma');
  const settingSigmaVal = document.getElementById('setting-sigma-val');
  const settingSegmentation = document.getElementById('setting-segmentation');
  const settingSpawnSecs = document.getElementById('setting-spawn-secs');
  const settingSpawnSecsVal = document.getElementById('setting-spawn-secs-val');
  const settingMissPenalty = document.getElementById('setting-miss-penalty');
  const settingMusicEnabled = document.getElementById('setting-music-enabled');
  const settingMusicVol = document.getElementById('setting-music-vol');
  const settingMusicVolVal = document.getElementById('setting-music-vol-val');
  const settingsSaveBtn = document.getElementById('settings-save');
  const settingsCancelBtn = document.getElementById('settings-cancel');
  
  // Time Attack Settings
  const taProgressiveCheck = document.getElementById('ta-progressive');
  const taEnemyList = document.getElementById('ta-enemy-list');
  const taNormalPatchesCheck = document.getElementById('ta-normal-patches');
  const taFadersCheck = document.getElementById('ta-faders');
  const taDriftersCheck = document.getElementById('ta-drifters');
  const taShrinkingCheck = document.getElementById('ta-shrinking');
  const taTendrilsStraightCheck = document.getElementById('ta-tendrils-straight');
  const taTendrilsZigzagCheck = document.getElementById('ta-tendrils-zigzag');
  const taTendrilsWaveCheck = document.getElementById('ta-tendrils-wave');
  const taEdgeCrawlersCheck = document.getElementById('ta-edge-crawlers');
  const taSettingsSaveBtn = document.getElementById('ta-settings-save');
  const taSettingsCancelBtn = document.getElementById('ta-settings-cancel');
  
  // Infinite Settings
  const infProgressiveCheck = document.getElementById('inf-progressive');
  const infEnemyList = document.getElementById('inf-enemy-list');
  const infNormalPatchesCheck = document.getElementById('inf-normal-patches');
  const infFadersCheck = document.getElementById('inf-faders');
  const infDriftersCheck = document.getElementById('inf-drifters');
  const infShrinkingCheck = document.getElementById('inf-shrinking');
  const infTendrilsStraightCheck = document.getElementById('inf-tendrils-straight');
  const infTendrilsZigzagCheck = document.getElementById('inf-tendrils-zigzag');
  const infTendrilsWaveCheck = document.getElementById('inf-tendrils-wave');
  const infEdgeCrawlersCheck = document.getElementById('inf-edge-crawlers');
  const infSettingsSaveBtn = document.getElementById('inf-settings-save');
  const infSettingsCancelBtn = document.getElementById('inf-settings-cancel');
  
  // Hero Roster
  const activePartyGrid = document.getElementById('active-party-grid');
  const availableHeroesGrid = document.getElementById('available-heroes-grid');
  const miaHeroesGrid = document.getElementById('mia-heroes-grid');
  const departedHeroesGrid = document.getElementById('departed-heroes-grid');
  const rosterExitBtn = document.getElementById('roster-exit');
  
  // Game Shell
  const gameModeLabel = document.getElementById('game-mode');
  const statScore = document.getElementById('stat-score');
  const statAvg = document.getElementById('stat-avg');
  const statHits = document.getElementById('stat-hits');
  const statMisses = document.getElementById('stat-misses');
  const timeStatItem = document.getElementById('time-stat-item');
  const statTime = document.getElementById('stat-time');
  const gamePauseBtn = document.getElementById('game-pause');
  const gameMenuBtn = document.getElementById('game-menu');
  const gameArea = document.getElementById('game-area');
  const speechLayer = document.getElementById('speech-layer');
  const questObjectivesPanel = document.getElementById('quest-objectives-panel');
  const partyDisplay = document.getElementById('party-display');
  
  // Pause Screen
  const visionTipText = document.getElementById('vision-tip-text');
  const pauseScore = document.getElementById('pause-score');
  const pauseHits = document.getElementById('pause-hits');
  const pauseAvg = document.getElementById('pause-avg');
  const pauseResumeBtn = document.getElementById('pause-resume');
  const pauseMenuBtn = document.getElementById('pause-menu');
  
  // Modals
  const heroModal = document.getElementById('hero-modal');
  const heroModalClose = document.getElementById('hero-modal-close');
  const heroName = document.getElementById('hero-name');
  const heroDetailBody = document.getElementById('hero-detail-body');
  const missionBriefingModal = document.getElementById('mission-briefing-modal');
  const missionBriefingBody = document.getElementById('mission-briefing-body');
  const missionStartBtn = document.getElementById('mission-start');
  const carnageReportModal = document.getElementById('carnage-report-modal');
  const carnageReportBody = document.getElementById('carnage-report-body');
  const carnageContinueBtn = document.getElementById('carnage-continue');

  // =================================================================
  // GLOBAL STATE
  // =================================================================
  
  let currentScreen = 'splash-screen';
  let gameMode = null; // 'time', 'infinite', 'quest'
  let isPaused = false;
  let isGameRunning = false;
  
  // Game stats
  let score = 0;
  let hits = 0;
  let misses = 0;
  let totalPointsFromHits = 0;
  let earliestHit = 0;
  let streakCount = 0;
  
  // Timers
  let spawnTimer = null;
  let gameTimer = null;
  let timeRemaining = 60;
  
  // Active targets
  const activeTargets = new Set();
  
  // Audio Context
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const audioCtx = AudioCtx ? new AudioCtx() : null;
  let musicState = { playing: false, mode: null, nodes: [], gain: null };

  // =================================================================
  // SETTINGS & PERSISTENCE
  // =================================================================
  
  const defaultSettings = {
    // Display
    fullscreen: false,
    bgColor: '#a6a6a6',
    
    // Gabor Patch
    patchType: 'gabor',
    patchSize: 88,
    brightness: 1.0,
    lambda: 12,
    contrast: 0.18,
    sigma: 30,
    segmentation: '0',
    
    // Gameplay
    spawnSecs: 1.2,
    missPenalty: 50,
    
    // Audio
    musicEnabled: true,
    musicVolume: 0.45,
    
    // Advanced gameplay
    maxPerfectScore: 50,
    scoringExp: 8.0,
    maxConcurrent: 6,
    fadeMinSecs: 20,
    fadeMaxSecs: 30,
    
    // Time Attack enemy settings
    timeAttackEnemies: {
      progressive: false,
      normalPatches: true,
      faders: false,
      drifters: false,
      shrinking: false,
      tendrilsStraight: false,
      tendrilsZigzag: false,
      tendrilsWave: false,
      edgeCrawlers: false
    },
    
    // Infinite enemy settings
    infiniteEnemies: {
      progressive: true,
      normalPatches: true,
      faders: false,
      drifters: false,
      shrinking: false,
      tendrilsStraight: false,
      tendrilsZigzag: false,
      tendrilsWave: false,
      edgeCrawlers: false
    }
  };
  
  let settings = Object.assign({}, defaultSettings);
  
  function loadSettings() {
    try {
      const saved = localStorage.getItem('eyesoar.settings.v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        settings = Object.assign({}, defaultSettings, parsed);
      }
    } catch (e) {
      console.warn('Failed to load settings:', e);
    }
  }
  
  function saveSettings() {
    try {
      localStorage.setItem('eyesoar.settings.v1', JSON.stringify(settings));
    } catch (e) {
      console.warn('Failed to save settings:', e);
    }
  }
  
  function loadHighScores() {
    try {
      const saved = localStorage.getItem('eyesoar.highscores.v1');
      return saved ? JSON.parse(saved) : { time: 0, infiniteAvg: 0 };
    } catch (e) {
      return { time: 0, infiniteAvg: 0 };
    }
  }
  
  function saveHighScores(scores) {
    try {
      localStorage.setItem('eyesoar.highscores.v1', JSON.stringify(scores));
    } catch (e) {
      console.warn('Failed to save high scores:', e);
    }
  }
  
  function updateHighScoresDisplay() {
    const scores = loadHighScores();
    hsTimeEl.textContent = scores.time > 0 ? scores.time : '—';
    hsInfiniteEl.textContent = scores.infiniteAvg > 0 ? scores.infiniteAvg.toFixed(2) : '—';
  }

  // =================================================================
  // SCREEN NAVIGATION SYSTEM
  // =================================================================
  
  function showScreen(screenId) {
    // Hide all screens
    const allScreens = document.querySelectorAll('.screen');
    allScreens.forEach(screen => {
      screen.classList.remove('active');
      screen.classList.add('hidden');
    });
    
    // Hide game shell
    if (gameShell) gameShell.classList.add('hidden');
    
    // Show target screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
      targetScreen.classList.remove('hidden');
      targetScreen.classList.add('active');
      currentScreen = screenId;
    }
    
    // Special handling for game shell
    if (screenId === 'game-shell') {
      gameShell.classList.remove('hidden');
    }
  }
  
  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('hidden');
    }
  }
  
  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('hidden');
    }
  }

  // =================================================================
  // SETTINGS UI
  // =================================================================
  
  function populateSettingsUI() {
    if (settingFullscreen) settingFullscreen.checked = settings.fullscreen;
    if (settingBgColor) settingBgColor.value = settings.bgColor;
    if (settingPatchType) settingPatchType.value = settings.patchType;
    if (settingPatchSize) {
      settingPatchSize.value = settings.patchSize;
      settingPatchSizeVal.textContent = settings.patchSize + 'px';
    }
    if (settingBrightness) {
      settingBrightness.value = settings.brightness;
      settingBrightnessVal.textContent = Number(settings.brightness).toFixed(2);
    }
    if (settingLambda) {
      settingLambda.value = settings.lambda;
      settingLambdaVal.textContent = settings.lambda + 'px';
    }
    if (settingContrast) {
      settingContrast.value = settings.contrast;
      settingContrastVal.textContent = Number(settings.contrast).toFixed(2);
    }
    if (settingSigma) {
      settingSigma.value = settings.sigma;
      settingSigmaVal.textContent = settings.sigma + 'px';
    }
    if (settingSegmentation) settingSegmentation.value = settings.segmentation;
    if (settingSpawnSecs) {
      settingSpawnSecs.value = settings.spawnSecs;
      settingSpawnSecsVal.textContent = Number(settings.spawnSecs).toFixed(2) + 's';
    }
    if (settingMissPenalty) settingMissPenalty.value = settings.missPenalty;
    if (settingMusicEnabled) settingMusicEnabled.checked = settings.musicEnabled;
    if (settingMusicVol) {
      settingMusicVol.value = settings.musicVolume;
      settingMusicVolVal.textContent = Number(settings.musicVolume).toFixed(2);
    }
  }
  
  function applySettingsFromUI() {
    settings.fullscreen = settingFullscreen ? settingFullscreen.checked : false;
    settings.bgColor = settingBgColor ? settingBgColor.value : '#a6a6a6';
    settings.patchType = settingPatchType ? settingPatchType.value : 'gabor';
    settings.patchSize = settingPatchSize ? Number(settingPatchSize.value) : 88;
    settings.brightness = settingBrightness ? Number(settingBrightness.value) : 1.0;
    settings.lambda = settingLambda ? Number(settingLambda.value) : 12;
    settings.contrast = settingContrast ? Number(settingContrast.value) : 0.18;
    settings.sigma = settingSigma ? Number(settingSigma.value) : 30;
    settings.segmentation = settingSegmentation ? settingSegmentation.value : '0';
    settings.spawnSecs = settingSpawnSecs ? Number(settingSpawnSecs.value) : 1.2;
    settings.missPenalty = settingMissPenalty ? Number(settingMissPenalty.value) : 50;
    settings.musicEnabled = settingMusicEnabled ? settingMusicEnabled.checked : true;
    settings.musicVolume = settingMusicVol ? Number(settingMusicVol.value) : 0.45;
    
    // Apply fullscreen to game shell
    if (gameShell) {
      if (settings.fullscreen) {
        gameShell.classList.add('fullscreen');
      } else {
        gameShell.classList.remove('fullscreen');
      }
    }
    
    // Apply background color
    if (gameArea) {
      gameArea.style.background = settings.bgColor;
    }
  }

  // =================================================================
  // ENEMY SELECTION UI
  // =================================================================
  
  function populateEnemySettings(mode) {
    if (mode === 'time') {
      taProgressiveCheck.checked = settings.timeAttackEnemies.progressive;
      taNormalPatchesCheck.checked = settings.timeAttackEnemies.normalPatches;
      taFadersCheck.checked = settings.timeAttackEnemies.faders;
      taDriftersCheck.checked = settings.timeAttackEnemies.drifters;
      taShrinkingCheck.checked = settings.timeAttackEnemies.shrinking;
      taTendrilsStraightCheck.checked = settings.timeAttackEnemies.tendrilsStraight;
      taTendrilsZigzagCheck.checked = settings.timeAttackEnemies.tendrilsZigzag;
      taTendrilsWaveCheck.checked = settings.timeAttackEnemies.tendrilsWave;
      taEdgeCrawlersCheck.checked = settings.timeAttackEnemies.edgeCrawlers;
      updateEnemyCheckboxStates('time');
    } else if (mode === 'infinite') {
      infProgressiveCheck.checked = settings.infiniteEnemies.progressive;
      infNormalPatchesCheck.checked = settings.infiniteEnemies.normalPatches;
      infFadersCheck.checked = settings.infiniteEnemies.faders;
      infDriftersCheck.checked = settings.infiniteEnemies.drifters;
      infShrinkingCheck.checked = settings.infiniteEnemies.shrinking;
      infTendrilsStraightCheck.checked = settings.infiniteEnemies.tendrilsStraight;
      infTendrilsZigzagCheck.checked = settings.infiniteEnemies.tendrilsZigzag;
      infTendrilsWaveCheck.checked = settings.infiniteEnemies.tendrilsWave;
      infEdgeCrawlersCheck.checked = settings.infiniteEnemies.edgeCrawlers;
      updateEnemyCheckboxStates('infinite');
    }
  }
  
  function updateEnemyCheckboxStates(mode) {
    if (mode === 'time') {
      const isProgressive = taProgressiveCheck.checked;
      taEnemyList.classList.toggle('disabled', isProgressive);
      const checkboxes = taEnemyList.querySelectorAll('.enemy-checkbox');
      checkboxes.forEach(cb => cb.disabled = isProgressive);
    } else if (mode === 'infinite') {
      const isProgressive = infProgressiveCheck.checked;
      infEnemyList.classList.toggle('disabled', isProgressive);
      const checkboxes = infEnemyList.querySelectorAll('.enemy-checkbox');
      checkboxes.forEach(cb => cb.disabled = isProgressive);
    }
  }
  
  function applyEnemySettings(mode) {
    if (mode === 'time') {
      settings.timeAttackEnemies.progressive = taProgressiveCheck.checked;
      settings.timeAttackEnemies.normalPatches = taNormalPatchesCheck.checked;
      settings.timeAttackEnemies.faders = taFadersCheck.checked;
      settings.timeAttackEnemies.drifters = taDriftersCheck.checked;
      settings.timeAttackEnemies.shrinking = taShrinkingCheck.checked;
      settings.timeAttackEnemies.tendrilsStraight = taTendrilsStraightCheck.checked;
      settings.timeAttackEnemies.tendrilsZigzag = taTendrilsZigzagCheck.checked;
      settings.timeAttackEnemies.tendrilsWave = taTendrilsWaveCheck.checked;
      settings.timeAttackEnemies.edgeCrawlers = taEdgeCrawlersCheck.checked;
    } else if (mode === 'infinite') {
      settings.infiniteEnemies.progressive = infProgressiveCheck.checked;
      settings.infiniteEnemies.normalPatches = infNormalPatchesCheck.checked;
      settings.infiniteEnemies.faders = infFadersCheck.checked;
      settings.infiniteEnemies.drifters = infDriftersCheck.checked;
      settings.infiniteEnemies.shrinking = infShrinkingCheck.checked;
      settings.infiniteEnemies.tendrilsStraight = infTendrilsStraightCheck.checked;
      settings.infiniteEnemies.tendrilsZigzag = infTendrilsZigzagCheck.checked;
      settings.infiniteEnemies.tendrilsWave = infTendrilsWaveCheck.checked;
      settings.infiniteEnemies.edgeCrawlers = infEdgeCrawlersCheck.checked;
    }
  }

  // =================================================================
  // VISION HEALTH TIPS
  // =================================================================
  
  const visionTips = [
    "Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds.",
    "Blink frequently to keep your eyes moist and reduce strain during screen time.",
    "Adjust your screen brightness to match your surroundings to reduce eye fatigue.",
    "Position your screen 20-26 inches from your eyes, slightly below eye level.",
    "Use artificial tears if your eyes feel dry during extended screen sessions.",
    "Reduce screen glare by adjusting lighting or using an anti-glare screen protector.",
    "Get regular comprehensive eye exams to detect vision problems early.",
    "Eat foods rich in omega-3 fatty acids, vitamins C and E, and zinc for eye health.",
    "Wear sunglasses that block UV rays when outdoors to protect your eyes.",
    "Give your eyes a break with palming: Cover closed eyes with palms for 30 seconds.",
    "Maintain proper posture while using screens to reduce neck and eye strain.",
    "Increase text size and contrast on screens to reduce squinting and strain.",
    "Practice eye exercises like focusing near and far to strengthen eye muscles.",
    "Stay hydrated throughout the day to help maintain eye moisture.",
    "Consider blue light filtering glasses for extended evening screen use.",
    "Ensure adequate lighting in your workspace to reduce eye strain.",
    "Close your eyes periodically for a few seconds to rest and re-lubricate them.",
    "Limit screen time before bed to improve sleep quality and eye rest.",
    "Use the Snellen chart test periodically to monitor your visual acuity.",
    "Vergence exercises (pencil push-ups) can improve eye coordination and focusing."
  ];
  
  function getRandomVisionTip() {
    return visionTips[Math.floor(Math.random() * visionTips.length)];
  }

  // =================================================================
  // AUDIO SYSTEM (Synthesized Music & Sound Effects)
  // =================================================================
  
  function stopMusic() {
    if (musicState.playing) {
      musicState.nodes.forEach(node => {
        try {
          if (node.stop) node.stop();
          if (node.disconnect) node.disconnect();
        } catch (e) { /* ignore */ }
      });
      if (musicState.gain && musicState.gain.disconnect) {
        musicState.gain.disconnect();
      }
      musicState.nodes = [];
      musicState.gain = null;
      musicState.playing = false;
      musicState.mode = null;
    }
  }
  
  function playStartJingle() {
    if (!audioCtx) return;
    try {
      audioCtx.resume();
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      g.gain.value = 0.3;
      
      // Three ascending notes
      [261.63, 329.63, 392.00].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.connect(g);
        osc.start(t + i * 0.15);
        osc.stop(t + i * 0.15 + 0.2);
      });
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }
  
  function playHitSound(earnedPoints) {
    if (!audioCtx) return;
    try {
      audioCtx.resume();
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.2, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
      
      const osc = audioCtx.createOscillator();
      const baseFreq = earnedPoints > 40 ? 800 : earnedPoints > 25 ? 600 : 400;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, t + 0.15);
      osc.type = 'triangle';
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.15);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }
  
  function playMissSound() {
    if (!audioCtx) return;
    try {
      audioCtx.resume();
      const t = audioCtx.currentTime;
      const g = audioCtx.createGain();
      g.connect(audioCtx.destination);
      g.gain.setValueAtTime(0.15, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.2);
      
      const osc = audioCtx.createOscillator();
      osc.frequency.setValueAtTime(150, t);
      osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
      osc.type = 'sawtooth';
      osc.connect(g);
      osc.start(t);
      osc.stop(t + 0.2);
    } catch (e) {
      console.warn('Audio playback failed:', e);
    }
  }
  
  function playBackgroundMusic(mode) {
    if (!audioCtx || !settings.musicEnabled) return;
    stopMusic();
    
    try {
      audioCtx.resume();
      musicState.mode = mode;
      musicState.playing = true;
      
      const masterGain = audioCtx.createGain();
      masterGain.gain.value = settings.musicVolume;
      masterGain.connect(audioCtx.destination);
      musicState.gain = masterGain;
      
      if (mode === 'time') {
        playTimeAttackMusic(masterGain);
      } else if (mode === 'infinite') {
        playInfiniteMusic(masterGain);
      }
    } catch (e) {
      console.warn('Music playback failed:', e);
    }
  }
  
  function playTimeAttackMusic(destination) {
    const t = audioCtx.currentTime;
    const loopDuration = 24; // 24 seconds at 100 BPM
    const beatDuration = 0.6; // 100 BPM = 0.6s per beat
    
    function scheduleLoop(startTime) {
      // Bass drum on strong beats
      [0, 2.4, 4.8, 7.2, 9.6, 12, 14.4, 16.8, 19.2, 21.6].forEach(offset => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = 60;
        osc.type = 'sine';
        osc.connect(g);
        g.connect(destination);
        g.gain.setValueAtTime(0.4, startTime + offset);
        g.gain.exponentialRampToValueAtTime(0.01, startTime + offset + 0.1);
        osc.start(startTime + offset);
        osc.stop(startTime + offset + 0.15);
        musicState.nodes.push(osc);
      });
      
      // Arpeggio pattern
      const notes = [261.63, 329.63, 392.00, 329.63]; // C E G E
      for (let i = 0; i < loopDuration / beatDuration; i++) {
        const freq = notes[i % notes.length];
        const time = startTime + i * beatDuration;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'square';
        osc.connect(g);
        g.connect(destination);
        g.gain.setValueAtTime(0.08, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
        osc.start(time);
        osc.stop(time + 0.35);
        musicState.nodes.push(osc);
      }
      
      // Schedule next loop
      if (musicState.playing && musicState.mode === 'time') {
        setTimeout(() => scheduleLoop(audioCtx.currentTime), loopDuration * 1000 - 100);
      }
    }
    
    scheduleLoop(t + 0.1);
  }
  
  function playInfiniteMusic(destination) {
    const t = audioCtx.currentTime;
    const loopDuration = 16;
    
    function scheduleLoop(startTime) {
      // Ambient bell-like tones
      const bells = [261.63, 293.66, 349.23, 392.00, 440.00];
      bells.forEach((freq, i) => {
        const time = startTime + i * 3.2;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.frequency.value = freq;
        osc.type = 'sine';
        osc.connect(g);
        g.connect(destination);
        g.gain.setValueAtTime(0.12, time);
        g.gain.exponentialRampToValueAtTime(0.01, time + 2.8);
        osc.start(time);
        osc.stop(time + 3);
        musicState.nodes.push(osc);
      });
      
      // Sustained pad
      const pad = audioCtx.createOscillator();
      const padGain = audioCtx.createGain();
      pad.frequency.value = 130.81; // C3
      pad.type = 'triangle';
      pad.connect(padGain);
      padGain.connect(destination);
      padGain.gain.setValueAtTime(0, startTime);
      padGain.gain.linearRampToValueAtTime(0.05, startTime + 2);
      padGain.gain.setValueAtTime(0.05, startTime + loopDuration - 2);
      padGain.gain.linearRampToValueAtTime(0, startTime + loopDuration);
      pad.start(startTime);
      pad.stop(startTime + loopDuration);
      musicState.nodes.push(pad);
      
      // Schedule next loop
      if (musicState.playing && musicState.mode === 'infinite') {
        setTimeout(() => scheduleLoop(audioCtx.currentTime), loopDuration * 1000 - 100);
      }
    }
    
    scheduleLoop(t + 0.1);
  }

  // =================================================================
  // GABOR PATCH RENDERING
  // =================================================================
  
  function createGaborCanvas(size, lambda, thetaRad, phase, sigma, contrast, brightness, segmentationCount, bgHex) {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    ctx.scale(dpr, dpr);
    
    // Parse background color
    let bgR = 128, bgG = 128, bgB = 128;
    if (bgHex && bgHex.startsWith('#')) {
      const hex = bgHex.slice(1);
      if (hex.length === 6) {
        bgR = parseInt(hex.slice(0, 2), 16);
        bgG = parseInt(hex.slice(2, 4), 16);
        bgB = parseInt(hex.slice(4, 6), 16);
      }
    }
    
    // Calculate mean luminance from background
    const meanLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
    
    // Conservative clamping for lambda and sigma
    const minLambda = 3;
    const maxLambda = size / 4;
    const clampedLambda = Math.max(minLambda, Math.min(maxLambda, lambda));
    
    const minSigma = size * 0.12;
    const maxSigma = size * 0.5;
    const clampedSigma = Math.max(minSigma, Math.min(maxSigma, sigma));
    
    // Ensure minimum contrast for visibility
    const minContrast = 0.02;
    const clampedContrast = Math.max(minContrast, contrast);
    
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;
    
    const cx = size / 2;
    const cy = size / 2;
    const cosTheta = Math.cos(thetaRad);
    const sinTheta = Math.sin(thetaRad);
    
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const dx = x - cx;
        const dy = y - cy;
        
        // Rotate coordinates
        const xPrime = dx * cosTheta + dy * sinTheta;
        const yPrime = -dx * sinTheta + dy * cosTheta;
        
        // Gaussian envelope
        const distSq = xPrime * xPrime + yPrime * yPrime;
        const gaussEnv = Math.exp(-distSq / (2 * clampedSigma * clampedSigma));
        
        // Sinusoidal grating
        const sinusoid = Math.cos((2 * Math.PI * xPrime) / clampedLambda + phase);
        
        // Scientific Gabor formula: I = mean * (1 + C * G_env * cos(...))
        let intensity = meanLum * (1 + clampedContrast * gaussEnv * sinusoid);
        
        // Apply brightness multiplier
        intensity *= brightness;
        
        // Clamp to valid range
        intensity = Math.max(0, Math.min(255, intensity));
        
        // Apply segmentation (quantization) if requested
        if (segmentationCount > 0) {
          const levels = segmentationCount;
          intensity = Math.round((intensity / 255) * (levels - 1)) * (255 / (levels - 1));
        }
        
        const idx = (y * size + x) * 4;
        data[idx] = intensity;
        data[idx + 1] = intensity;
        data[idx + 2] = intensity;
        data[idx + 3] = 255;
      }
    }
    
    // Optional: Apply slight blur if segmented (smoothing)
    if (segmentationCount > 0) {
      ctx.putImageData(imgData, 0, 0);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = size;
      tempCanvas.height = size;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.filter = 'blur(0.5px)';
        tempCtx.drawImage(canvas, 0, 0, size, size);
        ctx.clearRect(0, 0, size, size);
        ctx.drawImage(tempCanvas, 0, 0, size, size);
      }
    } else {
      ctx.putImageData(imgData, 0, 0);
    }
    
    return canvas;
  }
  
  function createCircleCanvas(size, brightness, bgHex) {
    const dpr = window.devicePixelRatio || 1;
    const canvas = document.createElement('canvas');
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = size + 'px';
    canvas.style.height = size + 'px';
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return canvas;
    
    ctx.scale(dpr, dpr);
    
    // Parse background color for mean luminance
    let bgR = 128, bgG = 128, bgB = 128;
    if (bgHex && bgHex.startsWith('#')) {
      const hex = bgHex.slice(1);
      if (hex.length === 6) {
        bgR = parseInt(hex.slice(0, 2), 16);
        bgG = parseInt(hex.slice(2, 4), 16);
        bgB = parseInt(hex.slice(4, 6), 16);
      }
    }
    
    const meanLum = 0.299 * bgR + 0.587 * bgG + 0.114 * bgB;
    let intensity = meanLum * brightness;
    intensity = Math.max(0, Math.min(255, intensity));
    
    const gray = Math.round(intensity);
    
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${gray}, ${gray}, ${gray})`;
    ctx.fill();
    
    return canvas;
  }

  // =================================================================
  // UI HELPERS (Speech Bubbles, Indicators, Messages)
  // =================================================================
  
  function showSpeechBubble(emoji, text, durationMs = null) {
    // Auto-calculate duration: 0.5 seconds per word
    if (durationMs === null) {
      const wordCount = text.trim().split(/\s+/).length;
      durationMs = wordCount * 500; // 0.5s per word
    }
    
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    
    const icon = document.createElement('div');
    icon.className = 'speech-icon';
    icon.textContent = emoji;
    
    const textEl = document.createElement('div');
    textEl.className = 'speech-text';
    textEl.textContent = text;
    
    bubble.appendChild(icon);
    bubble.appendChild(textEl);
    
    speechLayer.appendChild(bubble);
    
    setTimeout(() => {
      if (bubble.parentNode) {
        bubble.parentNode.removeChild(bubble);
      }
    }, durationMs);
  }
  
  function showIndicator(x, y, text, isPositive = true) {
    const indicator = document.createElement('div');
    indicator.className = isPositive ? 'indicator positive' : 'indicator negative';
    indicator.textContent = text;
    indicator.style.left = x + 'px';
    indicator.style.top = y + 'px';
    
    gameArea.appendChild(indicator);
    
    setTimeout(() => {
      if (indicator.parentNode) {
        indicator.parentNode.removeChild(indicator);
      }
    }, 1000);
  }
  
  function updateHeader() {
    if (statScore) statScore.textContent = score;
    if (statHits) statHits.textContent = hits;
    if (statMisses) statMisses.textContent = misses;
    
    const avg = hits > 0 ? (totalPointsFromHits / hits).toFixed(2) : '0.00';
    if (statAvg) statAvg.textContent = avg;
    
    if (gameMode === 'time' && statTime) {
      statTime.textContent = timeRemaining + 's';
    }
  }
  
  function clearGameArea() {
    // Remove all targets
    activeTargets.forEach(target => {
      if (target.destroy) target.destroy();
    });
    activeTargets.clear();
    
    // Clear any remaining elements
    while (gameArea.firstChild) {
      gameArea.removeChild(gameArea.firstChild);
    }
    
    // Clear speech bubbles
    while (speechLayer.firstChild) {
      speechLayer.removeChild(speechLayer.firstChild);
    }
  }

  // =================================================================
  // TARGET CREATION & SPAWNING
  // =================================================================
  
  function getEnemyConfig() {
    // Determine which enemies are enabled based on mode and settings
    const config = gameMode === 'time' ? settings.timeAttackEnemies : settings.infiniteEnemies;
    
    if (config.progressive) {
      // Progressive evolution based on score
      const enabledTypes = ['normalPatches'];
      if (score >= 100) enabledTypes.push('faders');
      if (score >= 300) enabledTypes.push('drifters');
      if (score >= 500) enabledTypes.push('shrinking');
      if (score >= 800) enabledTypes.push('tendrilsStraight');
      if (score >= 1200) enabledTypes.push('tendrilsZigzag');
      if (score >= 1600) enabledTypes.push('tendrilsWave');
      // Edge crawlers not in progressive mode
      return enabledTypes;
    } else {
      // Manual selection
      const enabled = [];
      if (config.normalPatches) enabled.push('normalPatches');
      if (config.faders) enabled.push('faders');
      if (config.drifters) enabled.push('drifters');
      if (config.shrinking) enabled.push('shrinking');
      if (config.tendrilsStraight) enabled.push('tendrilsStraight');
      if (config.tendrilsZigzag) enabled.push('tendrilsZigzag');
      if (config.tendrilsWave) enabled.push('tendrilsWave');
      if (config.edgeCrawlers) enabled.push('edgeCrawlers');
      return enabled.length > 0 ? enabled : ['normalPatches'];
    }
  }
  
  function createTargetInstance() {
    // Don't spawn if max concurrent reached
    if (activeTargets.size >= settings.maxConcurrent) return;
    
    // Get enabled enemy types
    const enabledTypes = getEnemyConfig();
    const enemyType = enabledTypes[Math.floor(Math.random() * enabledTypes.length)];
    
    // Size variance: 60%-100% of base size
    const sizeMultiplier = 0.6 + Math.random() * 0.4;
    const actualSize = Math.round(settings.patchSize * sizeMultiplier);
    
    // Random orientation and phase
    const theta = Math.random() * Math.PI;
    const phase = Math.random() * Math.PI * 2;
    
    // Create canvas based on patch type
    let canvas;
    const segCount = parseInt(settings.segmentation, 10);
    
    if (settings.patchType === 'circle') {
      canvas = createCircleCanvas(actualSize, settings.brightness, settings.bgColor);
    } else {
      canvas = createGaborCanvas(
        actualSize,
        settings.lambda,
        theta,
        phase,
        settings.sigma,
        settings.contrast,
        settings.brightness,
        segCount,
        settings.bgColor
      );
    }
    
    // Create target element
    const target = document.createElement('div');
    target.className = 'target';
    if (settings.patchType === 'circle') target.classList.add('circle');
    target.style.width = actualSize + 'px';
    target.style.height = actualSize + 'px';
    target.appendChild(canvas);
    
    // Random spawn position (avoid edges)
    const rect = gameArea.getBoundingClientRect();
    const margin = actualSize;
    const x = margin + Math.random() * (rect.width - actualSize - margin * 2);
    const y = margin + Math.random() * (rect.height - actualSize - margin * 2);
    
    target.style.left = x + 'px';
    target.style.top = y + 'px';
    
    // Fade duration
    const fadeDuration = settings.fadeMinSecs + Math.random() * (settings.fadeMaxSecs - settings.fadeMinSecs);
    const fadeMs = fadeDuration * 1000;
    
    // Target state
    const targetData = {
      el: target,
      type: enemyType,
      size: actualSize,
      startTime: Date.now(),
      fadeDuration: fadeMs,
      x: x,
      y: y,
      clicked: false,
      _raf: null,
      destroy: function() {
        if (this._raf) cancelAnimationFrame(this._raf);
        if (this.el && this.el.parentNode) {
          this.el.parentNode.removeChild(this.el);
        }
        activeTargets.delete(this);
      }
    };
    
    // Apply enemy-specific behaviors
    if (enemyType === 'faders') {
      // Already has fade built-in, just use shorter duration
      targetData.fadeDuration = fadeDuration * 0.7 * 1000;
    } else if (enemyType === 'drifters') {
      // Add drift velocity
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 0.5; // pixels per frame
      targetData.vx = Math.cos(angle) * speed;
      targetData.vy = Math.sin(angle) * speed;
    } else if (enemyType === 'shrinking') {
      // Will shrink over time
      targetData.initialSize = actualSize;
    } else if (enemyType.startsWith('tendrils')) {
      // Tendril movement patterns
      targetData.tendrilAngle = Math.random() * Math.PI * 2;
      targetData.tendrilSpeed = 1.5;
    }
    
    // Click handler
    target.addEventListener('click', (e) => {
      if (targetData.clicked || isPaused) return;
      targetData.clicked = true;
      
      const elapsed = Date.now() - targetData.startTime;
      const progress = Math.min(elapsed / targetData.fadeDuration, 1);
      
      // Score calculation: (1 - progress)^exp * maxPerfect
      const earnedPoints = Math.round(
        Math.pow(1 - progress, settings.scoringExp) * settings.maxPerfectScore
      );
      
      score += earnedPoints;
      hits++;
      totalPointsFromHits += earnedPoints;
      
      if (elapsed < earliestHit || earliestHit === 0) {
        earliestHit = elapsed;
      }
      
      // Show indicator
      const rect = target.getBoundingClientRect();
      const gameRect = gameArea.getBoundingClientRect();
      const indX = rect.left - gameRect.left + actualSize / 2;
      const indY = rect.top - gameRect.top + actualSize / 2;
      showIndicator(indX, indY, '+' + earnedPoints, true);
      
      playHitSound(earnedPoints);
      updateHeader();
      
      targetData.destroy();
    });
    
    // Animate target
    function animate() {
      if (!isGameRunning || isPaused || targetData.clicked) return;
      
      const elapsed = Date.now() - targetData.startTime;
      const progress = Math.min(elapsed / targetData.fadeDuration, 1);
      
      // Apply fade
      target.style.opacity = 1 - progress;
      
      // Apply enemy-specific animations
      if (enemyType === 'drifters' && targetData.vx !== undefined) {
        const rect = gameArea.getBoundingClientRect();
        targetData.x += targetData.vx;
        targetData.y += targetData.vy;
        
        // Bounce off edges
        if (targetData.x < 0 || targetData.x + actualSize > rect.width) {
          targetData.vx *= -1;
          targetData.x = Math.max(0, Math.min(rect.width - actualSize, targetData.x));
        }
        if (targetData.y < 0 || targetData.y + actualSize > rect.height) {
          targetData.vy *= -1;
          targetData.y = Math.max(0, Math.min(rect.height - actualSize, targetData.y));
        }
        
        target.style.left = targetData.x + 'px';
        target.style.top = targetData.y + 'px';
      } else if (enemyType === 'shrinking' && targetData.initialSize) {
        const currentSize = targetData.initialSize * (1 - progress * 0.5);
        target.style.width = currentSize + 'px';
        target.style.height = currentSize + 'px';
        targetData.size = currentSize;
      } else if (enemyType === 'tendrilsStraight') {
        targetData.x += Math.cos(targetData.tendrilAngle) * targetData.tendrilSpeed;
        targetData.y += Math.sin(targetData.tendrilAngle) * targetData.tendrilSpeed;
        target.style.left = targetData.x + 'px';
        target.style.top = targetData.y + 'px';
      } else if (enemyType === 'tendrilsZigzag') {
        const zigzagFreq = 0.1;
        targetData.tendrilAngle += Math.sin(elapsed * zigzagFreq) * 0.1;
        targetData.x += Math.cos(targetData.tendrilAngle) * targetData.tendrilSpeed;
        targetData.y += Math.sin(targetData.tendrilAngle) * targetData.tendrilSpeed;
        target.style.left = targetData.x + 'px';
        target.style.top = targetData.y + 'px';
      } else if (enemyType === 'tendrilsWave') {
        const waveFreq = 0.05;
        const waveAmp = 2;
        targetData.x += Math.cos(targetData.tendrilAngle) * targetData.tendrilSpeed;
        targetData.y += Math.sin(targetData.tendrilAngle) * targetData.tendrilSpeed + Math.sin(elapsed * waveFreq) * waveAmp;
        target.style.left = targetData.x + 'px';
        target.style.top = targetData.y + 'px';
      }
      
      // Check if faded out
      if (progress >= 1) {
        // Miss
        misses++;
        score = Math.max(0, score - settings.missPenalty);
        
        const rect = target.getBoundingClientRect();
        const gameRect = gameArea.getBoundingClientRect();
        const indX = rect.left - gameRect.left + actualSize / 2;
        const indY = rect.top - gameRect.top + actualSize / 2;
        showIndicator(indX, indY, '-' + settings.missPenalty, false);
        
        playMissSound();
        updateHeader();
        
        targetData.destroy();
        return;
      }
      
      targetData._raf = requestAnimationFrame(animate);
    }
    
    gameArea.appendChild(target);
    activeTargets.add(targetData);
    animate();
  }
  
  function startSpawning() {
    if (spawnTimer) clearInterval(spawnTimer);
    spawnTimer = setInterval(() => {
      if (!isPaused && isGameRunning) {
        createTargetInstance();
      }
    }, settings.spawnSecs * 1000);
    
    // Spawn first one immediately
    createTargetInstance();
  }
  
  function stopSpawning() {
    if (spawnTimer) {
      clearInterval(spawnTimer);
      spawnTimer = null;
    }
  }

  // =================================================================
  // GAME CONTROL (Start, End, Pause, Timer)
  // =================================================================
  
  function startGame(mode) {
    // Reset game state
    score = 0;
    hits = 0;
    misses = 0;
    totalPointsFromHits = 0;
    earliestHit = 0;
    streakCount = 0;
    isGameRunning = true;
    isPaused = false;
    gameMode = mode;
    
    // Clear any existing targets
    clearGameArea();
    
    // Update UI
    updateHeader();
    gameModeLabel.textContent = mode === 'time' ? 'Time Attack' : mode === 'infinite' ? 'Infinite Struggle' : 'Quest Mode';
    
    // Show/hide time stat based on mode
    if (timeStatItem) {
      if (mode === 'time') {
        timeStatItem.style.display = '';
        timeRemaining = 60;
        statTime.textContent = timeRemaining + 's';
      } else {
        timeStatItem.style.display = 'none';
      }
    }
    
    // Apply background color
    if (gameArea) {
      gameArea.style.background = settings.bgColor;
    }
    
    // Show game shell
    showScreen('game-shell');
    
    // Start music
    playBackgroundMusic(mode);
    
    // Start spawning
    startSpawning();
    
    // Start timer for Time Attack
    if (mode === 'time') {
      startTimer();
    }
    
    // Welcome message
    const modeNames = { time: 'Time Attack', infinite: 'Infinite Struggle', quest: 'Quest Mode' };
    showSpeechBubble('⚔️', `${modeNames[mode]} begins! May your vision be sharp.`);
  }
  
  function endGame() {
    isGameRunning = false;
    stopSpawning();
    stopMusic();
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    // Clear remaining targets
    clearGameArea();
    
    // Update high scores
    const scores = loadHighScores();
    let newRecord = false;
    
    if (gameMode === 'time' && score > scores.time) {
      scores.time = score;
      newRecord = true;
      saveHighScores(scores);
    } else if (gameMode === 'infinite') {
      const avg = hits > 0 ? totalPointsFromHits / hits : 0;
      if (avg > scores.infiniteAvg) {
        scores.infiniteAvg = avg;
        newRecord = true;
        saveHighScores(scores);
      }
    }
    
    updateHighScoresDisplay();
    
    // Show end message
    if (newRecord) {
      showSpeechBubble('🏆', 'New record! Your vision training is paying off.');
    } else {
      showSpeechBubble('✨', 'Battle complete. Rest your eyes and try again.');
    }
    
    // Return to main menu after delay
    setTimeout(() => {
      showScreen('main-menu-screen');
    }, 3000);
  }
  
  function pauseGame() {
    if (!isGameRunning || isPaused) return;
    
    isPaused = true;
    
    // Stop spawning and timer
    if (spawnTimer) clearInterval(spawnTimer);
    if (gameTimer) clearInterval(gameTimer);
    
    // Pause music
    stopMusic();
    
    // Update pause screen stats
    pauseScore.textContent = score;
    pauseHits.textContent = hits;
    const avg = hits > 0 ? (totalPointsFromHits / hits).toFixed(2) : '0.00';
    pauseAvg.textContent = avg;
    
    // Show random vision tip
    visionTipText.textContent = getRandomVisionTip();
    
    // Show pause screen
    showScreen('pause-screen');
  }
  
  function resumeGame() {
    if (!isGameRunning || !isPaused) return;
    
    isPaused = false;
    
    // Resume spawning
    startSpawning();
    
    // Resume timer if Time Attack
    if (gameMode === 'time') {
      startTimer();
    }
    
    // Resume music
    playBackgroundMusic(gameMode);
    
    // Hide pause screen, show game
    showScreen('game-shell');
    
    // Resume animations for active targets
    activeTargets.forEach(target => {
      if (target._raf) {
        // Targets will auto-resume when animate() checks isPaused
      }
    });
  }
  
  function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
      if (!isPaused) {
        timeRemaining--;
        if (statTime) statTime.textContent = timeRemaining + 's';
        
        if (timeRemaining <= 0) {
          endGame();
        }
      }
    }, 1000);
  }
  
  function returnToMenu() {
    isGameRunning = false;
    isPaused = false;
    stopSpawning();
    stopMusic();
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    clearGameArea();
    showScreen('main-menu-screen');
  }

  // =================================================================
  // EVENT HANDLERS & UI BINDINGS
  // =================================================================
  
  function bindEventHandlers() {
    // Splash screen
    if (splashStartBtn) {
      splashStartBtn.addEventListener('click', () => {
        playStartJingle();
        showScreen('main-menu-screen');
        updateHighScoresDisplay();
      });
    }
    
    // Main menu buttons
    if (menuTimeAttackBtn) {
      menuTimeAttackBtn.addEventListener('click', () => {
        populateEnemySettings('time');
        showScreen('time-attack-settings-screen');
      });
    }
    
    if (menuInfiniteBtn) {
      menuInfiniteBtn.addEventListener('click', () => {
        populateEnemySettings('infinite');
        showScreen('infinite-settings-screen');
      });
    }
    
    if (menuQuestBtn) {
      menuQuestBtn.addEventListener('click', () => {
        showSpeechBubble('🚧', 'Quest Mode is under development. Stay tuned for epic adventures!');
      });
    }
    
    if (menuHeroRosterBtn) {
      menuHeroRosterBtn.addEventListener('click', () => {
        showScreen('hero-roster-screen');
        // TODO: Populate hero roster
      });
    }
    
    if (menuSettingsBtn) {
      menuSettingsBtn.addEventListener('click', () => {
        populateSettingsUI();
        showScreen('settings-screen');
      });
    }
    
    // Settings screen
    if (settingsSaveBtn) {
      settingsSaveBtn.addEventListener('click', () => {
        applySettingsFromUI();
        saveSettings();
        showScreen('main-menu-screen');
        showSpeechBubble('💾', 'Settings saved successfully.');
      });
    }
    
    if (settingsCancelBtn) {
      settingsCancelBtn.addEventListener('click', () => {
        showScreen('main-menu-screen');
      });
    }
    
    // Settings live updates
    if (settingPatchSize) {
      settingPatchSize.addEventListener('input', () => {
        settingPatchSizeVal.textContent = settingPatchSize.value + 'px';
      });
    }
    
    if (settingBrightness) {
      settingBrightness.addEventListener('input', () => {
        settingBrightnessVal.textContent = Number(settingBrightness.value).toFixed(2);
      });
    }
    
    if (settingLambda) {
      settingLambda.addEventListener('input', () => {
        settingLambdaVal.textContent = settingLambda.value + 'px';
      });
    }
    
    if (settingContrast) {
      settingContrast.addEventListener('input', () => {
        settingContrastVal.textContent = Number(settingContrast.value).toFixed(2);
      });
    }
    
    if (settingSigma) {
      settingSigma.addEventListener('input', () => {
        settingSigmaVal.textContent = settingSigma.value + 'px';
      });
    }
    
    if (settingSpawnSecs) {
      settingSpawnSecs.addEventListener('input', () => {
        settingSpawnSecsVal.textContent = Number(settingSpawnSecs.value).toFixed(2) + 's';
      });
    }
    
    if (settingMusicVol) {
      settingMusicVol.addEventListener('input', () => {
        settingMusicVolVal.textContent = Number(settingMusicVol.value).toFixed(2);
      });
    }
    
    // Time Attack Settings
    if (taProgressiveCheck) {
      taProgressiveCheck.addEventListener('change', () => {
        updateEnemyCheckboxStates('time');
      });
    }
    
    if (taSettingsSaveBtn) {
      taSettingsSaveBtn.addEventListener('click', () => {
        applyEnemySettings('time');
        saveSettings();
        startGame('time');
      });
    }
    
    if (taSettingsCancelBtn) {
      taSettingsCancelBtn.addEventListener('click', () => {
        showScreen('main-menu-screen');
      });
    }
    
    // Infinite Settings
    if (infProgressiveCheck) {
      infProgressiveCheck.addEventListener('change', () => {
        updateEnemyCheckboxStates('infinite');
      });
    }
    
    if (infSettingsSaveBtn) {
      infSettingsSaveBtn.addEventListener('click', () => {
        applyEnemySettings('infinite');
        saveSettings();
        startGame('infinite');
      });
    }
    
    if (infSettingsCancelBtn) {
      infSettingsCancelBtn.addEventListener('click', () => {
        showScreen('main-menu-screen');
      });
    }
    
    // Hero Roster
    if (rosterExitBtn) {
      rosterExitBtn.addEventListener('click', () => {
        showScreen('main-menu-screen');
      });
    }
    
    // Game controls
    if (gamePauseBtn) {
      gamePauseBtn.addEventListener('click', () => {
        pauseGame();
      });
    }
    
    if (gameMenuBtn) {
      gameMenuBtn.addEventListener('click', () => {
        if (confirm('Return to main menu? Your progress will be lost.')) {
          returnToMenu();
        }
      });
    }
    
    // Pause screen
    if (pauseResumeBtn) {
      pauseResumeBtn.addEventListener('click', () => {
        resumeGame();
      });
    }
    
    if (pauseMenuBtn) {
      pauseMenuBtn.addEventListener('click', () => {
        if (confirm('Return to main menu? Your progress will be lost.')) {
          returnToMenu();
        }
      });
    }
    
    // Modal close
    if (heroModalClose) {
      heroModalClose.addEventListener('click', () => {
        hideModal('hero-modal');
      });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Spacebar to pause/resume
      if (e.code === 'Space' && isGameRunning) {
        e.preventDefault();
        if (isPaused) {
          resumeGame();
        } else {
          pauseGame();
        }
      }
      
      // Escape to return to menu (with confirmation)
      if (e.code === 'Escape' && isGameRunning && !isPaused) {
        e.preventDefault();
        pauseGame();
      }
    });
    
    // Click on empty area counts as miss
    if (gameArea) {
      gameArea.addEventListener('click', (e) => {
        if (!isGameRunning || isPaused) return;
        
        // Check if click was on empty space (not a target)
        if (e.target === gameArea) {
          misses++;
          score = Math.max(0, score - settings.missPenalty);
          
          showIndicator(e.offsetX, e.offsetY, '-' + settings.missPenalty, false);
          playMissSound();
          updateHeader();
        }
      });
    }
  }

  // =================================================================
  // INITIALIZATION
  // =================================================================
  
  function init() {
    // Load settings
    loadSettings();
    
    // Unlock audio on first user gesture
    document.addEventListener('click', () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }, { once: true });
    
    // Bind all event handlers
    bindEventHandlers();
    
    // Show splash screen
    showScreen('splash-screen');
  }
  
  // Start the app
  init();

})();

  // =================================================================
  // GAME CONTROL (Start, End, Pause, Timer)
  // =================================================================
  
  function startGame(mode) {
    // Reset game state
    score = 0;
    hits = 0;
    misses = 0;
    totalPointsFromHits = 0;
    earliestHit = 0;
    streakCount = 0;
    isGameRunning = true;
    isPaused = false;
    gameMode = mode;
    
    // Clear any existing targets
    clearGameArea();
    
    // Update UI
    updateHeader();
    gameModeLabel.textContent = mode === 'time' ? 'Time Attack' : mode === 'infinite' ? 'Infinite Struggle' : 'Quest Mode';
    
    // Show/hide time stat based on mode
    if (timeStatItem) {
      if (mode === 'time') {
        timeStatItem.style.display = '';
        timeRemaining = 60;
        statTime.textContent = timeRemaining + 's';
      } else {
        timeStatItem.style.display = 'none';
      }
    }
    
    // Apply background color
    if (gameArea) {
      gameArea.style.background = settings.bgColor;
    }
    
    // Show game shell
    showScreen('game-shell');
    
    // Start music
    playBackgroundMusic(mode);
    
    // Start spawning
    startSpawning();
    
    // Start timer for Time Attack
    if (mode === 'time') {
      startTimer();
    }
    
    // Welcome message
    const modeNames = { time: 'Time Attack', infinite: 'Infinite Struggle', quest: 'Quest Mode' };
    showSpeechBubble('⚔️', `${modeNames[mode]} begins! May your vision be sharp.`);
  }
  
  function endGame() {
    isGameRunning = false;
    stopSpawning();
    stopMusic();
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    // Clear remaining targets
    clearGameArea();
    
    // Update high scores
    const scores = loadHighScores();
    let newRecord = false;
    
    if (gameMode === 'time' && score > scores.time) {
      scores.time = score;
      newRecord = true;
      saveHighScores(scores);
    } else if (gameMode === 'infinite') {
      const avg = hits > 0 ? totalPointsFromHits / hits : 0;
      if (avg > scores.infiniteAvg) {
        scores.infiniteAvg = avg;
        newRecord = true;
        saveHighScores(scores);
      }
    }
    
    updateHighScoresDisplay();
    
    // Show end message
    if (newRecord) {
      showSpeechBubble('🏆', 'New record! Your vision training is paying off.');
    } else {
      showSpeechBubble('✨', 'Battle complete. Rest your eyes and try again.');
    }
    
    // Return to main menu after delay
    setTimeout(() => {
      showScreen('main-menu-screen');
    }, 3000);
  }
  
  function pauseGame() {
    if (!isGameRunning || isPaused) return;
    
    isPaused = true;
    
    // Stop spawning and timer
    if (spawnTimer) clearInterval(spawnTimer);
    if (gameTimer) clearInterval(gameTimer);
    
    // Pause music
    stopMusic();
    
    // Update pause screen stats
    pauseScore.textContent = score;
    pauseHits.textContent = hits;
    const avg = hits > 0 ? (totalPointsFromHits / hits).toFixed(2) : '0.00';
    pauseAvg.textContent = avg;
    
    // Show random vision tip
    visionTipText.textContent = getRandomVisionTip();
    
    // Show pause screen
    showScreen('pause-screen');
  }
  
  function resumeGame() {
    if (!isGameRunning || !isPaused) return;
    
    isPaused = false;
    
    // Resume spawning
    startSpawning();
    
    // Resume timer if Time Attack
    if (gameMode === 'time') {
      startTimer();
    }
    
    // Resume music
    playBackgroundMusic(gameMode);
    
    // Hide pause screen, show game
    showScreen('game-shell');
    
    // Resume animations for active targets
    activeTargets.forEach(target => {
      if (target._raf) {
        // Targets will auto-resume when animate() checks isPaused
      }
    });
  }
  
  function startTimer() {
    if (gameTimer) clearInterval(gameTimer);
    
    gameTimer = setInterval(() => {
      if (!isPaused) {
        timeRemaining--;
        if (statTime) statTime.textContent = timeRemaining + 's';
        
        if (timeRemaining <= 0) {
          endGame();
        }
      }
    }, 1000);
  }
  
  function returnToMenu() {
    isGameRunning = false;
    isPaused = false;
    stopSpawning();
    stopMusic();
    
    if (gameTimer) {
      clearInterval(gameTimer);
      gameTimer = null;
    }
    
    clearGameArea();
    showScreen('main-menu-screen');
  }

  // =================================================================
  // EVENT HANDLERS
  // =================================================================
  
  function bindEventHandlers() {
    // Splash screen
    if (splashStartBtn) {
      splashStartBtn.addEventListener('click', () => {
        playStartJingle();
        showScreen('main-menu-screen');
        updateHighScoresDisplay();
      });
    }
    
    // Main menu
    if (menuTimeAttackBtn) {
      menuTimeAttackBtn.addEventListener('click', () => {
        populateEnemySettings('time');
        showScreen('time-attack-settings-screen');
      });
    }
    
    if (menuInfiniteBtn) {
      menuInfiniteBtn.addEventListener('click', () => {
        populateEnemySettings('infinite');
        showScreen('infinite-settings-screen');
      });
    }
    
    if (menuQuestBtn) {
      menuQuestBtn.addEventListener('click', () => {
        showSpeechBubble('🚧', 'Quest Mode is under development. Stay tuned for epic adventures!');
      });
    }
    
    if (menuHeroRosterBtn) {
      menuHeroRosterBtn.addEventListener('click', () => {
        showScreen('hero-roster-screen');
      });
    }
    
    if (menuSettingsBtn) {
      menuSettingsBtn.addEventListener('click', () => {
        populateSettingsUI();
        showScreen('settings-screen');
      });
    }
    
    // Settings
    if (settingsSaveBtn) {
      settingsSaveBtn.addEventListener('click', () => {
        applySettingsFromUI();
        saveSettings();
        showScreen('main-menu-screen');
        showSpeechBubble('💾', 'Settings saved successfully.');
      });
    }
    
    if (settingsCancelBtn) {
      settingsCancelBtn.addEventListener('click', () => {
        showScreen('main-menu-screen');
      });
    }
    
    // Settings live updates
    if (settingPatchSize) settingPatchSize.addEventListener('input', () => settingPatchSizeVal.textContent = settingPatchSize.value + 'px');
    if (settingBrightness) settingBrightness.addEventListener('input', () => settingBrightnessVal.textContent = Number(settingBrightness.value).toFixed(2));
    if (settingLambda) settingLambda.addEventListener('input', () => settingLambdaVal.textContent = settingLambda.value + 'px');
    if (settingContrast) settingContrast.addEventListener('input', () => settingContrastVal.textContent = Number(settingContrast.value).toFixed(2));
    if (settingSigma) settingSigma.addEventListener('input', () => settingSigmaVal.textContent = settingSigma.value + 'px');
    if (settingSpawnSecs) settingSpawnSecs.addEventListener('input', () => settingSpawnSecsVal.textContent = Number(settingSpawnSecs.value).toFixed(2) + 's');
    if (settingMusicVol) settingMusicVol.addEventListener('input', () => settingMusicVolVal.textContent = Number(settingMusicVol.value).toFixed(2));
    
    // Time Attack
    if (taProgressiveCheck) taProgressiveCheck.addEventListener('change', () => updateEnemyCheckboxStates('time'));
    if (taSettingsSaveBtn) {
      taSettingsSaveBtn.addEventListener('click', () => {
        applyEnemySettings('time');
        saveSettings();
        startGame('time');
      });
    }
    if (taSettingsCancelBtn) taSettingsCancelBtn.addEventListener('click', () => showScreen('main-menu-screen'));
    
    // Infinite
    if (infProgressiveCheck) infProgressiveCheck.addEventListener('change', () => updateEnemyCheckboxStates('infinite'));
    if (infSettingsSaveBtn) {
      infSettingsSaveBtn.addEventListener('click', () => {
        applyEnemySettings('infinite');
        saveSettings();
        startGame('infinite');
      });
    }
    if (infSettingsCancelBtn) infSettingsCancelBtn.addEventListener('click', () => showScreen('main-menu-screen'));
    
    // Hero Roster
    if (rosterExitBtn) rosterExitBtn.addEventListener('click', () => showScreen('main-menu-screen'));
    
    // Game controls
    if (gamePauseBtn) gamePauseBtn.addEventListener('click', () => pauseGame());
    if (gameMenuBtn) {
      gameMenuBtn.addEventListener('click', () => {
        if (confirm('Return to main menu? Your progress will be lost.')) returnToMenu();
      });
    }
    
    // Pause
    if (pauseResumeBtn) pauseResumeBtn.addEventListener('click', () => resumeGame());
    if (pauseMenuBtn) {
      pauseMenuBtn.addEventListener('click', () => {
        if (confirm('Return to main menu? Your progress will be lost.')) returnToMenu();
      });
    }
    
    // Modal
    if (heroModalClose) heroModalClose.addEventListener('click', () => hideModal('hero-modal'));
    
    // Keyboard
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && isGameRunning) {
        e.preventDefault();
        isPaused ? resumeGame() : pauseGame();
      }
      if (e.code === 'Escape' && isGameRunning && !isPaused) {
        e.preventDefault();
        pauseGame();
      }
    });
    
    // Click on empty area
    if (gameArea) {
      gameArea.addEventListener('click', (e) => {
        if (!isGameRunning || isPaused || e.target !== gameArea) return;
        misses++;
        score = Math.max(0, score - settings.missPenalty);
        showIndicator(e.offsetX, e.offsetY, '-' + settings.missPenalty, false);
        playMissSound();
        updateHeader();
      });
    }
  }

  // =================================================================
  // INITIALIZATION
  // =================================================================
  
  function init() {
    loadSettings();
    document.addEventListener('click', () => {
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    }, { once: true });
    bindEventHandlers();
    showScreen('splash-screen');
  }
  
  init();
})();
