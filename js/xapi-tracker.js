/**
 * xAPI Tracking for NovaPay Platform Launch Training
 * Captures section views, quiz answers, time-on-page, and interaction data.
 */

const XAPITracker = (function() {
  'use strict';

  // ==================== CONFIGURATION ====================
  const DEBUG = false;
  const SEND_TO_LRS = true;
  const SCROLL_SAMPLE_INTERVAL = 2000;  // ms between scroll depth samples
  const MOUSE_SAMPLE_INTERVAL = 5000;   // ms between mouse position samples
  const IDLE_THRESHOLD = 30000;         // ms of inactivity before considered idle
  const BATCH_INTERVAL = 3000;          // ms between batch sends (reduced from 10s for faster feedback)

  // ==================== STATE ====================
  let isInitialized = false;
  let sessionId = null;
  let baseActivityId = null;

  // Section tracking
  let currentSection = null;
  let sectionStartTime = null;
  let sectionData = {};  // Detailed data per section

  // Interaction tracking
  let clickCount = 0;
  let scrollDepthMax = 0;
  let scrollDepthSamples = [];
  let mousePositions = [];
  let keyPressCount = 0;

  // Time tracking
  let activeTime = 0;
  let idleTime = 0;
  let lastActivityTime = Date.now();
  let isIdle = false;
  let isPageVisible = true;

  // Video tracking
  let videoStates = {};

  // Event queue for batching
  let eventQueue = [];
  let statementQueue = [];
  let batchInProgress = false;  // Mutex lock to prevent concurrent processBatch calls
  let batchPromise = null;      // Reference to current batch promise for chaining

  // All events log (kept in memory for debugging)
  let allEvents = [];

  // ==================== COURSE STRUCTURE (for rich reporting context) ====================
  // This allows us to provide clear breadcrumbs like "Module 2: Investor Communication > Knowledge Check > Q3"

  const COURSE_STRUCTURE = {
    title: 'Platform Launch Training',
    modules: {
      '1': { number: 1, title: 'Welcome & Overview', shortTitle: 'Overview' },
      '2': { number: 2, title: 'Core Payments', shortTitle: 'Payments' },
      '3': { number: 3, title: 'Developer Tools', shortTitle: 'Dev Tools' },
      '4': { number: 4, title: 'Security & Compliance', shortTitle: 'Security' },
      '5': { number: 5, title: 'Embedded Finance', shortTitle: 'Embedded' },
      '6': { number: 6, title: 'Platform Operations', shortTitle: 'Operations' },
      'exam': { number: 7, title: 'Final Exam', shortTitle: 'Final Exam' },
      'completion': { number: 8, title: 'Course Completion', shortTitle: 'Complete' }
    },
    sections: {
      '1-1': { module: '1', title: 'Platform Overview', type: 'content' },
      '1-2': { module: '1', title: "What's New At-a-Glance", type: 'content' },
      '2-1': { module: '2', title: 'Introduction to Instant Payouts', type: 'content' },
      '2-2': { module: '2', title: 'Building Your First Payout Flow', type: 'content' },
      '2-3': { module: '2', title: 'Interactive Demo', type: 'demo' },
      '2-4': { module: '2', title: 'Knowledge Check', type: 'quiz' },
      '3-1': { module: '3', title: 'Connect API Overview', type: 'content' },
      '3-2': { module: '3', title: 'Drop-in UI Components', type: 'content' },
      '3-3': { module: '3', title: 'Webhooks Pro Configuration', type: 'content' },
      '3-4': { module: '3', title: 'Knowledge Check', type: 'quiz' },
      '4-1': { module: '4', title: 'Fraud Shield Overview', type: 'content' },
      '4-2': { module: '4', title: 'Vault & Tokenization Setup', type: 'content' },
      '4-3': { module: '4', title: 'Compliance Hub Rules', type: 'content' },
      '4-4': { module: '4', title: 'Knowledge Check', type: 'quiz' },
      '5-1': { module: '5', title: 'Embedded Accounts', type: 'content' },
      '5-2': { module: '5', title: 'Global Rails & Multi-Currency', type: 'content' },
      '5-3': { module: '5', title: 'Revenue Analytics', type: 'content' },
      '6-1': { module: '6', title: 'Live Ledger', type: 'content' },
      '6-2': { module: '6', title: 'Smart Routing', type: 'content' },
      '6-3': { module: '6', title: 'API Permissions & Scopes', type: 'content' },
      'exam': { module: 'exam', title: 'Final Exam', type: 'exam' },
      'completion': { module: 'completion', title: 'Summary & Certificate', type: 'completion' }
    }
  };

  /**
   * Get a rich, human-readable location breadcrumb
   * Example: "Module 2: Investor Communication > Knowledge Check"
   */
  function getLocationBreadcrumb(sectionId) {
    const section = COURSE_STRUCTURE.sections[sectionId];
    if (!section) return sectionId || 'Unknown Location';

    const module = COURSE_STRUCTURE.modules[section.module];
    if (!module) return section.title;

    if (section.module === 'exam') {
      return '📋 FINAL EXAM';
    }
    if (section.module === 'completion') {
      return '🎓 Course Completion';
    }

    return `Module ${module.number}: ${module.shortTitle} > ${section.title}`;
  }

  /**
   * Get the module info for a section
   */
  function getModuleInfo(sectionId) {
    const section = COURSE_STRUCTURE.sections[sectionId];
    if (!section) return null;
    return COURSE_STRUCTURE.modules[section.module];
  }

  /**
   * Get section type (content, quiz, exam, demo, etc.)
   */
  function getSectionType(sectionId) {
    const section = COURSE_STRUCTURE.sections[sectionId];
    return section?.type || 'content';
  }

  // ==================== LOGGING ====================

  function log(...args) {
    if (DEBUG) {
      console.log('%c[Tracker]', 'color: #8b5cf6; font-weight: bold;', ...args);
    }
  }

  function logEvent(type, data) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      timeMs: Date.now(),
      ...data
    };

    allEvents.push(event);
    eventQueue.push(event);

    if (DEBUG) {
      console.log('%c[Event]', 'color: #f59e0b;', type, data);
    }

    // Store in sessionStorage for persistence
    try {
      const stored = JSON.parse(sessionStorage.getItem('xapi-events') || '[]');
      stored.push(event);
      // Keep last 1000 events
      if (stored.length > 1000) stored.shift();
      sessionStorage.setItem('xapi-events', JSON.stringify(stored));
    } catch (e) {
      // Storage full, ignore
    }
  }

  // ==================== INITIALIZATION ====================

  function init() {
    if (isInitialized) return;

    log('Initializing deep tracker...');

    sessionId = generateUUID();
    baseActivityId = getBaseActivityId();

    // Set up all tracking
    setupSectionTracking();
    setupClickTracking();
    setupScrollTracking();
    setupMouseTracking();
    setupKeyboardTracking();
    setupVisibilityTracking();
    setupIdleTracking();
    setupVideoTracking();
    setupQuizTracking();
    setupNavigationTracking();
    setupErrorTracking();
    setupPerformanceTracking();
    setupFormTracking();
    setupLinkTracking();
    setupGameTracking();
    setupDragDropTracking();
    setupHotspotTracking();
    setupAccordionTracking();

    // Start batch processing
    setInterval(() => { batchPromise = processBatch(); }, BATCH_INTERVAL);

    // Track initial state
    trackSessionStart();

    // Track initial page
    const initialSection = document.querySelector('.content-section:not(.hidden)');
    if (initialSection) {
      enterSection(initialSection.dataset.section || initialSection.id);
    }

    isInitialized = true;
    log('Deep tracker initialized');
    log('Session ID:', sessionId);
  }

  function generateUUID() {
    if (crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function getBaseActivityId() {
    const params = new URLSearchParams(window.location.search);
    return params.get('activityId') || 'https://novapay.dev/training/platform-launch';
  }

  /**
   * Create a valid activity ID by encoding any special characters
   * Activity IDs must be valid absolute URIs per xAPI spec
   */
  function makeActivityId(basePath, ...segments) {
    // Encode each segment to be URI-safe
    const encodedSegments = segments.map(seg => {
      // Replace spaces and special chars with hyphens, then URI encode
      return encodeURIComponent(
        String(seg)
          .replace(/\s+/g, '-')           // spaces to hyphens
          .replace(/[^\w\-\.]/g, '')      // remove other special chars
          .substring(0, 50)               // limit length
      );
    });

    // Ensure base path doesn't have trailing slash
    const cleanBase = basePath.replace(/\/+$/, '');

    return `${cleanBase}/${encodedSegments.join('/')}`;
  }

  // ==================== SESSION TRACKING ====================

  function trackSessionStart() {
    logEvent('session_start', {
      sessionId,
      courseTitle: COURSE_STRUCTURE.title,
      userAgent: navigator.userAgent,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      language: navigator.language,
      platform: navigator.platform,
      referrer: document.referrer,
      url: window.location.href
    });

    // Count total content sections, quizzes, and exam
    const totalSections = Object.keys(COURSE_STRUCTURE.sections).length;
    const quizCount = Object.values(COURSE_STRUCTURE.sections).filter(s => s.type === 'quiz').length;
    const moduleCount = Object.keys(COURSE_STRUCTURE.modules).length - 2; // Exclude exam and completion

    // NOTE: Don't use 'launched' - it's a cmi5 DEFINED verb reserved for LMS use only
    // Use 'experienced' instead for session start tracking
    sendStatement('experienced', {
      object: {
        id: makeActivityId(baseActivityId, 'session', 'start'),
        objectType: 'Activity',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/course',
          name: { 'en-US': `🚀 Started: ${COURSE_STRUCTURE.title}` },
          description: { 'en-US': `Learner started the ${COURSE_STRUCTURE.title} course.\n\nCourse contains:\n• ${moduleCount} Learning Modules\n• ${quizCount} Knowledge Checks\n• 1 Final Exam (10 questions, 80% to pass)` }
        }
      },
      result: {
        extensions: {
          'https://novapay.dev/xapi/session-id': sessionId,
          'https://novapay.dev/xapi/course-title': COURSE_STRUCTURE.title,
          'https://novapay.dev/xapi/total-sections': totalSections,
          'https://novapay.dev/xapi/total-modules': moduleCount,
          'https://novapay.dev/xapi/total-quizzes': quizCount,
          'https://novapay.dev/xapi/user-agent': navigator.userAgent,
          'https://novapay.dev/xapi/screen-size': `${window.screen.width}x${window.screen.height}`
        }
      }
    });
  }

  // ==================== SECTION/PAGE TRACKING ====================

  function setupSectionTracking() {
    // Watch for section visibility changes
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
          const section = mutation.target;
          if (section.classList.contains('content-section')) {
            const sectionId = section.dataset.section || section.id;
            const isVisible = !section.classList.contains('hidden');

            if (isVisible && sectionId !== currentSection) {
              if (currentSection) {
                exitSection(currentSection);
              }
              enterSection(sectionId);
            }
          }
        }
      });
    });

    document.querySelectorAll('.content-section').forEach(section => {
      observer.observe(section, { attributes: true });
    });
  }

  function enterSection(sectionId) {
    currentSection = sectionId;
    sectionStartTime = Date.now();
    scrollDepthMax = 0;
    scrollDepthSamples = [];
    clickCount = 0;

    // Initialize section data
    if (!sectionData[sectionId]) {
      sectionData[sectionId] = {
        visitCount: 0,
        totalTime: 0,
        maxScrollDepth: 0,
        clicks: 0,
        interactions: []
      };
    }
    sectionData[sectionId].visitCount++;

    // Get rich location context
    const locationBreadcrumb = getLocationBreadcrumb(sectionId);
    const moduleInfo = getModuleInfo(sectionId);
    const sectionType = getSectionType(sectionId);
    const sectionInfo = COURSE_STRUCTURE.sections[sectionId];

    logEvent('section_enter', {
      sectionId,
      location: locationBreadcrumb,
      module: moduleInfo?.title,
      sectionType,
      visitNumber: sectionData[sectionId].visitCount
    });

    // Build rich activity name for LRS reporting
    let activityName;
    let activityDescription;

    if (sectionId === 'exam') {
      activityName = '📋 FINAL EXAM - Assessment Screen';
      activityDescription = 'Learner entered the Final Exam section';
    } else if (sectionId === 'completion') {
      activityName = '🎓 Course Completion - Summary & Certificate';
      activityDescription = 'Learner reached the completion screen';
    } else if (moduleInfo) {
      const typeIcon = sectionType === 'quiz' ? '✓' :
                       sectionType === 'demo' ? '🎮' : '📖';
      activityName = `${typeIcon} ${locationBreadcrumb}`;
      activityDescription = `Module ${moduleInfo.number}: ${moduleInfo.title}\nSection: ${sectionInfo?.title || sectionId}\nType: ${sectionType}`;
    } else {
      activityName = sectionInfo?.title || getSectionTitle(sectionId);
      activityDescription = `Section: ${sectionId}`;
    }

    sendStatement('experienced', {
      object: {
        id: makeActivityId(baseActivityId, 'section', sectionId),
        objectType: 'Activity',
        definition: {
          type: 'http://activitystrea.ms/schema/1.0/page',
          name: { 'en-US': activityName },
          description: { 'en-US': activityDescription }
        }
      },
      result: {
        extensions: {
          'https://novapay.dev/xapi/visit-number': sectionData[sectionId].visitCount,
          'https://novapay.dev/xapi/location': locationBreadcrumb,
          'https://novapay.dev/xapi/module': moduleInfo?.title || 'Unknown',
          'https://novapay.dev/xapi/section-type': sectionType
        }
      }
    });
  }

  function exitSection(sectionId) {
    if (!sectionId || !sectionStartTime) return;

    const timeSpent = Date.now() - sectionStartTime;
    const timeSpentSeconds = Math.round(timeSpent / 1000);
    const data = sectionData[sectionId];

    if (data) {
      data.totalTime += timeSpent;
      data.maxScrollDepth = Math.max(data.maxScrollDepth, scrollDepthMax);
      data.clicks += clickCount;
    }

    // Get rich location context
    const locationBreadcrumb = getLocationBreadcrumb(sectionId);
    const moduleInfo = getModuleInfo(sectionId);
    const sectionType = getSectionType(sectionId);
    const sectionInfo = COURSE_STRUCTURE.sections[sectionId];

    logEvent('section_exit', {
      sectionId,
      location: locationBreadcrumb,
      module: moduleInfo?.title,
      timeSpentMs: timeSpent,
      scrollDepthMax,
      clicks: clickCount
    });

    // ==================== SEND AS CMI.INTERACTION ====================
    // This makes time-on-page show up in SCORM Cloud's Interactions report!
    // Using "numeric" interaction type with time in seconds as the response

    // Skip time-on-page tracking for Module 3
    if (moduleInfo && moduleInfo.number === 3) {
      sectionStartTime = null;
      return;
    }

    // Build clean interaction ID for the section
    let interactionId;
    let activityName;

    if (sectionId === 'exam') {
      interactionId = 'Time_FinalExam';
      activityName = 'Time on Final Exam';
    } else if (sectionId === 'completion') {
      interactionId = 'Time_Completion';
      activityName = 'Time on Completion Screen';
    } else if (moduleInfo && sectionInfo) {
      // e.g., "Time_M2_S1" for Module 2 Section 1
      const sectionNum = sectionId.split('-')[1] || '1';
      interactionId = `Time_M${moduleInfo.number}_S${sectionNum}`;
      activityName = `Time on ${locationBreadcrumb}`;
    } else {
      interactionId = `Time_${sectionId}`;
      activityName = `Time on ${sectionId}`;
    }

    // Send as numeric interaction - time in seconds
    const minutes = Math.floor(timeSpentSeconds / 60);
    const seconds = timeSpentSeconds % 60;
    const timeDisplay = minutes > 0
      ? `${minutes}m ${seconds}s (${timeSpentSeconds} sec total)`
      : `${timeSpentSeconds} seconds`;

    // Send "exited" statement with result.duration (cmi5 best practice for time tracking)
    // This pairs with the "experienced" statement sent on enterSection
    const sectionActivityId = makeActivityId(baseActivityId, 'section', sectionId);
    sendStatement('exited', {
      object: {
        id: sectionActivityId,
        objectType: 'Activity',
        definition: {
          type: 'http://activitystrea.ms/schema/1.0/page',
          name: { 'en-US': `⏱ ${timeDisplay} - ${activityName}` },
          description: { 'en-US': `${activityName} — Duration: ${timeDisplay}` }
        }
      },
      result: {
        duration: formatDuration(timeSpent),
        extensions: {
          'https://novapay.dev/xapi/time-seconds': timeSpentSeconds,
          'https://novapay.dev/xapi/scroll-depth': scrollDepthMax,
          'https://novapay.dev/xapi/click-count': clickCount
        }
      }
    });

    // Also send as cmi.interaction so it shows in SCORM Cloud's Interactions report
    sendStatement('answered', {
      object: {
        id: `${baseActivityId}/interactions/${interactionId}`,
        objectType: 'Activity',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
          name: { 'en-US': `⏱ ${timeDisplay} - ${activityName}` },
          description: { 'en-US': `TIME ON PAGE: ${timeDisplay} | Scroll depth: ${scrollDepthMax}% | Clicks: ${clickCount}` },
          interactionType: 'numeric',
          correctResponsesPattern: ['10:']  // Expected minimum 10 seconds
        }
      },
      result: {
        response: String(timeSpentSeconds),
        duration: formatDuration(timeSpent),
        extensions: {
          'https://novapay.dev/xapi/scroll-depth': scrollDepthMax,
          'https://novapay.dev/xapi/click-count': clickCount
        }
      }
    });

    sectionStartTime = null;
  }

  function getSectionTitle(sectionId) {
    const section = document.getElementById(`section-${sectionId}`) ||
                    document.querySelector(`[data-section="${sectionId}"]`);
    return section?.querySelector('h1')?.textContent || sectionId;
  }

  // ==================== CLICK TRACKING ====================

  function setupClickTracking() {
    document.addEventListener('click', e => {
      clickCount++;
      recordActivity();

      const target = e.target.closest('button, a, .clickable, [role="button"], input, label');
      const elementInfo = getElementInfo(e.target);

      logEvent('click', {
        x: e.clientX,
        y: e.clientY,
        pageX: e.pageX,
        pageY: e.pageY,
        element: elementInfo,
        section: currentSection
      });

      // Track specific interactive elements with rich location context
      if (target) {
        const targetInfo = getElementInfo(target);
        const locationBreadcrumb = getLocationBreadcrumb(currentSection);
        const moduleInfo = getModuleInfo(currentSection);
        const sectionType = getSectionType(currentSection);

        // Build meaningful element description
        const elementText = targetInfo.text?.substring(0, 50) || targetInfo.id || 'element';
        const elementType = targetInfo.tagName === 'button' ? '🔘' :
                           targetInfo.tagName === 'a' ? '🔗' :
                           targetInfo.tagName === 'input' ? '📝' : '👆';

        // Create activity name with full context
        const activityName = `${elementType} Click: "${elementText}" @ ${locationBreadcrumb}`;

        sendStatement('interacted', {
          object: {
            id: makeActivityId(baseActivityId, 'interaction', currentSection || 'unknown', targetInfo.id || elementText.substring(0, 20)),
            objectType: 'Activity',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/interaction',
              name: { 'en-US': activityName },
              description: { 'en-US': `${locationBreadcrumb}\nElement: ${targetInfo.tagName} - "${elementText}"` }
            }
          },
          result: {
            extensions: {
              'https://novapay.dev/xapi/element-type': targetInfo.tagName,
              'https://novapay.dev/xapi/element-id': targetInfo.id,
              'https://novapay.dev/xapi/element-class': targetInfo.className,
              'https://novapay.dev/xapi/element-text': targetInfo.text?.substring(0, 100),
              'https://novapay.dev/xapi/click-position': `${e.clientX},${e.clientY}`,
              'https://novapay.dev/xapi/location': locationBreadcrumb,
              'https://novapay.dev/xapi/module': moduleInfo?.title || 'Unknown',
              'https://novapay.dev/xapi/section-type': sectionType
            }
          }
        });
      }
    }, true);
  }

  function getElementInfo(el) {
    return {
      tagName: el.tagName?.toLowerCase(),
      id: el.id || null,
      className: el.className?.toString?.() || null,
      text: el.textContent?.trim()?.substring(0, 100) || null,
      href: el.href || null,
      type: el.type || null,
      name: el.name || null,
      value: el.type === 'password' ? '[hidden]' : el.value?.substring?.(0, 50) || null
    };
  }

  // ==================== SCROLL TRACKING ====================

  function setupScrollTracking() {
    let scrollTimeout;

    const trackScroll = () => {
      recordActivity();

      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;

      if (scrollPercent > scrollDepthMax) {
        scrollDepthMax = scrollPercent;
      }

      scrollDepthSamples.push({
        time: Date.now(),
        depth: scrollPercent
      });
    };

    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScroll, 150);
    }, { passive: true });

    // Sample scroll depth periodically
    setInterval(() => {
      if (currentSection && isPageVisible) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight;
        const clientHeight = document.documentElement.clientHeight;
        const scrollPercent = Math.round((scrollTop / (scrollHeight - clientHeight)) * 100) || 0;

        logEvent('scroll_sample', {
          section: currentSection,
          depth: scrollPercent,
          maxDepth: scrollDepthMax
        });
      }
    }, SCROLL_SAMPLE_INTERVAL);
  }

  // ==================== MOUSE TRACKING ====================

  function setupMouseTracking() {
    let lastMousePos = { x: 0, y: 0 };

    document.addEventListener('mousemove', e => {
      lastMousePos = { x: e.clientX, y: e.clientY };
      recordActivity();
    }, { passive: true });

    // Sample mouse position periodically
    setInterval(() => {
      if (currentSection && isPageVisible && !isIdle) {
        mousePositions.push({
          time: Date.now(),
          x: lastMousePos.x,
          y: lastMousePos.y,
          section: currentSection
        });

        // Keep last 100 positions
        if (mousePositions.length > 100) {
          mousePositions.shift();
        }
      }
    }, MOUSE_SAMPLE_INTERVAL);
  }

  // ==================== KEYBOARD TRACKING ====================

  function setupKeyboardTracking() {
    document.addEventListener('keydown', e => {
      keyPressCount++;
      recordActivity();

      // Track specific keys (not the actual content for privacy)
      if (['Enter', 'Tab', 'Escape', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        logEvent('key_press', {
          key: e.key,
          section: currentSection
        });
      }
    }, { passive: true });
  }

  // ==================== VISIBILITY TRACKING ====================

  function setupVisibilityTracking() {
    document.addEventListener('visibilitychange', () => {
      isPageVisible = !document.hidden;

      logEvent('visibility_change', {
        visible: isPageVisible,
        section: currentSection
      });

      if (!isPageVisible) {
        // User left - pause timing
        if (currentSection && sectionStartTime) {
          const elapsed = Date.now() - sectionStartTime;
          sectionData[currentSection] = sectionData[currentSection] || { totalTime: 0 };
          sectionData[currentSection].totalTime += elapsed;
          sectionStartTime = null;
        }

        sendStatement('suspended', {
          object: buildActivityObject('session', 'Session'),
          result: {
            extensions: {
              'https://novapay.dev/xapi/section-when-left': currentSection
            }
          }
        });
      } else {
        // User returned - resume timing
        if (currentSection) {
          sectionStartTime = Date.now();
        }

        sendStatement('resumed', {
          object: buildActivityObject('session', 'Session'),
          result: {
            extensions: {
              'https://novapay.dev/xapi/section-when-returned': currentSection
            }
          }
        });
      }
    });

    // Track window focus/blur
    window.addEventListener('focus', () => {
      logEvent('window_focus', { section: currentSection });
      recordActivity();
    });

    window.addEventListener('blur', () => {
      logEvent('window_blur', { section: currentSection });
    });
  }

  // ==================== IDLE TRACKING ====================

  function setupIdleTracking() {
    setInterval(() => {
      const timeSinceActivity = Date.now() - lastActivityTime;

      if (!isIdle && timeSinceActivity > IDLE_THRESHOLD) {
        isIdle = true;
        logEvent('idle_start', {
          section: currentSection,
          idleAfterMs: timeSinceActivity
        });
      }

      if (isIdle) {
        idleTime += 1000;
      } else if (isPageVisible) {
        activeTime += 1000;
      }
    }, 1000);
  }

  function recordActivity() {
    const wasIdle = isIdle;
    lastActivityTime = Date.now();
    isIdle = false;

    if (wasIdle) {
      logEvent('idle_end', {
        section: currentSection,
        idleDurationMs: idleTime
      });
    }
  }

  // ==================== VIDEO TRACKING ====================

  function setupVideoTracking() {
    // Track HTML5 videos
    document.querySelectorAll('video').forEach((video, i) => {
      const videoId = video.id || `video-${i}`;
      setupVideoElement(video, videoId);
    });

    // Watch for dynamically added videos
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.tagName === 'VIDEO') {
            const videoId = node.id || `video-${Date.now()}`;
            setupVideoElement(node, videoId);
          }
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  function setupVideoElement(video, videoId) {
    videoStates[videoId] = {
      started: false,
      playTime: 0,
      lastPlayStart: null,
      seekCount: 0,
      pauseCount: 0,
      bufferCount: 0
    };

    video.addEventListener('loadedmetadata', () => {
      logEvent('video_loaded', {
        videoId,
        duration: video.duration,
        section: currentSection
      });
    });

    video.addEventListener('play', () => {
      const state = videoStates[videoId];
      state.lastPlayStart = Date.now();

      if (!state.started) {
        state.started = true;
        logEvent('video_start', { videoId, section: currentSection });

        sendStatement('played', {
          object: buildVideoObject(videoId, video),
          result: {
            extensions: {
              'https://w3id.org/xapi/video/extensions/time': video.currentTime
            }
          }
        });
      } else {
        logEvent('video_resume', {
          videoId,
          time: video.currentTime,
          section: currentSection
        });

        sendStatement('played', {
          object: buildVideoObject(videoId, video),
          result: {
            extensions: {
              'https://w3id.org/xapi/video/extensions/time': video.currentTime,
              'https://novapay.dev/xapi/resume': true
            }
          }
        });
      }
    });

    video.addEventListener('pause', () => {
      const state = videoStates[videoId];
      state.pauseCount++;

      if (state.lastPlayStart) {
        state.playTime += Date.now() - state.lastPlayStart;
        state.lastPlayStart = null;
      }

      logEvent('video_pause', {
        videoId,
        time: video.currentTime,
        playTimeMs: state.playTime,
        section: currentSection
      });

      sendStatement('paused', {
        object: buildVideoObject(videoId, video),
        result: {
          extensions: {
            'https://w3id.org/xapi/video/extensions/time': video.currentTime,
            'https://w3id.org/xapi/video/extensions/played-segments': state.playTime,
            'https://novapay.dev/xapi/pause-count': state.pauseCount
          }
        }
      });
    });

    video.addEventListener('seeked', () => {
      const state = videoStates[videoId];
      state.seekCount++;

      logEvent('video_seek', {
        videoId,
        time: video.currentTime,
        seekCount: state.seekCount,
        section: currentSection
      });

      sendStatement('seeked', {
        object: buildVideoObject(videoId, video),
        result: {
          extensions: {
            'https://w3id.org/xapi/video/extensions/time-to': video.currentTime,
            'https://novapay.dev/xapi/seek-count': state.seekCount
          }
        }
      });
    });

    video.addEventListener('ended', () => {
      const state = videoStates[videoId];
      if (state.lastPlayStart) {
        state.playTime += Date.now() - state.lastPlayStart;
        state.lastPlayStart = null;
      }

      const videoDurationSec = Math.round(video.duration);
      const watchTimeSec = Math.round(state.playTime / 1000);
      const watchPercent = Math.round((state.playTime / (video.duration * 1000)) * 100);

      logEvent('video_complete', {
        videoId,
        duration: video.duration,
        playTimeMs: state.playTime,
        watchPercent,
        seekCount: state.seekCount,
        pauseCount: state.pauseCount,
        section: currentSection
      });

      // Send as cmi.interaction so it shows in SCORM Cloud Interactions report
      const locationBreadcrumb = getLocationBreadcrumb(currentSection);
      sendStatement('answered', {
        object: {
          id: `${baseActivityId}/interactions/Video_${videoId}`,
          objectType: 'Activity',
          definition: {
            type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
            name: { 'en-US': `Video: ${video.title || videoId} (${locationBreadcrumb})` },
            description: { 'en-US': `Video length: ${videoDurationSec}s | Watched: ${watchTimeSec}s (${watchPercent}%) | Seeks: ${state.seekCount} | Pauses: ${state.pauseCount}` },
            interactionType: 'numeric',
            correctResponsesPattern: [`${videoDurationSec}:`]  // Expected to watch full video
          }
        },
        result: {
          response: String(watchTimeSec),
          completion: watchPercent >= 90,  // Consider complete if watched 90%+
          success: watchPercent >= 90,
          extensions: {
            'https://novapay.dev/xapi/watch-percent': watchPercent,
            'https://novapay.dev/xapi/seek-count': state.seekCount,
            'https://novapay.dev/xapi/pause-count': state.pauseCount
          }
        }
      });
    });

    video.addEventListener('waiting', () => {
      const state = videoStates[videoId];
      state.bufferCount++;
      logEvent('video_buffer', { videoId, bufferCount: state.bufferCount });
    });

    video.addEventListener('error', e => {
      logEvent('video_error', {
        videoId,
        error: video.error?.message || 'Unknown error'
      });
    });

    // Track time updates for progress
    let lastTimeUpdate = 0;
    video.addEventListener('timeupdate', () => {
      const now = Math.floor(video.currentTime);
      if (now !== lastTimeUpdate && now % 10 === 0) {  // Every 10 seconds
        lastTimeUpdate = now;
        logEvent('video_progress', {
          videoId,
          time: video.currentTime,
          progress: video.currentTime / video.duration
        });
      }
    });
  }

  function buildVideoObject(videoId, video) {
    return {
      id: makeActivityId(baseActivityId, 'video', videoId),
      objectType: 'Activity',
      definition: {
        type: 'https://w3id.org/xapi/video/activity-type/video',
        name: { 'en-US': video.title || videoId },
        extensions: {
          'https://w3id.org/xapi/video/extensions/length': video.duration
        }
      }
    };
  }

  // ==================== QUIZ TRACKING ====================

  function setupQuizTracking() {
    // Track all quiz/exam answer submissions
    // IMPORTANT: Use capture phase (true) so we see the click BEFORE interactions.js
    // processes it and potentially disables/modifies the inputs
    document.addEventListener('click', e => {
      const btn = e.target.closest('.check-answer, .check-answer-multi, .submit-exam-answer');
      if (!btn) return;

      const question = btn.closest('.quiz-question, .exam-question');
      if (!question) return;

      // Capture selected values IMMEDIATELY before any other handler runs
      // This is critical because interactions.js disables inputs after processing
      const selectedInputs = question.querySelectorAll('input:checked');
      const capturedValues = Array.from(selectedInputs).map(input => input.value);

      // Wrap in try-catch to prevent blocking UI
      try {
        trackQuizAnswer(question, btn, capturedValues);
      } catch (error) {
        logError('Error tracking quiz answer:', error);
      }
    }, true);  // <-- CAPTURE PHASE - runs before bubble phase handlers

    // Track exam start
    const examStartBtn = document.getElementById('start-exam-btn');
    if (examStartBtn) {
      examStartBtn.addEventListener('click', () => {
        const attemptNum = typeof Interactions !== 'undefined' ?
                          Interactions.getExamAttempts() + 1 : 1;
        const maxAttempts = 3;
        const attemptsRemaining = maxAttempts - attemptNum;

        logEvent('exam_start', {
          attemptNumber: attemptNum,
          maxAttempts: maxAttempts,
          attemptsRemaining: attemptsRemaining
        });

        sendStatement('attempted', {
          object: {
            id: makeActivityId(baseActivityId, 'exam', 'final-exam'),
            objectType: 'Activity',
            definition: {
              type: 'http://adlnet.gov/expapi/activities/assessment',
              name: { 'en-US': `📋 FINAL EXAM - Attempt ${attemptNum} of ${maxAttempts}` },
              description: { 'en-US': `Learner started Final Exam attempt ${attemptNum}. ${attemptsRemaining} attempt(s) remaining after this one. Pass score: 80%` }
            }
          },
          result: {
            extensions: {
              'https://novapay.dev/xapi/attempt-number': attemptNum,
              'https://novapay.dev/xapi/max-attempts': maxAttempts,
              'https://novapay.dev/xapi/attempts-remaining': attemptsRemaining
            }
          }
        });
      });
    }
  }

  function trackQuizAnswer(question, btn, capturedValues = null) {
    try {
      const isExam = question.classList.contains('exam-question');

      // Get the actual question text - structure differs between quiz and exam
      // Knowledge checks: h3 has "Question X of Y", actual question in .question-text
      // Exam questions: h3 has the actual question
      let questionText;
      if (isExam) {
        // For exams, the h3 contains the actual question
        questionText = question.querySelector('h3')?.textContent?.trim() || 'Unknown';
      } else {
        // For knowledge checks, prefer .question-text over h3
        questionText = question.querySelector('.question-text')?.textContent?.trim() ||
                      question.querySelector('h3')?.textContent?.trim() ||
                      'Unknown';
      }

      const correctAnswer = btn.dataset.correct || question.dataset.correct;

      // Get all options and selected ones - with null checks
      const optionElements = question.querySelectorAll('.quiz-option');
      if (!optionElements || optionElements.length === 0) {
        log('No quiz options found');
        return;
      }

      // Use captured values if provided (from capture phase), otherwise read from DOM
      // This is important because interactions.js may have already disabled inputs
      const selectedValues = capturedValues || Array.from(
        question.querySelectorAll('input:checked')
      ).map(input => input.value);

      // If no answer selected, don't track (user will see validation message)
      if (!selectedValues || selectedValues.length === 0) {
        log('No answer selected, skipping tracking');
        return;
      }

      const allOptions = Array.from(optionElements).map(opt => {
        const input = opt.querySelector('input');
        // Get the option text - it's in .option-text span or just span
        const optionText = opt.querySelector('.option-text')?.textContent?.trim() ||
                          opt.querySelector('span')?.textContent?.trim() ||
                          opt.textContent?.trim() || '';
        return {
          value: input?.value || '',
          text: optionText.substring(0, 200),
          selected: selectedValues.includes(input?.value)
        };
      });

      const correctValues = correctAnswer?.split(',') || [];

      const isCorrect = correctValues.length === selectedValues.length &&
                       correctValues.every(v => selectedValues.includes(v));

      // ==================== RICH CONTEXT FOR REPORTING ====================

      // Get the location breadcrumb (e.g., "Module 2: Posts > Knowledge Check")
      const locationBreadcrumb = getLocationBreadcrumb(currentSection);
      const moduleInfo = getModuleInfo(currentSection);

      // Determine question number within this assessment
      let questionNumber = 1;
      if (isExam) {
        // For exam, get from progress indicator first
        const progressText = question.querySelector('.exam-progress')?.textContent || '';
        const match = progressText.match(/Question\s+(\d+)/i);
        if (match) {
          questionNumber = parseInt(match[1], 10);
        } else {
          // Fallback: count position among all exam questions
          const allExamQuestions = document.querySelectorAll('.exam-question');
          const idx = Array.from(allExamQuestions).indexOf(question);
          if (idx >= 0) questionNumber = idx + 1;
        }
        log(`Exam question ${questionNumber} detected, text: "${questionText.substring(0, 50)}..."`);
      } else {
        // For knowledge checks, count position among questions
        const allQuestions = question.closest('.knowledge-check, .quiz-container')?.querySelectorAll('.quiz-question') || [];
        questionNumber = Array.from(allQuestions).indexOf(question) + 1;
        if (questionNumber === 0) {
          const h3Text = question.querySelector('h3')?.textContent || '';
          const match = h3Text.match(/Question\s+(\d+)/i);
          if (match) questionNumber = parseInt(match[1], 10);
        }
      }

      // ==================== BUILD CLEAN INTERACTION ID ====================
      // SCORM Cloud shows: Interaction Id | Description | Type | Correct%
      // Make the Interaction ID short and scannable!

      let interactionId;  // This becomes the Activity ID - keep it SHORT
      let activityName;   // This is the "name" in definition
      let activityDescription;

      if (isExam) {
        // Interaction ID: "FinalExam_Q01" (short, sortable)
        interactionId = `FinalExam_Q${String(questionNumber).padStart(2, '0')}`;
        // Name shown in Description column
        activityName = `Final Exam Q${questionNumber}: ${questionText.substring(0, 50)}...`;
        activityDescription = questionText;
      } else {
        // Interaction ID: "M2_Quiz_Q1" (short, identifies module)
        const moduleNum = moduleInfo?.number || '?';
        interactionId = `M${moduleNum}_Quiz_Q${questionNumber}`;
        // Name shown in Description column
        activityName = `Module ${moduleNum} Quiz Q${questionNumber}: ${questionText.substring(0, 50)}...`;
        activityDescription = questionText;
      }

      logEvent('quiz_answer', {
        interactionId,
        questionNumber,
        questionText: questionText.substring(0, 200),
        isExam,
        module: moduleInfo?.title,
        selectedValues,
        correctValues,
        isCorrect
      });

      // Build choices array for xAPI interaction (shows answer options in LRS)
      const choices = allOptions.map((opt, idx) => ({
        id: opt.value || String.fromCharCode(65 + idx), // A, B, C, D as fallback
        description: { 'en-US': opt.text }
      }));

      // ==================== SEND COMPREHENSIVE STATEMENT ====================
      // Use clean interaction ID as the Activity ID suffix

      // Format response per xAPI spec: choice responses use [,] delimiter
      const xapiResponse = selectedValues.join('[,]');
      const xapiCorrectPattern = correctValues.join('[,]');

      sendStatement('answered', {
        object: {
          id: `${baseActivityId}/interactions/${interactionId}`,
          objectType: 'Activity',
          definition: {
            type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
            name: { 'en-US': activityName },
            description: { 'en-US': activityDescription },
            interactionType: 'choice',
            choices: choices,
            correctResponsesPattern: [xapiCorrectPattern]
          }
        },
        result: {
          success: isCorrect,
          response: xapiResponse,
          extensions: {
            'https://novapay.dev/xapi/is-exam': isExam,
            'https://novapay.dev/xapi/module': moduleInfo?.title || 'Unknown',
            'https://novapay.dev/xapi/question-number': questionNumber
          }
        }
      });

      // Immediately send quiz/exam answers (don't wait for batch interval)
      // Use batchPromise to properly serialize concurrent flushes
      log(`📝 Quiz statement queued: ${interactionId} (${isCorrect ? 'CORRECT' : 'WRONG'}) — flushing now...`);
      batchPromise = processBatch().then(() => {
        log(`✅ Quiz batch flushed for ${interactionId}`);
      }).catch(err => {
        logError(`❌ Quiz batch flush FAILED for ${interactionId}:`, err);
      });
    } catch (error) {
      logError('Error in trackQuizAnswer:', error);
      console.error('[Tracker] Full quiz tracking error:', error, error.stack);
      // Don't rethrow - we don't want to break the UI
    }
  }

  // ==================== NAVIGATION TRACKING ====================

  function setupNavigationTracking() {
    // Track all navigation button clicks with rich context
    document.addEventListener('click', e => {
      const navBtn = e.target.closest('.btn-next, .btn-prev, .section-link, .module-header');
      if (!navBtn) return;

      const targetSection = navBtn.dataset.next || navBtn.dataset.prev ||
                           navBtn.dataset.section || navBtn.closest('a')?.dataset.section;

      // Get location context for both sections
      const fromBreadcrumb = getLocationBreadcrumb(currentSection);
      const toBreadcrumb = targetSection ? getLocationBreadcrumb(targetSection) : 'Unknown';
      const navDirection = navBtn.classList.contains('btn-next') ? '➡️ Next' :
                          navBtn.classList.contains('btn-prev') ? '⬅️ Previous' : '📍 Jump to';

      logEvent('navigation_click', {
        from: currentSection,
        fromLocation: fromBreadcrumb,
        to: targetSection,
        toLocation: toBreadcrumb,
        direction: navDirection,
        element: getElementInfo(navBtn)
      });

      // Send navigation statement with full context
      if (targetSection) {
        sendStatement('progressed', {
          object: {
            id: makeActivityId(baseActivityId, 'navigation', currentSection || 'start', targetSection),
            objectType: 'Activity',
            definition: {
              type: 'http://activitystrea.ms/schema/1.0/page',
              name: { 'en-US': `${navDirection}: ${fromBreadcrumb} → ${toBreadcrumb}` },
              description: { 'en-US': `Learner navigated from "${fromBreadcrumb}" to "${toBreadcrumb}"` }
            }
          },
          result: {
            extensions: {
              'https://novapay.dev/xapi/from-section': currentSection,
              'https://novapay.dev/xapi/from-location': fromBreadcrumb,
              'https://novapay.dev/xapi/to-section': targetSection,
              'https://novapay.dev/xapi/to-location': toBreadcrumb,
              'https://novapay.dev/xapi/nav-direction': navDirection
            }
          }
        });
      }
    });

    // Track browser back/forward
    window.addEventListener('popstate', e => {
      const locationBreadcrumb = getLocationBreadcrumb(currentSection);
      logEvent('browser_navigation', {
        section: currentSection,
        location: locationBreadcrumb,
        state: e.state
      });
    });
  }

  // ==================== ERROR TRACKING ====================

  function setupErrorTracking() {
    window.addEventListener('error', e => {
      logEvent('javascript_error', {
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
        section: currentSection
      });

      sendStatement('experienced', {
        object: buildActivityObject('error/javascript', 'JavaScript Error'),
        result: {
          success: false,
          extensions: {
            'https://novapay.dev/xapi/error-message': e.message,
            'https://novapay.dev/xapi/error-file': e.filename,
            'https://novapay.dev/xapi/error-line': e.lineno
          }
        }
      });
    });

    window.addEventListener('unhandledrejection', e => {
      logEvent('promise_rejection', {
        reason: e.reason?.toString?.() || 'Unknown',
        section: currentSection
      });
    });
  }

  // ==================== PERFORMANCE TRACKING ====================

  function setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const timing = performance.timing;
        const perf = {
          dnsLookup: timing.domainLookupEnd - timing.domainLookupStart,
          tcpConnect: timing.connectEnd - timing.connectStart,
          serverResponse: timing.responseEnd - timing.requestStart,
          domLoad: timing.domContentLoadedEventEnd - timing.navigationStart,
          pageLoad: timing.loadEventEnd - timing.navigationStart
        };

        logEvent('performance', perf);

        sendStatement('experienced', {
          object: buildActivityObject('performance', 'Page Load Performance'),
          result: {
            duration: formatDuration(perf.pageLoad),
            extensions: {
              'https://novapay.dev/xapi/dns-lookup-ms': perf.dnsLookup,
              'https://novapay.dev/xapi/tcp-connect-ms': perf.tcpConnect,
              'https://novapay.dev/xapi/server-response-ms': perf.serverResponse,
              'https://novapay.dev/xapi/dom-load-ms': perf.domLoad,
              'https://novapay.dev/xapi/page-load-ms': perf.pageLoad
            }
          }
        });
      }, 0);
    });
  }

  // ==================== FORM TRACKING ====================

  function setupFormTracking() {
    // Track form field focus
    document.addEventListener('focus', e => {
      if (e.target.matches('input, textarea, select')) {
        logEvent('field_focus', {
          field: getElementInfo(e.target),
          section: currentSection
        });
      }
    }, true);

    // Track form field blur (with value length, not content)
    document.addEventListener('blur', e => {
      if (e.target.matches('input, textarea, select')) {
        logEvent('field_blur', {
          field: getElementInfo(e.target),
          valueLength: e.target.value?.length || 0,
          section: currentSection
        });
      }
    }, true);

    // Track form field changes
    document.addEventListener('change', e => {
      if (e.target.matches('input, textarea, select')) {
        const info = getElementInfo(e.target);
        logEvent('field_change', {
          field: info,
          section: currentSection
        });
      }
    });
  }

  // ==================== LINK TRACKING ====================

  function setupLinkTracking() {
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      const href = link.href;
      const isExternal = link.hostname !== window.location.hostname;

      logEvent('link_click', {
        href,
        isExternal,
        text: link.textContent?.trim()?.substring(0, 100),
        section: currentSection
      });

      if (isExternal) {
        sendStatement('experienced', {
          object: {
            id: href,
            objectType: 'Activity',
            definition: {
              type: 'http://activitystrea.ms/schema/1.0/page',
              name: { 'en-US': link.textContent?.trim() || href }
            }
          },
          result: {
            extensions: {
              'https://novapay.dev/xapi/external-link': true,
              'https://novapay.dev/xapi/from-section': currentSection
            }
          }
        });
      }
    });
  }

  // ==================== STATEMENT SENDING ====================

  // Track if session is ended (to stop sending statements)
  let sessionEnded = false;

  function sendStatement(verb, options = {}) {
    // Don't queue statements if the session has ended
    if (sessionEnded) {
      if (DEBUG) {
        console.log('%c[Statement SKIPPED - session ended]', 'color: #9ca3af;', verb);
      }
      return;
    }

    // Also check if Cmi5 is already terminated
    if (typeof Cmi5 !== 'undefined' && Cmi5.isTerminated()) {
      if (DEBUG) {
        console.log('%c[Statement SKIPPED - Cmi5 terminated]', 'color: #9ca3af;', verb);
      }
      sessionEnded = true; // Mark session as ended
      statementQueue = []; // Clear any pending statements
      return;
    }

    const statement = {
      verb: typeof verb === 'string' ? { id: getVerbId(verb), display: { 'en-US': verb } } : verb,
      object: options.object,
      result: options.result,
      timestamp: new Date().toISOString()
    };

    statementQueue.push(statement);

    if (DEBUG) {
      console.log('%c[Statement Queued]', 'color: #10b981;', verb, statement);
    }
  }

  function getVerbId(verb) {
    // NOTE: cmi5 "defined" verbs (initialized, terminated, completed, passed, failed)
    // should NOT be used from xapi-tracker - they are handled by cmi5-wrapper
    // "launched", "abandoned", "waived", "satisfied" are LMS-only verbs
    const verbMap = {
      'experienced': 'http://adlnet.gov/expapi/verbs/experienced',
      'exited': 'http://adlnet.gov/expapi/verbs/exited',
      'interacted': 'http://adlnet.gov/expapi/verbs/interacted',
      'played': 'https://w3id.org/xapi/video/verbs/played',
      'paused': 'https://w3id.org/xapi/video/verbs/paused',
      'seeked': 'https://w3id.org/xapi/video/verbs/seeked',
      'answered': 'http://adlnet.gov/expapi/verbs/answered',
      'attempted': 'http://adlnet.gov/expapi/verbs/attempted',
      'suspended': 'http://adlnet.gov/expapi/verbs/suspended',
      'resumed': 'http://adlnet.gov/expapi/verbs/resumed',
      'progressed': 'http://adlnet.gov/expapi/verbs/progressed'
    };
    return verbMap[verb] || `http://adlnet.gov/expapi/verbs/${verb}`;
  }

  function buildActivityObject(path, name) {
    return {
      id: makeActivityId(baseActivityId, path),
      objectType: 'Activity',
      definition: {
        type: 'http://activitystrea.ms/schema/1.0/page',
        name: { 'en-US': name }
      }
    };
  }

  async function processBatch() {
    // Don't process if session has ended
    if (sessionEnded) {
      statementQueue = []; // Clear any remaining statements
      return;
    }

    if (statementQueue.length === 0) return;
    if (!SEND_TO_LRS) {
      log('Batch ready (LRS disabled):', statementQueue.length, 'statements');
      statementQueue = [];
      return;
    }

    // If a batch is already in progress, wait for it to finish then process remaining
    if (batchInProgress) {
      log('Batch already in progress, will process after current batch completes');
      if (batchPromise) {
        await batchPromise;
      }
      // After waiting, check if there are still statements to send
      if (statementQueue.length === 0 || sessionEnded) return;
    }

    batchInProgress = true;

    // Try to send via Cmi5
    try {
      if (typeof Cmi5 !== 'undefined' && Cmi5.isConnected() && !Cmi5.isTerminated()) {
        const batch = [...statementQueue];
        statementQueue = [];

        for (let i = 0; i < batch.length; i++) {
          const stmt = batch[i];
          try {
            const verbName = stmt.verb.display?.['en-US'] || stmt.verb?.id || 'unknown';
            const objectId = stmt.object?.id || 'no-object';
            log(`Sending [${i + 1}/${batch.length}]: ${verbName} → ${objectId}`);
            await Cmi5.sendStatement(stmt.verb, stmt.result, stmt.object);
            log(`✅ Sent [${i + 1}/${batch.length}]: ${verbName} → ${objectId}`);
          } catch (e) {
            const errorMsg = e.message || e.toString();
            const verbName = stmt.verb.display?.['en-US'] || 'unknown';
            const objectId = stmt.object?.id || 'no-object';
            logError(`❌ FAILED [${i + 1}/${batch.length}]: ${verbName} → ${objectId}`, errorMsg);

            // Check if this is a session-ended error (401 with "session not found")
            if (errorMsg.includes('session not found') || errorMsg.includes('401')) {
              log('Session ended (LMS), stopping statement sends');
              sessionEnded = true;
              statementQueue = []; // Clear all remaining statements
              return; // Stop processing
            }

            logError('Failed to send statement:', e);
            // Re-queue ALL remaining statements (failed + unsent) to prevent data loss
            if (!sessionEnded) {
              const remaining = batch.slice(i);
              statementQueue.unshift(...remaining);
              log(`Re-queued ${remaining.length} statements (1 failed + ${remaining.length - 1} unsent)`);
            }
            break;
          }
        }
      } else {
        // Check if Cmi5 is terminated
        if (typeof Cmi5 !== 'undefined' && Cmi5.isTerminated()) {
          log('Cmi5 terminated, clearing statement queue');
          sessionEnded = true;
          statementQueue = [];
          return;
        }

        // Only log occasionally to avoid console spam
        if (statementQueue.length % 10 === 1) {
          log('Cmi5 not connected, statements queued:', statementQueue.length);
        }
        // Cap the queue size
        if (statementQueue.length > 100) {
          statementQueue = statementQueue.slice(-100);
        }
      }
    } catch (error) {
      logError('Error in processBatch:', error);
    } finally {
      batchInProgress = false;
    }
  }

  // ==================== UTILITIES ====================

  function formatDuration(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const s = seconds % 60;
    const m = minutes % 60;
    const h = hours;

    let duration = 'PT';
    if (h > 0) duration += h + 'H';
    if (m > 0) duration += m + 'M';
    duration += s + 'S';

    return duration;
  }

  function logError(...args) {
    console.error('%c[Tracker ERROR]', 'color: #dc2626; font-weight: bold;', ...args);
  }

  // ==================== GAME TRACKING ====================

  function setupGameTracking() {
    // Watch for game over and victory screens becoming visible
    // The game sets display: flex on these elements when showing results
    const gameOverScreen = document.getElementById('invaders-gameover');
    const victoryScreen = document.getElementById('invaders-victory');

    if (gameOverScreen) {
      const observer = new MutationObserver(() => {
        if (gameOverScreen.style.display === 'flex') {
          trackGameResult('game_over');
        }
      });
      observer.observe(gameOverScreen, { attributes: true, attributeFilter: ['style'] });
    }

    if (victoryScreen) {
      const observer = new MutationObserver(() => {
        if (victoryScreen.style.display === 'flex') {
          trackGameResult('victory');
        }
      });
      observer.observe(victoryScreen, { attributes: true, attributeFilter: ['style'] });
    }
  }

  function trackGameResult(outcome) {
    // Read stats from the DOM (populated by interactions.js)
    const isVictory = outcome === 'victory';
    const scoreEl = document.getElementById(isVictory ? 'victory-score' : 'gameover-score');
    const waveEl = document.getElementById(isVictory ? null : 'gameover-wave');
    const featuresEl = document.getElementById(isVictory ? null : 'gameover-features');
    const accuracyEl = document.getElementById(isVictory ? 'victory-accuracy' : 'gameover-accuracy');
    const gradeEl = document.getElementById(isVictory ? 'victory-grade' : 'gameover-grade');
    const comboEl = document.getElementById(isVictory ? 'victory-combo' : 'gameover-combo');

    const finalScore = parseInt((scoreEl?.textContent || '0').replace(/,/g, ''), 10);
    const accuracy = parseInt((accuracyEl?.textContent || '0').replace('%', ''), 10);
    const grade = gradeEl?.textContent?.trim() || '?';
    const combo = comboEl?.textContent?.trim() || '0x';
    const features = featuresEl?.textContent?.trim() || '?/?';
    const wave = waveEl?.textContent?.trim() || '?';

    logEvent('game_result', {
      outcome,
      score: finalScore,
      accuracy,
      grade,
      combo,
      features,
      wave
    });

    // Send as cmi.interaction with numeric response (score)
    const gradeScaled = { 'S': 1.0, 'A': 0.9, 'B': 0.8, 'C': 0.7, 'D': 0.5 };
    const scaledScore = gradeScaled[grade] || 0.5;

    sendStatement('answered', {
      object: {
        id: `${baseActivityId}/interactions/Game_FeatureInvaders`,
        objectType: 'Activity',
        definition: {
          type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
          name: { 'en-US': `🎮 Feature Invaders - ${isVictory ? 'Victory' : 'Game Over'} (Grade: ${grade})` },
          description: { 'en-US': `Feature Invaders game result | Score: ${finalScore.toLocaleString()} | Grade: ${grade} | Accuracy: ${accuracy}% | Wave: ${wave} | Intel: ${features} | Max Combo: ${combo}` },
          interactionType: 'numeric'
        }
      },
      result: {
        score: {
          scaled: scaledScore,
          raw: finalScore,
          min: 0,
          max: 50000
        },
        success: isVictory || grade === 'S' || grade === 'A',
        response: String(finalScore),
        extensions: {
          'https://novapay.dev/xapi/game-outcome': outcome,
          'https://novapay.dev/xapi/game-grade': grade,
          'https://novapay.dev/xapi/game-accuracy': accuracy,
          'https://novapay.dev/xapi/game-wave': wave,
          'https://novapay.dev/xapi/game-features': features,
          'https://novapay.dev/xapi/game-combo': combo
        }
      }
    });

    // Flush immediately so game results aren't lost
    batchPromise = processBatch();
  }

  // ==================== DRAG-AND-DROP TRACKING ====================

  function setupDragDropTracking() {
    // Track successful drops on drop zones
    document.querySelectorAll('.drop-zone').forEach(zone => {
      const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1 && node.classList?.contains('draggable')) {
              const signerName = node.dataset?.signer || node.textContent?.trim()?.substring(0, 30) || 'unknown';
              const dropZoneId = zone.id || 'unknown-zone';
              const locationBreadcrumb = getLocationBreadcrumb(currentSection);

              logEvent('drag_drop', {
                signer: signerName,
                dropZone: dropZoneId,
                section: currentSection
              });

              sendStatement('interacted', {
                object: {
                  id: makeActivityId(baseActivityId, 'interaction', 'drag-drop', dropZoneId),
                  objectType: 'Activity',
                  definition: {
                    type: 'http://adlnet.gov/expapi/activities/cmi.interaction',
                    name: { 'en-US': `📋 Drag & Drop: ${signerName} → ${dropZoneId}` },
                    description: { 'en-US': `${locationBreadcrumb}\nDragged "${signerName}" to drop zone "${dropZoneId}"` },
                    interactionType: 'matching'
                  }
                },
                result: {
                  response: `${signerName}[.]${dropZoneId}`,
                  extensions: {
                    'https://novapay.dev/xapi/drag-item': signerName,
                    'https://novapay.dev/xapi/drop-zone': dropZoneId,
                    'https://novapay.dev/xapi/location': locationBreadcrumb
                  }
                }
              });
            }
          });
        });
      });
      observer.observe(zone, { childList: true });
    });
  }

  // ==================== HOTSPOT TRACKING ====================

  function setupHotspotTracking() {
    document.addEventListener('click', e => {
      const hotspot = e.target.closest('.hotspot');
      if (!hotspot) return;

      const tooltip = hotspot.dataset?.tooltip || hotspot.textContent?.trim() || 'Unknown';
      const hotspotNum = hotspot.textContent?.trim() || '?';
      const locationBreadcrumb = getLocationBreadcrumb(currentSection);

      logEvent('hotspot_click', {
        hotspot: hotspotNum,
        tooltip: tooltip,
        section: currentSection
      });

      sendStatement('interacted', {
        object: {
          id: makeActivityId(baseActivityId, 'interaction', 'hotspot', currentSection || 'unknown', hotspotNum),
          objectType: 'Activity',
          definition: {
            type: 'http://adlnet.gov/expapi/activities/interaction',
            name: { 'en-US': `📍 Hotspot ${hotspotNum}: ${tooltip.substring(0, 50)}` },
            description: { 'en-US': `${locationBreadcrumb}\nHotspot ${hotspotNum}: ${tooltip}` }
          }
        },
        result: {
          extensions: {
            'https://novapay.dev/xapi/hotspot-number': hotspotNum,
            'https://novapay.dev/xapi/hotspot-content': tooltip,
            'https://novapay.dev/xapi/location': locationBreadcrumb
          }
        }
      });
    });
  }

  // ==================== ACCORDION TRACKING ====================

  function setupAccordionTracking() {
    document.addEventListener('click', e => {
      const header = e.target.closest('.accordion-header');
      if (!header) return;

      const item = header.closest('.accordion-item');
      if (!item) return;

      // Check state AFTER the click (interactions.js toggles the class)
      setTimeout(() => {
        const isOpen = item.classList.contains('open');
        const title = header.textContent?.trim()?.substring(0, 80) || 'Unknown';
        const locationBreadcrumb = getLocationBreadcrumb(currentSection);

        logEvent('accordion_toggle', {
          title: title,
          isOpen: isOpen,
          section: currentSection
        });

        if (isOpen) {
          sendStatement('interacted', {
            object: {
              id: makeActivityId(baseActivityId, 'interaction', 'accordion', currentSection || 'unknown', title.substring(0, 30)),
              objectType: 'Activity',
              definition: {
                type: 'http://adlnet.gov/expapi/activities/interaction',
                name: { 'en-US': `📂 Expanded: ${title.substring(0, 50)}` },
                description: { 'en-US': `${locationBreadcrumb}\nAccordion expanded: ${title}` }
              }
            },
            result: {
              extensions: {
                'https://novapay.dev/xapi/accordion-title': title,
                'https://novapay.dev/xapi/accordion-state': 'expanded',
                'https://novapay.dev/xapi/location': locationBreadcrumb
              }
            }
          });
        }
      }, 50); // Small delay to let interactions.js toggle the class first
    });
  }

  // ==================== CLEANUP ====================

  window.addEventListener('beforeunload', () => {
    // Send final section exit
    if (currentSection) {
      exitSection(currentSection);
    }

    // Log session end
    logEvent('session_end', {
      totalActiveTimeMs: activeTime,
      totalIdleTimeMs: idleTime,
      sectionsVisited: Object.keys(sectionData).length,
      totalClicks: clickCount,
      totalKeyPresses: keyPressCount
    });

    // Try to flush remaining statements
    batchPromise = processBatch();
  });

  // ==================== PUBLIC API ====================

  return {
    init,

    // Get all tracked data
    getData: () => ({
      sessionId,
      events: [...allEvents],
      sectionData: { ...sectionData },
      currentSection,
      activeTime,
      idleTime,
      videoStates: { ...videoStates },
      statementQueue: [...statementQueue]
    }),

    // Get events from sessionStorage
    getStoredEvents: () => {
      try {
        return JSON.parse(sessionStorage.getItem('xapi-events') || '[]');
      } catch (e) {
        return [];
      }
    },

    // Clear stored events
    clearStoredEvents: () => {
      sessionStorage.removeItem('xapi-events');
      allEvents = [];
    },

    // Get section analytics
    getSectionAnalytics: () => ({ ...sectionData }),

    // Force send all queued statements
    flush: () => { batchPromise = processBatch(); return batchPromise; },

    // Stop tracking (call when course ends)
    stop: () => {
      log('Tracker stopped - session ended');
      sessionEnded = true;
      statementQueue = [];
    },

    // Check if session has ended
    isSessionEnded: () => sessionEnded,

    // Manual event tracking
    trackCustomEvent: (type, data) => logEvent(type, data),

    // Debug output
    debug: () => {
      console.log('%c=== XAPITracker Debug ===', 'font-size: 16px; font-weight: bold; color: #8b5cf6;');
      console.log('Session ID:', sessionId);
      console.log('Current Section:', currentSection);
      console.log('Active Time:', Math.round(activeTime / 1000), 'seconds');
      console.log('Idle Time:', Math.round(idleTime / 1000), 'seconds');
      console.log('Events Logged:', allEvents.length);
      console.log('Statements Queued:', statementQueue.length);
      console.log('Section Data:', sectionData);
      console.log('Video States:', videoStates);
      console.log('\nRecent Events:');
      console.table(allEvents.slice(-20));
    }
  };
})();

// Initialize when DOM is ready (after Cmi5 has initialized)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => XAPITracker.init(), 1000);
});

// Export
if (typeof module !== 'undefined' && module.exports) {
  module.exports = XAPITracker;
}
