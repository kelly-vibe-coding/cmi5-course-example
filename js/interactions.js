/**
 * Interactive Elements Handler
 * NovaPay Platform Launch Training
 */

const Interactions = (function() {
  'use strict';

  // Final Exam State
  let examAttempts = 0;
  let examBestScore = 0;
  let examQuestionIndex = 0;
  let examAnswers = [];
  const MAX_EXAM_ATTEMPTS = 3;

  // ==================== INLINE ERROR MESSAGES ====================
  // Replace alert() popups with user-friendly inline messages

  /**
   * Show an inline error message near an element
   * @param {HTMLElement} container - The container to show the message in (e.g., question element)
   * @param {string} message - The error message to display
   * @param {string} type - 'error' | 'warning' | 'info'
   */
  function showInlineMessage(container, message, type = 'error') {
    // Remove any existing inline message in this container
    const existing = container.querySelector('.inline-message');
    if (existing) existing.remove();

    // Create message element
    const msgEl = document.createElement('div');
    msgEl.className = `inline-message inline-message-${type}`;
    msgEl.setAttribute('role', 'alert');
    msgEl.innerHTML = `
      <span class="inline-message-icon">${type === 'error' ? '⚠️' : type === 'warning' ? '⚡' : 'ℹ️'}</span>
      <span class="inline-message-text">${message}</span>
    `;

    // Insert at the top of the container (or before button group)
    const buttonGroup = container.querySelector('.quiz-actions, .exam-actions, .btn');
    if (buttonGroup) {
      buttonGroup.parentNode.insertBefore(msgEl, buttonGroup);
    } else {
      container.insertBefore(msgEl, container.firstChild);
    }

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      msgEl.classList.add('fade-out');
      setTimeout(() => msgEl.remove(), 300);
    }, 5000);

    // Scroll into view if needed
    msgEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    return msgEl;
  }

  /**
   * Add CSS styles for inline messages (called once on init)
   */
  function addInlineMessageStyles() {
    if (document.getElementById('inline-message-styles')) return;

    const style = document.createElement('style');
    style.id = 'inline-message-styles';
    style.textContent = `
      .inline-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        margin: 0.75rem 0;
        border-radius: 8px;
        font-size: 0.9rem;
        font-weight: 500;
        animation: slideIn 0.3s ease-out;
      }
      .inline-message-error {
        background: #FEF2F2;
        border: 1px solid #FECACA;
        color: #DC2626;
      }
      .inline-message-warning {
        background: #FFFBEB;
        border: 1px solid #FDE68A;
        color: #D97706;
      }
      .inline-message-info {
        background: #EFF6FF;
        border: 1px solid #BFDBFE;
        color: #2563EB;
      }
      .inline-message-icon {
        font-size: 1.1rem;
      }
      .inline-message.fade-out {
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease-out;
      }
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Initialize all interactions
   */
  function init() {
    // Add styles for inline error messages
    addInlineMessageStyles();

    initFeatureCards();
    initAccordions();
    initPostBuilderDemo();
    initKnowledgeChecks();
    initFinalExam();
    initWorkflowToggle();
    initDragAndDrop();
    initExclusionRuleBuilder();
    initHotspots();
    initCompleteCourseButton();

    // Check if LMS reset the learner - if so, clear local exam state
    checkForLMSReset();

    // Load exam state from localStorage
    loadExamState();
  }

  /**
   * Check if the LMS has reset the learner's progress
   * This happens when you reset learner progress in SCORM Cloud
   * We detect this by comparing session IDs - a new session means fresh start
   */
  function checkForLMSReset() {
    try {
      // Get the current cmi5 session ID (from the LMS launch)
      const currentSessionId = typeof Cmi5 !== 'undefined' && Cmi5.isConnected()
        ? Cmi5.getConfig().sessionId
        : null;

      if (!currentSessionId) {
        // Not in LMS context, keep local state
        return;
      }

      // Get the last known session ID from localStorage
      const lastSessionId = localStorage.getItem('novapay-platform-launch-last-session-id');

      // If we have a different session ID, the LMS gave us a fresh launch
      // This indicates a potential reset - clear local state
      if (lastSessionId && lastSessionId !== currentSessionId) {
        console.log('[Interactions] New cmi5 session detected - clearing local exam state');
        console.log('  Previous session:', lastSessionId);
        console.log('  Current session:', currentSessionId);

        // Clear exam state
        localStorage.removeItem('novapay-platform-launch-exam-state');

        // Also clear course state (progress tracking)
        localStorage.removeItem('novapay-platform-launch-course-state');

        // Reset in-memory state
        examAttempts = 0;
        examBestScore = 0;
        examQuestionIndex = 0;
        examAnswers = [];
      }

      // Save current session ID for next launch comparison
      localStorage.setItem('novapay-platform-launch-last-session-id', currentSessionId);

    } catch (e) {
      console.warn('Could not check for LMS reset:', e);
    }
  }

  /**
   * Feature Invaders Game (Module 1.2) - v34 ULTIMATE EDITION
   * - Intel popup when destroying targets (shows feature description)
   * - Combo system with multiplier
   * - Accuracy tracking (shots fired vs hits)
   * - Particle explosions
   * - Screen shake effects
   * - Grade system (S/A/B/C/D)
   * - Tighter hit detection
   */
  function initFeatureCards() {
    const gameArea = document.getElementById('invaders-game');
    if (!gameArea) return;

    // === SOUND SYSTEM (Space Invaders style) ===
    // Using Web Audio API to generate authentic 8-bit sounds
    let audioContext = null;
    let soundEnabled = true;

    function initAudio() {
      if (audioContext) return;
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        console.log('[FeatureInvaders] Audio initialized');
      } catch (e) {
        console.warn('[FeatureInvaders] Audio not available:', e);
        soundEnabled = false;
      }
    }

    // Play a specific sound effect
    function playSound(type) {
      if (!soundEnabled || !audioContext) return;

      // Resume audio context if suspended (browser autoplay policy)
      if (audioContext.state === 'suspended') {
        audioContext.resume();
      }

      const now = audioContext.currentTime;

      switch (type) {
        case 'shoot':
          // Classic laser pew sound - short high-pitched blip
          playTone(880, 0.08, 'square', 0.3, now, 1200);
          break;

        case 'hit':
          // Enemy destroyed - descending tone burst
          playTone(600, 0.1, 'square', 0.25, now);
          playTone(400, 0.1, 'square', 0.2, now + 0.05);
          playTone(200, 0.15, 'square', 0.15, now + 0.1);
          break;

        case 'bonusHit':
          // Bonus target - cheerful ascending arpeggio
          playTone(523, 0.08, 'square', 0.2, now);        // C5
          playTone(659, 0.08, 'square', 0.2, now + 0.06); // E5
          playTone(784, 0.12, 'square', 0.25, now + 0.12); // G5
          break;

        case 'healthPickup':
          // Health bubble collected - happy rising tone
          playTone(440, 0.1, 'sine', 0.3, now);
          playTone(554, 0.1, 'sine', 0.3, now + 0.1);
          playTone(659, 0.1, 'sine', 0.3, now + 0.2);
          playTone(880, 0.2, 'sine', 0.4, now + 0.3);
          break;

        case 'playerHit':
          // Player damaged - harsh noise burst
          playNoise(0.3, 0.5, now);
          playTone(150, 0.3, 'sawtooth', 0.3, now);
          break;

        case 'enemyShoot':
          // Enemy fires - lower, menacing
          playTone(180, 0.15, 'square', 0.15, now, 120);
          break;

        case 'escape':
          // Enemy escaped - descending failure sound
          playTone(300, 0.1, 'square', 0.2, now);
          playTone(200, 0.1, 'square', 0.2, now + 0.1);
          playTone(100, 0.2, 'square', 0.25, now + 0.2);
          break;

        case 'waveComplete':
          // Wave complete fanfare
          playTone(523, 0.15, 'square', 0.3, now);        // C5
          playTone(659, 0.15, 'square', 0.3, now + 0.15); // E5
          playTone(784, 0.15, 'square', 0.3, now + 0.3);  // G5
          playTone(1047, 0.3, 'square', 0.4, now + 0.45); // C6
          break;

        case 'gameOver':
          // Game over - sad descending
          playTone(392, 0.3, 'square', 0.3, now);        // G4
          playTone(330, 0.3, 'square', 0.3, now + 0.3);  // E4
          playTone(262, 0.3, 'square', 0.3, now + 0.6);  // C4
          playTone(196, 0.5, 'square', 0.4, now + 0.9);  // G3
          break;

        case 'gameStart':
          // Game starting - exciting ascending
          playTone(262, 0.1, 'square', 0.25, now);       // C4
          playTone(330, 0.1, 'square', 0.25, now + 0.1); // E4
          playTone(392, 0.1, 'square', 0.25, now + 0.2); // G4
          playTone(523, 0.2, 'square', 0.35, now + 0.3); // C5
          break;

        case 'combo':
          // Combo increase - quick high blip
          playTone(1200, 0.05, 'square', 0.15, now);
          break;
      }
    }

    // Generate a tone with optional pitch slide
    function playTone(freq, duration, waveType, volume, startTime, endFreq = null) {
      if (!audioContext) return;

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(freq, startTime);

      if (endFreq) {
        oscillator.frequency.linearRampToValueAtTime(endFreq, startTime + duration);
      }

      gainNode.gain.setValueAtTime(volume * 0.3, startTime); // Master volume reduction
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start(startTime);
      oscillator.stop(startTime + duration + 0.1);
    }

    // Generate noise (for explosions/damage)
    function playNoise(duration, volume, startTime) {
      if (!audioContext) return;

      const bufferSize = audioContext.sampleRate * duration;
      const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = audioContext.createBufferSource();
      noise.buffer = buffer;

      const gainNode = audioContext.createGain();
      gainNode.gain.setValueAtTime(volume * 0.2, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      // Add some filtering for that retro sound
      const filter = audioContext.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2000, startTime);
      filter.frequency.exponentialRampToValueAtTime(200, startTime + duration);

      noise.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(audioContext.destination);

      noise.start(startTime);
      noise.stop(startTime + duration + 0.1);
    }

    // === BACKGROUND MUSIC SYSTEM ===
    // Intro: Starlane Uplink.mp3 / Game: Orbital Credit Run.mp3
    let musicPlaying = false;
    let musicTimeouts = [];
    let currentMusicType = null;
    let musicGain = null;
    let currentSection = 0;

    // Audio elements for MP3 playback
    let introAudio = null;
    let gameAudio = null;

    // Initialize audio elements
    function initMusicAudio() {
      if (!introAudio) {
        introAudio = new Audio('audio/Starlane Uplink.mp3');
        introAudio.loop = true;
        introAudio.volume = 0.5;
      }
      if (!gameAudio) {
        gameAudio = new Audio('audio/Orbital Credit Run.mp3');
        gameAudio.loop = true;
        gameAudio.volume = 0.5;
      }
    }

    // Note frequencies (for procedural game music)
    const N = {
      C2: 65, D2: 73, E2: 82, F2: 87, Fs2: 92, G2: 98, A2: 110, B2: 123,
      C3: 131, Cs3: 139, D3: 147, Ds3: 156, E3: 165, F3: 175, Fs3: 185, G3: 196, Gs3: 208, A3: 220, As3: 233, B3: 247,
      C4: 262, Cs4: 277, D4: 294, Ds4: 311, E4: 330, F4: 349, Fs4: 370, G4: 392, Gs4: 415, A4: 440, As4: 466, B4: 494,
      C5: 523, Cs5: 554, D5: 587, Ds5: 622, E5: 659, F5: 698, Fs5: 740, G5: 784, Gs5: 831, A5: 880, As5: 932, B5: 988,
      C6: 1047, R: 0
    };

    // Timing helper
    function b(beats, bpm) { return (60 / bpm) * beats; }

    // ============================================================
    // INTRO MUSIC - Moody, atmospheric, mysterious (Metroid-style)
    // 4 unique sections, ~50 seconds total before seamless loop
    // ============================================================
    function getIntroSection(section) {
      const t = (beats) => b(beats, 72); // Slower, atmospheric tempo

      const sections = [
        // SECTION A: Mysterious opening - sparse, eerie
        {
          melody: [
            { n: N.E4, d: t(3) }, { n: N.R, d: t(1) },
            { n: N.G4, d: t(2) }, { n: N.A4, d: t(2) },
            { n: N.B4, d: t(4) }, { n: N.R, d: t(2) },
            { n: N.A4, d: t(1.5) }, { n: N.G4, d: t(1.5) }, { n: N.E4, d: t(3) },
            { n: N.R, d: t(2) }, { n: N.D4, d: t(2) }, { n: N.E4, d: t(4) },
            { n: N.R, d: t(4) },
          ],
          bass: [
            { n: N.E2, d: t(8) }, { n: N.E2, d: t(8) },
            { n: N.A2, d: t(8) }, { n: N.E2, d: t(8) },
          ],
          pad: [
            { n: N.B3, d: t(16) }, { n: N.A3, d: t(16) },
          ]
        },
        // SECTION B: Building tension - more melodic movement
        {
          melody: [
            { n: N.B4, d: t(1) }, { n: N.A4, d: t(1) }, { n: N.G4, d: t(1) }, { n: N.A4, d: t(1) },
            { n: N.B4, d: t(2) }, { n: N.D5, d: t(2) },
            { n: N.E5, d: t(4) }, { n: N.R, d: t(2) },
            { n: N.D5, d: t(1) }, { n: N.B4, d: t(1) }, { n: N.A4, d: t(2) },
            { n: N.G4, d: t(2) }, { n: N.A4, d: t(1) }, { n: N.B4, d: t(1) },
            { n: N.A4, d: t(3) }, { n: N.G4, d: t(1) },
            { n: N.E4, d: t(4) }, { n: N.R, d: t(4) },
          ],
          bass: [
            { n: N.G2, d: t(4) }, { n: N.D3, d: t(4) },
            { n: N.E2, d: t(4) }, { n: N.B2, d: t(4) },
            { n: N.A2, d: t(4) }, { n: N.E3, d: t(4) },
            { n: N.G2, d: t(4) }, { n: N.E2, d: t(4) },
          ],
          pad: [
            { n: N.D4, d: t(8) }, { n: N.B3, d: t(8) },
            { n: N.C4, d: t(8) }, { n: N.E3, d: t(8) },
          ]
        },
        // SECTION C: Climax - fuller, more intense
        {
          melody: [
            { n: N.E5, d: t(1) }, { n: N.Fs5, d: t(1) }, { n: N.G5, d: t(2) },
            { n: N.A5, d: t(1) }, { n: N.G5, d: t(1) }, { n: N.Fs5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(2) }, { n: N.E5, d: t(1) }, { n: N.Fs5, d: t(1) },
            { n: N.G5, d: t(4) }, { n: N.R, d: t(2) },
            { n: N.Fs5, d: t(1) }, { n: N.E5, d: t(1) }, { n: N.D5, d: t(2) },
            { n: N.B4, d: t(2) }, { n: N.A4, d: t(2) },
            { n: N.B4, d: t(4) }, { n: N.R, d: t(4) },
          ],
          bass: [
            { n: N.E2, d: t(2) }, { n: N.E3, d: t(2) }, { n: N.E2, d: t(2) }, { n: N.E3, d: t(2) },
            { n: N.A2, d: t(2) }, { n: N.A3, d: t(2) }, { n: N.A2, d: t(2) }, { n: N.A3, d: t(2) },
            { n: N.D2, d: t(2) }, { n: N.D3, d: t(2) }, { n: N.G2, d: t(2) }, { n: N.G3, d: t(2) },
            { n: N.E2, d: t(4) }, { n: N.E2, d: t(4) },
          ],
          pad: [
            { n: N.G4, d: t(8) }, { n: N.A4, d: t(8) },
            { n: N.Fs4, d: t(8) }, { n: N.E4, d: t(8) },
          ]
        },
        // SECTION D: Resolution - calming, leads back to loop
        {
          melody: [
            { n: N.E4, d: t(2) }, { n: N.G4, d: t(2) },
            { n: N.A4, d: t(2) }, { n: N.B4, d: t(1) }, { n: N.A4, d: t(1) },
            { n: N.G4, d: t(4) }, { n: N.R, d: t(2) },
            { n: N.D4, d: t(1) }, { n: N.E4, d: t(1) }, { n: N.G4, d: t(2) },
            { n: N.A4, d: t(2) }, { n: N.G4, d: t(2) },
            { n: N.E4, d: t(6) },
            { n: N.R, d: t(6) },
          ],
          bass: [
            { n: N.E2, d: t(8) }, { n: N.A2, d: t(8) },
            { n: N.G2, d: t(8) }, { n: N.E2, d: t(8) },
          ],
          pad: [
            { n: N.G3, d: t(16) }, { n: N.E3, d: t(16) },
          ]
        }
      ];
      return sections[section % sections.length];
    }

    // ============================================================
    // GAME MUSIC - Intense, driving, engaging action music
    // 6 unique sections, ~60 seconds total, varied and exciting
    // ============================================================
    function getGameSection(section) {
      const t = (beats) => b(beats, 150); // Fast, intense tempo

      const sections = [
        // SECTION A: Main theme - energetic hook
        {
          melody: [
            { n: N.E5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.R, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.R, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.E5, d: t(1) },
            { n: N.G5, d: t(2) }, { n: N.R, d: t(1) }, { n: N.G4, d: t(1) },
            { n: N.R, d: t(1) }, { n: N.C5, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.G4, d: t(0.5) },
            { n: N.R, d: t(0.5) }, { n: N.E4, d: t(1.5) },
            { n: N.A4, d: t(1) }, { n: N.B4, d: t(1) }, { n: N.As4, d: t(0.5) }, { n: N.A4, d: t(1.5) },
            { n: N.G4, d: t(1) }, { n: N.E5, d: t(1) }, { n: N.G5, d: t(1) }, { n: N.A5, d: t(1) },
            { n: N.R, d: t(0.5) }, { n: N.F5, d: t(0.5) }, { n: N.G5, d: t(1) }, { n: N.R, d: t(0.5) },
            { n: N.E5, d: t(1) }, { n: N.C5, d: t(0.5) }, { n: N.D5, d: t(0.5) }, { n: N.B4, d: t(1.5) },
          ],
          bass: [
            { n: N.C3, d: t(1) }, { n: N.G3, d: t(1) }, { n: N.C3, d: t(1) }, { n: N.G3, d: t(1) },
            { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) }, { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) },
            { n: N.A2, d: t(1) }, { n: N.E3, d: t(1) }, { n: N.E2, d: t(1) }, { n: N.B2, d: t(1) },
            { n: N.F2, d: t(1) }, { n: N.C3, d: t(1) }, { n: N.G2, d: t(2) },
            { n: N.C3, d: t(1) }, { n: N.G3, d: t(1) }, { n: N.A2, d: t(1) }, { n: N.E3, d: t(1) },
            { n: N.F2, d: t(1) }, { n: N.C3, d: t(1) }, { n: N.G2, d: t(2) },
          ]
        },
        // SECTION B: Intensity builder - driving rhythms
        {
          melody: [
            { n: N.A4, d: t(0.5) }, { n: N.A4, d: t(0.5) }, { n: N.A4, d: t(0.5) }, { n: N.A4, d: t(0.5) },
            { n: N.G4, d: t(0.5) }, { n: N.G4, d: t(0.5) }, { n: N.A4, d: t(1) },
            { n: N.C5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.A4, d: t(0.5) },
            { n: N.G4, d: t(1) }, { n: N.R, d: t(1) },
            { n: N.E5, d: t(0.5) }, { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(0.5) },
            { n: N.A4, d: t(1) }, { n: N.G4, d: t(1) },
            { n: N.A4, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.D5, d: t(0.5) },
            { n: N.E5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.A4, d: t(0.5) },
            { n: N.G4, d: t(2) },
          ],
          bass: [
            { n: N.A2, d: t(0.5) }, { n: N.A3, d: t(0.5) }, { n: N.A2, d: t(0.5) }, { n: N.A3, d: t(0.5) },
            { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) }, { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.F2, d: t(0.5) }, { n: N.F3, d: t(0.5) }, { n: N.E2, d: t(0.5) }, { n: N.E3, d: t(0.5) },
            { n: N.D2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.C2, d: t(0.5) }, { n: N.C3, d: t(0.5) }, { n: N.C2, d: t(0.5) }, { n: N.C3, d: t(0.5) },
            { n: N.A2, d: t(0.5) }, { n: N.A3, d: t(0.5) }, { n: N.G2, d: t(1) },
            { n: N.F2, d: t(0.5) }, { n: N.G2, d: t(0.5) }, { n: N.A2, d: t(1) },
            { n: N.G2, d: t(2) },
          ]
        },
        // SECTION C: Heroic theme - bold and triumphant
        {
          melody: [
            { n: N.C5, d: t(1) }, { n: N.E5, d: t(0.5) }, { n: N.G5, d: t(0.5) },
            { n: N.A5, d: t(1.5) }, { n: N.G5, d: t(0.5) },
            { n: N.F5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) },
            { n: N.D5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.G5, d: t(1) }, { n: N.F5, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.D5, d: t(1) }, { n: N.C5, d: t(1) },
            { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.D5, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.F5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(1) },
            { n: N.C5, d: t(2) },
          ],
          bass: [
            { n: N.C2, d: t(1) }, { n: N.G2, d: t(1) }, { n: N.A2, d: t(1) }, { n: N.E3, d: t(1) },
            { n: N.F2, d: t(1) }, { n: N.C3, d: t(1) }, { n: N.G2, d: t(2) },
            { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) }, { n: N.C2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.A2, d: t(1) }, { n: N.E3, d: t(1) }, { n: N.F2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.G2, d: t(1) }, { n: N.G2, d: t(1) }, { n: N.C2, d: t(2) },
          ]
        },
        // SECTION D: Breakdown - syncopated, grooving
        {
          melody: [
            { n: N.R, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.R, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.D5, d: t(1) },
            { n: N.R, d: t(0.5) }, { n: N.G5, d: t(0.5) }, { n: N.R, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.D5, d: t(1) }, { n: N.R, d: t(1) },
            { n: N.C5, d: t(0.5) }, { n: N.R, d: t(0.25) }, { n: N.C5, d: t(0.25) }, { n: N.D5, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.G5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(0.5) }, { n: N.R, d: t(0.25) }, { n: N.D5, d: t(0.25) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(0.5) },
            { n: N.A4, d: t(1) }, { n: N.G4, d: t(1) },
            { n: N.A4, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(1) },
            { n: N.B4, d: t(1.5) }, { n: N.R, d: t(0.5) },
          ],
          bass: [
            { n: N.E2, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.E3, d: t(0.5) },
            { n: N.A2, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.A3, d: t(0.5) },
            { n: N.G2, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.D2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.C2, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.C3, d: t(0.5) },
            { n: N.G2, d: t(1) }, { n: N.R, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.A2, d: t(1) }, { n: N.E2, d: t(1) },
            { n: N.G2, d: t(2) },
          ]
        },
        // SECTION E: Epic build - ascending intensity
        {
          melody: [
            { n: N.G4, d: t(0.5) }, { n: N.A4, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(0.5) },
            { n: N.D5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.F5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) },
            { n: N.D5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.E5, d: t(0.5) }, { n: N.F5, d: t(0.5) }, { n: N.G5, d: t(0.5) }, { n: N.A5, d: t(0.5) },
            { n: N.G5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.F5, d: t(1) },
            { n: N.E5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.G5, d: t(0.5) }, { n: N.F5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.D5, d: t(0.5) },
            { n: N.C5, d: t(2) },
          ],
          bass: [
            { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) }, { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.A2, d: t(0.5) }, { n: N.A3, d: t(0.5) }, { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.F2, d: t(0.5) }, { n: N.F3, d: t(0.5) }, { n: N.G2, d: t(0.5) }, { n: N.G3, d: t(0.5) },
            { n: N.E2, d: t(1) }, { n: N.E2, d: t(1) },
            { n: N.C2, d: t(0.5) }, { n: N.C3, d: t(0.5) }, { n: N.C2, d: t(0.5) }, { n: N.C3, d: t(0.5) },
            { n: N.D2, d: t(0.5) }, { n: N.D3, d: t(0.5) }, { n: N.E2, d: t(0.5) }, { n: N.E3, d: t(0.5) },
            { n: N.F2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.C2, d: t(2) },
          ]
        },
        // SECTION F: Finale - triumphant conclusion
        {
          melody: [
            { n: N.G5, d: t(0.5) }, { n: N.A5, d: t(0.5) }, { n: N.B5, d: t(1) },
            { n: N.A5, d: t(0.5) }, { n: N.G5, d: t(0.5) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(0.5) }, { n: N.E5, d: t(0.5) }, { n: N.G5, d: t(1) },
            { n: N.E5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.C5, d: t(1) }, { n: N.D5, d: t(0.5) }, { n: N.E5, d: t(0.5) },
            { n: N.F5, d: t(1) }, { n: N.E5, d: t(1) },
            { n: N.D5, d: t(0.5) }, { n: N.C5, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(0.5) },
            { n: N.D5, d: t(1.5) }, { n: N.R, d: t(0.5) },
            { n: N.G4, d: t(0.5) }, { n: N.A4, d: t(0.5) }, { n: N.B4, d: t(0.5) }, { n: N.C5, d: t(0.5) },
            { n: N.D5, d: t(1) }, { n: N.C5, d: t(1.5) }, { n: N.R, d: t(0.5) },
          ],
          bass: [
            { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) }, { n: N.A2, d: t(1) }, { n: N.E3, d: t(1) },
            { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) }, { n: N.C2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.C2, d: t(1) }, { n: N.G2, d: t(1) }, { n: N.F2, d: t(1) }, { n: N.C3, d: t(1) },
            { n: N.G2, d: t(1) }, { n: N.D3, d: t(1) }, { n: N.G2, d: t(1) }, { n: N.G2, d: t(1) },
            { n: N.C2, d: t(2) }, { n: N.C2, d: t(2) },
          ]
        }
      ];
      return sections[section % sections.length];
    }

    function startMusic(type) {
      if (!soundEnabled) return;

      try {
        stopMusic(); // Stop any currently playing music first

        musicPlaying = true;
        currentMusicType = type;
        currentSection = 0;

        if (type === 'intro') {
          // Use MP3 for intro music
          initMusicAudio();
          if (introAudio) {
            introAudio.currentTime = 0;
            introAudio.play().catch(e => console.log('[Music] Intro autoplay blocked:', e));
          }
        } else if (type === 'game') {
          // Use MP3 for game music
          initMusicAudio();
          if (gameAudio) {
            gameAudio.currentTime = 0;
            gameAudio.play().catch(e => console.log('[Music] Game autoplay blocked:', e));
          }
        }
      } catch (e) {
        console.warn('[Music] Error starting music:', e);
      }
    }

    function stopMusic() {
      musicPlaying = false;
      currentMusicType = null;

      // Stop MP3 audio
      if (introAudio) {
        introAudio.pause();
        introAudio.currentTime = 0;
      }
      if (gameAudio) {
        gameAudio.pause();
        gameAudio.currentTime = 0;
      }

      // Stop procedural music
      musicTimeouts.forEach(t => clearTimeout(t));
      musicTimeouts = [];
      if (musicGain) { try { musicGain.disconnect(); } catch(e) {} musicGain = null; }
    }

    // Expose stopMusic globally so course.js can call it on navigation
    window._stopGameMusic = stopMusic;

    function scheduleNote(freq, startTime, duration, type = 'square', volume = 0.1) {
      if (!audioContext || !musicGain || !musicPlaying || freq === 0) return;

      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.setValueAtTime(volume * 0.9, startTime + duration * 0.6);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration * 0.95);

      osc.connect(gain);
      gain.connect(musicGain);
      osc.start(startTime);
      osc.stop(startTime + duration);
    }

    function playIntroSection() {
      if (!musicPlaying || currentMusicType !== 'intro') return;

      const now = audioContext.currentTime;
      const section = getIntroSection(currentSection);
      let t = now;

      // Melody
      section.melody.forEach(note => {
        if (note.n > 0) scheduleNote(note.n, t, note.d * 0.9, 'square', 0.1);
        t += note.d;
      });

      // Bass
      let bt = now;
      section.bass.forEach(note => {
        if (note.n > 0) scheduleNote(note.n, bt, note.d * 0.85, 'triangle', 0.12);
        bt += note.d;
      });

      // Pad (atmospheric)
      if (section.pad) {
        let pt = now;
        section.pad.forEach(note => {
          if (note.n > 0) scheduleNote(note.n, pt, note.d * 0.95, 'sine', 0.05);
          pt += note.d;
        });
      }

      const dur = section.melody.reduce((s, n) => s + n.d, 0);
      const timeout = setTimeout(() => {
        if (musicPlaying && currentMusicType === 'intro') {
          currentSection++;
          playIntroSection();
        }
      }, dur * 1000);
      musicTimeouts.push(timeout);
    }

    function playGameSection() {
      if (!musicPlaying || currentMusicType !== 'game') return;

      const now = audioContext.currentTime;
      const section = getGameSection(currentSection);
      const tempoMult = Math.max(0.85, 1 - (wave - 1) * 0.012); // Speeds up slightly each wave

      let t = now;
      section.melody.forEach(note => {
        if (note.n > 0) scheduleNote(note.n, t, note.d * tempoMult * 0.9, 'square', 0.1);
        t += note.d * tempoMult;
      });

      let bt = now;
      section.bass.forEach(note => {
        if (note.n > 0) {
          scheduleNote(note.n, bt, note.d * tempoMult * 0.8, 'triangle', 0.11);
          scheduleNote(note.n * 2, bt, note.d * tempoMult * 0.4, 'square', 0.03); // Octave doubling
        }
        bt += note.d * tempoMult;
      });

      const dur = section.melody.reduce((s, n) => s + n.d, 0) * tempoMult;
      const timeout = setTimeout(() => {
        if (musicPlaying && currentMusicType === 'game') {
          currentSection++;
          playGameSection();
        }
      }, dur * 1000);
      musicTimeouts.push(timeout);
    }

    // === GAME STATE ===
    let gameRunning = false;
    let features = [];
    let destroyedFeatures = [];
    let invaders = [];
    let playerLasers = [];
    let enemyProjectiles = [];
    let particles = [];
    let score = 0;
    let shields = 3;
    let wave = 1;
    let waveInProgress = false;
    let waveKills = 0;
    let shipX = 50;
    let gameLoop = null;
    let lastFrameTime = 0;
    let lastInvaderSpawn = 0;
    let lastEnemyShot = 0;
    let invaderQueue = [];
    let canShoot = true;
    let lastShotTime = 0;
    let highScore = 0;
    let bestWave = 0;
    let gameStartTime = 0;

    // === COMBO & ACCURACY STATE ===
    let combo = 0;
    let maxCombo = 0;
    let comboTimer = null;
    let shotsFired = 0;
    let shotsHit = 0;
    let lastComboTime = 0;
    const COMBO_TIMEOUT = 2000; // 2 seconds to maintain combo

    // === SMOOTH INPUT STATE ===
    let keysPressed = { left: false, right: false, fire: false };
    let targetShipX = 50;

    // === WAVE CONFIGURATION ===
    // Based on Space Invaders mechanics:
    // - Start slow, speed up as enemies are killed (within wave)
    // - Each new wave starts slightly faster
    // - Enemy shooting increases over time
    //
    // Reference: Original Space Invaders moves at ~2px/frame at 60fps = 120px/sec with 55 enemies
    // Our game area is smaller, so we scale accordingly

    // Base config for wave 1
    // DIFFICULTY TUNING v3:
    // - Wave 1-2: Easy, learn the controls
    // - Wave 3-5: Medium, starting to get busy
    // - Wave 6-8: Hard, real challenge begins
    // - Wave 9+: Expert/Insane, survival mode
    const BASE_CONFIG = {
      featureCount: 12,          // learning objectives per wave
      spawnInterval: 1600,       // ms between spawns
      startDropSpeed: 25,        // initial drop speed
      maxDropSpeed: 90,          // max speed when few enemies left
      swayAmplitude: 15,         // side-to-side movement
      enemyShotInterval: 4000,   // ms between enemy shots
      enemyProjectileSpeed: 100, // bullet speed
      pointsPerKill: 100,
      bonusPointsPerKill: 50
    };

    // BONUS TARGETS - filler enemies for variety
    const BONUS_TARGETS = [
      { icon: '⭐', title: 'Bonus', desc: 'Extra points!', isBonus: true },
      { icon: '💎', title: 'Gem', desc: 'Valuable target!', isBonus: true },
      { icon: '🎁', title: 'Gift', desc: 'Surprise bonus!', isBonus: true },
      { icon: '🏆', title: 'Trophy', desc: 'Achievement unlocked!', isBonus: true },
      { icon: '🎯', title: 'Bullseye', desc: 'Perfect shot!', isBonus: true },
      { icon: '💫', title: 'Star', desc: 'Shooting star!', isBonus: true },
      { icon: '🔮', title: 'Orb', desc: 'Mysterious power!', isBonus: true },
      { icon: '🌟', title: 'Nova', desc: 'Explosive bonus!', isBonus: true }
    ];

    // HEALTH BUBBLE - rare shield regeneration pickup
    // Very rare spawn chance - rewards skilled players who can hit it
    const HEALTH_BUBBLE = { icon: '💚', title: 'Shield Repair', desc: '+1 Shield!', isHealth: true };
    const HEALTH_BUBBLE_CHANCE = 0.04; // 4% chance per spawn - very rare!
    let lastHealthBubbleWave = 0; // Track to prevent too many per wave

    // Difficulty tiers with bonus enemy counts
    const DIFFICULTY_TIERS = [
      { name: 'WAVE',   waves: [1, 2],   bonusCount: 0 },   // Waves 1-2: Just features (12 enemies)
      { name: 'WAVE',   waves: [3, 4],   bonusCount: 3 },   // Waves 3-4: +3 bonus (15 enemies)
      { name: 'WAVE',   waves: [5, 6],   bonusCount: 5 },   // Waves 5-6: +5 bonus (17 enemies)
      { name: 'WAVE',   waves: [7, 8],   bonusCount: 7 },   // Waves 7-8: +7 bonus (19 enemies)
      { name: 'WAVE',   waves: [9, 10],  bonusCount: 10 },  // Waves 9-10: +10 bonus (22 enemies)
      { name: 'WAVE',   waves: [11, 999], bonusCount: 12 }  // Waves 11+: +12 bonus (24 enemies)
    ];

    // Get config for a wave
    function getWaveConfig(waveNum) {
      const tier = DIFFICULTY_TIERS.find(t => waveNum >= t.waves[0] && waveNum <= t.waves[1])
                   || DIFFICULTY_TIERS[DIFFICULTY_TIERS.length - 1];

      // Aggressive wave multiplier: 12% increase per wave
      // Wave 1 = 1.0, Wave 5 = 1.48, Wave 10 = 2.08, Wave 15 = 2.68
      const waveMultiplier = 1 + (waveNum - 1) * 0.12;

      // Total invaders = features (dynamic count) + bonus targets
      const totalInvaders = features.length + tier.bonusCount;

      // Scale values with wave
      return {
        name: `${tier.name} ${waveNum}`,
        invaderCount: totalInvaders,
        featureCount: BASE_CONFIG.featureCount,
        bonusCount: tier.bonusCount,
        // Spawning gets faster each wave (min 800ms)
        spawnInterval: Math.max(800, Math.round(BASE_CONFIG.spawnInterval / waveMultiplier)),
        // Starting speed increases each wave (caps at 80)
        startDropSpeed: Math.min(80, Math.round(BASE_CONFIG.startDropSpeed * waveMultiplier)),
        // Max speed increases each wave (caps at 200 - very fast!)
        maxDropSpeed: Math.min(200, Math.round(BASE_CONFIG.maxDropSpeed * waveMultiplier)),
        // Sway increases (makes them harder to hit)
        swayAmplitude: Math.min(50, Math.round(BASE_CONFIG.swayAmplitude * waveMultiplier)),
        // Enemies shoot more frequently (min 1200ms)
        enemyShotInterval: Math.max(1200, Math.round(BASE_CONFIG.enemyShotInterval / waveMultiplier)),
        // Bullets get faster (caps at 250)
        enemyProjectileSpeed: Math.min(250, Math.round(BASE_CONFIG.enemyProjectileSpeed * waveMultiplier)),
        // Points increase with wave (reward for surviving harder waves)
        pointsPerKill: Math.round(BASE_CONFIG.pointsPerKill + (waveNum * 20)),
        bonusPointsPerKill: Math.round(BASE_CONFIG.bonusPointsPerKill + (waveNum * 10)),
        // More accurate difficulty labels - HARD should feel hard!
        difficultyLabel: waveNum <= 2 ? 'EASY' : waveNum <= 4 ? 'MEDIUM' : waveNum <= 6 ? 'HARD' : waveNum <= 8 ? 'EXPERT' : 'INSANE'
      };
    }

    // SPACE INVADERS SPEED CURVE: Speed increases as enemies are killed
    // Classic mechanic - last few enemies are frantic!
    function getDynamicDifficulty(config, aliveCount, totalCount) {
      if (totalCount <= 0) totalCount = 1;
      if (aliveCount <= 0) aliveCount = 1;

      // How much of the wave is cleared (0 = none, 1 = all)
      const killRatio = 1 - (aliveCount / totalCount);

      // Speed curve - starts gentle, gets aggressive in the last 30%
      // At 10% killed: ~0.05, at 50% killed: ~0.35, at 90% killed: ~0.95
      const speedProgress = Math.pow(killRatio, 1.5); // More aggressive than quadratic
      const dropSpeed = config.startDropSpeed + (config.maxDropSpeed - config.startDropSpeed) * speedProgress;

      // Enemy firing speeds up as wave progresses (up to 50% faster)
      const shotIntervalReduction = killRatio * 0.5;
      const enemyShotInterval = config.enemyShotInterval * (1 - shotIntervalReduction);

      // Sway increases (up to 2x - makes them harder to hit)
      const swayMultiplier = 1 + killRatio * 1.0;

      return {
        dropSpeed: dropSpeed,
        enemyShotInterval: Math.max(800, enemyShotInterval), // Min 800ms between shots
        swaySpeed: swayMultiplier,
        projectileSpeed: config.enemyProjectileSpeed * (1 + killRatio * 0.3) // Bullets 30% faster at wave end
      };
    }

    // === LEADERBOARD CONFIGURATION ===
    //
    // ╔═══════════════════════════════════════════════════════════════════════╗
    // ║              GOOGLE SHEETS LEADERBOARD SETUP INSTRUCTIONS              ║
    // ╠═══════════════════════════════════════════════════════════════════════╣
    // ║                                                                        ║
    // ║  STEP 1: CREATE A GOOGLE FORM                                          ║
    // ║  ─────────────────────────────                                         ║
    // ║  1. Go to forms.google.com and create a new form                       ║
    // ║  2. Add 3 questions (all Short Answer type):                           ║
    // ║     - "Player Name" (required)                                         ║
    // ║     - "Score" (required)                                               ║
    // ║     - "Wave Reached" (optional)                                        ║
    // ║  3. Click the 3 dots menu → Get pre-filled link                        ║
    // ║  4. Fill in test values and click "Get Link"                           ║
    // ║  5. The URL will contain entry IDs like: entry.1234567890              ║
    // ║     Copy these IDs to the config below                                 ║
    // ║  6. The form action URL is the form URL with /formResponse at end      ║
    // ║     Example: https://docs.google.com/forms/d/e/FORM_ID/formResponse    ║
    // ║                                                                        ║
    // ║  STEP 2: SET UP THE GOOGLE SHEET                                       ║
    // ║  ──────────────────────────────                                        ║
    // ║  1. In your Google Form, click "Responses" tab                         ║
    // ║  2. Click the green Sheets icon to create a linked spreadsheet         ║
    // ║  3. In the Sheet, go to File → Share → Publish to web                  ║
    // ║  4. Select "Comma-separated values (.csv)" and click Publish           ║
    // ║  5. Copy the published URL to sheetUrl below                           ║
    // ║                                                                        ║
    // ║  STEP 3: UPDATE THE CONFIG BELOW                                       ║
    // ║  ────────────────────────────────                                      ║
    // ║  Replace the empty strings with your actual URLs and field IDs         ║
    // ║                                                                        ║
    // ╚═══════════════════════════════════════════════════════════════════════╝
    //
    let LEADERBOARD_CONFIG = {
      // Google Form URL for submitting scores
      formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeMkT-VyTqpOqr9K45KyMnNuApTrycOKMJx8ve7hHCwP4CbBw/formResponse',

      // Google Sheet published CSV URL for reading scores
      sheetUrl: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSaZQtrVGEs41SPVVJNOs2-FrKziwaxLX-SFNvq6UOLqISluaF4oWZTTCsYHjcgoEk7Z3qEMDbpZMYA/pub?output=csv',

      // Field entry IDs from your Google Form (extracted from form HTML)
      nameField: 'entry.1476077623',   // Player Name
      scoreField: 'entry.287792209',   // Score
      waveField: 'entry.790319897',    // Wave Reached

      // Default leaderboard entries (customize these for your company!)
      // These show up before anyone has submitted real scores
      defaults: [
        { name: 'Champion', score: 5000, wave: 5 },
        { name: 'Pro Player', score: 4000, wave: 4 },
        { name: 'Rising Star', score: 3000, wave: 3 },
        { name: 'Rookie', score: 2000, wave: 2 },
        { name: 'Beginner', score: 1000, wave: 1 }
      ]
    };

    // Leaderboard state
    let leaderboardData = [...LEADERBOARD_CONFIG.defaults];
    let playerName = localStorage.getItem('novapay-feature-invaders-playername') || '';

    // === BASE GAME SETTINGS ===
    const SHIP_SPEED = 90;  // Direct movement speed (no momentum/sliding)
    const LASER_SPEED = 600;
    const SHIP_BOTTOM = 50;
    const SHOT_COOLDOWN = 350; // ms between shots (slower = harder)
    const INVADER_SIZE = 55;
    const LASER_HIT_DISTANCE = 38;
    const PLAYER_HIT_DISTANCE = 22; // Tighter hit detection for player
    const HIGH_SCORE_KEY = 'novapay-feature-invaders-highscore-v1';
    const BEST_WAVE_KEY = 'novapay-feature-invaders-bestwave-v1';

    // === DOM ELEMENTS ===
    const ship = document.getElementById('invaders-ship');
    const startScreen = document.getElementById('invaders-start');
    const gameoverScreen = document.getElementById('invaders-gameover');
    const victoryScreen = document.getElementById('invaders-victory');
    const waveTransition = document.getElementById('wave-transition');
    const waveNumberSpan = document.getElementById('wave-number');
    const waveDifficultySpan = document.getElementById('wave-difficulty');
    const scoreDisplay = document.getElementById('invaders-score');
    const waveDisplay = document.getElementById('invaders-wave');
    const shieldsDisplay = document.getElementById('invaders-shields');
    const intelDisplay = document.getElementById('invaders-intel');
    const particleContainer = document.getElementById('particle-container');
    const featureChecklist = document.getElementById('feature-checklist');

    // Intel popup elements
    const intelPopup = document.getElementById('intel-popup');
    const intelIcon = document.getElementById('intel-icon');
    const intelTitle = document.getElementById('intel-title');
    const intelDesc = document.getElementById('intel-desc');
    const intelPoints = document.getElementById('intel-points');

    // Combo display
    const comboDisplay = document.getElementById('combo-display');
    const comboCount = document.getElementById('combo-count');

    // Sidebar elements
    const sidebarHighscore = document.getElementById('sidebar-highscore');
    const sidebarCurrentScore = document.getElementById('sidebar-current-score');
    const sidebarAccuracy = document.getElementById('sidebar-accuracy');
    const sidebarProgress = document.getElementById('sidebar-progress');
    const intelFeed = document.getElementById('intel-feed');

    // Start screen elements
    const startHighscore = document.getElementById('start-highscore');
    const startBestwave = document.getElementById('start-bestwave');

    // Results elements (game over)
    const gameoverScore = document.getElementById('gameover-score');
    const gameoverWave = document.getElementById('gameover-wave');
    const gameoverFeatures = document.getElementById('gameover-features');
    const gameoverAccuracy = document.getElementById('gameover-accuracy');
    const gameoverCombo = document.getElementById('gameover-combo');
    const gameoverGrade = document.getElementById('gameover-grade');
    const gameoverHighscoreMsg = document.getElementById('gameover-highscore-msg');

    // Results elements (victory)
    const victoryScore = document.getElementById('victory-score');
    const victoryTime = document.getElementById('victory-time');
    const victoryAccuracy = document.getElementById('victory-accuracy');
    const victoryCombo = document.getElementById('victory-combo');
    const victoryGrade = document.getElementById('victory-grade');
    const victoryHighscoreMsg = document.getElementById('victory-highscore-msg');

    // === LOAD HIGH SCORE & BEST WAVE ===
    function loadHighScore() {
      try {
        const savedScore = localStorage.getItem(HIGH_SCORE_KEY);
        const savedWave = localStorage.getItem(BEST_WAVE_KEY);
        if (savedScore) highScore = parseInt(savedScore, 10) || 0;
        if (savedWave) bestWave = parseInt(savedWave, 10) || 0;
      } catch (e) {
        console.warn('Could not load high score:', e);
      }
      updateHighScoreDisplays();
      loadLeaderboard();
    }

    // === LEADERBOARD FUNCTIONS ===
    async function loadLeaderboard() {
      // First, try localStorage (this is the most reliable)
      try {
        const saved = localStorage.getItem('novapay-feature-invaders-leaderboard');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            leaderboardData = parsed;
            console.log('[Leaderboard] Loaded from localStorage:', leaderboardData.length, 'entries');
          }
        }
      } catch (e) {
        console.warn('[Leaderboard] Could not load from localStorage:', e);
      }

      // If we have a Google Sheet configured, try to fetch from it (async, won't block)
      if (LEADERBOARD_CONFIG.sheetUrl) {
        try {
          const cacheBuster = `&_t=${Date.now()}`;
          const url = LEADERBOARD_CONFIG.sheetUrl + cacheBuster;
          // Use redirect: 'follow' to handle Google's redirects
          const response = await fetch(url, {
            mode: 'cors',
            redirect: 'follow',
            credentials: 'omit'
          });
          if (response.ok) {
            const csvText = await response.text();
            console.log('[Leaderboard] Fetched CSV, length:', csvText.length);
            const parsedData = parseCSV(csvText);
            console.log('[Leaderboard] Parsed entries:', parsedData.length);
            if (parsedData.length > 0) {
              // Merge with localStorage data and deduplicate
              const merged = [...leaderboardData, ...parsedData];
              const unique = merged.reduce((acc, curr) => {
                const exists = acc.find(e => e.name === curr.name && e.score === curr.score);
                if (!exists) acc.push(curr);
                return acc;
              }, []);
              leaderboardData = unique.sort((a, b) => b.score - a.score).slice(0, 10);
              console.log('[Leaderboard] Merged with Google Sheet data:', leaderboardData.length, 'entries');
              // Also save merged data to localStorage for faster loading next time
              try {
                localStorage.setItem('novapay-feature-invaders-leaderboard', JSON.stringify(leaderboardData));
              } catch (e) {}
            }
          } else {
            console.warn('[Leaderboard] Google Sheet response not OK:', response.status);
          }
        } catch (e) {
          console.warn('[Leaderboard] Could not fetch from Google Sheet (this is OK, using local data):', e.message);
        }
      }

      // If we still have no data, use defaults
      if (!leaderboardData || leaderboardData.length === 0) {
        leaderboardData = [...LEADERBOARD_CONFIG.defaults];
        console.log('[Leaderboard] Using default entries');
      }

      updateLeaderboardDisplay();
    }

    function parseCSV(csvText) {
      const lines = csvText.trim().split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const scoreIdx = headers.findIndex(h => h.includes('score'));
      const waveIdx = headers.findIndex(h => h.includes('wave'));

      if (nameIdx === -1 || scoreIdx === -1) return [];

      const data = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        if (values.length > Math.max(nameIdx, scoreIdx)) {
          data.push({
            name: values[nameIdx]?.trim() || 'Anonymous',
            score: parseInt(values[scoreIdx], 10) || 0,
            wave: waveIdx >= 0 ? parseInt(values[waveIdx], 10) || 1 : 1
          });
        }
      }
      return data;
    }

    async function submitToLeaderboard(name, finalScore, finalWave) {
      // Save name for next time
      try {
        localStorage.setItem('novapay-feature-invaders-playername', name);
      } catch (e) {}

      // If Google Form is configured, submit to it (using fetch only - no duplicates!)
      if (LEADERBOARD_CONFIG.formUrl && LEADERBOARD_CONFIG.nameField) {
        try {
          const formData = new URLSearchParams();
          formData.append(LEADERBOARD_CONFIG.nameField, name);
          formData.append(LEADERBOARD_CONFIG.scoreField, finalScore.toString());
          if (LEADERBOARD_CONFIG.waveField) {
            formData.append(LEADERBOARD_CONFIG.waveField, finalWave.toString());
          }

          // Use fetch with no-cors (fire and forget)
          fetch(LEADERBOARD_CONFIG.formUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          }).then(() => {
            console.log('[Leaderboard] Score submitted to Google Form');
          }).catch(e => {
            console.warn('[Leaderboard] Could not submit:', e);
          });
        } catch (e) {
          console.warn('[Leaderboard] Could not submit to Google Form:', e);
        }
      }

      // Also save locally (immediate feedback)
      const newEntry = { name, score: finalScore, wave: finalWave };
      leaderboardData.push(newEntry);
      leaderboardData.sort((a, b) => b.score - a.score);
      leaderboardData = leaderboardData.slice(0, 10);

      try {
        localStorage.setItem('novapay-feature-invaders-leaderboard', JSON.stringify(leaderboardData));
      } catch (e) {}

      updateLeaderboardDisplay();

      // Schedule a refresh from the Google Sheet after a delay
      // (Google Sheets published CSV can take a few seconds to update)
      if (LEADERBOARD_CONFIG.sheetUrl) {
        setTimeout(() => loadLeaderboard(), 5000);  // Refresh after 5 seconds
        setTimeout(() => loadLeaderboard(), 15000); // And again after 15 seconds
      }

      return leaderboardData.findIndex(e => e.name === name && e.score === finalScore) + 1;
    }

    function updateLeaderboardDisplay() {
      const leaderboardList = document.getElementById('leaderboard-list');
      if (!leaderboardList) return;

      leaderboardList.innerHTML = leaderboardData.slice(0, 5).map((entry, i) => `
        <div class="leaderboard-entry ${i === 0 ? 'top-score' : ''}">
          <span class="leaderboard-rank">${i + 1}</span>
          <span class="leaderboard-name">${escapeHtml(entry.name)}</span>
          <span class="leaderboard-score">${entry.score.toLocaleString()}</span>
        </div>
      `).join('');
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function showNameEntryPopup(finalScore, finalWave, isVictory) {
      const popup = document.getElementById('name-entry-popup');
      const input = document.getElementById('player-name-input');
      const submitBtn = document.getElementById('submit-name-btn');
      const skipBtn = document.getElementById('skip-name-btn');
      const scoreDisplay = document.getElementById('name-entry-score');

      if (!popup) return;

      // Pre-fill with saved name
      if (input) input.value = playerName;
      if (scoreDisplay) scoreDisplay.textContent = finalScore.toLocaleString();

      popup.style.display = 'flex';

      // Handle submit
      const handleSubmit = async () => {
        const name = input?.value.trim() || 'Anonymous';
        popup.style.display = 'none';
        const rank = await submitToLeaderboard(name, finalScore, finalWave);

        // Show result screen after submission
        if (isVictory) {
          showVictoryScreen(finalScore, finalWave, rank);
        } else {
          showGameOverScreen(finalScore, finalWave, rank);
        }
      };

      const handleSkip = () => {
        popup.style.display = 'none';
        if (isVictory) {
          showVictoryScreen(finalScore, finalWave, null);
        } else {
          showGameOverScreen(finalScore, finalWave, null);
        }
      };

      submitBtn?.removeEventListener('click', handleSubmit);
      skipBtn?.removeEventListener('click', handleSkip);
      submitBtn?.addEventListener('click', handleSubmit);
      skipBtn?.addEventListener('click', handleSkip);

      // Allow Enter to submit
      input?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSubmit();
      });

      input?.focus();
    }

    // === SAVE HIGH SCORE ===
    function saveHighScore() {
      let isNew = false;
      if (score > highScore) {
        highScore = score;
        try {
          localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
        } catch (e) {
          console.warn('Could not save high score:', e);
        }
        isNew = true;
        reportHighScoreToLRS();
      }
      if (wave > bestWave) {
        bestWave = wave;
        try {
          localStorage.setItem(BEST_WAVE_KEY, bestWave.toString());
        } catch (e) {}
      }
      updateHighScoreDisplays();
      return isNew;
    }

    // === REPORT HIGH SCORE TO LRS ===
    function reportHighScoreToLRS() {
      if (typeof xAPITracker !== 'undefined' && xAPITracker.sendInteractionStatement) {
        const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
        xAPITracker.sendInteractionStatement(
          'feature-invaders-highscore',
          'numeric',
          highScore.toString(),
          `High Score: ${highScore} pts | Wave ${wave} | Accuracy: ${accuracy}% | Max Combo: ${maxCombo}x`,
          true,
          highScore,
          15000
        );
        console.log('[FeatureInvaders] High score reported to LRS:', highScore);
      }
    }

    // === UPDATE HIGH SCORE DISPLAYS ===
    function updateHighScoreDisplays() {
      const formatted = highScore.toString().padStart(5, '0');
      if (sidebarHighscore) sidebarHighscore.textContent = formatted;
      if (startHighscore) startHighscore.textContent = formatted;
      if (startBestwave) startBestwave.textContent = bestWave > 0 ? `WAVE ${bestWave}` : '-';
    }

    // === LOAD FEATURES FROM DATA SOURCE ===
    function loadFeatures() {
      const dataSource = document.getElementById('game-features-data');
      if (!dataSource) return;

      features = Array.from(dataSource.children).map(el => ({
        icon: el.dataset.icon,
        title: el.dataset.title,
        desc: el.dataset.desc
      }));

      console.log('[FeatureInvaders] Loaded', features.length, 'features');
    }

    // === BUILD SIDEBAR CHECKLIST ===
    function buildChecklist() {
      if (!featureChecklist) return;

      featureChecklist.innerHTML = features.map((f, i) => `
        <div class="feature-item" data-index="${i}">
          <div class="feature-main">
            <span class="feature-icon">${f.icon}</span>
            <span class="feature-name">${f.title}</span>
            <span class="feature-status">○</span>
          </div>
          <div class="feature-desc">${f.desc}</div>
        </div>
      `).join('');
    }

    // === UPDATE CHECKLIST ITEM ===
    function markFeatureDestroyed(featureData) {
      if (!featureChecklist) return;

      const index = features.findIndex(f => f.icon === featureData.icon);
      if (index >= 0) {
        const item = featureChecklist.querySelector(`[data-index="${index}"]`);
        if (item) {
          item.classList.add('acquired');
          const status = item.querySelector('.feature-status');
          if (status) status.textContent = '✓';
        }
      }

      // Update progress counter
      if (sidebarProgress) {
        sidebarProgress.textContent = `${destroyedFeatures.length}/${features.length}`;
      }
    }

    // === RESET CHECKLIST ===
    function resetChecklist() {
      if (!featureChecklist) return;

      featureChecklist.querySelectorAll('.feature-item').forEach(item => {
        item.classList.remove('acquired');
        const status = item.querySelector('.feature-status');
        if (status) status.textContent = '○';
      });

      if (sidebarProgress) sidebarProgress.textContent = `0/${features.length}`;
    }

    // === SHOW INTEL BANNER (TOP - NON-BLOCKING) ===
    function showIntelPopup(featureData, points) {
      // Use top banner instead of centered popup
      const banner = document.getElementById('intel-banner') || createIntelBanner();

      // Set content
      const bannerIcon = banner.querySelector('.intel-banner-icon');
      const bannerTitle = banner.querySelector('.intel-banner-title');
      const bannerPoints = banner.querySelector('.intel-banner-points');

      if (bannerIcon) bannerIcon.textContent = featureData.icon;
      if (bannerTitle) bannerTitle.textContent = featureData.title;
      if (bannerPoints) bannerPoints.textContent = `+${points}`;

      // Show banner with animation
      banner.classList.remove('hidden');
      banner.classList.add('show');

      // Hide after short delay (keep it brief so it doesn't distract)
      setTimeout(() => {
        banner.classList.remove('show');
        setTimeout(() => banner.classList.add('hidden'), 300);
      }, 1500);

      // Add to the intel feed in sidebar
      addIntelCard(featureData, points);
    }

    // Add an intel card to the sidebar feed
    function addIntelCard(featureData, points) {
      if (!intelFeed) return;

      // Remove empty state if present
      const emptyState = intelFeed.querySelector('.intel-empty-state');
      if (emptyState) emptyState.remove();

      // Remove 'latest' class from previous cards
      const prevLatest = intelFeed.querySelector('.intel-card.latest');
      if (prevLatest) prevLatest.classList.remove('latest');

      // Create new intel card
      const card = document.createElement('div');
      card.className = 'intel-card latest';
      card.innerHTML = `
        <div class="intel-card-header">
          <span class="intel-card-icon">${featureData.icon}</span>
          <span class="intel-card-title">${featureData.title}</span>
          <span class="intel-card-badge">+${points}</span>
        </div>
        <div class="intel-card-desc">${featureData.desc}</div>
      `;

      // Insert at top of feed
      intelFeed.insertBefore(card, intelFeed.firstChild);

      // Scroll to top to show new card
      intelFeed.scrollTop = 0;
    }

    // Clear intel feed (for game reset)
    function clearIntelFeed() {
      if (!intelFeed) return;
      intelFeed.innerHTML = `
        <div class="intel-empty-state">
          <div class="intel-empty-icon">🎯</div>
          <div class="intel-empty-text">Destroy targets to learn about new features!</div>
          <div class="intel-empty-hint">Each target reveals important product intel.</div>
        </div>
      `;
    }

    // Create the intel banner element if it doesn't exist
    function createIntelBanner() {
      const gameArea = document.getElementById('invaders-game');
      if (!gameArea) return null;

      const banner = document.createElement('div');
      banner.id = 'intel-banner';
      banner.className = 'intel-banner hidden';
      banner.innerHTML = `
        <span class="intel-banner-icon">📣</span>
        <span class="intel-banner-title">Feature</span>
        <span class="intel-banner-points">+100</span>
      `;
      gameArea.appendChild(banner);
      return banner;
    }

    // === COMBO SYSTEM ===
    function incrementCombo() {
      combo++;
      if (combo > maxCombo) maxCombo = combo;
      lastComboTime = performance.now();

      // Play combo sound for combos of 3+
      if (combo >= 3) {
        playSound('combo');
      }

      // Show combo display
      if (comboDisplay && combo >= 2) {
        if (comboCount) comboCount.textContent = combo;
        comboDisplay.style.opacity = '1';
        comboDisplay.classList.add('pulse');
        setTimeout(() => comboDisplay.classList.remove('pulse'), 200);
      }

      // Clear existing timer
      if (comboTimer) clearTimeout(comboTimer);

      // Start combo decay timer
      comboTimer = setTimeout(() => {
        resetCombo();
      }, COMBO_TIMEOUT);
    }

    function resetCombo() {
      combo = 0;
      if (comboDisplay) comboDisplay.style.opacity = '0';
    }

    function getComboMultiplier() {
      if (combo < 2) return 1;
      if (combo < 5) return 1.5;
      if (combo < 10) return 2;
      if (combo < 15) return 2.5;
      return 3;
    }

    // === PARTICLE SYSTEM ===
    function createExplosion(x, y, color = '#00ff88') {
      if (!particleContainer) return;

      const particleCount = 12;
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.background = color;

        const angle = (Math.PI * 2 / particleCount) * i + Math.random() * 0.5;
        const speed = 80 + Math.random() * 120;
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        const life = 0.5 + Math.random() * 0.3;

        particles.push({
          element: particle,
          x: x,
          y: y,
          vx: vx,
          vy: vy,
          life: life,
          maxLife: life
        });

        particleContainer.appendChild(particle);
      }
    }

    function updateParticles(deltaTime) {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= deltaTime;

        if (p.life <= 0) {
          p.element.remove();
          particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * deltaTime;
        p.y += p.vy * deltaTime;
        p.vy += 200 * deltaTime; // gravity

        const opacity = p.life / p.maxLife;
        const scale = 0.5 + opacity * 0.5;

        p.element.style.left = p.x + 'px';
        p.element.style.top = p.y + 'px';
        p.element.style.opacity = opacity;
        p.element.style.transform = `scale(${scale})`;
      }
    }

    // === SCREEN SHAKE ===
    function screenShake(intensity = 1) {
      const wrapper = document.querySelector('.invaders-wrapper');
      if (!wrapper) return;

      wrapper.classList.add('shake');
      wrapper.style.setProperty('--shake-intensity', intensity);

      setTimeout(() => {
        wrapper.classList.remove('shake');
      }, 200);
    }

    // === CALCULATE GRADE ===
    function calculateGrade(finalScore, accuracy, maxComboAchieved, waveReached, victory) {
      let points = 0;

      // Score contribution (up to 40 points)
      if (finalScore >= 5000) points += 40;
      else if (finalScore >= 4000) points += 35;
      else if (finalScore >= 3000) points += 30;
      else if (finalScore >= 2000) points += 20;
      else if (finalScore >= 1000) points += 10;
      else points += 5;

      // Accuracy contribution (up to 30 points)
      if (accuracy >= 90) points += 30;
      else if (accuracy >= 80) points += 25;
      else if (accuracy >= 70) points += 20;
      else if (accuracy >= 60) points += 15;
      else if (accuracy >= 50) points += 10;
      else points += 5;

      // Combo contribution (up to 15 points)
      if (maxComboAchieved >= 10) points += 15;
      else if (maxComboAchieved >= 7) points += 12;
      else if (maxComboAchieved >= 5) points += 9;
      else if (maxComboAchieved >= 3) points += 6;
      else points += 3;

      // Wave contribution (up to 15 points)
      if (victory) points += 15;
      else if (waveReached >= 3) points += 12;
      else if (waveReached >= 2) points += 8;
      else points += 4;

      // Convert to grade
      if (points >= 90) return 'S';
      if (points >= 75) return 'A';
      if (points >= 60) return 'B';
      if (points >= 45) return 'C';
      return 'D';
    }

    // === QUEUE INVADERS FOR CURRENT WAVE ===
    function queueInvadersForWave() {
      const config = getWaveConfig(wave);

      // Clean up any leftover invaders from previous wave (prevents memory buildup)
      invaders.forEach(inv => {
        if (inv.element && inv.element.parentNode) {
          inv.element.remove();
        }
      });
      invaders = [];

      // Always include all learning objectives (features)
      const shuffledFeatures = [...features].sort(() => Math.random() - 0.5);
      const featureTargets = shuffledFeatures.map(f => ({ ...f, isBonus: false }));

      // Add bonus targets for later waves (more targets = more chaos)
      const bonusTargets = [];
      for (let i = 0; i < config.bonusCount; i++) {
        const bonus = BONUS_TARGETS[i % BONUS_TARGETS.length];
        bonusTargets.push({ ...bonus });
      }

      // Combine and shuffle all targets together
      invaderQueue = [...featureTargets, ...bonusTargets].sort(() => Math.random() - 0.5);
      waveKills = 0;

      console.log(`[FeatureInvaders] Wave ${wave} (${config.name}): ${featureTargets.length} features + ${bonusTargets.length} bonus = ${invaderQueue.length} total`);
    }

    // === START NEXT WAVE (INFINITE MODE) ===
    function startNextWave() {
      wave++;
      // No max waves - game continues until player dies!

      const config = getWaveConfig(wave);

      // Show wave transition
      if (waveTransition && waveNumberSpan) {
        waveNumberSpan.textContent = wave;
        if (waveDifficultySpan) waveDifficultySpan.textContent = `DIFFICULTY: ${config.difficultyLabel}`;
        waveTransition.classList.add('show');

        setTimeout(() => {
          waveTransition.classList.remove('show');
          queueInvadersForWave();
          waveInProgress = true;
          updateHUD();
        }, 2500);
      } else {
        queueInvadersForWave();
        waveInProgress = true;
        updateHUD();
      }
    }

    // === CHECK WAVE COMPLETE ===
    function checkWaveComplete() {
      const config = getWaveConfig(wave);
      const aliveInvaders = invaders.filter(i => !i.destroyed).length;
      const queueEmpty = invaderQueue.length === 0;

      // Wave complete when: all invaders spawned AND all killed or escaped
      if (queueEmpty && aliveInvaders === 0) {
        console.log(`[FeatureInvaders] Wave ${wave} complete! Kills: ${waveKills}`);
        waveInProgress = false;

        // Play wave complete fanfare
        playSound('waveComplete');

        // Bonus points for completing wave (scales with wave number)
        const waveBonus = wave * 300;
        score += waveBonus;
        updateHUD();

        // NO shield regeneration between waves!
        // Shields only regenerate from rare health bubbles.
        // This makes health bubbles more valuable and the game more tense.

        setTimeout(() => {
          startNextWave();
        }, 1500);
      }
    }

    // === SPAWN SINGLE INVADER ===
    function spawnInvader() {
      if (invaderQueue.length === 0) return null;

      const featureData = invaderQueue.shift();
      const gameWidth = gameArea.offsetWidth;
      const isBonus = featureData.isBonus;

      const margin = 70;
      const x = margin + Math.random() * (gameWidth - margin * 2 - INVADER_SIZE);

      const el = document.createElement('div');
      // Add 'bonus' class for visual distinction
      el.className = isBonus ? 'invader bonus-target' : 'invader feature-target';
      el.innerHTML = `
        <div class="invader-glow"></div>
        <span class="invader-icon">${featureData.icon}</span>
        ${!isBonus ? '<span class="invader-badge">INTEL</span>' : ''}
      `;
      el.style.left = x + 'px';
      el.style.top = '-70px';
      gameArea.appendChild(el);

      const invader = {
        element: el,
        x: x,
        y: -70,
        baseX: x,
        data: featureData,
        destroyed: false,
        swayOffset: Math.random() * Math.PI * 2
      };

      invaders.push(invader);

      // RARE HEALTH BUBBLE SPAWN
      // After spawning a regular invader, small chance to also spawn a health bubble
      // Only spawn if we haven't already spawned one this wave and player has lost shields
      if (wave > lastHealthBubbleWave && shields < 3 && Math.random() < HEALTH_BUBBLE_CHANCE) {
        spawnHealthBubble();
        lastHealthBubbleWave = wave;
      }

      return invader;
    }

    // === SPAWN HEALTH BUBBLE (RARE) ===
    function spawnHealthBubble() {
      const gameWidth = gameArea.offsetWidth;
      const margin = 70;
      const x = margin + Math.random() * (gameWidth - margin * 2 - INVADER_SIZE);

      const el = document.createElement('div');
      el.className = 'invader health-bubble';
      el.innerHTML = `
        <div class="invader-glow health-glow"></div>
        <span class="invader-icon">${HEALTH_BUBBLE.icon}</span>
        <span class="invader-badge health-badge">HEAL</span>
      `;
      el.style.left = x + 'px';
      el.style.top = '-70px';
      gameArea.appendChild(el);

      const bubble = {
        element: el,
        x: x,
        y: -70,
        baseX: x,
        data: { ...HEALTH_BUBBLE, isBonus: false, isHealth: true },
        destroyed: false,
        swayOffset: Math.random() * Math.PI * 2
      };

      invaders.push(bubble);
      console.log('[FeatureInvaders] Health bubble spawned! Shields: ' + shields);
    }

    // === FIRE PLAYER LASER ===
    function fireLaser() {
      if (!canShoot || !gameRunning) return;

      const gameWidth = gameArea.offsetWidth;
      const gameHeight = gameArea.offsetHeight;
      const shipCenterX = (shipX / 100) * gameWidth;

      const el = document.createElement('div');
      el.className = 'player-laser';
      el.style.left = (shipCenterX - 2) + 'px';
      el.style.top = (gameHeight - SHIP_BOTTOM - 35) + 'px';
      gameArea.appendChild(el);

      playerLasers.push({
        element: el,
        x: shipCenterX - 2,
        y: gameHeight - SHIP_BOTTOM - 35
      });

      // Play laser sound
      playSound('shoot');

      shotsFired++;
      canShoot = false;
      lastShotTime = performance.now();
    }

    // === ENEMY FIRES PROJECTILE ===
    function fireEnemyProjectile(invader) {
      const el = document.createElement('div');
      el.className = 'enemy-projectile';
      el.style.left = (invader.x + INVADER_SIZE / 2 - 4) + 'px';
      el.style.top = (invader.y + INVADER_SIZE) + 'px';

      // Play enemy shoot sound
      playSound('enemyShoot');
      gameArea.appendChild(el);

      enemyProjectiles.push({
        element: el,
        x: invader.x + INVADER_SIZE / 2 - 4,
        y: invader.y + INVADER_SIZE
      });
    }

    // === UPDATE HUD ===
    function updateHUD() {
      if (scoreDisplay) scoreDisplay.textContent = score.toString().padStart(5, '0');
      if (waveDisplay) waveDisplay.innerHTML = `${wave}<span class="wave-total">∞</span>`;

      // Shield pips
      if (shieldsDisplay) {
        const pips = shieldsDisplay.querySelectorAll('.shield-pip');
        pips.forEach((pip, i) => {
          pip.classList.toggle('active', i < shields);
          pip.classList.toggle('depleted', i >= shields);
        });
      }

      // Intel counter in HUD
      if (intelDisplay) intelDisplay.innerHTML = `${destroyedFeatures.length}<span class="intel-total">/${features.length}</span>`;

      // Sidebar updates
      if (sidebarCurrentScore) sidebarCurrentScore.textContent = score.toString().padStart(5, '0');

      // Accuracy
      const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
      if (sidebarAccuracy) sidebarAccuracy.textContent = `${accuracy}%`;
    }

    // === MOVE SHIP (DIRECT) ===
    function moveShip(deltaTime) {
      // Direct movement - no sliding/momentum
      if (keysPressed.left) {
        shipX -= SHIP_SPEED * deltaTime;
      }
      if (keysPressed.right) {
        shipX += SHIP_SPEED * deltaTime;
      }

      // Clamp to bounds
      shipX = Math.max(6, Math.min(94, shipX));
      targetShipX = shipX; // Keep in sync for mouse control

      ship.style.left = shipX + '%';
    }

    // === DESTROY INVADER ===
    function destroyInvader(invader, laserX, laserY) {
      invader.destroyed = true;
      invader.element.classList.add('destroyed');

      // Track hit
      shotsHit++;
      incrementCombo();

      // Calculate points with combo multiplier
      const config = getWaveConfig(wave);
      const multiplier = getComboMultiplier();
      const isBonus = invader.data.isBonus;
      const isHealth = invader.data.isHealth;

      // HEALTH BUBBLE - special case!
      if (isHealth) {
        playSound('healthPickup'); // Special sound for health
        if (shields < 3) {
          // Restore 1 shield
          shields++;
          showHealthPopup(true); // Show "SHIELD RESTORED!"
          console.log('[FeatureInvaders] Shield restored! Now: ' + shields);
        } else {
          // Already full - give bonus points instead
          const bonusPoints = 500;
          score += bonusPoints;
          showHealthPopup(false, bonusPoints); // Show "FULL! +500"
          console.log('[FeatureInvaders] Shields full - bonus points!');
        }
        // Green explosion for health
        const explosionX = invader.x + INVADER_SIZE / 2;
        const explosionY = invader.y + INVADER_SIZE / 2;
        createExplosion(explosionX, explosionY, '#00ff00');
        updateHUD();
        setTimeout(() => invader.element.remove(), 400);
        return; // Don't process as normal invader
      }

      // Bonus targets worth less than learning objectives
      const basePoints = isBonus ? config.bonusPointsPerKill : config.pointsPerKill;
      const points = Math.round(basePoints * multiplier);
      score += points;

      // Only track feature (learning objective) destruction, not bonus targets
      if (!isBonus) {
        playSound('hit'); // Standard hit sound for features
        const alreadyDestroyed = destroyedFeatures.some(f => f.icon === invader.data.icon);
        if (!alreadyDestroyed) {
          destroyedFeatures.push(invader.data);
        }
        // Show intel popup with learning content
        showIntelPopup(invader.data, points);
        // Mark on progress tracker
        markFeatureDestroyed(invader.data);
      } else {
        playSound('bonusHit'); // Cheerful sound for bonus
        // Bonus target - just show quick points notification
        showBonusPopup(invader.data, points);
      }

      waveKills++;

      // Create explosion - different color for bonus vs feature
      const explosionX = invader.x + INVADER_SIZE / 2;
      const explosionY = invader.y + INVADER_SIZE / 2;
      createExplosion(explosionX, explosionY, isBonus ? '#ffcc00' : '#00ff88');

      // Update HUD
      updateHUD();

      setTimeout(() => invader.element.remove(), 400);

      // Check if wave is complete
      checkWaveComplete();
    }

    // Show health bubble collection popup
    function showHealthPopup(restored, bonusPoints = 0) {
      const banner = document.getElementById('intel-banner') || createIntelBanner();
      if (!banner) return;

      const bannerIcon = banner.querySelector('.intel-banner-icon');
      const bannerTitle = banner.querySelector('.intel-banner-title');
      const bannerPoints = banner.querySelector('.intel-banner-points');

      if (bannerIcon) bannerIcon.textContent = '💚';
      if (restored) {
        if (bannerTitle) bannerTitle.textContent = 'SHIELD RESTORED!';
        if (bannerPoints) bannerPoints.textContent = '+1 ❤️';
      } else {
        if (bannerTitle) bannerTitle.textContent = 'SHIELDS FULL!';
        if (bannerPoints) bannerPoints.textContent = `+${bonusPoints}`;
      }

      banner.classList.remove('hidden', 'bonus');
      banner.classList.add('show', 'health');

      setTimeout(() => {
        banner.classList.remove('show', 'health');
        setTimeout(() => banner.classList.add('hidden'), 300);
      }, 1800);
    }

    // Quick popup for bonus targets (doesn't add to intel feed)
    function showBonusPopup(targetData, points) {
      const banner = document.getElementById('intel-banner') || createIntelBanner();
      if (!banner) return;

      const bannerIcon = banner.querySelector('.intel-banner-icon');
      const bannerTitle = banner.querySelector('.intel-banner-title');
      const bannerPoints = banner.querySelector('.intel-banner-points');

      if (bannerIcon) bannerIcon.textContent = targetData.icon;
      if (bannerTitle) bannerTitle.textContent = 'BONUS!';
      if (bannerPoints) bannerPoints.textContent = `+${points}`;

      banner.classList.remove('hidden');
      banner.classList.add('show', 'bonus');

      setTimeout(() => {
        banner.classList.remove('show', 'bonus');
        setTimeout(() => banner.classList.add('hidden'), 300);
      }, 800); // Shorter display for bonus
    }

    // === PLAYER HIT BY PROJECTILE ===
    function playerHit() {
      playSound('playerHit'); // Harsh damage sound

      shields--;
      updateHUD();
      resetCombo();

      // Screen shake
      screenShake(1.5);

      // Create red explosion at ship
      const gameWidth = gameArea.offsetWidth;
      const gameHeight = gameArea.offsetHeight;
      const shipCenterX = (shipX / 100) * gameWidth;
      createExplosion(shipCenterX, gameHeight - SHIP_BOTTOM, '#ff4444');

      // Flash ship
      ship.classList.add('hit');
      setTimeout(() => ship.classList.remove('hit'), 300);

      if (shields <= 0) {
        setTimeout(gameOver, 500);
      }
    }

    // === INVADER ESCAPED ===
    // In classic Space Invaders, enemies reaching the bottom is devastating!
    // - Feature targets (learning objectives): LOSE A SHIELD
    // - Bonus targets: LOSE A SHIELD (they're enemies too!)
    // - Health bubbles: No penalty - they're a gift, not a threat
    function invaderEscaped(invader) {
      invader.destroyed = true;
      invader.element.style.opacity = '0';
      setTimeout(() => invader.element.remove(), 300);

      const isHealth = invader.data.isHealth;

      // Health bubbles don't penalize - they're gifts
      if (isHealth) {
        return;
      }

      // ALL enemies escaping = lose a shield!
      playSound('escape'); // Sad descending sound

      shields--;
      updateHUD();
      resetCombo();

      // Show warning for feature targets (learning objectives)
      if (!invader.data.isBonus) {
        showEscapeWarning(invader.data);
      }

      screenShake(2);

      if (shields <= 0) {
        setTimeout(gameOver, 500);
      }
    }

    // Show warning when a feature escapes
    function showEscapeWarning(featureData) {
      const banner = document.getElementById('intel-banner') || createIntelBanner();
      if (!banner) return;

      const bannerIcon = banner.querySelector('.intel-banner-icon');
      const bannerTitle = banner.querySelector('.intel-banner-title');
      const bannerPoints = banner.querySelector('.intel-banner-points');

      if (bannerIcon) bannerIcon.textContent = '⚠️';
      if (bannerTitle) bannerTitle.textContent = `${featureData.title} ESCAPED!`;
      if (bannerPoints) bannerPoints.textContent = '-1 ❤️';

      banner.classList.remove('hidden', 'bonus', 'health');
      banner.classList.add('show', 'danger');

      setTimeout(() => {
        banner.classList.remove('show', 'danger');
        setTimeout(() => banner.classList.add('hidden'), 300);
      }, 1500);
    }

    // === GAME OVER ===
    function gameOver() {
      gameRunning = false;
      waveInProgress = false;
      if (gameLoop) cancelAnimationFrame(gameLoop);
      if (comboTimer) clearTimeout(comboTimer);

      // Stop the game music
      stopMusic();

      saveHighScore();

      // Show name entry popup for leaderboard
      showNameEntryPopup(score, wave, false);
    }

    function showGameOverScreen(finalScore, finalWave, rank) {
      // Calculate stats
      const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
      const grade = calculateGrade(finalScore, accuracy, maxCombo, finalWave, false);
      const isNewHighScore = finalScore >= highScore;

      // Populate game over screen
      if (gameoverScore) gameoverScore.textContent = finalScore.toLocaleString();
      if (gameoverWave) gameoverWave.textContent = finalWave;
      if (gameoverFeatures) gameoverFeatures.textContent = `${destroyedFeatures.length}/${features.length}`;
      if (gameoverAccuracy) gameoverAccuracy.textContent = `${accuracy}%`;
      if (gameoverCombo) gameoverCombo.textContent = `${maxCombo}x`;
      if (gameoverGrade) {
        gameoverGrade.textContent = grade;
        gameoverGrade.className = `result-value grade grade-${grade.toLowerCase()}`;
      }
      if (gameoverHighscoreMsg) {
        if (rank && rank <= 5) {
          gameoverHighscoreMsg.textContent = `★ #${rank} ON LEADERBOARD! ★`;
          gameoverHighscoreMsg.style.display = 'block';
        } else if (isNewHighScore) {
          gameoverHighscoreMsg.textContent = '★ NEW PERSONAL BEST! ★';
          gameoverHighscoreMsg.style.display = 'block';
        } else {
          gameoverHighscoreMsg.style.display = 'none';
        }
      }

      // Populate leaderboard with player highlighted
      populateGameOverLeaderboard(playerName, finalScore, rank);

      gameoverScreen.style.display = 'flex';

      // Play game over sound
      playSound('gameOver');
    }

    // Populate the game over leaderboard with player's entry highlighted
    function populateGameOverLeaderboard(currentPlayerName, currentScore, playerRank) {
      const leaderboardList = document.getElementById('gameover-leaderboard-list');
      if (!leaderboardList) return;

      // Get top 5 entries
      const entries = leaderboardData.slice(0, 5);

      leaderboardList.innerHTML = entries.map((entry, i) => {
        const rank = i + 1;
        const isCurrentPlayer = playerRank && rank === playerRank;
        const rankClass = rank === 1 ? 'gold' : rank === 2 ? 'silver' : rank === 3 ? 'bronze' : '';
        const highlightClass = isCurrentPlayer ? 'current-player' : '';

        return `
          <div class="leaderboard-row ${rankClass} ${highlightClass}">
            <span class="lb-rank">#${rank}</span>
            <span class="lb-name">${escapeHtml(entry.name)}${isCurrentPlayer ? ' ← YOU' : ''}</span>
            <span class="lb-score">${entry.score.toLocaleString()}</span>
            <span class="lb-wave">W${entry.wave || '?'}</span>
          </div>
        `;
      }).join('');

      // If player didn't make top 5, show their position below
      if (playerRank && playerRank > 5) {
        leaderboardList.innerHTML += `
          <div class="leaderboard-row current-player not-top5">
            <span class="lb-rank">#${playerRank}</span>
            <span class="lb-name">${escapeHtml(currentPlayerName)} ← YOU</span>
            <span class="lb-score">${currentScore.toLocaleString()}</span>
            <span class="lb-wave">W${wave}</span>
          </div>
        `;
      }
    }

    // === VICTORY (kept for compatibility but now only shown via skip) ===
    function victory() {
      // In infinite mode, game only ends on death
      // This function is kept for the skip button functionality
      gameRunning = false;
      waveInProgress = false;
      if (gameLoop) cancelAnimationFrame(gameLoop);
      if (comboTimer) clearTimeout(comboTimer);

      saveHighScore();

      // If player has a good score, show name entry
      if (score > 0) {
        showNameEntryPopup(score, wave, true);
      } else {
        showVictoryScreen(0, 1, null);
      }
    }

    function showVictoryScreen(finalScore, finalWave, rank) {
      // Calculate stats
      const gameTime = Math.round((performance.now() - gameStartTime) / 1000);
      const minutes = Math.floor(gameTime / 60);
      const seconds = gameTime % 60;
      const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      const accuracy = shotsFired > 0 ? Math.round((shotsHit / shotsFired) * 100) : 0;
      const grade = calculateGrade(finalScore, accuracy, maxCombo, finalWave, true);
      const isNewHighScore = finalScore >= highScore;

      // Populate victory screen
      if (victoryScore) victoryScore.textContent = finalScore.toLocaleString();
      if (victoryTime) victoryTime.textContent = timeStr;
      if (victoryAccuracy) victoryAccuracy.textContent = `${accuracy}%`;
      if (victoryCombo) victoryCombo.textContent = `${maxCombo}x`;
      if (victoryGrade) {
        victoryGrade.textContent = grade;
        victoryGrade.className = `result-value grade grade-${grade.toLowerCase()}`;
      }
      if (victoryHighscoreMsg) {
        if (rank && rank <= 5) {
          victoryHighscoreMsg.textContent = `★ #${rank} ON LEADERBOARD! ★`;
          victoryHighscoreMsg.style.display = 'block';
        } else if (isNewHighScore && finalScore > 0) {
          victoryHighscoreMsg.textContent = '★ NEW PERSONAL BEST! ★';
          victoryHighscoreMsg.style.display = 'block';
        } else {
          victoryHighscoreMsg.style.display = 'none';
        }
      }

      victoryScreen.style.display = 'flex';

      const completionPrompt = document.getElementById('featureCardsCompletion');
      if (completionPrompt) {
        completionPrompt.style.display = 'flex';
      }
    }

    // === SKIP GAME ===
    function skipGame() {
      gameRunning = false;
      if (gameLoop) cancelAnimationFrame(gameLoop);
      if (comboTimer) clearTimeout(comboTimer);

      // Stop any music
      stopMusic();

      // Clear game objects
      invaders.forEach(inv => inv.element?.remove());
      playerLasers.forEach(l => l.element?.remove());
      enemyProjectiles.forEach(p => p.element?.remove());
      particles.forEach(p => p.element?.remove());
      invaders = [];
      playerLasers = [];
      enemyProjectiles = [];
      particles = [];

      startScreen.style.display = 'none';
      gameoverScreen.style.display = 'none';
      victoryScreen.style.display = 'none';

      // Navigate to next section
      if (typeof Course !== 'undefined') {
        Course.navigateToSection('2-1');
      } else {
        // Fallback: show completion prompt
        const completionPrompt = document.getElementById('featureCardsCompletion');
        if (completionPrompt) {
          completionPrompt.style.display = 'flex';
        }
      }
    }

    // === MAIN GAME LOOP (60fps) ===
    function runGame(currentTime) {
      if (!gameRunning) return;

      // Get base wave config
      const config = getWaveConfig(wave);

      // Calculate dynamic difficulty based on remaining enemies (Space Invaders style!)
      const aliveInvaders = invaders.filter(inv => !inv.destroyed);
      const totalSpawned = config.invaderCount - invaderQueue.length;
      const dynamicDiff = getDynamicDifficulty(config, aliveInvaders.length, Math.max(totalSpawned, 1));

      if (!lastFrameTime) lastFrameTime = currentTime;
      const deltaTime = Math.min((currentTime - lastFrameTime) / 1000, 0.1);
      lastFrameTime = currentTime;

      const gameWidth = gameArea.offsetWidth;
      const gameHeight = gameArea.offsetHeight;
      const escapeY = gameHeight - 60;
      const shipY = gameHeight - SHIP_BOTTOM;

      // Shot cooldown
      if (!canShoot && currentTime - lastShotTime > SHOT_COOLDOWN) {
        canShoot = true;
      }

      // Fire if holding space
      if (keysPressed.fire && canShoot) {
        fireLaser();
      }

      // Move ship
      moveShip(deltaTime);

      // Spawn invaders
      if (waveInProgress && invaderQueue.length > 0 && currentTime - lastInvaderSpawn > config.spawnInterval) {
        spawnInvader();
        lastInvaderSpawn = currentTime;
      }

      // Check if wave should complete (all spawned and none alive)
      if (waveInProgress && invaderQueue.length === 0 && invaders.filter(i => !i.destroyed).length === 0) {
        checkWaveComplete();
      }

      // Enemy shooting - DYNAMIC: shoots faster as fewer enemies remain
      if (invaders.length > 0 && currentTime - lastEnemyShot > dynamicDiff.enemyShotInterval) {
        const activeInvaders = invaders.filter(inv => !inv.destroyed && inv.y > 0);
        if (activeInvaders.length > 0) {
          const shooter = activeInvaders[Math.floor(Math.random() * activeInvaders.length)];
          fireEnemyProjectile(shooter);
          lastEnemyShot = currentTime;
        }
      }

      // Update player lasers
      for (let i = playerLasers.length - 1; i >= 0; i--) {
        const laser = playerLasers[i];
        laser.y -= LASER_SPEED * deltaTime;
        laser.element.style.top = laser.y + 'px';

        if (laser.y < -30) {
          laser.element.remove();
          playerLasers.splice(i, 1);
          continue;
        }

        // Check hit on invaders
        for (const invader of invaders) {
          if (invader.destroyed) continue;

          const invCenterX = invader.x + INVADER_SIZE / 2;
          const invCenterY = invader.y + INVADER_SIZE / 2;
          const dx = laser.x - invCenterX;
          const dy = laser.y - invCenterY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < LASER_HIT_DISTANCE) {
            destroyInvader(invader, laser.x, laser.y);
            laser.element.remove();
            playerLasers.splice(i, 1);
            break;
          }
        }
      }

      // Update enemy projectiles - DYNAMIC: projectiles faster as fewer enemies remain
      const shipCenterX = (shipX / 100) * gameWidth;
      for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
        const proj = enemyProjectiles[i];
        proj.y += dynamicDiff.projectileSpeed * deltaTime;
        proj.element.style.top = proj.y + 'px';

        if (proj.y > gameHeight + 20) {
          proj.element.remove();
          enemyProjectiles.splice(i, 1);
          continue;
        }

        // Tighter hit detection for player
        const dx = proj.x - shipCenterX;
        const dy = proj.y - shipY;
        if (Math.abs(dx) < PLAYER_HIT_DISTANCE && Math.abs(dy) < PLAYER_HIT_DISTANCE) {
          proj.element.remove();
          enemyProjectiles.splice(i, 1);
          playerHit();
          continue;
        }
      }

      // Update invaders - DYNAMIC SPEED: faster as fewer enemies remain!
      for (let i = invaders.length - 1; i >= 0; i--) {
        const invader = invaders[i];
        if (invader.destroyed) continue;

        // Sway speed increases as enemies die
        invader.swayOffset += deltaTime * dynamicDiff.swaySpeed;
        const swayX = Math.sin(invader.swayOffset) * config.swayAmplitude;
        invader.x = invader.baseX + swayX;
        invader.x = Math.max(5, Math.min(gameWidth - INVADER_SIZE - 5, invader.x));

        // DROP SPEED IS DYNAMIC - this is the key Space Invaders mechanic!
        invader.y += dynamicDiff.dropSpeed * deltaTime;

        invader.element.style.left = invader.x + 'px';
        invader.element.style.top = invader.y + 'px';

        if (invader.y > escapeY) {
          invaderEscaped(invader);
        }
      }

      // Update particles
      updateParticles(deltaTime);

      // Cleanup destroyed
      invaders = invaders.filter(inv => !inv.destroyed);

      gameLoop = requestAnimationFrame(runGame);
    }

    // === START GAME ===
    function startGame() {
      // Initialize audio on first interaction (browser policy)
      initAudio();

      // Switch to game music
      startMusic('game');

      // Play game start sound
      playSound('gameStart');

      // Reset state
      gameRunning = true;
      waveInProgress = true;
      score = 0;
      shields = 3;
      wave = 1;
      waveKills = 0;
      destroyedFeatures = [];
      shipX = 50;
      targetShipX = 50;
      lastFrameTime = 0;
      lastInvaderSpawn = 0;
      lastEnemyShot = 0;
      canShoot = true;
      keysPressed = { left: false, right: false, fire: false };
      gameStartTime = performance.now();

      // Reset combo and accuracy
      combo = 0;
      maxCombo = 0;
      shotsFired = 0;
      shotsHit = 0;
      if (comboTimer) clearTimeout(comboTimer);

      // Clear game objects
      invaders.forEach(inv => inv.element?.remove());
      playerLasers.forEach(l => l.element?.remove());
      enemyProjectiles.forEach(p => p.element?.remove());
      particles.forEach(p => p.element?.remove());
      invaders = [];
      playerLasers = [];
      enemyProjectiles = [];
      particles = [];

      // Queue invaders for wave 1
      queueInvadersForWave();

      // Reset checklist and intel feed
      resetChecklist();
      clearIntelFeed();

      // Reset sidebar displays
      if (sidebarAccuracy) sidebarAccuracy.textContent = '-%';

      // Reset ship position
      ship.style.left = '50%';
      ship.classList.remove('hit');

      // Hide overlays
      startScreen.style.display = 'none';
      gameoverScreen.style.display = 'none';
      victoryScreen.style.display = 'none';
      if (waveTransition) waveTransition.classList.remove('show');
      if (intelPopup) intelPopup.classList.remove('show');
      if (comboDisplay) comboDisplay.style.opacity = '0';

      // Update HUD
      updateHUD();

      // Start game loop
      gameLoop = requestAnimationFrame(runGame);

      console.log('[FeatureInvaders] v34 ULTIMATE EDITION - Wave 1 started!');
    }

    // === INPUT HANDLERS ===
    document.addEventListener('keydown', (e) => {
      const section = document.getElementById('section-1-2');
      if (!section || section.classList.contains('hidden')) return;

      // Don't capture keys when typing in an input field
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        keysPressed.left = true;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        keysPressed.right = true;
      } else if (e.code === 'Space') {
        e.preventDefault();
        keysPressed.fire = true;
      }
    });

    document.addEventListener('keyup', (e) => {
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        keysPressed.left = false;
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        keysPressed.right = false;
      } else if (e.code === 'Space') {
        keysPressed.fire = false;
      }
    });

    gameArea?.addEventListener('mousemove', (e) => {
      if (!gameRunning) return;
      const rect = gameArea.getBoundingClientRect();
      targetShipX = ((e.clientX - rect.left) / rect.width) * 100;
    });

    gameArea?.addEventListener('click', (e) => {
      if (!gameRunning) return;
      fireLaser();
    });

    gameArea?.addEventListener('touchmove', (e) => {
      if (!gameRunning) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = gameArea.getBoundingClientRect();
      targetShipX = ((touch.clientX - rect.left) / rect.width) * 100;
    }, { passive: false });

    gameArea?.addEventListener('touchstart', (e) => {
      if (!gameRunning) return;
      const touch = e.touches[0];
      const rect = gameArea.getBoundingClientRect();
      targetShipX = ((touch.clientX - rect.left) / rect.width) * 100;
    }, { passive: true });

    // === WELCOME SCREEN & CINEMATIC VILLAIN INTRO ===
    let cinematicIndex = 0;
    let cinematicTimer = null;
    let cinematicRunning = false;
    const VILLAIN_DISPLAY_TIME = 3000; // Time each villain is shown (ms)
    const VILLAIN_ENTER_DELAY = 200;   // Stagger delay between parade entries (ms)

    // Welcome screen DOM elements
    const welcomeScreen = document.getElementById('invaders-welcome');
    const welcomeStartBtn = document.getElementById('welcome-start-btn');

    // Cinematic DOM elements
    const cinematicScreen = document.getElementById('invaders-cinematic');
    const villainParade = document.getElementById('villain-parade');
    const spotlightIcon = document.getElementById('spotlight-icon');
    const spotlightName = document.getElementById('spotlight-name');
    const spotlightDesc = document.getElementById('spotlight-desc');
    const spotlightThreat = document.getElementById('spotlight-threat');
    const spotlightCurrent = document.getElementById('spotlight-current');
    const spotlightTotal = document.getElementById('spotlight-total');
    const villainSpotlight = document.getElementById('villain-spotlight');
    const cinematicTitle = document.getElementById('cinematic-title');
    const cinematicCta = document.getElementById('cinematic-cta');
    const cinematicSkipBtn = document.getElementById('cinematic-skip-btn');
    const cinematicStartBtn = document.getElementById('cinematic-start-btn');

    // Show welcome screen first
    function initWelcome() {
      if (!welcomeScreen || features.length === 0) {
        // No welcome screen or no features, go straight to game
        showStartScreen();
        return;
      }

      // Show welcome, hide everything else
      welcomeScreen.style.display = 'flex';
      if (cinematicScreen) cinematicScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'none';
    }

    // Start the cinematic when user clicks the button
    function startCinematicFromWelcome() {
      // Initialize audio and start intro music
      initAudio();
      startMusic('intro');

      if (welcomeScreen) welcomeScreen.style.display = 'none';
      initCinematic();
    }

    // Welcome button listener
    welcomeStartBtn?.addEventListener('click', startCinematicFromWelcome);

    function initCinematic() {
      if (!cinematicScreen || features.length === 0) {
        showStartScreen();
        return;
      }

      cinematicIndex = 0;
      cinematicRunning = true;

      // Set total count
      if (spotlightTotal) spotlightTotal.textContent = features.length;

      // Build the villain parade (all icons in a row, Space Invaders style)
      if (villainParade) {
        villainParade.innerHTML = features.map((f, i) =>
          `<div class="parade-villain" data-index="${i}" title="${f.title}">${f.icon}</div>`
        ).join('');
      }

      // Show cinematic screen
      cinematicScreen.style.display = 'flex';
      if (startScreen) startScreen.style.display = 'none';

      // Hide spotlight and CTA initially
      if (villainSpotlight) villainSpotlight.style.opacity = '0';
      if (cinematicCta) cinematicCta.style.display = 'none';

      // Start the sequence after title animation
      setTimeout(() => {
        startVillainParade();
      }, 1500);
    }

    function startVillainParade() {
      if (!cinematicRunning) return;

      const villains = villainParade?.querySelectorAll('.parade-villain');
      if (!villains || villains.length === 0) return;

      // Animate villains entering the parade one by one (Space Invaders descent)
      villains.forEach((v, i) => {
        setTimeout(() => {
          if (!cinematicRunning) return;
          v.classList.add('entered');

          // When this villain enters, start showing them in spotlight if they're current
          if (i === 0) {
            setTimeout(() => {
              if (cinematicRunning) {
                showVillainInSpotlight(0);
              }
            }, 300);
          }
        }, i * VILLAIN_ENTER_DELAY);
      });
    }

    function showVillainInSpotlight(index) {
      if (!cinematicRunning || index >= features.length) {
        // All villains shown, proceed to CTA
        showCinematicCta();
        return;
      }

      cinematicIndex = index;
      const feature = features[index];
      const villains = villainParade?.querySelectorAll('.parade-villain');

      // Update parade highlighting
      if (villains) {
        villains.forEach((v, i) => {
          v.classList.remove('active', 'completed');
          if (i < index) v.classList.add('completed');
          else if (i === index) v.classList.add('active');
        });
      }

      // Show spotlight area
      if (villainSpotlight) {
        villainSpotlight.style.opacity = '1';
        villainSpotlight.classList.remove('entering');
        // Force reflow to restart animation
        void villainSpotlight.offsetWidth;
        villainSpotlight.classList.add('entering');
      }

      // Update spotlight content
      if (spotlightIcon) spotlightIcon.textContent = feature.icon;
      if (spotlightName) spotlightName.textContent = feature.title;
      if (spotlightDesc) spotlightDesc.textContent = feature.desc;
      if (spotlightCurrent) spotlightCurrent.textContent = index + 1;

      // Random threat level for dramatic effect
      const threats = ['CRITICAL', 'HIGH', 'ELEVATED', 'MODERATE'];
      const threatIdx = Math.floor(Math.random() * threats.length);
      if (spotlightThreat) {
        spotlightThreat.textContent = `THREAT: ${threats[threatIdx]}`;
      }

      // Auto-advance to next villain after delay
      cinematicTimer = setTimeout(() => {
        if (cinematicRunning) {
          showVillainInSpotlight(index + 1);
        }
      }, VILLAIN_DISPLAY_TIME);
    }

    function showCinematicCta() {
      cinematicRunning = false;

      // Hide spotlight, show CTA
      if (villainSpotlight) villainSpotlight.style.opacity = '0';
      if (cinematicTitle) cinematicTitle.style.opacity = '0';

      // Mark all parade villains as completed
      const villains = villainParade?.querySelectorAll('.parade-villain');
      if (villains) {
        villains.forEach(v => {
          v.classList.remove('active');
          v.classList.add('completed');
        });
      }

      // Show CTA
      if (cinematicCta) {
        cinematicCta.style.display = 'block';
      }
    }

    function skipCinematic() {
      cinematicRunning = false;
      if (cinematicTimer) {
        clearTimeout(cinematicTimer);
        cinematicTimer = null;
      }
      showStartScreen();
    }

    function showStartScreen() {
      cinematicRunning = false;
      if (cinematicTimer) {
        clearTimeout(cinematicTimer);
        cinematicTimer = null;
      }
      if (cinematicScreen) cinematicScreen.style.display = 'none';
      if (startScreen) startScreen.style.display = 'flex';
    }

    // Cinematic button listeners
    cinematicSkipBtn?.addEventListener('click', skipCinematic);
    cinematicStartBtn?.addEventListener('click', showStartScreen);

    // ESC key to skip cinematic
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && cinematicRunning) {
        skipCinematic();
      }
    });

    // Allow clicking parade villains to jump to that feature
    villainParade?.addEventListener('click', (e) => {
      const villain = e.target.closest('.parade-villain');
      if (villain && cinematicRunning) {
        const index = parseInt(villain.dataset.index, 10);
        if (cinematicTimer) clearTimeout(cinematicTimer);
        showVillainInSpotlight(index);
      }
    });

    // === BUTTON LISTENERS ===
    document.getElementById('invaders-start-btn')?.addEventListener('click', startGame);
    document.getElementById('invaders-retry-btn')?.addEventListener('click', startGame);
    document.getElementById('invaders-skip-btn')?.addEventListener('click', skipGame);
    document.getElementById('invaders-skip-btn-2')?.addEventListener('click', skipGame);
    document.getElementById('invaders-continue-btn')?.addEventListener('click', () => {
      if (typeof Course !== 'undefined') {
        Course.navigateToSection('2-1');
      }
    });

    // Sound toggle button
    const soundToggle = document.getElementById('sound-toggle');
    if (soundToggle) {
      soundToggle.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        soundToggle.classList.toggle('muted', !soundEnabled);

        if (!soundEnabled) {
          stopMusic();
        } else if (gameRunning) {
          startMusic('game');
        }
      });
    }

    // Load features, high score, and build checklist on init
    loadFeatures();
    loadHighScore();
    buildChecklist();

    // Initialize with welcome screen (user clicks to start cinematic)
    initWelcome();

    console.log('[FeatureInvaders] v34 ULTIMATE EDITION Initialized');
  }

  /**
   * Accordions
   */
  function initAccordions() {
    document.querySelectorAll('.accordion-header').forEach(header => {
      header.addEventListener('click', () => {
        const item = header.parentElement;
        const wasOpen = item.classList.contains('open');

        // Close all items in this accordion
        const accordion = item.parentElement;
        accordion.querySelectorAll('.accordion-item').forEach(i => {
          i.classList.remove('open');
        });

        // Toggle clicked item
        if (!wasOpen) {
          item.classList.add('open');
        }
      });
    });
  }

  /**
   * Payout Builder Demo (Module 2.3)
   */
  function initPostBuilderDemo() {
    const titleInput = document.getElementById('postTitle');
    const topicSelect = document.getElementById('postTopic');
    const subtitleInput = document.getElementById('postSubtitle');
    const contentInput = document.getElementById('postContent');
    const colorOptions = document.querySelectorAll('.color-option');
    const publishBtn = document.getElementById('publishPost');
    const resetBtn = document.getElementById('resetDemo');

    const previewHeader = document.getElementById('previewHeader');
    const previewTitle = document.getElementById('previewTitle');
    const previewTopic = document.getElementById('previewTopic');
    const previewSubtitle = document.getElementById('previewSubtitle');
    const previewDate = document.getElementById('previewDate');
    const previewContent = document.getElementById('previewContent');

    const demoContainer = document.querySelector('.demo-container');
    const demoSuccess = document.getElementById('demoSuccess');

    if (!titleInput || !publishBtn) return;

    // Set today's date
    const today = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    if (previewDate) {
      previewDate.textContent = today;
    }

    // Update preview on input
    function updatePreview() {
      if (previewTitle) {
        previewTitle.textContent = titleInput.value || 'Payout Request Preview';
      }
      if (previewTopic) {
        previewTopic.textContent = topicSelect.value ?
          topicSelect.options[topicSelect.selectedIndex].text : 'Topic';
      }
      if (previewSubtitle) {
        previewSubtitle.textContent = subtitleInput.value;
        previewSubtitle.style.display = subtitleInput.value ? 'block' : 'none';
      }
      if (previewContent) {
        previewContent.textContent = contentInput.value || 'Your content will appear here...';
      }

      // Enable/disable publish button
      const isValid = titleInput.value.trim() && topicSelect.value;
      publishBtn.disabled = !isValid;
    }

    titleInput.addEventListener('input', updatePreview);
    topicSelect.addEventListener('change', updatePreview);
    subtitleInput.addEventListener('input', updatePreview);
    contentInput.addEventListener('input', updatePreview);

    // Color picker
    colorOptions.forEach(option => {
      option.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('selected'));
        option.classList.add('selected');

        if (previewHeader) {
          previewHeader.style.background = option.dataset.color;
        }
      });
    });

    // Publish button
    publishBtn.addEventListener('click', () => {
      if (demoContainer && demoSuccess) {
        demoContainer.classList.add('hidden');
        demoSuccess.classList.remove('hidden');
      }
    });

    // Reset button
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        titleInput.value = '';
        topicSelect.value = '';
        subtitleInput.value = '';
        contentInput.value = '';
        colorOptions.forEach(o => o.classList.remove('selected'));
        colorOptions[0]?.classList.add('selected');
        if (previewHeader) {
          previewHeader.style.background = '#7C3AED';
        }

        updatePreview();

        if (demoContainer && demoSuccess) {
          demoContainer.classList.remove('hidden');
          demoSuccess.classList.add('hidden');
        }
      });
    }
  }

  // ==================== KNOWLEDGE CHECKS (Practice - No Score) ====================

  /**
   * Initialize Knowledge Checks - these are practice quizzes
   * - Allow retry on wrong answers
   * - Always show "Continue" button
   * - Don't track scores
   */
  function initKnowledgeChecks() {
    // Find all knowledge check containers (not the final exam)
    document.querySelectorAll('.quiz-container:not(#final-exam)').forEach(container => {
      initKnowledgeCheckContainer(container);
    });
  }

  function initKnowledgeCheckContainer(container) {
    const questions = container.querySelectorAll('.quiz-question');

    questions.forEach((question, index) => {
      const checkBtn = question.querySelector('.check-answer, .check-answer-multi');
      if (!checkBtn) return;

      // Add a continue button (hidden initially)
      const continueBtn = document.createElement('button');
      continueBtn.className = 'btn btn-primary knowledge-check-continue hidden';
      continueBtn.innerHTML = index < questions.length - 1
        ? 'Next Question <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5"/></svg>'
        : 'Continue <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M6 3l5 5-5 5"/></svg>';
      checkBtn.parentNode.insertBefore(continueBtn, checkBtn.nextSibling);

      // Add a retry button (hidden initially)
      const retryBtn = document.createElement('button');
      retryBtn.className = 'btn btn-secondary knowledge-check-retry hidden';
      retryBtn.textContent = 'Try Again';
      checkBtn.parentNode.insertBefore(retryBtn, continueBtn);

      // Handle check answer
      checkBtn.addEventListener('click', () => {
        try {
          const isMulti = checkBtn.classList.contains('check-answer-multi');
          const result = isMulti
            ? checkKnowledgeAnswerMulti(question, checkBtn)
            : checkKnowledgeAnswer(question, checkBtn);

          // Only update UI if user actually answered
          if (!result.answered) {
            return; // User didn't select anything, alert was shown
          }

          // Show appropriate buttons
          if (result.isCorrect) {
            continueBtn.classList.remove('hidden');
            retryBtn.classList.add('hidden');
            checkBtn.classList.add('hidden');
          } else {
            retryBtn.classList.remove('hidden');
            continueBtn.classList.remove('hidden'); // Can still continue even if wrong
            checkBtn.classList.add('hidden');
          }
        } catch (error) {
          console.error('Error checking answer:', error);
          // Still show continue button so user isn't stuck
          continueBtn.classList.remove('hidden');
          checkBtn.classList.add('hidden');
        }
      });

      // Handle retry
      retryBtn.addEventListener('click', () => {
        resetKnowledgeQuestion(question);
        retryBtn.classList.add('hidden');
        continueBtn.classList.add('hidden');
        checkBtn.classList.remove('hidden');
      });

      // Handle continue
      continueBtn.addEventListener('click', () => {
        if (index < questions.length - 1) {
          // Go to next question
          question.classList.add('hidden');
          questions[index + 1].classList.remove('hidden');
        } else {
          // Show completion and navigate to next section
          const results = container.querySelector('.quiz-results');
          if (results) {
            question.classList.add('hidden');
            results.classList.remove('hidden');

            // Update results text for knowledge check
            const resultsText = results.querySelector('.results-score');
            if (resultsText) {
              resultsText.textContent = 'Great job completing this knowledge check!';
            }
          }
        }
      });
    });
  }

  function checkKnowledgeAnswer(question, btn) {
    const selectedOption = question.querySelector('input[type="radio"]:checked');

    if (!selectedOption) {
      showInlineMessage(question, 'Please select an answer before continuing.', 'warning');
      return { isCorrect: false, answered: false };
    }

    const correctAnswer = btn.dataset.correct;
    const isCorrect = selectedOption.value === correctAnswer;
    const feedback = question.querySelector('.quiz-feedback');
    const feedbackCorrect = question.querySelector('.feedback-correct');
    const feedbackIncorrect = question.querySelector('.feedback-incorrect');

    // Show feedback
    if (feedback) feedback.classList.remove('hidden');
    if (feedbackCorrect) feedbackCorrect.classList.toggle('hidden', !isCorrect);
    if (feedbackIncorrect) feedbackIncorrect.classList.toggle('hidden', isCorrect);

    // Highlight options
    question.querySelectorAll('.quiz-option').forEach(option => {
      const input = option.querySelector('input');
      option.classList.remove('correct', 'incorrect');
      if (input.value === correctAnswer) {
        option.classList.add('correct');
      } else if (input.checked && !isCorrect) {
        option.classList.add('incorrect');
      }
    });

    // Disable inputs temporarily
    question.querySelectorAll('input').forEach(input => {
      input.disabled = true;
    });

    return { isCorrect, answered: true };
  }

  function checkKnowledgeAnswerMulti(question, btn) {
    const selectedOptions = question.querySelectorAll('input[type="checkbox"]:checked');

    if (selectedOptions.length === 0) {
      showInlineMessage(question, 'Please select at least one answer before continuing.', 'warning');
      return { isCorrect: false, answered: false };
    }

    const correctAnswers = btn.dataset.correct.split(',');
    const selectedValues = Array.from(selectedOptions).map(opt => opt.value);

    const isCorrect = correctAnswers.length === selectedValues.length &&
      correctAnswers.every(a => selectedValues.includes(a));

    const feedback = question.querySelector('.quiz-feedback');
    const feedbackCorrect = question.querySelector('.feedback-correct');
    const feedbackIncorrect = question.querySelector('.feedback-incorrect');

    // Show feedback
    if (feedback) feedback.classList.remove('hidden');
    if (feedbackCorrect) feedbackCorrect.classList.toggle('hidden', !isCorrect);
    if (feedbackIncorrect) feedbackIncorrect.classList.toggle('hidden', isCorrect);

    // Highlight options
    question.querySelectorAll('.quiz-option').forEach(option => {
      const input = option.querySelector('input');
      option.classList.remove('correct', 'incorrect');
      if (correctAnswers.includes(input.value)) {
        option.classList.add('correct');
      } else if (input.checked) {
        option.classList.add('incorrect');
      }
    });

    // Disable inputs temporarily
    question.querySelectorAll('input').forEach(input => {
      input.disabled = true;
    });

    return { isCorrect, answered: true };
  }

  function resetKnowledgeQuestion(question) {
    // Clear selections
    question.querySelectorAll('input').forEach(input => {
      input.checked = false;
      input.disabled = false;
    });

    // Clear highlighting
    question.querySelectorAll('.quiz-option').forEach(option => {
      option.classList.remove('correct', 'incorrect');
    });

    // Hide feedback
    const feedback = question.querySelector('.quiz-feedback');
    if (feedback) feedback.classList.add('hidden');
    const feedbackCorrect = question.querySelector('.feedback-correct');
    if (feedbackCorrect) feedbackCorrect.classList.add('hidden');
    const feedbackIncorrect = question.querySelector('.feedback-incorrect');
    if (feedbackIncorrect) feedbackIncorrect.classList.add('hidden');
  }

  // ==================== FINAL EXAM (Graded - 10 Questions, 3 Attempts) ====================

  /**
   * Initialize Final Exam
   */
  function initFinalExam() {
    const examContainer = document.getElementById('final-exam');
    if (!examContainer) return;

    const startBtn = document.getElementById('start-exam-btn');
    const retakeBtn = document.getElementById('retake-exam-btn');

    if (startBtn) {
      startBtn.addEventListener('click', () => startExam());
    }

    if (retakeBtn) {
      retakeBtn.addEventListener('click', () => startExam());
    }

    // Initialize exam question handlers
    examContainer.querySelectorAll('.exam-question').forEach((question, index) => {
      const submitBtn = question.querySelector('.submit-exam-answer');
      if (submitBtn) {
        submitBtn.addEventListener('click', () => submitExamAnswer(index));
      }
    });

    // Update UI based on saved state
    updateExamUI();
  }

  function startExam() {
    if (examAttempts >= MAX_EXAM_ATTEMPTS) {
      const examContainer = document.getElementById('final-exam');
      showInlineMessage(examContainer, 'You have used all 3 exam attempts. Your best score has been recorded.', 'error');
      return;
    }

    examAttempts++;
    examQuestionIndex = 0;
    examAnswers = [];

    // Hide intro, show first question
    const intro = document.getElementById('exam-intro');
    const questions = document.querySelectorAll('.exam-question');
    const results = document.getElementById('exam-results');

    if (intro) intro.classList.add('hidden');
    if (results) results.classList.add('hidden');

    // Reset all questions
    questions.forEach((q, i) => {
      q.classList.toggle('hidden', i !== 0);
      resetExamQuestion(q);
    });

    // Update attempt counter
    const attemptDisplay = document.getElementById('exam-attempt-count');
    if (attemptDisplay) {
      attemptDisplay.textContent = `Attempt ${examAttempts} of ${MAX_EXAM_ATTEMPTS}`;
    }

    saveExamState();
  }

  function submitExamAnswer(questionIndex) {
    const questions = document.querySelectorAll('.exam-question');
    const question = questions[questionIndex];
    const selectedOption = question.querySelector('input[type="radio"]:checked');

    if (!selectedOption) {
      showInlineMessage(question, 'Please select an answer to continue with the exam.', 'warning');
      return;
    }

    const correctAnswer = question.dataset.correct;
    const isCorrect = selectedOption.value === correctAnswer;

    // Store answer
    examAnswers[questionIndex] = {
      selected: selectedOption.value,
      correct: correctAnswer,
      isCorrect: isCorrect
    };

    // Show feedback briefly
    const feedback = question.querySelector('.exam-feedback');
    if (feedback) {
      feedback.classList.remove('hidden');
      feedback.textContent = isCorrect ? '✓ Correct!' : '✗ Incorrect';
      feedback.className = `exam-feedback ${isCorrect ? 'correct' : 'incorrect'}`;
    }

    // Disable inputs
    question.querySelectorAll('input').forEach(input => {
      input.disabled = true;
    });

    // Move to next question or show results
    setTimeout(() => {
      if (questionIndex < questions.length - 1) {
        question.classList.add('hidden');
        questions[questionIndex + 1].classList.remove('hidden');
        examQuestionIndex = questionIndex + 1;
      } else {
        showExamResults();
      }
      saveExamState();
    }, 1000);
  }

  function showExamResults() {
    const questions = document.querySelectorAll('.exam-question');
    const results = document.getElementById('exam-results');

    // Hide all questions
    questions.forEach(q => q.classList.add('hidden'));

    // Calculate score
    const correctCount = examAnswers.filter(a => a && a.isCorrect).length;
    const totalQuestions = questions.length;
    const scorePercent = correctCount / totalQuestions;

    // Update best score
    if (scorePercent > examBestScore) {
      examBestScore = scorePercent;
    }

    // Update results display
    const scoreDisplay = document.getElementById('exam-score');
    const bestScoreDisplay = document.getElementById('exam-best-score');
    const attemptsLeftDisplay = document.getElementById('exam-attempts-left');
    const passFailDisplay = document.getElementById('exam-pass-fail');
    const retakeBtn = document.getElementById('retake-exam-btn');
    const completeBtn = document.getElementById('exam-complete-btn');

    if (scoreDisplay) {
      scoreDisplay.textContent = `${correctCount} / ${totalQuestions} (${Math.round(scorePercent * 100)}%)`;
    }

    if (bestScoreDisplay) {
      bestScoreDisplay.textContent = `${Math.round(examBestScore * 100)}%`;
    }

    const attemptsLeft = MAX_EXAM_ATTEMPTS - examAttempts;
    if (attemptsLeftDisplay) {
      attemptsLeftDisplay.textContent = attemptsLeft;
    }

    const passed = examBestScore >= 0.75; // 75% to pass
    if (passFailDisplay) {
      passFailDisplay.textContent = passed ? 'PASSED' : 'NOT YET PASSED';
      passFailDisplay.className = `exam-pass-fail ${passed ? 'passed' : 'failed'}`;
    }

    // Show/hide retake button
    if (retakeBtn) {
      retakeBtn.classList.toggle('hidden', attemptsLeft <= 0);
      retakeBtn.textContent = `Retake Exam (${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining)`;
    }

    // Show complete button if passed or no attempts left
    if (completeBtn) {
      completeBtn.classList.toggle('hidden', !passed && attemptsLeft > 0);
    }

    // Show results
    if (results) {
      results.classList.remove('hidden');
    }

    // Record score for course completion
    if (typeof Course !== 'undefined') {
      Course.recordQuizScore('final-exam', correctCount, totalQuestions);
      Course.setFinalExamScore(examBestScore);
    }

    saveExamState();
  }

  function resetExamQuestion(question) {
    question.querySelectorAll('input').forEach(input => {
      input.checked = false;
      input.disabled = false;
    });

    const feedback = question.querySelector('.exam-feedback');
    if (feedback) {
      feedback.classList.add('hidden');
    }
  }

  function saveExamState() {
    const state = {
      examAttempts,
      examBestScore,
      examQuestionIndex,
      examAnswers
    };
    try {
      localStorage.setItem('novapay-platform-launch-exam-state', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save exam state:', e);
    }
  }

  function loadExamState() {
    try {
      const saved = localStorage.getItem('novapay-platform-launch-exam-state');
      if (saved) {
        const state = JSON.parse(saved);
        examAttempts = state.examAttempts || 0;
        examBestScore = state.examBestScore || 0;
        examQuestionIndex = state.examQuestionIndex || 0;
        examAnswers = state.examAnswers || [];
        updateExamUI();
      }
    } catch (e) {
      console.warn('Could not load exam state:', e);
    }
  }

  function updateExamUI() {
    const intro = document.getElementById('exam-intro');
    const startBtn = document.getElementById('start-exam-btn');
    const previousScore = document.getElementById('exam-previous-score');

    if (examAttempts > 0 && previousScore) {
      previousScore.textContent = `Your best score: ${Math.round(examBestScore * 100)}%`;
      previousScore.classList.remove('hidden');
    }

    if (startBtn && examAttempts > 0) {
      const attemptsLeft = MAX_EXAM_ATTEMPTS - examAttempts;
      if (attemptsLeft > 0) {
        startBtn.textContent = `Retake Exam (${attemptsLeft} attempt${attemptsLeft !== 1 ? 's' : ''} remaining)`;
      } else {
        startBtn.textContent = 'No attempts remaining';
        startBtn.disabled = true;
      }
    }
  }

  // ==================== OTHER INTERACTIONS ====================

  /**
   * Workflow Toggle (Module 3.2)
   */
  function initWorkflowToggle() {
    const toggle = document.getElementById('workflowToggle');
    const workflowWithout = document.getElementById('workflowWithout');
    const workflowWith = document.getElementById('workflowWith');

    if (!toggle || !workflowWithout || !workflowWith) return;

    toggle.addEventListener('change', () => {
      if (toggle.checked) {
        workflowWithout.classList.add('hidden');
        workflowWith.classList.remove('hidden');
      } else {
        workflowWithout.classList.remove('hidden');
        workflowWith.classList.add('hidden');
      }
    });
  }

  /**
   * Drag and Drop (Module 3.3)
   */
  function initDragAndDrop() {
    const draggables = document.querySelectorAll('.signer-card.draggable');
    const dropZone = document.getElementById('countersignerDropZone');
    const signerAssigned = document.getElementById('signerAssigned');

    if (!dropZone || draggables.length === 0) return;

    draggables.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        card.classList.add('dragging');
        e.dataTransfer.setData('text/plain', card.dataset.signer);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
      });
    });

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');

      const signerId = e.dataTransfer.getData('text/plain');
      const signerCard = document.querySelector(`.signer-card[data-signer="${signerId}"]`);

      if (signerCard) {
        // Clone card into drop zone
        const clone = signerCard.cloneNode(true);
        clone.classList.remove('draggable');
        clone.removeAttribute('draggable');

        dropZone.innerHTML = '';
        dropZone.appendChild(clone);
        dropZone.classList.add('has-signer');

        // Show success message
        if (signerAssigned) {
          signerAssigned.classList.remove('hidden');
        }
      }
    });
  }

  /**
   * Exclusion Rule Builder (Module 4.3)
   */
  function initExclusionRuleBuilder() {
    const emailInput = document.getElementById('exclusionEmail');
    const addBtn = document.getElementById('addExclusion');
    const exclusionItems = document.getElementById('exclusionItems');

    if (!emailInput || !addBtn || !exclusionItems) return;

    addBtn.addEventListener('click', () => {
      const value = emailInput.value.trim();
      if (!value) return;

      // Create new exclusion item
      const item = document.createElement('div');
      item.className = 'exclusion-item';
      item.innerHTML = `
        <span>${value}</span>
        <button class="remove-btn" aria-label="Remove">&times;</button>
      `;

      // Add remove handler
      item.querySelector('.remove-btn').addEventListener('click', () => {
        item.remove();
      });

      exclusionItems.appendChild(item);
      emailInput.value = '';
    });

    // Allow Enter key to add
    emailInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addBtn.click();
      }
    });

    // Handle existing remove buttons
    exclusionItems.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        btn.closest('.exclusion-item').remove();
      });
    });
  }

  /**
   * Hotspots (Module 6.1)
   */
  function initHotspots() {
    document.querySelectorAll('.hotspot').forEach(hotspot => {
      hotspot.addEventListener('click', () => {
        // Visual feedback on click
        hotspot.style.transform = 'scale(1.3)';
        setTimeout(() => {
          hotspot.style.transform = '';
        }, 200);
      });
    });
  }

  /**
   * Complete Course Button
   */
  function initCompleteCourseButton() {
    const completeBtn = document.getElementById('completeCourseBtn');
    const examCompleteBtn = document.getElementById('exam-complete-btn');

    // Main complete button
    if (completeBtn) {
      completeBtn.addEventListener('click', async () => {
        await completeCourse(completeBtn);
      });
    }

    // Exam complete button
    if (examCompleteBtn) {
      examCompleteBtn.addEventListener('click', async () => {
        // Navigate to completion section first
        if (typeof Course !== 'undefined') {
          Course.navigateToSection('completion');
        }
      });
    }
  }

  async function completeCourse(btn) {
    btn.disabled = true;
    btn.textContent = 'Completing...';

    try {
      if (typeof Course !== 'undefined') {
        await Course.completeCourse();
      }

      btn.textContent = 'Course Completed!';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-secondary');

      // Show celebration
      showCompletionCelebration();
    } catch (error) {
      console.error('Error completing course:', error);
      btn.textContent = 'Mark Course Complete';
      btn.disabled = false;
    }
  }

  /**
   * Show completion celebration animation
   */
  function showCompletionCelebration() {
    const completionIcon = document.querySelector('.completion-icon-large');
    if (completionIcon) {
      completionIcon.classList.add('celebrate');
    }

    // Simple confetti effect
    const colors = ['#7C3AED', '#06B6D4', '#10B981', '#F59E0B'];
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        top: -10px;
        left: ${Math.random() * 100}vw;
        opacity: ${Math.random()};
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
        animation: confetti-fall ${2 + Math.random() * 2}s linear forwards;
        z-index: 9999;
        pointer-events: none;
      `;
      document.body.appendChild(confetti);

      setTimeout(() => confetti.remove(), 4000);
    }

    // Add confetti animation
    if (!document.getElementById('confetti-style')) {
      const style = document.createElement('style');
      style.id = 'confetti-style';
      style.textContent = `
        @keyframes confetti-fall {
          to {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // Public API
  return {
    init,
    getExamBestScore: () => examBestScore,
    getExamAttempts: () => examAttempts,

    /**
     * Reset all local state (for testing or manual reset)
     * Call this from console: Interactions.resetAllState()
     */
    resetAllState() {
      console.log('[Interactions] Resetting all local state...');

      // Clear localStorage
      localStorage.removeItem('novapay-platform-launch-exam-state');
      localStorage.removeItem('novapay-platform-launch-course-state');
      localStorage.removeItem('novapay-platform-launch-last-session-id');

      // Reset in-memory state
      examAttempts = 0;
      examBestScore = 0;
      examQuestionIndex = 0;
      examAnswers = [];

      // Update UI
      updateExamUI();

      console.log('[Interactions] State reset complete. Reload the page to see changes.');
      return 'State reset. Please reload the page.';
    }
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Interactions.init();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Interactions;
}
