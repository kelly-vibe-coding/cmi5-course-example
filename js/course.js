/**
 * Course Navigation and State Management
 * NovaPay Platform Launch Training
 */

const Course = (function() {
  'use strict';

  // Course structure
  const sections = [
    { id: '1-1', module: 1, title: 'Platform Overview' },
    { id: '1-2', module: 1, title: "What's New At-a-Glance" },
    { id: '2-1', module: 2, title: 'Introduction to Instant Payouts' },
    { id: '2-2', module: 2, title: 'Building Your First Payout Flow' },
    { id: '2-3', module: 2, title: 'Interactive Demo' },
    { id: '2-4', module: 2, title: 'Knowledge Check' },
    { id: '3-1', module: 3, title: 'Connect API Overview' },
    { id: '3-2', module: 3, title: 'Drop-in UI Components' },
    { id: '3-3', module: 3, title: 'Webhooks Pro Configuration' },
    { id: '3-4', module: 3, title: 'Knowledge Check' },
    { id: '4-1', module: 4, title: 'Fraud Shield Overview' },
    { id: '4-2', module: 4, title: 'Vault & Tokenization Setup' },
    { id: '4-3', module: 4, title: 'Compliance Hub Rules' },
    { id: '4-4', module: 4, title: 'Knowledge Check' },
    { id: '5-1', module: 5, title: 'Embedded Accounts' },
    { id: '5-2', module: 5, title: 'Global Rails & Multi-Currency' },
    { id: '5-3', module: 5, title: 'Revenue Analytics' },
    { id: '6-1', module: 6, title: 'Live Ledger' },
    { id: '6-2', module: 6, title: 'Smart Routing' },
    { id: '6-3', module: 6, title: 'API Permissions & Scopes' },
    { id: 'exam', module: 'exam', title: 'Final Exam' },
    { id: 'completion', module: 'completion', title: 'Summary & Certificate' }
  ];

  // State
  let currentSectionId = '1-1';
  let visitedSections = new Set(['1-1']);
  let completedSections = new Set();
  let quizScores = {};
  let startTime = Date.now();
  let finalExamScore = null; // The score that gets reported to LMS

  // DOM elements
  let progressFill, progressPercent, mobileProgress;

  /**
   * Initialize the course
   */
  function init() {
    // Cache DOM elements
    progressFill = document.getElementById('progressFill');
    progressPercent = document.getElementById('progressPercent');
    mobileProgress = document.getElementById('mobileProgress');

    // Set up event listeners
    setupNavigation();
    setupMobileMenu();
    setupNavigationButtons();

    // Load saved state
    loadState();

    // Navigate to current section
    navigateToSection(currentSectionId, false);

    // Update progress
    updateProgress();

    console.log('Course initialized');
  }

  /**
   * Set up sidebar navigation
   */
  function setupNavigation() {
    // Module headers (expand/collapse)
    document.querySelectorAll('.module-header').forEach(header => {
      header.addEventListener('click', () => {
        const isExpanded = header.getAttribute('aria-expanded') === 'true';
        header.setAttribute('aria-expanded', !isExpanded);

        const sectionList = header.nextElementSibling;
        if (sectionList) {
          sectionList.classList.toggle('collapsed', isExpanded);
        }
      });
    });

    // Section links
    document.querySelectorAll('.section-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sectionId = link.dataset.section;
        navigateToSection(sectionId);
      });
    });
  }

  /**
   * Set up mobile menu toggle
   */
  function setupMobileMenu() {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });

      // Close sidebar when clicking outside
      document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') &&
            !sidebar.contains(e.target) &&
            !menuToggle.contains(e.target)) {
          sidebar.classList.remove('open');
        }
      });
    }

    // Mobile prev/next buttons
    const mobilePrev = document.getElementById('mobilePrev');
    const mobileNext = document.getElementById('mobileNext');

    if (mobilePrev) {
      mobilePrev.addEventListener('click', () => navigatePrev());
    }
    if (mobileNext) {
      mobileNext.addEventListener('click', () => navigateNext());
    }
  }

  /**
   * Set up next/prev buttons in content
   */
  function setupNavigationButtons() {
    document.addEventListener('click', (e) => {
      const nextBtn = e.target.closest('.btn-next');
      const prevBtn = e.target.closest('.btn-prev');

      if (nextBtn) {
        const nextSection = nextBtn.dataset.next;
        if (nextSection) {
          navigateToSection(nextSection);
        }
      }

      if (prevBtn) {
        const prevSection = prevBtn.dataset.prev;
        if (prevSection) {
          navigateToSection(prevSection);
        }
      }
    });
  }

  /**
   * Check if the exam has been passed
   */
  function hasPassedExam() {
    if (typeof Interactions !== 'undefined' && Interactions.getExamBestScore) {
      return Interactions.getExamBestScore() >= 0.75;
    }
    return false;
  }

  /**
   * Navigate to a specific section
   */
  function navigateToSection(sectionId, trackView = true) {
    const targetSection = document.getElementById(`section-${sectionId}`);
    if (!targetSection) {
      console.warn(`Section not found: ${sectionId}`);
      return;
    }

    // Block access to completion section until exam is passed
    if (sectionId === 'completion' && !hasPassedExam()) {
      console.log('[Course] Completion section locked - exam not yet passed');
      alert('Please pass the Final Exam before accessing the Course Completion section.');
      return;
    }

    // Stop game music if navigating away from the game section
    if (currentSectionId === '1-2' && sectionId !== '1-2') {
      if (typeof window._stopGameMusic === 'function') {
        window._stopGameMusic();
      }
    }

    // Hide current section
    document.querySelectorAll('.content-section').forEach(section => {
      section.classList.add('hidden');
    });

    // Show target section
    targetSection.classList.remove('hidden');

    // Update navigation state
    const previousSection = currentSectionId;
    currentSectionId = sectionId;

    // Mark as visited
    visitedSections.add(sectionId);

    // Mark previous section as completed if moving forward
    const prevIndex = sections.findIndex(s => s.id === previousSection);
    const currIndex = sections.findIndex(s => s.id === sectionId);
    if (currIndex > prevIndex && previousSection !== sectionId) {
      markSectionComplete(previousSection);
    }

    // Update sidebar
    updateSidebarState();

    // Update progress
    updateProgress();

    // Update mobile nav
    updateMobileNav();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Note: cmi5 only tracks initialized, completed, passed/failed, terminated
    // Section tracking would require additional xAPI statements which are optional

    // Expand parent module in sidebar
    const moduleNum = targetSection.dataset.module;
    expandModule(moduleNum);

    // Save state
    saveState();
  }

  /**
   * Navigate to previous section
   */
  function navigatePrev() {
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    if (currentIndex > 0) {
      navigateToSection(sections[currentIndex - 1].id);
    }
  }

  /**
   * Navigate to next section
   */
  function navigateNext() {
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    if (currentIndex < sections.length - 1) {
      navigateToSection(sections[currentIndex + 1].id);
    }
  }

  /**
   * Expand a module in the sidebar
   */
  function expandModule(moduleId) {
    const navModule = document.querySelector(`.nav-module[data-module="${moduleId}"]`);
    if (navModule) {
      const header = navModule.querySelector('.module-header');
      const sectionList = navModule.querySelector('.section-list');

      if (header && sectionList) {
        header.setAttribute('aria-expanded', 'true');
        sectionList.classList.remove('collapsed');
      }
    }
  }

  /**
   * Update sidebar active states
   */
  function updateSidebarState() {
    // Check if exam is passed for completion section lock state
    const examPassed = hasPassedExam();

    // Update section links
    document.querySelectorAll('.section-link').forEach(link => {
      const sectionId = link.dataset.section;
      link.classList.remove('active', 'locked');

      if (sectionId === currentSectionId) {
        link.classList.add('active');
      }

      if (completedSections.has(sectionId)) {
        link.classList.add('completed');
      }

      // Mark completion section as locked if exam not passed
      if (sectionId === 'completion' && !examPassed) {
        link.classList.add('locked');
      }
    });

    // Update module status indicators
    const moduleStatus = {};
    sections.forEach(section => {
      if (!moduleStatus[section.module]) {
        moduleStatus[section.module] = { total: 0, completed: 0 };
      }
      moduleStatus[section.module].total++;
      if (completedSections.has(section.id)) {
        moduleStatus[section.module].completed++;
      }
    });

    Object.keys(moduleStatus).forEach(moduleId => {
      const status = moduleStatus[moduleId];
      const indicator = document.querySelector(`.nav-module[data-module="${moduleId}"] .module-status`);
      if (indicator) {
        if (status.completed === status.total) {
          indicator.dataset.status = 'complete';
        } else if (status.completed > 0) {
          indicator.dataset.status = 'in-progress';
        } else {
          indicator.dataset.status = 'incomplete';
        }
      }
    });
  }

  /**
   * Mark a section as complete
   */
  function markSectionComplete(sectionId) {
    completedSections.add(sectionId);
    updateSidebarState();
    updateProgress();
    saveState();
  }

  /**
   * Update progress bar
   */
  function updateProgress() {
    const totalSections = sections.length - 1; // Exclude completion section
    const completed = completedSections.size;
    const percent = Math.round((completed / totalSections) * 100);

    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
    if (progressPercent) {
      progressPercent.textContent = `${percent}%`;
    }

    // Note: cmi5 tracks completion at the end, not incremental progress
  }

  /**
   * Update mobile navigation
   */
  function updateMobileNav() {
    const currentIndex = sections.findIndex(s => s.id === currentSectionId);
    const total = sections.length;

    const mobilePrev = document.getElementById('mobilePrev');
    const mobileNext = document.getElementById('mobileNext');

    if (mobilePrev) {
      mobilePrev.disabled = currentIndex === 0;
    }
    if (mobileNext) {
      mobileNext.disabled = currentIndex === total - 1;
    }
    if (mobileProgress) {
      mobileProgress.textContent = `${currentIndex + 1} / ${total}`;
    }
  }

  /**
   * Record quiz score
   */
  function recordQuizScore(moduleId, score, total) {
    quizScores[moduleId] = { score, total };
    saveState();
  }

  /**
   * Get overall quiz score
   * Now uses ONLY the final exam score for LMS reporting
   */
  function getOverallScore() {
    // If we have a final exam score, use that (it's the only graded assessment)
    if (finalExamScore !== null) {
      return finalExamScore;
    }

    // Fallback to quiz scores if no final exam taken (shouldn't happen in normal flow)
    let totalScore = 0;
    let totalQuestions = 0;

    Object.values(quizScores).forEach(quiz => {
      totalScore += quiz.score;
      totalQuestions += quiz.total;
    });

    return totalQuestions > 0 ? totalScore / totalQuestions : 0;
  }

  /**
   * Set the final exam score (called from Interactions.js)
   */
  function setFinalExamScore(score) {
    finalExamScore = score;
    saveState();
  }

  /**
   * Complete the course
   */
  async function completeCourse() {
    const score = getOverallScore();
    const elapsedTime = Date.now() - startTime;
    const timeSpent = formatTime(elapsedTime);

    // Update completion stats
    const completionTime = document.getElementById('completionTime');
    const sectionsCompletedEl = document.getElementById('sectionsCompleted');
    const quizScoreEl = document.getElementById('quizScore');

    if (completionTime) {
      completionTime.textContent = timeSpent;
    }
    if (sectionsCompletedEl) {
      sectionsCompletedEl.textContent = `${completedSections.size}/${sections.length - 1}`;
    }
    if (quizScoreEl) {
      quizScoreEl.textContent = `${Math.round(score * 100)}%`;
    }

    // Send completion to cmi5
    // Use the Cmi5 object (cmi5-wrapper.js provides both Cmi5 and Cmi5Wrapper aliases)
    if (typeof Cmi5 !== 'undefined' && Cmi5.isConnected()) {
      try {
        // Flush any pending xAPI tracker statements before sending cmi5 defined statements
        if (typeof XAPITracker !== 'undefined' && XAPITracker.flush) {
          await XAPITracker.flush();
          console.log('cmi5: Flushed pending xAPI tracker statements');
        }

        // Step 1: Send completed statement (required for moveOn=CompletedOrPassed)
        await Cmi5.complete();
        console.log('cmi5: Completed statement sent');

        // Step 2: Determine pass/fail based on mastery score
        const masteryScore = Cmi5.getMasteryScore();

        if (score >= masteryScore) {
          await Cmi5.pass(score);
          console.log('cmi5: Passed statement sent (score:', Math.round(score * 100) + '%)');
        } else {
          await Cmi5.fail(score);
          console.log('cmi5: Failed statement sent (score:', Math.round(score * 100) + '%)');
        }

        // Step 3: Send terminated
        await Cmi5.terminate();
        console.log('cmi5: Terminated statement sent');

        // Stop the xAPI tracker to prevent further statement sends
        if (typeof XAPITracker !== 'undefined' && XAPITracker.stop) {
          XAPITracker.stop();
          console.log('XAPITracker stopped');
        }
      } catch (error) {
        console.error('cmi5: Error sending completion statements:', error);
      }
    } else {
      console.log('Course completed (standalone mode - no cmi5 connection)');
    }

    // Clear saved state
    clearState();

    console.log('Course completed', { score, timeSpent, sectionsCompleted: completedSections.size });
  }

  /**
   * Format milliseconds to readable time
   */
  function formatTime(ms) {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m`;
    }

    return `${minutes}m ${seconds}s`;
  }

  /**
   * Save state to localStorage
   */
  function saveState() {
    const state = {
      currentSectionId,
      visitedSections: Array.from(visitedSections),
      completedSections: Array.from(completedSections),
      quizScores,
      startTime
    };

    try {
      localStorage.setItem('novapay-platform-launch-course-state', JSON.stringify(state));
    } catch (e) {
      console.warn('Could not save course state:', e);
    }
  }

  /**
   * Load state from localStorage
   */
  function loadState() {
    try {
      const saved = localStorage.getItem('novapay-platform-launch-course-state');
      if (saved) {
        const state = JSON.parse(saved);
        currentSectionId = state.currentSectionId || '1-1';
        visitedSections = new Set(state.visitedSections || ['1-1']);
        completedSections = new Set(state.completedSections || []);
        quizScores = state.quizScores || {};
        startTime = state.startTime || Date.now();
        console.log('Course state loaded');
      }
    } catch (e) {
      console.warn('Could not load course state:', e);
    }
  }

  /**
   * Clear saved state
   */
  function clearState() {
    try {
      localStorage.removeItem('novapay-platform-launch-course-state');
    } catch (e) {
      console.warn('Could not clear course state:', e);
    }
  }

  // Public API
  return {
    init,
    navigateToSection,
    navigatePrev,
    navigateNext,
    markSectionComplete,
    recordQuizScore,
    getOverallScore,
    completeCourse,
    setFinalExamScore,
    getCurrentSection: () => currentSectionId,
    getSections: () => sections,
    getVisitedSections: () => visitedSections,
    getCompletedSections: () => completedSections,
    getFinalExamScore: () => finalExamScore
  };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Course.init();
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Course;
}
