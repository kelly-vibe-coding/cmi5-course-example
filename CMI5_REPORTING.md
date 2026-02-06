# xAPI/cmi5 Reporting Fields

This document describes all xAPI statements and fields sent by the course to the LRS/LMS.

---

## Overview

The course sends **two types of xAPI statements**:

1. **cmi5 Defined Statements** (via `cmi5-wrapper.js`) - Required for LMS completion
2. **Rich Tracking Statements** (via `xapi-tracker.js`) - Detailed analytics

---

## Part 1: cmi5 Defined Statements

These are the **required** cmi5 statements for LMS completion tracking.

| Order | Verb | When Sent |
|-------|------|-----------|
| 1 | `initialized` | On course launch (automatic) |
| 2 | `passed` OR `failed` | When learner clicks "Complete Course" |
| 3 | `terminated` | After pass/fail, or on page close |

### 1. Initialized Statement

```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/initialized" },
  "object": { "id": "<activity-id>" },
  "context": {
    "registration": "<uuid>",
    "extensions": {
      "https://w3id.org/xapi/cmi5/context/extensions/sessionid": "<uuid>"
    },
    "contextActivities": {
      "category": [{ "id": "https://w3id.org/xapi/cmi5/context/categories/cmi5" }]
    }
  }
}
```

### 2. Passed/Failed Statement

```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/passed" },
  "result": {
    "success": true,
    "completion": true,
    "duration": "PT5M30S",
    "score": {
      "scaled": 0.85,
      "raw": 85,
      "min": 0,
      "max": 100
    }
  }
}
```

### 3. Terminated Statement

```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/terminated" },
  "result": {
    "duration": "PT5M45S"
  }
}
```

---

## Part 2: Rich Tracking Statements

These statements provide **detailed analytics** for learning behavior.

### Statement Types

| Verb | Object | When Sent | Data Captured |
|------|--------|-----------|---------------|
| `experienced` | Section/Page | User views a section | Progress % |
| `exited` | Section/Page | User leaves a section | Time spent, cumulative time |
| `played` | Video | Video starts/resumes | Current time |
| `paused` | Video | Video paused | Current time, played segments |
| `seeked` | Video | Video scrubbed | Seek position |
| `completed` | Video | Video finishes | Total watch time |
| `answered` | Question | Quiz/exam answer submitted | Response, correct/incorrect |
| `attempted` | Assessment | Exam started | Attempt number |
| `progressed` | Course | Progress milestones | Progress % |

---

### Section Tracking

**Experienced (entering a section)**
```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/experienced" },
  "object": {
    "id": "https://novapay.dev/training/platform-launch/section/2-1",
    "definition": {
      "type": "http://activitystrea.ms/schema/1.0/page",
      "name": { "en-US": "Introduction to Instant Payouts" }
    }
  },
  "result": {
    "extensions": {
      "https://w3id.org/xapi/cmi5/result/extensions/progress": 0.25
    }
  }
}
```

**Exited (leaving a section)**
```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/exited" },
  "object": {
    "id": "https://novapay.dev/training/platform-launch/section/2-1"
  },
  "result": {
    "duration": "PT2M15S",
    "extensions": {
      "https://novapay.dev/xapi/extensions/cumulative-time": "PT3M45S",
      "https://novapay.dev/xapi/extensions/time-spent-ms": 135000
    }
  }
}
```

---

### Video Tracking

Uses the [Video xAPI Profile](https://w3id.org/xapi/video) verbs.

**Played**
```json
{
  "verb": { "id": "https://w3id.org/xapi/video/verbs/played" },
  "object": {
    "id": "https://novapay.dev/training/platform-launch/video/intro-video",
    "definition": {
      "type": "https://w3id.org/xapi/video/activity-type/video",
      "name": { "en-US": "Introduction Video" }
    }
  },
  "result": {
    "extensions": {
      "https://w3id.org/xapi/video/extensions/time": 0,
      "https://w3id.org/xapi/video/extensions/length": 180
    }
  }
}
```

**Paused**
```json
{
  "verb": { "id": "https://w3id.org/xapi/video/verbs/paused" },
  "result": {
    "extensions": {
      "https://w3id.org/xapi/video/extensions/time": 45.5,
      "https://w3id.org/xapi/video/extensions/played-segments": 45500
    }
  }
}
```

**Completed**
```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/completed" },
  "result": {
    "extensions": {
      "https://w3id.org/xapi/video/extensions/time": 180,
      "https://w3id.org/xapi/video/extensions/progress": 1,
      "https://w3id.org/xapi/video/extensions/played-segments": 172000
    }
  }
}
```

---

### Quiz/Exam Tracking

**Question Answered**
```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/answered" },
  "object": {
    "id": "https://novapay.dev/training/platform-launch/quiz/q-1",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
      "name": { "en-US": "What is the primary benefit of NovaPay's Instant Payouts feature?" },
      "interactionType": "choice",
      "correctResponsesPattern": ["b"]
    }
  },
  "result": {
    "success": true,
    "response": "b",
    "extensions": {
      "https://novapay.dev/xapi/extensions/response-text": "Real-time settlement in seconds instead of days",
      "https://novapay.dev/xapi/extensions/is-exam": false
    }
  }
}
```

**Exam Attempted**
```json
{
  "verb": { "id": "http://adlnet.gov/expapi/verbs/attempted" },
  "object": {
    "id": "https://novapay.dev/training/platform-launch/exam/final-exam",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/assessment",
      "name": { "en-US": "Final Exam" }
    }
  },
  "result": {
    "extensions": {
      "https://novapay.dev/xapi/extensions/attempt-number": 1
    }
  }
}
```

---

## Debugging

### Browser Console

The tracker logs all statements to the console with debug mode enabled:

```
[XAPITracker] Entering section: 2-1
[XAPITracker] Statement sent: experienced
[XAPITracker] Exiting section: 2-1, time spent: 2:15
[XAPITracker] Statement sent: exited
```

### Offline Mode

When not connected to an LRS, statements are stored in `sessionStorage`:

```javascript
// View all captured statements (in browser console)
XAPITracker.getDebugStatements()

// Clear debug statements
XAPITracker.clearDebugStatements()

// View time spent per section
XAPITracker.getSectionTimes()
```

---

## Data Summary

### What's Tracked

| Category | Metrics |
|----------|---------|
| **Course** | Completion, pass/fail, final score, total duration |
| **Sections** | Time spent per section, visit count, navigation path |
| **Videos** | Play/pause events, watch time, completion, seek behavior |
| **Quizzes** | Each answer, correct/incorrect, response text |
| **Exam** | Attempt number, per-question results, best score |
| **Engagement** | Page visibility (tab switches), time on page |

### Custom Extensions

| Extension URI | Description |
|---------------|-------------|
| `novapay.dev/.../cumulative-time` | Total time spent in a section (across visits) |
| `novapay.dev/.../time-spent-ms` | Time in milliseconds (for precision) |
| `novapay.dev/.../response-text` | Human-readable selected answer text |
| `novapay.dev/.../is-exam` | Boolean distinguishing exam from practice |
| `novapay.dev/.../attempt-number` | Which attempt (1, 2, or 3) for exams |

---

## LRS Requirements

For full analytics, you'll need an LRS that:

1. **Receives all statement types** (not just cmi5 defined)
2. **Provides query/reporting tools** for analyzing statements
3. **Supports the Video xAPI Profile** for video analytics

### Recommended LRS Options

| LRS | Free Tier | Notes |
|-----|-----------|-------|
| [SCORM Cloud](https://cloud.scorm.com) | 10 registrations/mo | Easy upload, good UI |
| [Learning Locker](https://learninglocker.net) | Self-hosted | Full featured, open source |
| [Veracity LRS](https://lrs.io) | Yes | Good statement viewer |
| [ADL LRS](https://lrs.adlnet.gov) | Yes | Basic, good for testing |

---

## Skilljar Limitations

Skilljar's cmi5 support captures **completion, score, and pass/fail** but may not display:

- Detailed section timing
- Video analytics
- Individual quiz responses
- Progress milestones

To get full analytics, consider:
1. Connecting an external LRS alongside Skilljar
2. Using Skilljar's API to export completion data
3. Asking Skilljar support about xAPI statement forwarding
