# NovaPay Platform Launch Training

A fully interactive e-learning course built with HTML, CSS, and JavaScript. It follows the **cmi5** standard, which means it can plug into any compatible Learning Management System (LMS) and report learner progress back automatically.

> **NovaPay is a fictional fintech company.** This course was built as a realistic demo of what a cmi5-compliant training package looks like in practice — content, quizzes, a mini-game, and full xAPI analytics.

**Author:** Kelly Mullaney — [kelly.r.mullaney@gmail.com](mailto:kelly.r.mullaney@gmail.com)
**License:** [MIT](LICENSE)
**Questions?** Feel free to reach out via email. Happy to help with setup, customization, or anything cmi5/xAPI related.

---

## What's Inside

| Module | Topic | Highlights |
|--------|-------|------------|
| 1 | Welcome & Overview | Platform intro + **Feature Invaders** arcade game |
| 2 | Core Payments | Instant Payouts, payout builder demo, accordion deep-dives |
| 3 | Developer Tools | Connect API, Drop-in UI, Webhooks Pro |
| 4 | Security & Compliance | Fraud Shield, Vault & Tokenization, Compliance Hub |
| 5 | Embedded Finance | Embedded Accounts, Global Rails, Revenue Analytics |
| 6 | Platform Operations | Live Ledger, Smart Routing, API Permissions |
| 7 | Final Exam | 10 questions, 75% to pass, 3 attempts max |
| 8 | Completion | Summary screen with certificate |

**22 sections** across 6 learning modules, plus a graded exam and completion screen.

### Interactive Elements

- **Feature Invaders** — A Space Invaders-style mini-game where you learn NovaPay features by blasting them. Combo multipliers, wave progression, and a grade system.
- **Knowledge Checks** — Multiple-choice quizzes at the end of Modules 2, 3, and 4.
- **Drag & Drop** — Hands-on exercises for matching concepts.
- **Hotspots** — Clickable image regions that reveal details.
- **Accordions** — Expandable content sections with smooth CSS transitions.
- **Payout Builder** — An interactive form demo that simulates building a payout flow.

---

## How It Works

This is a **single-page application** — one HTML file with all content. JavaScript handles navigation between sections, tracks progress, and communicates with an LRS (Learning Record Store) when launched from an LMS.

### Key Files

```
course-package/
├── index.html              Main course (all content lives here)
├── cmi5.xml                Course manifest (tells the LMS what this is)
├── CMI5_REPORTING.md       Documentation of all xAPI statements sent
├── css/
│   ├── styles.css          Course styling
│   └── game-styles.css     Feature Invaders game styling
├── js/
│   ├── cmi5-wrapper.js     LRS connection, auth, and xAPI delivery
│   ├── course.js           Navigation, progress, sidebar
│   ├── interactions.js     Quizzes, game, drag-drop, demos
│   └── xapi-tracker.js     Detailed analytics tracking
├── images/                 Course thumbnails and logo
└── audio/                  Feature Invaders soundtrack
```

---

## Running Locally

You can preview the course on your machine without an LMS. You just need a local web server (browsers block some features when opening HTML files directly).

### Option 1: Python (built into macOS and most Linux)

```bash
cd course-package
python3 -m http.server 8888
```

Then open **http://localhost:8888** in your browser.

### Option 2: Node.js

```bash
npx serve course-package -p 8888
```

### Option 3: VS Code

Install the **Live Server** extension, right-click `index.html`, and choose "Open with Live Server."

> When running locally, the header will show **"Standalone"** — that's normal. It just means there's no LMS/LRS connected, so quiz answers and progress won't be recorded externally. Everything else works.

---

## Deploying to an LMS

### Step 1: Grab the zip

A ready-to-upload package is included in the repo:

**[NovaPay-Platform-Launch-Training.zip](NovaPay-Platform-Launch-Training.zip)**

Or build it yourself:

```bash
zip -r NovaPay-Platform-Launch-Training.zip . -x ".*" "__MACOSX/*" "*.zip"
```

### Step 2: Upload to your LMS

This course uses the **cmi5** standard. Upload the zip to any cmi5-compatible platform:

- **SCORM Cloud** — Go to Library > Add Course > choose the zip
- **Skilljar** — Upload as a cmi5 content package
- **Any cmi5-compliant LMS** — Look for "Import Course" or "Add Content"

The LMS reads `cmi5.xml` to understand the course structure, then launches `index.html` with the authentication parameters the course needs to talk to the LRS.

### Step 3: Verify tracking

Once uploaded, launch the course and complete a few sections. Check your LMS reporting for:

- **Time on page** per section
- **Quiz and exam answers** with correct/incorrect status
- **Course completion** (passed/failed based on exam score)

---

## What Gets Tracked

When connected to an LMS, the course sends **xAPI statements** that record learner activity. There are two categories:

### Completion Tracking (required by cmi5)

| Event | When |
|-------|------|
| Initialized | Course opens |
| Completed | Learner clicks "Complete Course" |
| Passed *or* Failed | Based on final exam score (75% threshold) |
| Terminated | Course closes |

### Detailed Analytics (optional, for richer reporting)

| What | Details |
|------|---------|
| Section views | Which pages were visited and for how long |
| Quiz answers | Each answer with correct/incorrect status |
| Exam results | All 10 questions with response details |
| Time on page | Duration per section in seconds |
| Game results | Feature Invaders score and completion |
| Interactions | Drag-drop, hotspot clicks, accordion usage |

See `CMI5_REPORTING.md` for the full technical specification of every xAPI statement.

---

## Exam & Scoring

- The **Final Exam** has 10 multiple-choice questions covering all 6 modules.
- Learners need **75% (8/10)** to pass.
- They get **3 attempts** — the best score is kept.
- The **Completion section is locked** until the exam is passed.
- Only the exam score is reported to the LMS for pass/fail. Knowledge check scores are tracked but don't affect completion.

---

## Useful Console Commands

Open your browser's developer console (F12) to access these helpers:

| Command | What it does |
|---------|-------------|
| `Cmi5.debug()` | Show LRS connection info and statement log |
| `Cmi5.getConfig()` | Show current configuration |
| `Cmi5.getStatementLog()` | List all xAPI statements sent this session |
| `XAPITracker.debug()` | Show tracking state, events, and section analytics |
| `Interactions.resetAllState()` | Reset exam attempts and quiz progress (reload after) |

---

## Tech Stack

- **HTML5 / CSS3 / Vanilla JavaScript** — no frameworks, no build step
- **cmi5 / xAPI** — industry-standard e-learning interoperability
- **Web Audio API** — procedural 8-bit sound effects in the game
- **Responsive design** — works on desktop and mobile
- **Accessible** — semantic HTML, ARIA labels, keyboard navigation, reduced-motion support

---

## Glossary

| Term | Meaning |
|------|---------|
| **cmi5** | An xAPI profile that defines how an LMS launches and tracks e-learning content. Think of it as the modern replacement for SCORM. |
| **xAPI** | Experience API — a specification for tracking learning experiences as "statements" (e.g., "Learner answered Question 3 correctly"). |
| **LMS** | Learning Management System — the platform that hosts and delivers courses to learners (e.g., SCORM Cloud, Skilljar, Moodle). |
| **LRS** | Learning Record Store — the database that stores xAPI statements. Often built into the LMS. |
| **Activity ID** | A unique URL-like identifier for a piece of content (doesn't need to resolve to a real webpage). |
| **Mastery Score** | The minimum score needed to pass (75% for this course). |
| **moveOn** | A cmi5 setting that tells the LMS what "done" means. This course uses `CompletedOrPassed`. |

---

## License

MIT License. See [LICENSE](LICENSE) for details.
