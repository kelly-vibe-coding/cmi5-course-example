/**
 * cmi5 Wrapper for NovaPay Platform Launch Training
 * Handles LRS connection, auth, and xAPI statement delivery per cmi5 spec.
 * Reference: https://github.com/AICC/cmi-5_Spec_Current/blob/quartz/cmi5_spec.md
 */

const Cmi5 = (function() {
  'use strict';

  // ==================== DEBUG MODE ====================
  // Set to true to see all xAPI activity in console
  const DEBUG = false;

  // ==================== CONSTANTS ====================
  const SESSION_STORAGE_KEY = 'cmi5_session_data';
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;

  function log(...args) {
    if (DEBUG) {
      console.log('%c[cmi5]', 'color: #7C3AED; font-weight: bold;', ...args);
    }
  }

  function logError(...args) {
    console.error('%c[cmi5 ERROR]', 'color: #dc2626; font-weight: bold;', ...args);
  }

  function logSuccess(...args) {
    if (DEBUG) {
      console.log('%c[cmi5 ✓]', 'color: #059669; font-weight: bold;', ...args);
    }
  }

  function logStatement(verb, statement) {
    if (DEBUG) {
      console.groupCollapsed(`%c[cmi5] Statement: ${verb}`, 'color: #0891b2; font-weight: bold;');
      console.log('Full statement:', JSON.stringify(statement, null, 2));
      console.log('Timestamp:', statement.timestamp);
      if (statement.result) {
        console.log('Result:', statement.result);
      }
      console.groupEnd();
    }
  }

  // ==================== STATE ====================
  let initialized = false;
  let terminated = false;

  // Launch parameters from URL
  let endpoint = null;      // LRS endpoint
  let fetchUrl = null;      // URL to get auth token
  let actor = null;         // Learner agent object
  let registration = null;  // Registration UUID
  let activityId = null;    // Activity ID for this AU

  // Auth and session
  let authToken = null;     // Auth token for LRS (Basic or Bearer)
  let sessionId = null;     // Unique session identifier

  // Launch data from LMS
  let launchData = null;    // Full LMS.LaunchData document
  let contextTemplate = null; // Context template for statements
  let launchMode = 'Normal'; // Normal, Browse, or Review
  let masteryScore = 0.75;  // Default mastery score
  let moveOn = 'CompletedOrPassed'; // Completion criteria
  let returnURL = null;     // URL to return to after completion

  // Tracking
  let completionSent = false;
  let successSent = false;
  let startTime = null;

  // Statement log for debugging
  let statementLog = [];

  // ==================== SESSION STORAGE ====================

  /**
   * Save session data to sessionStorage
   * This is critical because the fetch URL can only be used ONCE per cmi5 spec
   */
  function saveSessionData() {
    try {
      const data = {
        endpoint,
        authToken,
        actor,
        registration,
        activityId,
        sessionId,
        launchData,
        contextTemplate,
        launchMode,
        masteryScore,
        moveOn,
        returnURL,
        startTime,
        initialized,
        completionSent,
        successSent
      };
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(data));
      log('Session data saved to sessionStorage');
    } catch (e) {
      logError('Failed to save session data:', e);
    }
  }

  /**
   * Load session data from sessionStorage
   * Returns true if valid session data was found
   */
  function loadSessionData() {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (!saved) {
        return false;
      }

      const data = JSON.parse(saved);

      // Verify this is for the same registration (same course launch)
      const params = new URLSearchParams(window.location.search);
      const currentRegistration = params.get('registration');
      const currentFetchUrl = params.get('fetch');

      // Extract session ID from current fetch URL to compare
      let currentSessionIdFromUrl = null;
      if (currentFetchUrl) {
        try {
          const fetchUrlObj = new URL(currentFetchUrl);
          currentSessionIdFromUrl = fetchUrlObj.searchParams.get('session');
        } catch (e) {
          // Ignore parse errors
        }
      }

      // Must match BOTH registration AND session ID (if available)
      // A new session ID means the LMS started a fresh session (e.g., after reset)
      const registrationMatches = data.registration && data.registration === currentRegistration;
      const sessionMatches = !currentSessionIdFromUrl || data.sessionId === currentSessionIdFromUrl;

      if (registrationMatches && sessionMatches && data.authToken) {
        endpoint = data.endpoint;
        authToken = data.authToken;
        actor = data.actor;
        registration = data.registration;
        activityId = data.activityId;
        sessionId = data.sessionId;
        launchData = data.launchData;
        contextTemplate = data.contextTemplate;
        launchMode = data.launchMode || 'Normal';
        masteryScore = data.masteryScore ?? 0.75;
        moveOn = data.moveOn || 'CompletedOrPassed';
        returnURL = data.returnURL;
        startTime = data.startTime;
        initialized = data.initialized;
        completionSent = data.completionSent || false;
        successSent = data.successSent || false;

        logSuccess('Session data restored from sessionStorage');
        log('Restored session:', {
          endpoint: endpoint ? '(present)' : '(missing)',
          authToken: authToken ? '(present)' : '(missing)',
          registration,
          sessionId
        });
        return true;
      }

      if (!registrationMatches) {
        log('Stored session data is for different registration, starting fresh');
      } else if (!sessionMatches) {
        log('Stored session data is for different session ID (LMS started new session), starting fresh');
        log('  Stored session:', data.sessionId);
        log('  Current session:', currentSessionIdFromUrl);
      }

      // Clear stale session data
      clearSessionData();
      return false;
    } catch (e) {
      logError('Failed to load session data:', e);
      return false;
    }
  }

  /**
   * Clear session data (on terminate)
   */
  function clearSessionData() {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      // Ignore
    }
  }

  // ==================== URL PARAMETER PARSING ====================

  function parseLaunchParameters() {
    const params = new URLSearchParams(window.location.search);

    endpoint = params.get('endpoint');
    fetchUrl = params.get('fetch');
    registration = params.get('registration');
    activityId = params.get('activityId');

    // Actor is URL-encoded JSON
    const actorParam = params.get('actor');
    if (actorParam) {
      try {
        actor = JSON.parse(actorParam);
      } catch (e) {
        logError('Failed to parse actor parameter:', e);
      }
    }

    log('Launch parameters:', {
      endpoint: endpoint || '(not provided)',
      fetchUrl: fetchUrl ? '(present)' : '(not provided)',
      actor: actor ? '(present)' : '(not provided)',
      registration: registration || '(not provided)',
      activityId: activityId || '(not provided)'
    });

    const hasAllParams = !!(endpoint && fetchUrl && actor && registration && activityId);

    if (!hasAllParams) {
      log('Missing launch parameters - will run in standalone mode');
      if (!endpoint) log('  - Missing: endpoint');
      if (!fetchUrl) log('  - Missing: fetch');
      if (!actor) log('  - Missing: actor');
      if (!registration) log('  - Missing: registration');
      if (!activityId) log('  - Missing: activityId');
    }

    return hasAllParams;
  }

  // ==================== AUTH TOKEN ====================

  /**
   * Fetch authorization token from the fetch URL
   * Per cmi5 spec: POST to fetch URL with NO body, response contains auth-token
   *
   * CRITICAL: The fetch URL can only be used ONCE per cmi5 specification.
   * If the page refreshes, we must use the cached token from sessionStorage.
   */
  async function fetchAuthToken() {
    if (!fetchUrl) {
      throw new Error('No fetch URL available');
    }

    log('Fetching auth token from:', fetchUrl);

    try {
      // cmi5 spec: POST with NO body, NO Content-Type header
      const response = await fetch(fetchUrl, {
        method: 'POST',
        mode: 'cors',
        credentials: 'include'  // Include cookies if needed
      });

      log('Auth fetch response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        logError('Auth fetch failed:', response.status, errorText);

        // Check if this is a "already used" error - fetch URL is one-time use
        if (response.status === 401 || response.status === 403 || response.status === 410) {
          logError('Fetch URL may have already been used (one-time use per cmi5 spec)');
          logError('Check if sessionStorage has cached token');
        }

        throw new Error(`Auth fetch failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      log('Auth fetch response data:', data);

      // Token may be in 'auth-token' or 'authToken' field
      authToken = data['auth-token'] || data.authToken || data.token;

      if (!authToken) {
        logError('No auth token in response. Response keys:', Object.keys(data));
        throw new Error('No auth token in response');
      }

      // SCORM Cloud returns just the base64 token without the "Basic " prefix
      // We need to add the prefix for proper HTTP Basic Auth
      log('Auth token format check:', {
        hasBasicPrefix: authToken.startsWith('Basic '),
        hasBearerPrefix: authToken.startsWith('Bearer '),
        tokenLength: authToken.length
      });

      // Add "Basic " prefix if not already present
      if (!authToken.startsWith('Basic ') && !authToken.startsWith('Bearer ')) {
        authToken = 'Basic ' + authToken;
        log('Added "Basic " prefix to auth token');
      }

      logSuccess('Auth token obtained:', authToken.substring(0, 30) + '...');

      // Save to sessionStorage immediately in case of page refresh
      saveSessionData();

      return true;
    } catch (error) {
      logError('Failed to fetch auth token:', error);
      throw error;
    }
  }

  // ==================== LRS COMMUNICATION ====================

  /**
   * Sleep helper for retry delays
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Make an authenticated request to the LRS with retry logic
   */
  async function lrsRequest(path, method = 'GET', body = null, retryCount = 0) {
    if (!endpoint || !authToken) {
      logError('LRS not configured:', { endpoint: !!endpoint, authToken: !!authToken });
      throw new Error('LRS not configured (missing endpoint or authToken)');
    }

    // Ensure endpoint ends with /
    const baseUrl = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const url = baseUrl + path;

    const headers = {
      'Authorization': authToken,
      'X-Experience-API-Version': '1.0.3'
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
    }

    const options = {
      method,
      headers,
      mode: 'cors'
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    log(`LRS ${method} ${path}${retryCount > 0 ? ` (retry ${retryCount})` : ''}`);

    try {
      const response = await fetch(url, options);

      log(`LRS response: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        const errorText = await response.text();

        // 404 on GET requests is expected for missing resources (learner preferences, state docs)
        // Return null instead of throwing - let the caller handle it
        if (response.status === 404 && method === 'GET') {
          log(`Resource not found (404) - this is often expected:`, path);
          return null;
        }

        logError(`LRS request failed:`, {
          url,
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });

        // Retry on transient errors (5xx, network issues)
        if (retryCount < MAX_RETRIES && (response.status >= 500 || response.status === 0)) {
          log(`Retrying in ${RETRY_DELAY_MS}ms...`);
          await sleep(RETRY_DELAY_MS * (retryCount + 1)); // Exponential backoff
          return lrsRequest(path, method, body, retryCount + 1);
        }

        // Don't retry on 4xx errors (client errors like bad request, unauthorized)
        throw new Error(`LRS request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      // Some responses may be empty
      const text = await response.text();
      if (text) {
        try {
          return JSON.parse(text);
        } catch (e) {
          return text;
        }
      }
      return null;
    } catch (error) {
      // Retry on network errors
      if (retryCount < MAX_RETRIES && error.name === 'TypeError') {
        log(`Network error, retrying in ${RETRY_DELAY_MS}ms...`);
        await sleep(RETRY_DELAY_MS * (retryCount + 1));
        return lrsRequest(path, method, body, retryCount + 1);
      }

      logError('LRS request error:', error);
      throw error;
    }
  }

  /**
   * Send request synchronously (for beforeunload)
   * Uses navigator.sendBeacon (preferred) with XMLHttpRequest sync as fallback
   *
   * Note: sendBeacon is more reliable on page unload but only supports POST.
   * For xAPI statements, we need PUT, so we try sendBeacon first (some LRS accept POST)
   * and fall back to sync XHR.
   */
  function lrsRequestSync(path, method, body) {
    if (!endpoint || !authToken) {
      logError('Cannot send sync request - not configured');
      return false;
    }

    const baseUrl = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const url = baseUrl + path;

    // Try sendBeacon first (most reliable for page unload)
    // Note: sendBeacon only supports POST, but some LRS accept it for statements
    if (navigator.sendBeacon && body) {
      try {
        // Create a Blob with the proper content type
        const blob = new Blob([JSON.stringify(body)], {
          type: 'application/json'
        });

        // Note: sendBeacon doesn't support custom headers like Authorization
        // So we need to use the sync XHR approach for authenticated requests
        log('sendBeacon not suitable for authenticated requests, using sync XHR');
      } catch (e) {
        log('sendBeacon failed:', e);
      }
    }

    // Fall back to synchronous XMLHttpRequest
    try {
      const xhr = new XMLHttpRequest();
      xhr.open(method, url, false);  // false = synchronous
      xhr.setRequestHeader('Authorization', authToken);
      xhr.setRequestHeader('X-Experience-API-Version', '1.0.3');

      if (body) {
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(body));
      } else {
        xhr.send();
      }

      log(`Sync LRS response: ${xhr.status}`);
      return xhr.status >= 200 && xhr.status < 300;
    } catch (error) {
      logError('Sync LRS request failed:', error);
      return false;
    }
  }

  // ==================== LEARNER PREFERENCES ====================

  // Learner preferences (from Agent Profile)
  let learnerPreferences = null;

  /**
   * Fetch Learner Preferences from Agent Profile
   * Per cmi5 spec, this MUST be retrieved before sending statements
   */
  async function fetchLearnerPreferences() {
    log('Fetching Learner Preferences from Agent Profile...');

    const params = new URLSearchParams({
      profileId: 'cmi5LearnerPreferences',
      agent: JSON.stringify(actor)
    });

    try {
      learnerPreferences = await lrsRequest(`agents/profile?${params.toString()}`);

      if (learnerPreferences) {
        logSuccess('Learner Preferences retrieved:', learnerPreferences);
      } else {
        log('No Learner Preferences found (this is normal for new learners)');
        learnerPreferences = {}; // Empty object is fine
      }

      return true;
    } catch (error) {
      // 404 is expected if no preferences exist yet - that's OK
      if (error.message.includes('404')) {
        log('No existing Learner Preferences (404) - this is normal');
        learnerPreferences = {};
        return true;
      }

      // Other errors - log but don't fail
      log('Could not fetch Learner Preferences:', error.message);
      learnerPreferences = {};
      return true; // Non-fatal
    }
  }

  // ==================== STATE DOCUMENT ====================

  async function fetchLaunchData() {
    log('Fetching LMS.LaunchData...');

    const params = new URLSearchParams({
      stateId: 'LMS.LaunchData',
      activityId: activityId,
      agent: JSON.stringify(actor),
      registration: registration
    });

    try {
      launchData = await lrsRequest(`activities/state?${params.toString()}`);

      if (launchData) {
        // Extract important fields
        contextTemplate = launchData.contextTemplate;
        launchMode = launchData.launchMode || 'Normal';
        masteryScore = launchData.masteryScore ?? 0.75;
        moveOn = launchData.moveOn || 'CompletedOrPassed';
        returnURL = launchData.returnURL;

        logSuccess('LaunchData retrieved:', {
          launchMode,
          masteryScore,
          moveOn,
          hasContextTemplate: !!contextTemplate,
          returnURL: returnURL || '(none)'
        });
      } else {
        log('No LaunchData found, using defaults');
      }

      return true;
    } catch (error) {
      // LMS.LaunchData is OPTIONAL in cmi5 - many LMS don't provide it
      // A 404 or 500 error here is NOT fatal - just use defaults
      log('LaunchData not available (this is often normal):', error.message);
      log('Using default values: masteryScore=0.75, launchMode=Normal');
      // Return TRUE - this is not a fatal error
      return true;
    }
  }

  // ==================== STATEMENT BUILDING ====================

  function generateUUID() {
    if (crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Build a cmi5 compliant statement
   */
  function buildStatement(verb, result = null, objectOverride = null) {
    const statement = {
      id: generateUUID(),
      actor: actor,
      verb: verb,
      object: objectOverride || {
        id: activityId,
        objectType: 'Activity'
      },
      timestamp: new Date().toISOString()
    };

    // Build context - start with contextTemplate if available
    let context = {};

    if (contextTemplate) {
      context = JSON.parse(JSON.stringify(contextTemplate));
    }

    // Ensure required cmi5 context fields
    context.registration = registration;

    // Add context extensions
    if (!context.extensions) {
      context.extensions = {};
    }
    context.extensions['https://w3id.org/xapi/cmi5/context/extensions/sessionid'] = sessionId;

    // Ensure contextActivities exists
    if (!context.contextActivities) {
      context.contextActivities = {};
    }

    // Add cmi5 category (required for cmi5 defined statements)
    if (!context.contextActivities.category) {
      context.contextActivities.category = [];
    }

    const hasCmi5Category = context.contextActivities.category.some(
      cat => cat.id === 'https://w3id.org/xapi/cmi5/context/categories/cmi5'
    );

    if (!hasCmi5Category) {
      context.contextActivities.category.push({
        id: 'https://w3id.org/xapi/cmi5/context/categories/cmi5',
        objectType: 'Activity'
      });
    }

    // Add moveon category for passed/failed statements (required by cmi5 spec)
    const verbId = verb.id;
    if (verbId === 'http://adlnet.gov/expapi/verbs/passed' ||
        verbId === 'http://adlnet.gov/expapi/verbs/failed') {
      const hasMoveOnCategory = context.contextActivities.category.some(
        cat => cat.id === 'https://w3id.org/xapi/cmi5/context/categories/moveon'
      );
      if (!hasMoveOnCategory) {
        context.contextActivities.category.push({
          id: 'https://w3id.org/xapi/cmi5/context/categories/moveon',
          objectType: 'Activity'
        });
      }
    }

    statement.context = context;

    // Add result if provided
    if (result) {
      statement.result = result;
    }

    return statement;
  }

  // ==================== SEND STATEMENT ====================

  async function sendStatement(statement) {
    if (terminated && statement.verb.id !== 'http://adlnet.gov/expapi/verbs/terminated') {
      log('Cannot send statements after termination');
      return null;
    }

    const verbName = statement.verb.display?.['en-US'] || statement.verb.id.split('/').pop();
    logStatement(verbName, statement);

    // Log to our internal array for debugging
    statementLog.push({
      timestamp: statement.timestamp,
      verb: verbName,
      success: null,
      error: null
    });

    try {
      await lrsRequest(
        `statements?statementId=${statement.id}`,
        'PUT',
        statement
      );

      statementLog[statementLog.length - 1].success = true;
      logSuccess(`Statement sent: ${verbName}`);
      return statement.id;
    } catch (error) {
      statementLog[statementLog.length - 1].error = error.message;
      logError(`Failed to send statement: ${verbName}`, error);
      throw error;
    }
  }

  /**
   * Send statement synchronously (for page unload)
   */
  function sendStatementSync(statement) {
    const verbName = statement.verb.display?.['en-US'] || statement.verb.id.split('/').pop();
    logStatement(verbName + ' (sync)', statement);

    const success = lrsRequestSync(
      `statements?statementId=${statement.id}`,
      'PUT',
      statement
    );

    statementLog.push({
      timestamp: statement.timestamp,
      verb: verbName,
      success: success,
      sync: true
    });

    if (success) {
      logSuccess(`Statement sent (sync): ${verbName}`);
    } else {
      logError(`Failed to send statement (sync): ${verbName}`);
    }

    return success ? statement.id : null;
  }

  // ==================== CMI5 DEFINED STATEMENTS ====================

  function calculateDuration() {
    if (!startTime) {
      return 'PT0S';
    }

    const ms = Date.now() - startTime;
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

  async function sendInitialized() {
    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/initialized',
      display: { 'en-US': 'initialized' }
    };

    const statement = buildStatement(verb);
    return sendStatement(statement);
  }

  async function sendCompleted() {
    if (completionSent) {
      log('Completion already sent');
      return null;
    }

    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/completed',
      display: { 'en-US': 'completed' }
    };

    const result = {
      completion: true,
      duration: calculateDuration()
    };

    const statement = buildStatement(verb, result);
    const id = await sendStatement(statement);

    if (id) {
      completionSent = true;
      saveSessionData();  // Persist state
    }

    return id;
  }

  async function sendPassed(score = null) {
    if (successSent) {
      log('Success status already sent');
      return null;
    }

    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/passed',
      display: { 'en-US': 'passed' }
    };

    // Per cmi5 spec: passed/failed statements should NOT include completion
    // They only include success and optionally score
    const result = {
      success: true,
      duration: calculateDuration()
    };

    if (score !== null) {
      result.score = {
        scaled: Math.min(1, Math.max(0, score))  // Clamp to 0-1
      };
      result.score.raw = Math.round(result.score.scaled * 100);
      result.score.min = 0;
      result.score.max = 100;
    }

    const statement = buildStatement(verb, result);
    const id = await sendStatement(statement);

    if (id) {
      successSent = true;
      saveSessionData();  // Persist state
    }

    return id;
  }

  async function sendFailed(score = null) {
    if (successSent) {
      log('Success status already sent');
      return null;
    }

    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/failed',
      display: { 'en-US': 'failed' }
    };

    // Per cmi5 spec: passed/failed statements should NOT include completion
    // They only include success and optionally score
    const result = {
      success: false,
      duration: calculateDuration()
    };

    if (score !== null) {
      result.score = {
        scaled: Math.min(1, Math.max(0, score))
      };
      result.score.raw = Math.round(result.score.scaled * 100);
      result.score.min = 0;
      result.score.max = 100;
    }

    const statement = buildStatement(verb, result);
    const id = await sendStatement(statement);

    if (id) {
      successSent = true;
      saveSessionData();  // Persist state
    }

    return id;
  }

  async function sendTerminated() {
    if (terminated) {
      log('Already terminated');
      return null;
    }

    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/terminated',
      display: { 'en-US': 'terminated' }
    };

    const result = {
      duration: calculateDuration()
    };

    const statement = buildStatement(verb, result);

    try {
      const id = await sendStatement(statement);
      terminated = true;
      clearSessionData();  // Clean up session storage on terminate
      return id;
    } catch (error) {
      logError('Failed to send terminated:', error);
      throw error;
    }
  }

  /**
   * Send terminated statement synchronously (for beforeunload)
   */
  function sendTerminatedSync() {
    if (terminated) {
      return null;
    }

    const verb = {
      id: 'http://adlnet.gov/expapi/verbs/terminated',
      display: { 'en-US': 'terminated' }
    };

    const result = {
      duration: calculateDuration()
    };

    const statement = buildStatement(verb, result);
    const id = sendStatementSync(statement);

    if (id) {
      terminated = true;
      clearSessionData();  // Clean up session storage on terminate
    }

    return id;
  }

  // ==================== PUBLIC API ====================

  return {
    /**
     * Initialize the cmi5 session
     *
     * IMPORTANT: Per cmi5 spec, the fetch URL can only be used ONCE.
     * On page refresh, we MUST restore the session from sessionStorage.
     */
    async initialize() {
      if (initialized) {
        log('Already initialized');
        return true;
      }

      log('='.repeat(50));
      log('Initializing cmi5... (VERSION 30.0)');
      log('='.repeat(50));

      // CRITICAL: Check for existing session data FIRST
      // This handles page refresh - fetch URL can only be used once!
      const hasExistingSession = loadSessionData();

      if (hasExistingSession && authToken && endpoint) {
        log('RESTORED existing session from sessionStorage');
        log('Session was already initialized - continuing with cached token');

        // Session is already initialized - no need to validate
        // The fetchLaunchData call can fail (500 error) even with valid token
        // because LMS.LaunchData is optional in cmi5
        logSuccess('='.repeat(50));
        logSuccess('cmi5 session RESTORED from cache');
        logSuccess('='.repeat(50));
        return true;
      }

      // No existing session - fresh launch
      startTime = Date.now();

      // Parse launch parameters first (we need fetchUrl to extract session ID)
      const hasParams = parseLaunchParameters();

      // Extract session ID from the fetch URL (provided by LMS)
      // The fetch URL contains a 'session' parameter that we MUST use
      if (fetchUrl) {
        try {
          const fetchUrlObj = new URL(fetchUrl);
          sessionId = fetchUrlObj.searchParams.get('session');
          if (sessionId) {
            log('Session ID extracted from fetch URL:', sessionId);
          } else {
            // Fallback to generating our own (may not work with strict LMS)
            sessionId = generateUUID();
            log('Session ID not in fetch URL, generated:', sessionId);
          }
        } catch (e) {
          sessionId = generateUUID();
          log('Could not parse fetch URL, generated session ID:', sessionId);
        }
      } else {
        sessionId = generateUUID();
        log('No fetch URL, generated session ID:', sessionId);
      }

      log('Using Session ID:', sessionId);

      if (!hasParams) {
        log('Running in STANDALONE mode (no LMS connection)');
        initialized = true;
        return true;
      }

      try {
        // Step 1: Fetch auth token (one-time use!)
        log('Step 1: Fetching auth token (one-time use per cmi5 spec)...');
        await fetchAuthToken();

        // Step 2: Fetch Learner Preferences (REQUIRED by cmi5 before sending statements)
        log('Step 2: Fetching Learner Preferences from Agent Profile...');
        await fetchLearnerPreferences();

        // Step 3: Fetch LMS.LaunchData (optional but useful)
        log('Step 3: Fetching LMS.LaunchData...');
        await fetchLaunchData();

        // Step 4: Send initialized statement
        log('Step 4: Sending initialized statement...');
        await sendInitialized();

        initialized = true;

        // Save complete session state for page refresh
        saveSessionData();

        logSuccess('='.repeat(50));
        logSuccess('cmi5 initialization COMPLETE');
        logSuccess('='.repeat(50));
        return true;

      } catch (error) {
        logError('='.repeat(50));
        logError('cmi5 initialization FAILED:', error);
        logError('='.repeat(50));
        // Set initialized but NOT connected - allows course to run
        initialized = true;
        return false;
      }
    },

    isConnected() {
      return !!(endpoint && authToken);
    },

    isInitialized() {
      return initialized;
    },

    isTerminated() {
      return terminated;
    },

    getLaunchMode() {
      return launchMode;
    },

    getMasteryScore() {
      return masteryScore;
    },

    getMoveOn() {
      return moveOn;
    },

    getReturnURL() {
      return returnURL;
    },

    async complete() {
      if (!initialized) {
        log('Not initialized');
        return null;
      }
      return sendCompleted();
    },

    async pass(score = null) {
      if (!initialized) {
        log('Not initialized');
        return null;
      }
      return sendPassed(score);
    },

    async fail(score = null) {
      if (!initialized) {
        log('Not initialized');
        return null;
      }
      return sendFailed(score);
    },

    async terminate() {
      if (!initialized) {
        log('Not initialized');
        return null;
      }
      return sendTerminated();
    },

    /**
     * Synchronous terminate for beforeunload
     */
    terminateSync() {
      if (!initialized || !this.isConnected()) {
        return null;
      }
      return sendTerminatedSync();
    },

    /**
     * Send a custom statement (for xapi-tracker and other extensions)
     * These are "allowed" statements per cmi5 spec (not the defined verbs)
     *
     * IMPORTANT: Per cmi5 spec section 9.6.2.2, "allowed" statements:
     * - MUST include registration in context
     * - MUST NOT include cmi5 category (that marks it as a "defined" statement)
     * - SHOULD include session ID extension
     * - MAY include parent/grouping from contextTemplate
     */
    async sendStatement(verb, result = null, object = null) {
      if (!initialized || !this.isConnected()) {
        log('Cannot send statement (not connected)');
        return null;
      }

      if (terminated) {
        log('Cannot send statements after termination');
        return null;
      }

      const statement = {
        id: generateUUID(),
        actor: actor,
        verb: verb,
        object: object || {
          id: activityId,
          objectType: 'Activity'
        },
        timestamp: new Date().toISOString(),
        context: {
          registration: registration,
          extensions: {
            'https://w3id.org/xapi/cmi5/context/extensions/sessionid': sessionId
          }
          // NOTE: Do NOT include cmi5 category for "allowed" statements
          // Including it would mark this as a "defined" statement and trigger validation
        }
      };

      if (result) {
        statement.result = result;
      }

      // Merge contextTemplate if available (parent, grouping) - these ARE allowed
      if (contextTemplate) {
        statement.context.contextActivities = statement.context.contextActivities || {};
        if (contextTemplate.contextActivities?.parent) {
          statement.context.contextActivities.parent = contextTemplate.contextActivities.parent;
        }
        if (contextTemplate.contextActivities?.grouping) {
          statement.context.contextActivities.grouping = contextTemplate.contextActivities.grouping;
        }
      }

      return sendStatement(statement);
    },

    /**
     * Send an "allowed" statement synchronously (for beforeunload).
     * Same as sendStatement but uses sync XHR so it completes before page teardown.
     */
    sendStatementSync(verb, result = null, object = null) {
      if (!initialized || !this.isConnected() || terminated) return null;

      const statement = {
        id: generateUUID(),
        actor: actor,
        verb: verb,
        object: object || { id: activityId, objectType: 'Activity' },
        timestamp: new Date().toISOString(),
        context: {
          registration: registration,
          extensions: {
            'https://w3id.org/xapi/cmi5/context/extensions/sessionid': sessionId
          }
        }
      };

      if (result) statement.result = result;

      if (contextTemplate) {
        statement.context.contextActivities = statement.context.contextActivities || {};
        if (contextTemplate.contextActivities?.parent) {
          statement.context.contextActivities.parent = contextTemplate.contextActivities.parent;
        }
        if (contextTemplate.contextActivities?.grouping) {
          statement.context.contextActivities.grouping = contextTemplate.contextActivities.grouping;
        }
      }

      return sendStatementSync(statement);
    },

    // ==================== DEBUG API ====================

    /**
     * Get all statements sent this session
     */
    getStatementLog() {
      return [...statementLog];
    },

    /**
     * Get current configuration (for debugging)
     */
    getConfig() {
      return {
        initialized,
        terminated,
        connected: this.isConnected(),
        endpoint: endpoint || null,
        activityId: activityId || null,
        registration: registration || null,
        sessionId,
        launchMode,
        masteryScore,
        moveOn,
        hasContextTemplate: !!contextTemplate,
        statementCount: statementLog.length,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        duration: calculateDuration()
      };
    },

    /**
     * Print debug info to console
     */
    debug() {
      console.log('%c=== cmi5 Debug Info ===', 'color: #7C3AED; font-weight: bold; font-size: 14px;');
      console.log('Config:', this.getConfig());
      console.log('Statement Log:', this.getStatementLog());
      console.log('Actor:', actor);
      console.log('LaunchData:', launchData);
      console.log('ContextTemplate:', contextTemplate);
    }
  };
})();

// Backwards compatibility
const Cmi5Wrapper = Cmi5;

// Make Cmi5 accessible globally (helps with iframe debugging)
window.Cmi5 = Cmi5;
window.Cmi5Wrapper = Cmi5Wrapper;

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Cmi5.initialize().then((success) => {
    // Update LRS status indicator in header
    const statusEl = document.getElementById('lrsStatus');
    const statusText = statusEl?.querySelector('.lrs-status-text');

    if (Cmi5.isConnected()) {
      if (statusEl) {
        statusEl.className = 'lrs-status connected';
        if (statusText) statusText.textContent = 'LRS Connected';
        statusEl.title = 'Connected to LRS: ' + (Cmi5.getConfig().endpoint || 'unknown');
      }
    } else {
      if (statusEl) {
        statusEl.className = 'lrs-status standalone';
        if (statusText) statusText.textContent = 'Standalone';
        statusEl.title = 'Running in standalone mode — no LRS connected.';
      }
    }
  }).catch((error) => {
    console.error('[cmi5] Initialization failed:', error);
    const statusEl = document.getElementById('lrsStatus');
    const statusText = statusEl?.querySelector('.lrs-status-text');
    if (statusEl) {
      statusEl.className = 'lrs-status error';
      if (statusText) statusText.textContent = 'LRS Error';
      statusEl.title = 'Failed to connect to LRS: ' + (error.message || 'Unknown error');
    }
  });
});

// Handle page unload - send terminated statement SYNCHRONOUSLY
window.addEventListener('beforeunload', () => {
  if (Cmi5.isInitialized() && !Cmi5.isTerminated() && Cmi5.isConnected()) {
    Cmi5.terminateSync();
  }
});

// Also try on pagehide (more reliable on mobile)
window.addEventListener('pagehide', () => {
  if (Cmi5.isInitialized() && !Cmi5.isTerminated() && Cmi5.isConnected()) {
    Cmi5.terminateSync();
  }
});

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Cmi5;
}
