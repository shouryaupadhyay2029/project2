# MASTER PLATFORM AUDIT REPORT

## 1. Executive Summary & Action Plan

This master report aggregates the findings from over 15 individual system audits conducted across the DevStage platform. The backend architecture of DevStage is exceptionally robust, scalable, and performant. However, the platform suffers from a massive disconnect between the backend APIs and the frontend implementation, alongside a few critical security and SEO flaws.

### 🔴 CRITICAL FIXES REQUIRED IMMEDIATELY
1. **JWT & Firebase Backdoor (Security)**: The `authmiddleware.js` file contains a hardcoded fallback (`"firebase_secret_not_jwt_secret"`). This allows any attacker to forge Google Auth tokens and hijack any user account. This must be removed immediately.
2. **Missing Centralized Ban Check (Security)**: Banned users are not blocked at the auth middleware level. They retain access until their JWT expires (up to 30 days) on any route that doesn't manually query their ban status.
3. **PWA Installability (PWA)**: The Progressive Web App cannot be installed because `index.html` is missing the `<link rel="manifest" href="/manifest.json">` tag, and the required icons (`/assets/icon-192.png`) do not exist.

### 🟠 HIGH PRIORITY FRONTEND WIRING (The "Mock Data" Problem)
The most pervasive issue across the platform is that the backend APIs are fully built, but the frontend relies on static HTML or mocked JavaScript arrays.
1. **Feed System**: The UI in `feed.html` uses mock GSAP arrays instead of calling the fully functional `/api/feed` endpoint.
2. **Bookmark System**: The UI bookmark buttons are decorative and do not call `/api/bookmarks`.
3. **Moderation & Analytics**: There are no frontend dashboards for admins to view user reports (`/api/reports`) or project analytics (`/api/analytics`).
4. **Achievement System**: The backend tracking works, but the frontend does not dynamically render unlocked achievements from the database.
5. **Real-time Missing Links**: While sockets are used, notifications in the UI are often static and not wired to the live socket events emitted by the backend.

### 🟡 MEDIUM PRIORITY (SEO & Performance optimizations)
1. **Broken SEO & Social Sharing**: There are absolutely zero Open Graph (`og:`) tags or Structured Data (`ld+json`) schemas. Sharing a project on Twitter/Discord will look blank. Core discovery pages (`/pages/explore.html`, etc.) are missing `<meta name="description">`.
2. **Socket DB Bottlenecks**: High-frequency socket events (like `presence_ping` and typing indicators) trigger synchronous database writes without debouncing, which will throttle the database under heavy load.
3. **Route-level Validation**: While `validation.js` exists, it is not mounted to routes, meaning weak passwords and malformed emails are not blocked at the API layer.

---

## 2. Detailed Audit Reports
*(Appended below are the unedited, full reports for every audited subsystem)*

---


---

# Complete Achievement System Audit Report

This report evaluates the **Achievement System** of the DevStage platform. Verification covered the end-to-end flow from backend controllers, database schemas, criterion check events, caching, and frontend presentation.

---

## 1. Achievement Creation
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The backend has an achievement configurations catalog (`ACHIEVEMENT_CATALOG`) defining 14 achievements with distinct titles, descriptions, and rarities (common, rare, epic, legendary).
  * The `unlockAchievement` controller function correctly instantiates `Achievement` documents in MongoDB with 100% progress and visible flags.
* **Frontend/UI**: **BROKEN**
  * The frontend profile page widget does not fetch or render actual achievements from the database. Instead, it hardcodes a static list of badges (`Full Stack Builder`, `30-Day Streak`, `Early Deployer`, `Team Player`, `Top 1%`) directly in the HTML markup.

### Technical Mapping
* **Files involved:**
  * [achievementController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/achievementController.js) (lines 7-79, 80-120)
  * [Achievement.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Achievement.js)
  * [profile.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/profile.html) (lines 4983-4992)
* **APIs involved:**
  * `GET /api/achievements/me` (Protected)

---

## 2. Progress Tracking
**Status: BROKEN**

### Issues & Root Causes
1. **Uncalled Checking Triggers (Isolated Logic)**:
   * *Root Cause:* The function `checkAndUnlockAchievements` correctly checks and validates multiple criteria (e.g. project count, streak numbers, GitHub project URLs, profile bio length, follow relationships). However, this function is **NEVER CALLED OR IMPORTED** anywhere else in the backend application controllers.
   * *Consequence:* As a result, when a developer updates their profile, creates projects, links GitHub repos, follows other users, or builds a streak, achievements are never tracked or checked. They remain permanently locked unless manually entered in MongoDB.

### Technical Mapping
* **Files involved:**
  * [achievementController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/achievementController.js) (lines 122-169)
  * [projectController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/projectController.js)
  * [userController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/authcontroller.js)

---

## 3. Achievement Unlocking
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The unlock mechanism correctly prevents duplicate unlocks using a composite unique index (`userId` + `type`) on the `Achievement` schema, returning null if already present.
  * Correctly broadcasts real-time updates via Socket.IO using the `achievement_unlocked` event and clears cached results.
* **Frontend/UI**: **BROKEN**
  * Since the frontend profile script (`scripts/profile.js`) fires the custom event `devstage:achievements_loaded` but never subscribes to it or updates the UI with the payload details, the user never sees their unlocked achievements list in their profile.

### Technical Mapping
* **Files involved:**
  * [achievementController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/achievementController.js) (lines 80-120)
  * [profile.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/scripts/profile.js) (lines 344-368)
  * [profile.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/profile.html)

---

## 4. Reward Logic
**Status: MISSING**

### Verification Details
* **Description**: There is no reward logic (such as leveling systems, developer XP points, custom roles, feature permissions, or profiles leveling up) associated with achievements. Achievements represent passive database records without incentives.

### Technical Mapping
* **Files involved:**
  * [Achievement.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Achievement.js)

---

## 5. Persistence
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Unlocked achievements persist successfully inside the MongoDB database. The index structure optimizes lookup querying by `userId` and `unlockedAt`.
* **Frontend/UI**: **BROKEN**
  * The frontend UI does not fetch or reflect actual database records, rendering static HTML badges instead.

### Technical Mapping
* **Files involved:**
  * [Achievement.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Achievement.js) (lines 45-50)

---

## ACHIEVEMENT SUMMARY

### System Metrics
* **Total Components Verified:** 5
* **Fully Working:** 0
* **Partially Working:** 3
* **Broken:** 1 (Progress Tracking checking function is completely uncalled/untriggered)
* **Missing:** 1 (Reward logic is completely absent)

### Audit Overview
* **Achievement Creation:** PARTIALLY WORKING (Backend successfully registers achievement structures; UI displays hardcoded mock badges)
* **Progress Tracking:** BROKEN (No controller triggers `checkAndUnlockAchievements` during project, follow, or profile changes, meaning no stats are evaluated)
* **Achievement Unlocking:** PARTIALLY WORKING (Proper database unique keys, Socket.IO broadcasts, and cache clear; UI script does not subscribe to the load event to render them)
* **Reward Logic:** MISSING (No XP, levels, points, or perks are associated with unlocks)
* **Persistence:** PARTIALLY WORKING (Database saves entities with indexing; UI displays mock content only)


---

# Complete Analytics System Audit Report

This report evaluates the **Analytics System** of the DevStage platform. Verification covered the end-to-end flow from backend controllers, database collections (`ProjectAnalytics`), daily aggregates, caching, CTR logic, and user interface representation.

---

## 1. Event Tracking
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **PARTIALLY WORKING**
  * The backend has support for tracking 5 event types (`impression`, `click`, `open`, `save`, `collaboration`).
  * However, `recordAnalyticsEvent` is **ONLY** ever called for `impression` and `click` from its controllers.
  * The tracking logic for `open`, `save`, and `collaboration` is completely dead code and **never triggered** by corresponding action controllers (e.g., when bookmarking a project or requesting to collaborate).
* **Frontend/UI**: **BROKEN**
  * The frontend code does not make any API POST requests to `/api/analytics/impression/:projectId` or `/api/analytics/click/:projectId`. Behavioral tracking is completely offline.

### Technical Mapping
* **Files involved:**
  * [analyticsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/analyticsController.js) (lines 16-73)
  * [ProjectAnalytics.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/ProjectAnalytics.js)
  * [bookmarkController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/bookmarkController.js)
  * [collaborationController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/collaborationController.js)

---

## 2. User Analytics
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Correctly queries the developer's owned projects, matches daily stats over a 30-day window, and aggregates records into total impressions, clicks, saves, and CTR metric summaries per project.
  * Employs memory caching (`analytics:me:${userId}`) with a TTL of 300 seconds to protect DB aggregate operations.
* **Frontend/UI**: **BROKEN**
  * The frontend profile page does not call the user analytics summary endpoints, resulting in no dashboard visualization of owner metrics.

### Technical Mapping
* **Files involved:**
  * [analyticsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/analyticsController.js) (lines 139-194)
* **APIs involved:**
  * `GET /api/analytics/me` (Protected)
  * `GET /api/projects/analytics-summary/me` (Alias)

---

## 3. Project Analytics
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Provides granular daily logs for a single project.
  * Properly enforces ownership authorization checks: returns 403 Forbidden if a user tries to query metrics for a project they do not own.
  * Caches results under `analytics:project:${projectId}` for 300 seconds.
* **Frontend/UI**: **MISSING**
  * There is no dashboard page or panel on the user interface dedicated to displaying project-specific analytics metrics.

### Technical Mapping
* **Files involved:**
  * [analyticsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/analyticsController.js) (lines 75-137)
* **APIs involved:**
  * `GET /api/analytics/project/:projectId` (Protected)
  * `GET /api/projects/analytics/:projectId` (Alias)

---

## 4. Dashboard Metrics
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The Click-Through Rate (CTR) is calculated properly on the backend: `(clicks / impressions * 100).toFixed(1)` when impressions > 0, defaulting to `"0.0"` otherwise.
  * Processes totals for clicks, impressions, opens, and saves successfully.
* **Frontend/UI**: **MISSING**
  * No visual interface elements or metrics components exist on the frontend to present CTRs or totals to the user.

### Technical Mapping
* **Files involved:**
  * [analyticsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/analyticsController.js) (lines 180-186)

---

## 5. Aggregation Logic
**Status: WORKING**

### Verification Details
* **Description**: The database aggregation queries function perfectly.
  * Uses Mongoose `$group` with `$sum` accumulator operators to process multi-day analytics entries.
  * Unique visitor tracking hashes the client IP + User Agent (`crypto.createHash("md5")`) and inserts it via `$addToSet` in a daily array.
  * Summarizes unique visitors over 30 days correctly in memory using `Set` flatMap deduplication.

### Technical Mapping
* **Files involved:**
  * [analyticsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/analyticsController.js) (lines 11-15, 102-127)

---

## ANALYTICS SUMMARY

### System Metrics
* **Total Components Verified:** 5
* **Fully Working:** 1
* **Partially Working:** 4
* **Broken:** 0
* **Missing:** 0

### Audit Overview
* **Event Tracking:** PARTIALLY WORKING (Impression and click events are written to database; open, save, and collaboration triggers are unused dead logic; UI does not generate tracking hits)
* **User Analytics:** PARTIALLY WORKING (Backend fetches user projects and sums engagement records with cache guards; UI does not retrieve or display summary)
* **Project Analytics:** PARTIALLY WORKING (Backend retrieves daily stats and locks queries to project owner; UI contains no metrics dashboard)
* **Dashboard Metrics:** PARTIALLY WORKING (Backend calculates CTR and sum matrices cleanly; frontend presentation layer is missing)
* **Aggregation Logic:** WORKING (Robust MD5 IP+UA hashing, Mongoose aggregate `$group` pipelines, and unique visitor collections operate correctly)


---

# Complete Audit Log System Audit Report

This report evaluates the **Audit Log System** of the DevStage platform. Verification covered the end-to-end flow from backend controllers, database collections (`AuditLog`), enums, query filters, safety scrubs, and frontend views.

---

## 1. Activity Logging
**Status: BROKEN**

### Issues & Root Causes
1. **Absent Controller Triggers**:
   * *Root Cause:* The helper function `createAuditLog` is defined in `auditController.js`, but it is **NEVER imported or called** in any of the system activity controllers (such as project creation, collaboration requests, bookmark additions, workspace management, or role updates).
   * *Consequence:* Activities like `project_create`, `project_update`, `project_delete`, `bookmark_add`, `member_add`, or `workspace_create` are never recorded in the audit log collection.

### Technical Mapping
* **Files involved:**
  * [auditController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/auditController.js) (lines 3-22)
  * [ProjectAnalytics.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/ProjectAnalytics.js)
  * [projectController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/projectController.js)
  * [collaborationController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/collaborationController.js)
  * [bookmarkController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/bookmarkController.js)

---

## 2. Security Logging
**Status: BROKEN**

### Issues & Root Causes
1. **Unmonitored Security Events**:
   * *Root Cause:* Critical authentication and profile mutation endpoints (such as user registration, logins, logouts, passwords modifications, or settings updates) do not invoke `createAuditLog`.
   * *Consequence:* The enums `auth_register`, `auth_login`, `auth_logout`, `password_change`, and `settings_update` remain entirely unused. Security monitoring is offline.

### Technical Mapping
* **Files involved:**
  * [auditController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/auditController.js)
  * [authcontroller.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/authcontroller.js)
  * [settingsController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/settingsController.js)

---

## 3. Audit Events
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **PARTIALLY WORKING**
  * The `AuditLog` schema defines 26 different enum actions to classify activity and security logs.
  * However, out of these 26 actions, **only one** (`report_create` inside `reportController.js`) is actually invoked and tracked in the application.
  * The remaining 25 actions are dead logic in the enums list.

### Technical Mapping
* **Files involved:**
  * [AuditLog.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/AuditLog.js) (lines 11-27)
  * [reportController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/reportController.js) (lines 47-51)

---

## 4. Log Retrieval
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The log retrieval endpoint `GET /api/audit/me` query executes correctly.
  * Automatically sorts results in reverse chronological order (`createdAt: -1`).
  * Enforces database security scrubbing: strips out the sensitive `actorIp` and `userAgent` properties from user-facing logs before returning response payloads.
* **Frontend/UI**: **BROKEN**
  * The user profile page contains a "System Log" console panel showing hardcoded static messages (e.g. `✓ SignalOS v2.1.0 — deployment successful (23s)`). It does not pull or display live data from the backend retrieval API.

### Technical Mapping
* **Files involved:**
  * [auditController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/auditController.js) (lines 24-38)
  * [profile.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/profile.html) (lines 4637-4675)
* **APIs involved:**
  * `GET /api/audit/me` (Protected)

---

## AUDIT LOG SUMMARY

### System Metrics
* **Total Components Verified:** 4
* **Fully Working:** 0
* **Partially Working:** 2
* **Broken:** 2 (Activity Logging and Security Logging are completely unlogged due to missing triggers)
* **Missing:** 0

### Audit Overview
* **Activity Logging:** BROKEN (Actions like project creation, workspace management, and bookmark changes are never logged due to missing controller triggers)
* **Security Logging:** BROKEN (Crucial actions like registration, logins, logout, and settings changes are never logged due to missing controller triggers)
* **Audit Events:** PARTIALLY WORKING (Only 1 of 26 defined enum actions is actually logged in the controllers; the other 25 are dead values)
* **Log Retrieval:** PARTIALLY WORKING (Backend API correctly queries, sorts, and scrubs sensitive IP/UA fields; UI lists hardcoded mock logs only)


---

# DevStage — Complete Authentication System Audit

> **Audit Date:** 2026-06-20  
> **Auditor:** Antigravity (Static + Execution-Trace Analysis)  
> **Scope:** Full auth stack — frontend (`scripts/auth.js`, `scripts/authGuard.js`) → backend (`routes/authroutes.js`, `middleware/auth.js`, `middleware/authmiddleware.js`, `api/authcontroller.js`, `utils/jwtTokens.js`, `utils/firebaseTokens.js`) → model (`models/user.js`)

---

## 1. SIGNUP

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `POST /api/auth/register` (`routes/authroutes.js:13`)  
- **Handler:** `registerUser` (`api/authcontroller.js:63`)  
- **Flow:**  
  1. Validates `username`, `email`, `password` are present  
  2. Checks for existing email (does **not** check duplicate username here)  
  3. Hashes password with `bcrypt.genSalt(10)` + `bcrypt.hash()`  
  4. Creates user with `User.create()`  
  5. Signs a **30d JWT** (`signAuthToken({ id: user._id }, { expiresIn: "30d" })`)  
  6. Returns `{ success, token, user }`  

### Frontend — BROKEN (dead-code path)
- **File:** `scripts/auth.js:1414–1458`  
- `registerForm` listener binds to `#registerForm` (only exists in `pages/register.html`)  
- `register.html` is a **bare skeleton** (no styling, no validation, no error handling) — 3 raw inputs and a button  
- On success it redirects to `../pages/dashboard.html` which **does not exist** in the project  
- The main UI modal (`#auth-card` / `#auth-form`) uses **mock/local storage only** — it never calls the backend register API  
- Password stored **plaintext** in `localStorage.devstageMockAccount` during mock signup

### Root Causes
- `pages/register.html` is a throwaway stub, not the real registration UI  
- The real auth modal (`#auth-form`) is wired to a mock-only code path (lines 1139–1235) and never calls `POST /api/auth/register`  
- Redirect target `dashboard.html` is missing

---

## 2. LOGIN

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `POST /api/auth/login` (`routes/authroutes.js:14`)  
- **Handler:** `loginUser` (`api/authcontroller.js:135`)  
- **Flow:**  
  1. Finds user by email  
  2. `bcrypt.compare(password, user.password)`  
  3. Signs a **7d JWT** (`signAuthToken({ id: user._id }, { expiresIn: "7d" })`)  
  4. Updates `isOnline = true`, `lastSeen`, saves  
  5. Returns `{ success, message, token, user }`  

### Frontend — BROKEN (split personalities)
- **`pages/login.html` path** (`scripts/auth.js:1460–1512`): Calls `POST /api/auth/login` correctly, stores token, redirects to `../pages/profile.html` ✓  
- **Main modal `#auth-form`** (`scripts/auth.js:1139–1235`): **NEVER calls the backend.** It reads `devstageMockAccount` from localStorage and uses `completeMockAuth()` — a completely local mock session with `uid: mock-...`  
- Two completely separate login code paths exist; only the stub `login.html` path reaches the real backend  

### Root Causes
- The main app modal submit handler was never wired to the real `POST /api/auth/login`  
- Mock session falls through even when a real backend is running

---

## 3. LOGOUT

**Status: ✓ WORKING**

- **File:** `scripts/auth.js:1319–1337`  
- **Flow:**  
  1. Calls `presenceRequest("offline")` (best-effort)  
  2. `clearAuthSession()` — wipes all 10 localStorage keys  
  3. `signOut(auth)` — signs out of Firebase  
  4. Redirects to `index.html`  
- Dispatches `devstage:auth_changed` event for reactive UI  
- Handles errors gracefully in `finally`  

### Minor Issue
- No backend `/api/auth/logout` endpoint exists. No server-side token invalidation or blocklist. JWTs remain valid until expiry (7d or 30d) after logout.

---

## 4. JWT GENERATION

**Status: ✓ WORKING**

- **File:** `backend/utils/jwtTokens.js:14–19`  
- `signAuthToken(payload, options)` calls `jwt.sign(payload, getJwtSecret(), { algorithm: "HS256", expiresIn: "7d", ...options })`  
- Secret is read from `process.env.JWT_SECRET` — confirmed present in `.env` as `shourya_PlaceProProject`  
- Registration uses `expiresIn: "30d"`, login uses `"7d"` (discrepancy but not a bug)  
- Google login generates token with `{ id, provider: "google" }` payload  

### Minor Issue
- Secret is **weak** (short, human-readable). Acceptable for development, not for production.

---

## 5. JWT VALIDATION

**Status: ✓ WORKING**

- **File:** `backend/utils/jwtTokens.js:22–26`  
- `verifyAuthToken(token)` calls `jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] })`  
- Algorithm is explicitly pinned — no algorithm confusion attacks possible  
- Used in both `auth.js:protect` and `authmiddleware.js:authMiddleware`  
- Throws on invalid/expired tokens — caught and passed to Firebase fallback  

---

## 6. JWT REFRESH

**Status: ✗ BROKEN**

### Backend
- **No `/api/auth/refresh` endpoint exists**  
- `/api/auth/me` is called by the test as a "refresh" (step 3 in `test_auth_persistence.js`) but it only returns the current user — it does **not** issue a new token  

### Frontend
- `refreshBackendTokenFromFirebase()` (`scripts/auth.js:124–131`) handles refresh only for **Google/Firebase users** by re-exchanging the Firebase token for a backend JWT  
- For **local (email/password) users**, there is **no token refresh mechanism** at all  
- When a 7d JWT expires for a local user, they will get 401 on all protected routes with no recovery path except re-login  

### Root Cause
- Token refresh was not implemented for the local auth flow. The `/api/auth/me` endpoint was repurposed as a "verify me" but issues no new token.

---

## 7. FIREBASE AUTHENTICATION

**Status: ✓ WORKING**

- **Files:** `scripts/auth.js:1–28` (client SDK), `backend/utils/firebaseTokens.js` (server verification)  
- Firebase project: `devstage-872b1` (confirmed in both `scripts/auth.js:17–24` and `scripts/firebase-config.js:4–11`)  
- **Note:** Two Firebase initialization strategies co-exist:
  - `scripts/auth.js`: Uses **ES Module SDK v10.12.2** from gstatic CDN ✓  
  - `scripts/firebase-config.js`: Uses **legacy compat SDK** (`firebase.apps`, `firebase.firestore()`) — this is the old v8 style and will **conflict** if both are loaded on the same page  
- Backend `verifyFirebaseIdToken()`: fetches Google's public X.509 certs, caches them (respecting `cache-control`), verifies RS256 signature, checks `audience` and `issuer` against project ID ✓  
- `onAuthStateChanged` listener (`scripts/auth.js:904`) automatically exchanges Firebase token for backend JWT on every auth state change ✓  

### Root Cause of Conflict
- `scripts/firebase-config.js` must **not** be loaded on pages that also load `scripts/auth.js` — they both initialize Firebase with different SDK generations, causing double-init or `firebase is not defined` errors.

---

## 8. GOOGLE AUTHENTICATION

**Status: ✓ WORKING**

- **Route:** `POST /api/auth/google` (`routes/authroutes.js:15`)  
- **Handler:** `googleLogin` (`api/authcontroller.js:187`)  
- **Frontend trigger:** `window.loginWithGoogle()` (`scripts/auth.js:989–1030`)  
- **Flow:**  
  1. `signInWithPopup(auth, GoogleAuthProvider)` → Firebase ID token  
  2. Frontend calls `exchangeGoogleToken(firebaseToken)` → `POST /api/auth/google`  
  3. Backend verifies Firebase token via `verifyFirebaseIdToken()`  
  4. Upserts user in MongoDB (creates if new, updates `isOnline`/`lastSeen` if existing)  
  5. Issues backend JWT `{ id, provider: "google" }` (7d)  
  6. Frontend caches session, syncs navbar, calls `saveUserToFirestore()`  
  7. Redirects to `profile.html`  
- `onAuthStateChanged` also fires and re-runs the exchange independently (potential double-exchange race, see root cause)  

### Minor Issue
- `onAuthStateChanged` and `loginWithGoogle()` both call `exchangeGoogleToken()` simultaneously after a Google sign-in. This causes two `POST /api/auth/google` calls in quick succession — harmless but wasteful.

---

## 9. SESSION PERSISTENCE

**Status: ⚠ PARTIALLY WORKING**

### Working
- Token stored in two locations: `localStorage.token` AND `localStorage.devstage_auth` (JSON)  
- User object stored in `localStorage.user`, `localStorage.currentUser`, `localStorage.devstage_user_cache`, `localStorage.devstageUser`  
- `getStoredToken()` checks both locations with fallback  
- `cacheAuthSession()` writes all keys atomically  
- `clearAuthSession()` wipes all 10 keys  

### Broken
- **Four different representations** of the user are stored simultaneously (`user`, `currentUser`, `devstage_user_cache`, `devstageUser`) with **different schemas** — `devstageUser` has `displayName/uid/photoURL`; `user` has the raw backend shape. They can drift out of sync.
- **Mock sessions** (`uid: mock-...`) are treated as valid auth by `authGuard.js` — a user who clicked "Demo Login" passes the protected route guard  
- `localStorage.isLoggedIn` is never validated against the actual token — it can be `"true"` with an expired token  

---

## 10. AUTO LOGIN

**Status: ⚠ PARTIALLY WORKING**

- **File:** `scripts/auth.js:749–862` (`checkAuth()`)  
- On page load, `checkAuth()` runs for protected pages  
- **If Firebase session:** defers to `onAuthStateChanged` — correct ✓  
- **If mock session:** accepts without backend verification — ✗  
- **If backend JWT session:** calls `GET /api/auth/me` with stored token; on success, re-caches user data ✓  
- **If no session:** redirects to homepage ✓  

### Root Cause
- Mock sessions bypass all backend verification — someone can forge a `devstageUser` in localStorage with `uid: "mock-anything"` and gain access to all protected pages  

---

## 11. PROTECTED ROUTES (Backend)

**Status: ✓ WORKING**

- `PUT /api/users/update-profile` → uses `protect` middleware ✓  
- `PUT /api/users/platform-settings` → uses `protect` middleware ✓  
- `PUT /api/users/privacy-settings` → uses `protect` middleware ✓  
- `DELETE /api/users/delete-account` → uses `protect` middleware ✓  
- `GET /api/auth/me` → uses `authMiddleware` ✓  
- `PUT /api/auth/update` → uses `authMiddleware` ✓  
- All other routes in `followRoutes`, `notificationRoutes`, `messageRoutes`, etc. mount their own middleware internally  

### Issue — Middleware Duplication
- `middleware/auth.js` exports `protect`  
- `middleware/authmiddleware.js` exports `authMiddleware`  
- **They are byte-for-byte identical in logic** — same Firebase fallback, same user-creation logic, same `req.user` shape  
- `userRoutes.js` imports `protect` from `auth.js`; `authroutes.js` imports `authMiddleware` from `authmiddleware.js`; `server.js` imports both  
- **Root Cause:** Code was duplicated instead of shared. Any bug fix must be applied to both files.

---

## 12. AUTH MIDDLEWARE

**Status: ⚠ PARTIALLY WORKING**

### Working
- Bearer token extraction via regex ✓  
- JWT verification with `verifyAuthToken()` ✓  
- Firebase fallback with `verifyFirebaseIdToken()` ✓  
- Test/emulation fallback via `jwt.verify(token, "firebase_secret_not_jwt_secret")` ✓  
- Auto user-creation for new Google users ✓  
- Sets `req.user.isGoogleUser` flag ✓  

### Critical Issue — Test Secret in Production Code
- **File:** `middleware/auth.js:38`, `middleware/authmiddleware.js:39`  
- `jwt.verify(token, "firebase_secret_not_jwt_secret")` is hardcoded into **production middleware**  
- Anyone who discovers this string can forge an arbitrary Firebase identity token:  
  ```js
  jwt.sign({ email: "admin@any.com", name: "Attacker" }, "firebase_secret_not_jwt_secret")
  ```
  and gain authenticated access to **any** protected route, including profile update and account deletion  
- **This is a security vulnerability (auth bypass)**

### Minor Issue
- `const jwt = require("jsonwebtoken")` is required inside the middleware function body on every request call — should be at the module top level for performance

---

## 13. USER CREATION

**Status: ✓ WORKING**

### Email/Password Registration
- `User.create({ username, email, password: hashedPassword, isOnline: true, lastSeen })` ✓  
- `username` field is `unique: true, sparse: true` in schema ✓  
- `email` is `required: true, unique: true` ✓  
- No email format validation on the backend (relies on frontend only)  

### Google User Auto-Creation
- Triggered in: `authcontroller.js:googleLogin`, `auth.js:protect`, `authmiddleware.js:authMiddleware` (three separate places)  
- Uses `createUniqueGoogleUsername()` with 10-attempt loop + timestamp fallback ✓  
- Google users stored with `password: "google_auth_placeholder_password"` — plaintext, not hashed  
  - **Root Cause:** This placeholder is never used for authentication, but if schema validation runs `bcrypt` pre-save hooks (none exist here), or if a future hook is added, this will break

---

## 14. USER SYNC

**Status: ⚠ PARTIALLY WORKING**

### Backend → Frontend Sync
- `GET /api/auth/me` returns full user object ✓  
- `cacheAuthSession(token, user, provider)` stores to 3 localStorage keys ✓  
- `syncNavbarUser(user)` updates avatar, name, email in navbar DOM ✓  

### Issues
- `devstageUser` schema differs from `user` schema (field names differ: `displayName` vs `username`, `uid` vs `id`)  
- After Google login, `onAuthStateChanged` syncs `devstageUser` using Firebase's `user.displayName` but profile.html `injectProfileUI` uses `user.username` — so the sidebar may show the Firebase display name instead of the MongoDB username  
- `saveUserToFirestore()` (`scripts/auth.js:1032`) writes to Firestore `users` collection — **separate** from MongoDB — creating a second source of truth that is never read back  

---

## 15. TOKEN STORAGE

**Status: ⚠ PARTIALLY WORKING**

### Working
- Token stored in `localStorage.token` (primary) and `localStorage.devstage_auth` (secondary JSON)  
- `getStoredToken()` checks both with fallback  

### Issues
- **localStorage only** — tokens survive page refresh but are accessible to any JS on the page (XSS attack surface)  
- No `httpOnly` cookie option implemented  
- Token expiry is never checked client-side before use — expired tokens are sent and rejected by the server, causing 401 errors with no pre-emptive refresh  
- `isBackendJwt()` checks `header.alg === "HS256"` — if a Firebase token happens to have this header (it uses RS256, so it won't), the check would incorrectly accept it; logic is correct but fragile  

---

## 16. TOKEN RETRIEVAL

**Status: ✓ WORKING**

- `getValidBackendToken()` (`scripts/auth.js:154`):  
  1. Reads `getStoredToken()` (checks `localStorage.token` then `devstage_auth`)  
  2. If token is a backend JWT (`isBackendJwt` checks `alg === HS256`), returns it directly  
  3. Otherwise, attempts `refreshBackendTokenFromFirebase()` (Firebase-only)  
- `devstageApi()` calls `getValidBackendToken()` before every request ✓  
- All manual `fetch()` calls throughout `auth.js` also call `getValidBackendToken()` ✓  

### Issue
- For local (email/password) users, if the stored token is NOT HS256 (e.g., a stale Firebase token), `refreshBackendTokenFromFirebase()` is attempted — which requires a live Firebase session. If Firebase is not active, the token retrieval silently returns `""` and the API call proceeds with no `Authorization` header, getting a 401.

---

## 17. AUTHORIZATION HEADERS

**Status: ✓ WORKING**

- `devstageApi()` (`scripts/auth.js:174`): sets `Authorization: Bearer ${token}` if token is truthy ✓  
- `presenceRequest()` (`scripts/auth.js:205`): sets `Authorization: Bearer ${token}` ✓  
- `loadNotifications()` (`scripts/auth.js:280`): sets `Authorization: Bearer ${token}` ✓  
- `checkAuth()` call to `/api/auth/me` (`scripts/auth.js:812`): sets `Authorization: Bearer ${token}` ✓  
- Backend `extractBearerToken()` regex: `/^Bearer\s+(.+)$/i` — case-insensitive, trims whitespace ✓  
- `server.js` CORS: `allowedHeaders: ["Content-Type", "Authorization"]` ✓  

---

## 18. ROLE CHECKS

**Status: ✗ MISSING**

- The `User` model has **no `role` field** (no `admin`, `moderator`, `user` enum)  
- `isBanned` field exists and is checked on public profile lookup  
- `warningCount` and `reportCount` exist for moderation data  
- **No middleware performs any role-based access control (RBAC)**  
- **No admin routes exist** with privileged access  
- The `req.user` object set by both middleware files contains only `{ id, email, provider }` — no role  
- `req.user.isGoogleUser` is set as a provider flag but is never used to gate any route  

### Root Cause
- RBAC was never implemented. The schema and middleware both need to be extended.

---

## EXECUTION TRACE SUMMARY

### Successful Backend Flow (Verified via test_auth_persistence.js)
```
POST /api/auth/register
  → authcontroller.js:registerUser
  → User.create() → MongoDB write
  → signAuthToken({ id }) → JWT (30d)
  ← { success: true, token, user }

POST /api/auth/login
  → authcontroller.js:loginUser
  → User.findOne({ email })
  → bcrypt.compare()
  → signAuthToken({ id }) → JWT (7d)
  → user.save() (isOnline, lastSeen)
  ← { success: true, token, user }

GET /api/auth/me [Bearer JWT]
  → authmiddleware.js:authMiddleware
  → verifyAuthToken(token) → decoded { id }
  → req.user = { id, isGoogleUser: false }
  → User.findById(req.user.id).select("-password")
  ← { success: true, user }

PUT /api/users/update-profile [Bearer JWT]
  → auth.js:protect (identical to authMiddleware)
  → verifyAuthToken() → req.user.id
  → User.findById(id) → update fields → save()
  ← { success: true, user }
```

### Security Vulnerability Trace (Auth Bypass)
```
ANY request with:
  Authorization: Bearer <jwt.sign({email:"x@x.com"}, "firebase_secret_not_jwt_secret")>

  → middleware:verifyAuthToken() → FAILS (wrong secret)
  → catch → try jwt.verify(token, "firebase_secret_not_jwt_secret") → PASSES
  → User.findOne({ email: "x@x.com" }) or User.create(...)
  → req.user = { id: <any>, provider: "google" }
  → next() → AUTHORIZED ACCESS TO ALL PROTECTED ROUTES
```

---

## AUTH SYSTEM SUMMARY

| Feature | Status | Severity |
|---|---|---|
| Signup (Backend) | ✓ Working | — |
| Signup (Frontend modal) | ✗ Broken | High — real backend never called |
| Login (Backend) | ✓ Working | — |
| Login (Frontend modal) | ✗ Broken | High — mock-only, never hits backend |
| Logout | ✓ Working | — |
| JWT Generation | ✓ Working | — |
| JWT Validation | ✓ Working | — |
| JWT Refresh | ✗ Broken | High — no refresh endpoint, no local-user recovery |
| Firebase Authentication | ✓ Working | — |
| Google Authentication | ✓ Working | — |
| Session Persistence | ⚠ Partial | Medium — 4 diverging storage schemas |
| Auto Login | ⚠ Partial | Medium — mock sessions bypass backend |
| Protected Routes (Backend) | ✓ Working | — |
| Auth Middleware | ⚠ Partial | **Critical — hardcoded bypass secret** |
| User Creation | ✓ Working | — |
| User Sync | ⚠ Partial | Medium — dual DB (MongoDB + Firestore) drift |
| Token Storage | ⚠ Partial | Medium — localStorage only, no httpOnly |
| Token Retrieval | ✓ Working | — |
| Authorization Headers | ✓ Working | — |
| Role Checks | ✗ Missing | High — no RBAC implemented |

---

### ✓ Working (8)
Logout, JWT Generation, JWT Validation, Firebase Authentication, Google Authentication, Protected Routes (Backend), User Creation, Token Retrieval, Authorization Headers

### ⚠ Partial (5)
Session Persistence, Auto Login, Auth Middleware (bypass secret!), User Sync, Token Storage

### ✗ Broken / Missing (5)
- **Signup Frontend** — modal never calls real backend  
- **Login Frontend** — modal is mock-only  
- **JWT Refresh** — no `/api/auth/refresh`, no recovery for expired local tokens  
- **Auth Middleware Security** — `"firebase_secret_not_jwt_secret"` hardcoded in production, enables full auth bypass  
- **Role Checks** — RBAC completely absent from schema and middleware  


---

# Complete Bookmark System Audit Report

This report evaluates the **Bookmark System** of the DevStage platform. Verification covered the end-to-end flow from backend controllers, database storage schemas, socket emission, caching operations, and user interface representation.

---

## 1. Save Bookmark
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The backend api validates the resource ID (project or profile) and performs an atomic `$addToSet` update on the user model, avoiding duplicate additions.
  * Correctly handles errors and returns the updated count.
  * Automatically attempts to emit a Socket.IO event (`bookmark_updated`) to notify the client in real-time.
* **Frontend/UI**: **BROKEN**
  * The frontend user interface (e.g. `pages/feed.html`) performs bookmark saving in `localStorage` under the key `devstage_saved_ids`. It does not call the backend POST routes.

### Technical Mapping
* **Files involved:**
  * [bookmarkController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/bookmarkController.js) (lines 12-48, 103-131)
  * [user.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/user.js)
  * [feed.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/feed.html) (lines 1745-1767)
* **APIs involved:**
  * `POST /api/bookmarks/project/:id` (Protected)
  * `POST /api/bookmarks/profile/:id` (Protected)

---

## 2. Remove Bookmark
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * The backend api validates the resource ID and performs an atomic `$pull` update on the user's `savedProjects` or `savedProfiles` array.
  * Emits Socket.IO event for real-time synchronization.
* **Frontend/UI**: **BROKEN**
  * Removing a bookmark in the UI only pulls from `localStorage` (`devstage_saved_ids`). It does not invoke the backend DELETE routes.

### Technical Mapping
* **Files involved:**
  * [bookmarkController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/bookmarkController.js) (lines 50-78, 133-156)
  * [user.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/user.js)
  * [feed.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/feed.html) (lines 1745-1767)
* **APIs involved:**
  * `DELETE /api/bookmarks/project/:id` (Protected)
  * `DELETE /api/bookmarks/profile/:id` (Protected)

---

## 3. Retrieve Bookmarks
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Resolves user bookmark list properly.
  * In `getSavedProjects`, fetches project records matching the ID list and populates owner profiles.
  * In `getSavedProfiles`, fetches active user records matching the ID list.
  * Status API (`GET /api/bookmarks/status`) successfully maps counts and boolean saving flags.
* **Frontend/UI**: **BROKEN**
  * The frontend feed does not load existing bookmarks from the backend. Instead, cards render with static saved counts from mock arrays.

### Technical Mapping
* **Files involved:**
  * [bookmarkController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/bookmarkController.js) (lines 79-99, 157-195)
* **APIs involved:**
  * `GET /api/bookmarks/projects` (Protected)
  * `GET /api/bookmarks/profiles` (Protected)
  * `GET /api/bookmarks/status` (Protected)

---

## 4. Bookmark Persistence
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * MongoDB correctly stores bookmark arrays under the user's `savedProjects` and `savedProfiles` collections. The schema has robust indexing on `savedProjects: 1` and `savedProfiles: 1` to accelerate joins.
* **Frontend/UI**: **PARTIALLY WORKING**
  * The UI relies entirely on local storage persistence. Bookmarks do not persist across logins on different devices/browsers and will clear if cache is cleaned.

### Technical Mapping
* **Files involved:**
  * [user.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/user.js) (lines 343-356, 406-407)
  * [feed.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/feed.html) (lines 1745-1767)

---

## 5. Cache System Analysis
* **Redundant Deletions**:
  * In the controller, actions invoke `delCache("bookmarks:projects:...")` and `delCache("bookmarks:profiles:...")`.
  * However, `getSavedProjects` and `getSavedProfiles` contain no caching logic (they retrieve directly from MongoDB every time). Thus, these cache deletion commands do nothing, making the caching logic for bookmarks redundant.

---

## BOOKMARK SUMMARY

### System Metrics
* **Total Components Verified:** 4
* **Fully Working:** 0
* **Partially Working:** 4
* **Broken:** 0
* **Missing:** 0

### Audit Overview
* **Save Bookmark:** PARTIALLY WORKING (Backend API and DB persists via atomic `$addToSet`; UI relies on mock logic in `localStorage`)
* **Remove Bookmark:** PARTIALLY WORKING (Backend API and DB removes via atomic `$pull`; UI updates only local arrays)
* **Retrieve Bookmarks:** PARTIALLY WORKING (Backend successfully gathers saved items and populates details; UI ignores backend APIs)
* **Bookmark Persistence:** PARTIALLY WORKING (Proper MongoDB schema storage; frontend loses bookmarks across environments due to `localStorage` reliance)


---

# Complete Feed System Audit Report

This report evaluates the **Feed and Trending System** of the DevStage platform. Verification covered the end-to-end flow from backend controller queries, cache stores, ranking/trending calculations, database schema mapping, and frontend consumption.

---

## 1. Feed Generation
**Status: WORKING**

### Verification Details
* The backend generates feed items by executing parallel queries across four different sources:
  1. Recent projects from followed users.
  2. Recommended projects matching the current user's profile skills, tech stack, and developer tags.
  3. Public activities of followed users.
  4. Visible achievements unlocked by followed users.
* Parallel fetches are correctly implemented using `Promise.all` for performance optimization.
* If a user doesn't follow anyone, the queries return gracefully with empty arrays instead of crashing.

### Technical Mapping
* **Files involved:**
  * [feedController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/feedController.js) (lines 43-94)
  * [Project.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Project.js)
  * [Activity.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Activity.js)
  * [Achievement.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Achievement.js)
* **APIs involved:**
  * `GET /api/feed/me` (Protected)

---

## 2. Feed Retrieval
**Status: PARTIALLY WORKING**

### Issues & Root Causes
1. **Severe In-Memory Pagination Cap**:
   * *Root Cause:* The backend queries themselves are limited via database `.limit()` (20 projects, 10 trending, 15 activities, 10 achievements). These records are combined and then sliced in-memory based on requested `page` and `limit`.
   * *Consequence:* The total feed size is capped at 55 items *globally*. Page 3 or 4 of a user's feed will return empty, and the user can never scroll further back in history even if the database has thousands of matching projects.
2. **Regex Query Performance Overhead**:
   * *Root Cause:* The query for recommended projects matches user skills/tags using dynamic arrays of regular expressions (`techStack: { $in: userSkills.map(s => new RegExp(s, "i")) }`).
   * *Consequence:* Regex-based array matching skips index optimization and triggers expensive database scans as the database scales.

### Technical Mapping
* **Files involved:**
  * [feedController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/feedController.js) (lines 19-35, 104-121)
* **APIs involved:**
  * `GET /api/feed/me` (Protected)

---

## 3. Trending Engine
**Status: PARTIALLY WORKING**

### Issues & Root Causes
1. **Saves Field Database Schema Discrepancy**:
   * *Root Cause:* The project trending scoring formula relies on a `saves` metric weight: `(project.saves || 0) * 5`. However, the Mongoose `Project` schema has no `saves` field defined. The `saves` field is only recorded inside the `ProjectAnalytics` schema and is never synced back.
   * *Consequence:* `project.saves` evaluates to `undefined`, defaulting to `0`. Consequently, bookmark/save actions are ignored during trending score calculations.
2. **Time-Decay Formula Fallback**:
   * The actual decay calculation (`rawScore / Math.pow(hoursAge + 2, 1.5)`) functions correctly and ranks projects with high engagement relative to their age higher.

### Technical Mapping
* **Files involved:**
  * [trendingController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/trendingController.js) (lines 10-21)
  * [Project.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Project.js)
  * [ProjectAnalytics.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/ProjectAnalytics.js)
* **APIs involved:**
  * `GET /api/trending/projects` (Public)
  * `GET /api/trending/users` (Public)

---

## 4. Ranking Logic
**Status: PARTIALLY WORKING**

### Issues & Root Causes
1. **Weighted Base Scores**:
   * Followed projects get a base score of `100`, recommended projects get `50`, followed achievements get `40`, and activities get `30`. This prioritization hierarchy works properly.
2. **Incomplete Engagement Ranking**:
   * *Root Cause:* Since project trending scores exclude the `saves` component (always resolving to `0` due to schema discrepancy), the sorting of projects is not fully reflective of total user bookmarks.

### Technical Mapping
* **Files involved:**
  * [feedController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/feedController.js) (lines 97-106)
  * [trendingController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/trendingController.js) (lines 10-21)

---

## 5. Feed Updates
**Status: PARTIALLY WORKING**

### Issues & Root Causes
1. **Stale Cache (Lack of Invalidation Triggers)**:
   * *Root Cause:* The page 1 feed response is cached for 120 seconds (`feed:user:${req.user.id}:page:1`). However, there are no invalidation triggers (`delCache`) when key actions occur.
   * *Consequence:* If a user creates a new project, follows/unfollows someone, or records new activity, the feed will remain stale for up to 2 minutes.

### Technical Mapping
* **Files involved:**
  * [feedController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/feedController.js) (lines 25-29, 119)
  * [followController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/followController.js)
  * [projectController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/projectController.js)

---

## 6. Feed Performance
**Status: BROKEN**

### Issues & Root Causes
1. **Unconnected Frontend (Complete Mock Data)**:
   * *Root Cause:* The frontend user interface page `pages/feed.html` does **NOT** consume the backend feed API (`/api/feed/me`) or trending APIs (`/api/trending/projects`). It relies entirely on static, hardcoded placeholder data arrays in the HTML script tag.
   * *Consequence:* The UI is completely isolated from actual database updates or user interactions, providing no dynamic feed content.
2. **Process-Local Memory Cache**:
   * *Root Cause:* The cache store in `backend/utils/cache.js` uses a process-local `Map`.
   * *Consequence:* If the backend scales horizontally (e.g. multi-process clusters with PM2 or Docker), cache misses and states will drift between processes.

### Technical Mapping
* **Files involved:**
  * [feed.html](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/pages/feed.html) (lines 1376-1496)
  * [cache.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/utils/cache.js)
* **APIs involved:**
  * `GET /api/feed/me`
  * `GET /api/trending/projects`

---

## FEED SUMMARY

### System Metrics
* **Total Components Verified:** 6
* **Fully Working:** 1
* **Partially Working:** 4
* **Broken:** 1 (Due to complete UI-to-API disconnection and static hardcoding)
* **Missing:** 0

### Audit Overview
* **Feed Generation:** WORKING (Parallel retrieval correctly fetches 4 distinct feed channels)
* **Feed Retrieval:** PARTIALLY WORKING (Pagination limited in-memory to 55 items, unindexed regex tech stack matching)
* **Trending Engine:** PARTIALLY WORKING (Scoring logic is clean but `saves` field is missing from Project model, rendering bookmark weights inert)
* **Ranking Logic:** PARTIALLY WORKING (Ranking operates as designed, but outputs are skewed due to the inert saves component)
* **Feed Updates:** PARTIALLY WORKING (2-minute Cache implemented but lacks dynamic cache invalidation on follow/create events)
* **Feed Performance:** BROKEN (Frontend `pages/feed.html` relies entirely on static mock data and does not call any backend APIs; memory cache is not clustered/Redis ready)


---

# Complete Moderation System Audit Report

This report evaluates the **Moderation/Reporting System** of the DevStage platform. Verification covered the end-to-end flow from backend controllers, database schemas, audit logger integration, abuse control rules, and frontend features.

---

## 1. Report Submission
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Correctly validates report properties (valid types: `spam`, `abuse`, etc.; valid targets: `user`, `project`, etc.) and enforces proper format constraints on target resource IDs.
  * Reasons are successfully validated to be between 10 and 1000 characters.
  * Correctly generates audit trail records (`report_create` action logs) in MongoDB when a report is created.
* **Frontend/UI**: **BROKEN**
  * The frontend contains no report buttons or moderation inputs. The user has no way to report another developer, workspace, or project from the user interface.

### Technical Mapping
* **Files involved:**
  * [reportController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/reportController.js) (lines 9-65)
  * [Report.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Report.js)
  * [auditController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/auditController.js)

---

## 2. Report Retrieval
**Status: PARTIALLY WORKING**

### Verification Details
* **Backend/Database**: **WORKING**
  * Exposes user report retrieval API (`GET /api/reports/me`) to list reports filed by the active reporter, sorted by creation date (newest first).
* **Frontend/UI**: **BROKEN**
  * The UI has no page or view showing a list of reports submitted by the user.

### Technical Mapping
* **Files involved:**
  * [reportController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/reportController.js) (lines 67-80)
* **APIs involved:**
  * `GET /api/reports/me` (Protected)

---

## 3. Moderation Actions
**Status: MISSING**

### Verification Details
* **Description**: There are no moderation action endpoints (e.g. routes to resolve, dismiss, or review reports; or routes to ban/suspend users or delete flagged projects) anywhere in the application controllers.
* **Database fields unused**: The `Report` model schema has fields for `status` ("reviewed", "resolved", "dismissed"), `moderatorNote`, `resolvedAt`, and `resolvedBy`, but there is no server code or route that updates these values. They are entirely unpopulated dead model options.
* **isBanned Field**: Although other application subsystems (search, messaging, follow, etc.) check `isBanned: { $ne: true }` defensively, there is no code in the application that can update a user's `isBanned` state.

### Technical Mapping
* **Files involved:**
  * [Report.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Report.js) (lines 28-35)
  * [reportController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/reportController.js)

---

## 4. Abuse Protection
**Status: WORKING**

### Verification Details
* **Self-Report Block**: Backend correctly checks if the user is attempting to report themselves and returns a `400 Bad Request` with an explanatory message.
* **Duplicate Report Prevention**: Implements a composite unique index on `reporter` + `targetId` + `type` in the `Report` schema. The backend controller correctly intercepts the `11000 duplicate key error` and returns a clean `409 Conflict` status code.
* **Generic Network Protection**: Integrates a general Express rate limiter to limit API spam.

### Technical Mapping
* **Files involved:**
  * [Report.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/models/Report.js) (line 39)
  * [reportController.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/api/reportController.js) (lines 33-36, 59-61)
  * [rateLimiter.js](file:///c:/Users/Shourya/Upadhyay/OneDrive/Documents/ALL/CODES/PROJECT/2/project2/backend/middleware/rateLimiter.js)

---

## MODERATION SUMMARY

### System Metrics
* **Total Components Verified:** 4
* **Fully Working:** 1
* **Partially Working:** 2
* **Broken:** 0
* **Missing:** 1 (Moderator actions/resolution endpoints and ban updates are completely absent)

### Audit Overview
* **Report Submission:** PARTIALLY WORKING (Backend validates targets/reasons, persists, and writes audit trails; frontend UI is completely missing report inputs)
* **Report Retrieval:** PARTIALLY WORKING (My reports list API is functional on backend; UI does not consume the endpoint)
* **Moderation Actions:** MISSING (No resolve, dismiss, review, or account banning routes are implemented)
* **Abuse Protection:** WORKING (Self-report block, Mongoose composite unique indexing duplicate block, and generic rate limits are fully functional)


---

# Complete Performance Audit

## Overview
This audit evaluates the system's performance characteristics, focusing on database efficiency, caching strategies, API design, frontend asset management, and real-time socket communication.

### 1. Database Queries
**Status: WORKING**
- **Observation**: Mongoose schemas (`Project`, `User`, `Message`, `Conversation`, `Workspace`, `Activity`, `Achievement`, etc.) have comprehensive compound and single-field indexes defined to optimize query execution plans.
- **Current State**: Read operations across all major controllers extensively utilize Mongoose's `.lean()` method. This strips the heavy Mongoose document wrappers, returning plain JavaScript objects, significantly reducing memory overhead and improving read performance.

### 2. Caching
**Status: WORKING**
- **Observation**: An in-memory cache system is implemented in `backend/utils/cache.js`. 
- **Current State**: It is actively used in `trendingController.js`, `searchController.js`, `feedController.js`, `analyticsController.js`, `activityController.js`, and `achievementController.js`. It caches expensive queries (like personalized feeds and global search results) for durations ranging from 30 seconds to 10 minutes. The system is designed to be easily swappable with Redis for horizontal scaling. 

### 3. API Performance
**Status: WORKING**
- **Observation**: The server implements standard Node.js performance best practices.
- **Current State**: 
  - `compression` middleware is globally mounted in `server.js` to gzip payload responses.
  - Pagination is consistently enforced using `limit` and `skip` (or `slice`) across lists (e.g., messages, workspaces, projects, feeds). Hard limits (typically 50 or 100 maximum items) prevent malicious actors from requesting overly large datasets.

### 4. Bundle Size
**Status: N/A / LOW IMPACT**
- **Observation**: The frontend does not use a modern module bundler (like Webpack, Vite, or Next.js).
- **Current State**: Since the application relies on plain HTML, CSS, and Vanilla JavaScript, there is no monolithic "bundle" to suffer from bloat. Third-party dependencies (like Lucide icons and Fonts) are served via CDNs, which leverages browser-level caching.

### 5. Frontend Performance
**Status: PARTIALLY WORKING**
- **Observation**: The DOM relies heavily on native JavaScript APIs.
- **Current State**: Vanilla JS guarantees low execution overhead. However, because there is no build pipeline (bundler), the local CSS and JavaScript files are not automatically minified, and there is no automatic code-splitting or lazy-loading for off-screen components.

### 6. Socket Performance
**Status: PARTIALLY WORKING**
- **Observation**: The real-time architecture in `backend/socket/socketServer.js` efficiently uses a `Map` to track connected users and relies on Socket.IO rooms for targeted broadcasting.
- **Current State**: While the broadcasting logic is efficient, some socket events trigger direct, synchronous database writes (e.g., `User.findByIdAndUpdate` inside `presence_ping`, or `Message.create` in `send_message`) without debouncing or queuing. Under extremely high concurrency, this could become a database bottleneck.

---

## PERFORMANCE SUMMARY
The system is highly optimized on the backend. The extensive use of database indexes, `.lean()` queries, targeted in-memory caching, and strict pagination ensures that the API remains fast and scalable. The primary areas for future optimization involve migrating the in-memory cache to Redis for multi-instance scaling, introducing a frontend build step for minification, and implementing debouncing or message queuing for high-frequency Socket.IO database writes.


---

# DevStage — Complete Project System Audit

> **Audit Date:** 2026-06-20  
> **Scope:** Full project stack — frontend (`pages/upload.html`, `scripts/upload.js`, `pages/explore.html`, `scripts/profile.js`) → backend (`routes/projectRoutes.js`, `api/projectController.js`, `api/searchController.js`, `api/trendingController.js`, `api/analyticsController.js`) → database (`models/Project.js`, MongoDB)

---

## EXECUTION TRACE MAP

```
upload.html / scripts/upload.js
  ├─ firebase.storage().ref().put(file)      → Firebase Storage (thumbnail upload)
  └─ POST /api/projects/create               → projectController.js:createProject

explore.html (inline script)
  └─ db.collection('projects').get()         → Firebase Firestore (NOT MongoDB!)

scripts/profile.js
  ├─ GET  /api/projects/my-projects          → projectController.js:getMyProjects
  └─ POST /api/projects/view/:id             → projectRoutes.js:inline handler

settings.html (saveBtn)
  └─ GET  /api/auth/me                       → authcontroller.js (featuredProject field)

projectRoutes.js (server: /api/projects)
  ├─ GET  /all                               → projectController.js:getAllProjects (PUBLIC)
  ├─ POST /view/:id                          → projectRoutes.js:inline (PUBLIC)
  ├─ GET  /my-projects          [auth]       → projectController.js:getMyProjects
  ├─ POST /create               [auth]       → projectController.js:createProject
  ├─ PUT  /update/:id           [auth]       → projectController.js:updateProject
  ├─ DELETE /delete/:id         [auth]       → projectController.js:deleteProject
  ├─ PUT  /feature/:id          [auth]       → projectController.js:featureProject
  └─ POST /like/:id             [auth]       → projectController.js:likeProject

searchRoutes.js (/api/search)
  ├─ GET  /projects                          → searchController.js:searchProjects
  ├─ GET  /global                            → searchController.js:globalSearch
  └─ GET  /trending                          → searchController.js:getTrendingSearches

trendingRoutes.js (/api/trending)
  ├─ GET  /projects                          → trendingController.js:getTrendingProjects
  └─ GET  /users                             → trendingController.js:getTrendingUsers

analyticsRoutes.js (/api/analytics)
  ├─ GET  /analytics/:projectId  [auth]      → analyticsController.js:getProjectAnalytics
  └─ GET  /analytics-summary/me  [auth]      → analyticsController.js:getMyAnalyticsSummary
```

---

## 1. CREATE PROJECT

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `POST /api/projects/create` (`projectRoutes.js:80`)
- **Middleware:** `protect` from `middleware/auth.js`
- **Handler:** `projectController.js:createProject` (line 7)
- **Validation:**
  - `title` and `description` required ✓
  - `title.length > 80` → 400 ✓
  - `description.length > 500` → 400 ✓
  - `techStack.length > 12` → 400 ✓
  - `githubUrl` and `liveUrl` URL regex validation ✓
- **DB Write:** `Project.create({ title, description, techStack, githubUrl, liveUrl, status, thumbnail, owner: req.user.id })` ✓
- **Activity Log:** `createActivity("project_created", ...)` with `visibility: "public"` ✓
- **Response:** Full project document ✓

### Frontend — PARTIALLY WORKING
- **File:** `scripts/upload.js:253–363`
- **Flow:**
  1. Checks `localStorage.getItem('token')` — exits silently if no token ✓
  2. If a file is selected: uploads to **Firebase Storage** (`storage.ref('projects/${uid}/...').put(file)`) → gets Firebase CDN URL as `thumbnail` ✓
  3. Sends `POST /api/projects/create` with JWT Bearer token + JSON body ✓
  4. On success: redirects to `explore.html` ✓

### Issues
- **Category → Status Mismatch:** UI has categories: `Web App`, `AI`, `UI/UX`, `Open Source`, `Mobile`, `Robotics`, `Cybersecurity`. These are sent as `status` (`upload.js:332`). But the `Project` schema only allows `status: enum ["Planning", "In Progress", "Completed"]` (`models/Project.js:11`). **Result:** `category` values like `"AI"`, `"UI/UX"`, `"Mobile"` will fail Mongoose validation silently or be rejected, defaulting to `"Planning"` ✗
- **`githubUrl` and `liveUrl` are hardcoded to `''`** in `upload.js:334–335` — they are never collected from the user, even though the backend accepts them ✗
- **No auth guard on page load** — `upload.html` does not redirect unauthenticated users away from the form; the failure only shows after form submission ✗

---

## 2. EDIT PROJECT

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `PUT /api/projects/update/:id` (`projectRoutes.js:86`)
- **Handler:** `projectController.js:updateProject` (line 126)
- **Ownership + Collaborator Check:** Allows owner OR collaborators with role `"admin"` or `"editor"` ✓
- **Validation:** Same rules as create (title ≤ 80, description ≤ 500, techStack ≤ 12, URL regex) ✓
- **DB Write:** `Project.findByIdAndUpdate(id, { ...fields }, { new: true, runValidators: true })` ✓
- **Activity Log:** `createActivity("project_updated", ...)` ✓

### Frontend — BROKEN
- **No Edit UI exists in the application.** There is no modal, page, or form that calls `PUT /api/projects/update/:id` anywhere in the frontend codebase
- `profile.html` shows project cards but they click through to `explore.html?id=...` with no project detail or edit view ✗
- `settings.html` only sets `featuredProject` (the ID string), not editable project fields ✗

### Root Cause
Backend update route is fully implemented and functional, but no frontend UI has been built to call it.

---

## 3. DELETE PROJECT

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `DELETE /api/projects/delete/:id` (`projectRoutes.js:89`)
- **Handler:** `projectController.js:deleteProject` (line 244)
- **Authorization:** Checks `project.owner.toString() === req.user.id` — only owner can delete ✓
- **DB Write:** `Project.findByIdAndDelete(id)` ✓
- **Activity Log:** `createActivity("project_deleted", ...)` with `visibility: "private"` ✓
- **No cascading deletes:** `ProjectAnalytics` records, bookmark entries (`User.savedProjects`), and `CollaborationRequest` records referencing this project are NOT cleaned up ✗

### Frontend — BROKEN
- **No Delete UI exists.** No button, confirmation modal, or API call to `DELETE /api/projects/delete/:id` anywhere in the frontend ✗

### Root Cause
Same as Edit — backend is complete; no frontend affordance.

---

## 4. VIEW PROJECT

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING

#### View Count Tracking
- **Route:** `POST /api/projects/view/:id` (`projectRoutes.js:20`) — **PUBLIC** (no auth)
- Finds project by ID, checks 30-second per-IP cooldown using `req.app.set()` ✓
- `project.views++` → `project.save()` ✓

#### Project Analytics (Detail)
- **Route:** `GET /api/projects/analytics/:projectId` (`projectRoutes.js:77`)
- Requires ownership check, returns 30-day daily breakdown, impressions, clicks, saves, CTR, unique visitors ✓
- Uses separate `ProjectAnalytics` model with visitor hashing ✓

#### Get All Projects (Public List)
- **Route:** `GET /api/projects/all` — paginated, filters by `status` and `featured`, sorted by `featured DESC, likes DESC, createdAt DESC` ✓
- Populates `owner` with `username displayName profilePhoto` ✓

### Frontend — BROKEN

#### Explore Page
- **File:** `explore.html:1155` — `fetchProjects()` queries **`db.collection('projects')`** (Firebase Firestore), NOT `GET /api/projects/all` (MongoDB) ✗
- Projects created via `upload.js` are saved to **MongoDB only**. Explore page reads from **Firestore only**. These are entirely separate data stores with **zero sync** — projects uploaded via the form never appear on the Explore page ✗
- The `renderProject()` function (line 1097) reads `p.tags`, `p.userName`, `p.likesCount`, `p.fileURL` — Firestore field names. MongoDB projects use `p.techStack`, `p.owner.displayName`, `p.likes`, no `fileURL` ✗

#### Profile Projects (Partial)
- **File:** `scripts/profile.js:101–148` — `fetchUserProjects()` calls `GET /api/projects/my-projects` with JWT ✓
- On item click, fires `POST /api/projects/view/:id` ✓ then redirects to `explore.html?id=...`
- Explore page **does not read the URL `?id` param** and has no single-project detail view — the redirect leads to the generic Firestore-sourced feed, not the specific project ✗

---

## 5. PROJECT DISCOVERY

**Status: ✗ BROKEN**

### Explore Page Discovery
- **File:** `explore.html:1155–1180`
- All discovery reads from Firebase Firestore `db.collection('projects')` ✓ (for pre-existing Firestore data)
- **Critical:** All new projects from `upload.js` go to MongoDB, **never to Firestore** — discovery is completely broken for newly uploaded projects ✗
- Filter chips (Latest / Most Liked / Trending) only trigger `fetchProjects(filter)` which changes `orderBy` on Firestore, but `most-liked` and `trending` filters pass through without being handled in the Firestore query ✗

### Filter Sidebar
- "Latest" → `query.orderBy('createdAt', 'desc')` on Firestore ✓
- "Most Liked" → falls through to `fetchProjects('most-liked')` but the Firestore query has no branch for this → same as `latest` ✗
- "Trending" → same — no Firestore query for trending ✗
- Tech Stack chips (React, Python, TypeScript, etc.) toggle `active` CSS class but **never trigger any filtering query** ✗

### Backend Discovery (Working, Unused by Explore)
- `GET /api/projects/all` — paginated, supports `?status=&featured=true` ✓
- `GET /api/trending/projects` — time-decay trending score (views×1 + likes×3 + saves×5) / hoursAge^1.5 ✓
- **None of these are called by `explore.html`** ✗

---

## 6. SEARCH PROJECTS

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `GET /api/search/projects` (`searchRoutes.js:11`)
- **Handler:** `searchController.js:searchProjects` (line 110)
- Input sanitization: `sanitizeQuery()` strips non-alphanumeric chars, max 60 chars ✓
- Query: regex on `title`, `description`, `techStack` ✓
- Filters: `?tech=` for tech filter, `?status=` for status, `?featured=true` ✓
- Result caching via `getCache()`/`setCache()` (30 second TTL) ✓
- Global search: `GET /api/search/global` — searches both users and projects ✓
- Trending tech: `GET /api/search/trending` — aggregate on `Project.techStack` ✓

### Frontend — BROKEN
- **File:** `explore.html:1183–1188` — The search input `#feed-search` filters **already-rendered DOM cards** with `card.innerText.toLowerCase().includes(term)` — **client-side only**, no API call ✗
- `explore.html:1285–1314` — The Command Palette (⌘K) filters static hardcoded chip labels — never calls `GET /api/search/projects` ✗
- **No API search integration anywhere in the frontend** — `GET /api/search/projects`, `GET /api/search/global`, and `GET /api/search/trending` are all completely unused by the UI ✗

### Root Cause
Three fully functional search endpoints exist on the backend. The frontend implements only client-side DOM text-filtering of static Firestore results, with no backend search integration.

---

## 7. PROJECT CARDS

**Status: ⚠ PARTIALLY WORKING**

### Explore Page Cards — BROKEN
- **File:** `explore.html:1097–1118` — `renderProject(p, id)` reads:
  - `p.title` ✓ (same in both DB)
  - `p.description` ✓
  - `p.tags` — Firestore field name; MongoDB uses `p.techStack` ✗ (tags always empty for MongoDB projects)
  - `p.userName` — Firestore field; MongoDB uses `p.owner.displayName` (populated) ✗ (shows "Anonymous" for MongoDB projects)
  - `p.likes?.length || p.likesCount` — Firestore schema; MongoDB uses `p.likes` (Number) ✗
  - `p.fileURL` — Firestore field; not in MongoDB schema ✗ (click-through broken for MongoDB projects)
- **Thumbnail:** Not rendered in card — `project.thumbnail` is never read by `renderProject()` ✗

### Profile Page Cards — WORKING
- **File:** `scripts/profile.js:150–185` — `renderProjectCard()` reads from MongoDB response fields correctly:
  - `title`, `description`, `category` (mapped from `status`), `githubUrl`, `liveUrl`, `thumbnail`, `featured`, `likes`, `views` ✓
- Shows project index number, title, description, status tag ✓
- Click tracks view counter + redirects ✓

---

## 8. PROJECT METADATA

**Status: ⚠ PARTIALLY WORKING**

### Schema Fields — COMPLETE
| Field | Schema | Backend | Frontend Input | Frontend Display |
|---|---|---|---|---|
| `title` | ✓ String max 80 | ✓ | ✓ upload.html | ✓ profile.js |
| `description` | ✓ String max 500 | ✓ | ✓ upload.html | ✓ profile.js |
| `techStack` | ✓ [String] | ✓ | ✓ upload.html | ✓ profile.js |
| `githubUrl` | ✓ String | ✓ | ✗ hardcoded `''` | ✗ |
| `liveUrl` | ✓ String | ✓ | ✗ hardcoded `''` | ✗ |
| `thumbnail` | ✓ String (URL) | ✓ | ✓ Firebase Storage URL | ✗ not shown in explore |
| `status` | ✓ enum | ✓ | ✗ category mismatch | ✗ |
| `featured` | ✓ Boolean | ✓ | ✗ no UI to set | ✓ profile.js shows badge |
| `likes` | ✓ Number | ✓ | ✗ like button broken | ✗ |
| `views` | ✓ Number | ✓ | ✓ POST /view/:id on click | ✗ not shown |
| `collaborators` | ✓ [{user, role}] | ✓ | ✗ no UI | ✗ |
| `owner` | ✓ ObjectId ref | ✓ | auto from req.user | ✓ populated in /all |

### Analytics Metadata (ProjectAnalytics model)
- `impressions`, `clicks`, `opens`, `saves`, `collaborationRequests`, `uniqueVisitorHashes` — per day, per project ✓
- `GET /api/projects/analytics/:projectId` returns full 30-day breakdown ✓
- **No frontend analytics dashboard exists** — the endpoint is backend-only ✗

---

## 9. TAGS (TECH STACK)

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- `techStack: [String]` on `Project` model ✓
- Indexed: `projectSchema.index({ title: "text", description: "text", techStack: "text" })` ✓
- Stored as array, max 12 items enforced by `createProject` and `updateProject` ✓
- Searched via regex in `searchController.js:134` ✓
- Tech chip aggregation (`GET /api/search/trending`) pulls live counts from DB ✓

### Frontend — PARTIALLY WORKING
- **Upload:** `upload.js:320` — parses comma-separated input `tech.split(',').map(s => s.trim())` → `techStackArray` sent to backend ✓
- **Upload Preview:** Tags shown as chips in real-time ✓
- **Explore Sidebar:** Tech chip filter buttons (React, Python, etc.) have hardcoded counts (e.g., `24`, `18`) — **never fetched from `GET /api/search/trending`** ✗
- **Tech chip click** toggles `.active` CSS class but **does not filter the feed** ✗
- **Profile cards:** `p.category` used instead of `p.techStack[0]` (just shows status/category as tag) ✗

---

## 10. CATEGORIES

**Status: ✗ BROKEN**

### Schema — MISSING
- The `Project` schema has **no `category` field** — only `status: enum ["Planning", "In Progress", "Completed"]`
- The upload form (`upload.html:163–173`) has a category selector with: `Web App`, `AI`, `UI/UX`, `Open Source`, `Mobile`, `Robotics`, `Cybersecurity`
- `upload.js:332` sends `status: category` — e.g., `{ status: "AI" }`
- Mongoose will reject `"AI"` as invalid for the `status` enum — the `Project.create()` call will fail with a ValidationError unless the default falls through ✗

### Impact
- Any project created with a non-"Planning"/"In Progress"/"Completed" category value either fails silently (falls to `"Planning"` default) or throws a 500 error
- The category system is **entirely cosmetic** — it doesn't map to any searchable or filterable field in the database

### Root Cause
The frontend UI category system (7 categories) was designed independently from the backend schema (3 status values). The two were mapped together without schema changes.

---

## 11. PROJECT OWNERSHIP

**Status: ✓ WORKING**

### Backend — WORKING
- **Schema:** `owner: { type: ObjectId, ref: "User" }` (`models/Project.js:16`) ✓
- **Set on create:** `owner: req.user.id` (from authenticated JWT) ✓
- **Enforced on delete:** `project.owner.toString() !== req.user.id` → 403 ✓
- **Enforced on update:** `project.owner.toString() === req.user.id || collaborator?.role in ["admin", "editor"]` ✓
- **Enforced on feature:** `project.owner.toString() !== req.user.id` → 403 ✓
- **Get my projects:** `Project.find({ owner: req.user.id })` — owner-scoped query ✓
- **Public profile lookup** populates `owner` with `username displayName profilePhoto` ✓
- **Analytics:** Ownership check before returning project analytics (`project.owner !== req.user.id` → 403) ✓

### Collaborator Roles
- Schema supports `collaborators: [{ user: ObjectId, role: enum ["admin", "editor", "viewer"] }]` ✓
- `updateProject` respects collaborator roles for edit permission ✓
- **No frontend UI to add/manage collaborators** — the `collaborationRoutes.js` exists but the teams page (`teams.html`) does not connect to it ✗

---

## ROUTE → HANDLER → DB MATRIX

| Route | Handler | DB Operation | Auth | Frontend Caller |
|---|---|---|---|---|
| `POST /api/projects/create` | `createProject` | `Project.create()` | ✓ | `upload.js` ✓ |
| `GET /api/projects/my-projects` | `getMyProjects` | `Project.find({owner})` | ✓ | `profile.js` ✓, `upload.js` ✓ |
| `PUT /api/projects/update/:id` | `updateProject` | `Project.findByIdAndUpdate()` | ✓ | ✗ NONE |
| `DELETE /api/projects/delete/:id` | `deleteProject` | `Project.findByIdAndDelete()` | ✓ | ✗ NONE |
| `PUT /api/projects/feature/:id` | `featureProject` | `Project.updateMany()` + `save()` | ✓ | ✗ NONE |
| `POST /api/projects/like/:id` | `likeProject` | `project.likes++; save()` | ✓ | ✗ NONE |
| `POST /api/projects/view/:id` | inline | `project.views++; save()` | ✗ public | `profile.js` ✓ |
| `GET /api/projects/all` | `getAllProjects` | `Project.find().populate()` | ✗ public | ✗ NONE |
| `GET /api/search/projects` | `searchProjects` | `Project.find(regex filter)` | ✗ public | ✗ NONE |
| `GET /api/search/global` | `globalSearch` | `User + Project find()` | ✗ public | ✗ NONE |
| `GET /api/search/trending` | `getTrendingSearches` | `Project.aggregate()` | ✗ public | ✗ NONE |
| `GET /api/trending/projects` | `getTrendingProjects` | `Project.find()` + score | ✗ public | ✗ NONE |
| `GET /api/projects/analytics/:id` | `getProjectAnalytics` | `ProjectAnalytics.find()` | ✓ | ✗ NONE |
| `GET /api/projects/analytics-summary/me` | `getMyAnalyticsSummary` | `ProjectAnalytics.aggregate()` | ✓ | ✗ NONE |

---

## PROJECT SYSTEM SUMMARY

### ✓ Working (3)
- **Create Project (Backend)** — `POST /api/projects/create` with full validation, ownership, and activity log
- **Project Ownership (Backend)** — Owner enforced on create/update/delete/feature with collaborator role support
- **View Count Tracking** — `POST /api/projects/view/:id` with 30-second cooldown, called by `profile.js`

### ⚠ Partial (6)

| Feature | Status | Root Cause |
|---|---|---|
| **Create Project (Frontend)** | Partial | `githubUrl`/`liveUrl` hardcoded to `''`; category value sent as `status` causes enum validation failure |
| **Edit Project (Backend)** | Partial | Backend complete, no frontend UI exists |
| **Delete Project (Backend)** | Partial | Backend complete, no frontend UI exists; `ProjectAnalytics` not cascade-deleted |
| **View Project (Backend)** | Partial | `GET /api/projects/all` fully built but never called by `explore.html` |
| **Project Cards** | Partial | Profile cards (MongoDB) work; Explore cards use Firestore schema — fields mismatch |
| **Tags (Tech Stack)** | Partial | Saved to DB correctly; Explore sidebar filter chips are static and non-functional |

### ✗ Broken / Missing (6)

| Feature | Files | Root Cause |
|---|---|---|
| **Edit Project (Frontend)** | `pages/upload.html`, `scripts/upload.js` | No edit form, modal, or `PUT /api/projects/update/:id` call exists anywhere |
| **Delete Project (Frontend)** | All pages | No delete button or `DELETE /api/projects/delete/:id` call exists anywhere |
| **Project Discovery** | `explore.html:1155` | Reads `Firebase Firestore` collection; all uploaded projects live in `MongoDB` — zero intersection |
| **Filter & Sort** | `explore.html:1318–1324` | "Most Liked" and "Trending" filters pass to Firestore query with no handler; `GET /api/trending/projects` never called |
| **Search Projects** | `explore.html:1183`, `1305` | Frontend implements DOM-only text filter on Firestore cards; `GET /api/search/projects` never called |
| **Categories** | `upload.html`, `models/Project.js` | Category UI (7 values) sent as `status` field (3-value enum) — causes Mongoose `ValidationError`; no `category` field in schema |


---

# Complete PWA Audit

## Overview
This audit evaluates the Progressive Web App (PWA) readiness of the project, including Service Worker configuration, caching strategies, offline capabilities, manifest correctness, and overall installability.

### 1. Service Worker
**Status: WORKING**
- **Observation**: A robust service worker (`service-worker.js`) is implemented and correctly registered via `scripts/auth.js` upon window load.
- **Current State**: The service worker correctly handles the lifecycle events (`install`, `activate`) and actively intercepts `fetch` requests to apply targeted caching strategies.

### 2. Cache Strategy
**Status: WORKING**
- **Observation**: The service worker employs intelligent, route-specific caching strategies.
- **Current State**:
  - **Static Assets** (images, fonts, generic scripts/styles): Uses a `cacheFirst` strategy.
  - **Critical Scripts** (`auth.js`, `firebase-config.js`): Uses a `networkFirstStatic` strategy to ensure critical auth logic is always up-to-date while retaining an offline fallback.
  - **API Requests** (`/api/*`): Uses a `networkFirstApi` strategy. If the network fails, it returns a gracefully structured mock 503 JSON response rather than a raw network error.
  - **HTML Navigations**: Uses a `networkFirstPage` strategy, falling back to `/offline.html`.

### 3. Offline Mode
**Status: WORKING**
- **Observation**: The application handles offline states elegantly for both UI navigation and data fetching.
- **Current State**:
  - `offline.html` exists and is successfully pre-cached during the service worker `install` phase.
  - Disconnected users attempting to navigate will see the custom offline page.
  - Disconnected users making API calls will receive a handled JSON response (`{ success: false, offline: true, message: "DevStage is offline..." }`), preventing unhandled promise rejections on the frontend.

### 4. Installability
**Status: BROKEN**
- **Observation**: The application cannot currently be installed to a user's home screen or desktop.
- **Current State**: `index.html` (and likely other HTML pages) is missing the critical `<link rel="manifest" href="/manifest.json">` tag in the `<head>`. Without this link, the browser does not know the PWA manifest exists and will not trigger the install prompt.

### 5. Manifest
**Status: PARTIALLY WORKING**
- **Observation**: `manifest.json` exists in the root directory and contains the correct structure.
- **Current State**: It defines the required PWA fields (`name`, `short_name`, `start_url`, `display: standalone`, `theme_color`, etc.). However, it references icon assets that do not exist in the repository.

### 6. PWA Assets
**Status: BROKEN**
- **Observation**: The icons required for a valid PWA installation are missing.
- **Current State**: `manifest.json` points to `/assets/icon-192.png` and `/assets/icon-512.png`. However, the `assets` directory does not exist in the root of the project. Browsers will reject PWA installation if valid icons are not found at the specified paths.

---

## PWA SUMMARY
The underlying JavaScript infrastructure for the PWA (Service Worker, Caching, Offline Fallbacks) is **highly robust and working perfectly**. It employs sophisticated network-first and cache-first routing. 

However, the PWA is currently **not installable** due to basic structural omissions:
1. `index.html` is missing the `<link rel="manifest" href="/manifest.json">` tag.
2. The icon files (`/assets/icon-192.png` and `/assets/icon-512.png`) do not exist.

Once the manifest is linked and the icons are added, the platform will be a fully functional, installable Progressive Web App.


---

# Complete Security Audit

## Overview
This audit evaluates the system's security posture across validation, sanitization, rate limiting, authorization, JWT security, Firebase security, secrets management, and environment variables.

### 1. Validation
**Status: PARTIALLY WORKING**
- **Observation**: `backend/middleware/validation.js` contains validation utilities (e.g., username regex, pagination limits, ObjectId checks). However, these utilities are **not imported or enforced** in `server.js` or any of the routing files.
- **Current State**: Validation relies on manual ad-hoc checks within individual controllers (e.g., `authcontroller.js` checks for empty fields). There is no strong route-level enforcement for email formats or password complexity.

### 2. Sanitization
**Status: WORKING**
- **Observation**: The `sanitizeRequest` middleware from `validation.js` is globally mounted in `server.js` (line 106).
- **Current State**: It recursively traverses request bodies, queries, and parameters to strip out `$` (NoSQL injection prevention) and `__proto__` (prototype pollution prevention). This implementation is robust and functional.

### 3. Rate Limiting
**Status: WORKING**
- **Observation**: Multiple purpose-built limiters (`generalLimiter`, `authLimiter`, `messageLimiter`, `searchLimiter`, `presenceLimiter`, `contactLimiter`) are defined in `rateLimiter.js`.
- **Current State**: These limiters are correctly applied to their respective routes in `server.js`, providing solid protection against brute-force and DDoS attacks.

### 4. Authorization
**Status: PARTIALLY WORKING**
- **Observation**: Most endpoints correctly implement ownership checks (e.g., verifying `project.owner.toString() === req.user.id`).
- **Current State**: The `isBanned` check is handled manually in scattered controllers (e.g., trending, search, messages). Because `authmiddleware.js` does NOT verify the database status of the user or check for a `banned` flag, a banned user with an unexpired JWT can still access any endpoint that forgets to query the DB for `isBanned`.

### 5. JWT Security
**Status: BROKEN (CRITICAL VULNERABILITY)**
- **Observation**: JWT tokens are issued with long expiration times (7 days for login, 30 days for register) and there is no token revocation or blacklist mechanism.
- **Current State**: More alarmingly, there is a **CRITICAL BACKDOOR** in `authmiddleware.js`. When standard JWT verification fails, the fallback mechanism attempts to verify the token using a hardcoded secret: `jwt.verify(token, "firebase_secret_not_jwt_secret")`. This allows any attacker to forge a token, sign it with this hardcoded secret, and spoof any user by simply providing their email address in the payload.

### 6. Firebase Security
**Status: BROKEN**
- **Observation**: `utils/firebaseTokens.js` implements proper RS256 token verification using Google's public certificates.
- **Current State**: However, because `authmiddleware.js` checks the hardcoded `firebase_secret_not_jwt_secret` *before* attempting the real RS256 verification, the secure Firebase logic can be bypassed entirely. 

### 7. Secrets Management
**Status: BROKEN**
- **Observation**: Secrets and configurations are loosely managed.
- **Current State**: The `authmiddleware.js` file contains a hardcoded fallback secret (`firebase_secret_not_jwt_secret`). Additionally, the `MONGO_URI` contains plaintext database credentials (username and password). 

### 8. Environment Variables
**Status: PARTIALLY WORKING**
- **Observation**: The `backend/.env` file is used to store sensitive variables like `JWT_SECRET`, `MONGO_URI`, and `CLIENT_URL`.
- **Current State**: While the `.env` file is properly listed in `.gitignore` (preventing accidental commits), it contains hardcoded production-like credentials locally, and some secrets (like the mock Firebase secret) bypass the environment variable system entirely by being hardcoded into the source logic.

---

## Issue Rankings

### 🔴 CRITICAL
1. **JWT & Firebase Forgery Backdoor**: The hardcoded fallback secret (`"firebase_secret_not_jwt_secret"`) in `authmiddleware.js` allows any attacker to forge tokens and completely bypass authentication for any user account.

### 🟠 HIGH
1. **Missing Centralized Ban Enforcement**: `isBanned` is not checked within the global `authmiddleware.js`. Banned users retain access until their JWT expires (up to 30 days) on any endpoint that lacks a manual DB-level `isBanned` check.

### 🟡 MEDIUM
1. **Lack of Route-Level Schema Validation**: While `validation.js` exists, it is not applied. Endpoints (especially `/api/auth/register`) lack strict validation for password complexity, email format, and input length, increasing the risk of poorly formatted or malicious payloads.
2. **Long-Lived JWTs without Revocation**: Issuing 30-day tokens without a refresh token system or token blacklist makes it impossible to securely force-logout a compromised session.

### 🟢 LOW
1. **Hardcoded Local DB Credentials**: The `.env` file uses an explicit `MONGO_URI` containing a plaintext password. While gitignored, relying on explicit credentials rather than managed identity/roles or local dev-only credentials poses a minor risk if the file is shared.

---

## SECURITY SUMMARY
The system exhibits strong baseline defenses with globally enforced sanitization against NoSQL injection and solid rate limiting against brute-forcing. However, the authentication and authorization layers suffer from a **CRITICAL** vulnerability due to a hardcoded token verification backdoor in the Firebase fallback logic. Additionally, the lack of centralized status checks (like `isBanned`) within the auth middleware and the absence of global schema validation expose the application to significant security risks that must be remediated immediately.


---

# Complete SEO Audit

## Overview
This audit evaluates the Search Engine Optimization (SEO) readiness of the platform, checking meta configurations, social sharing capabilities, structured data, and crawler configurations.

### 1. Meta Tags
**Status: PARTIALLY WORKING**
- **Observation**: While title tags exist across the application, metadata is sparse and heavily hardcoded.
- **Current State**:
  - `index.html` and `settings.html` contain a standard `<meta name="description">` tag.
  - However, all core discovery pages (`/pages/explore.html`, `/pages/feed.html`, `/pages/profile.html`, `/pages/teams.html`) are completely missing the `<meta name="description">` tag.
  - Page titles are static and hardcoded (e.g., `Profile — Designer & Developer`), meaning user profiles and specific projects will not have unique page titles when crawled.

### 2. Open Graph (OG Tags)
**Status: BROKEN**
- **Observation**: There is zero implementation of the Open Graph protocol across the entire application.
- **Current State**: Because tags like `og:title`, `og:description`, `og:image`, and `og:url` are missing from all HTML files, sharing any link from DevStage on Twitter, LinkedIn, Discord, or iMessage will result in a blank or fallback preview. The platform will look completely unbranded when shared socially.

### 3. Structured Data
**Status: BROKEN**
- **Observation**: There is no semantic data markup implemented.
- **Current State**: The application lacks `application/ld+json` script tags. Search engines (like Google) cannot semantically understand the content. For a platform showcasing projects and developers, implementing Schema.org types like `SoftwareSourceCode`, `CreativeWork`, or `Person` is critical for rich search results, but none are currently present.

### 4. Robots
**Status: WORKING**
- **Observation**: Crawler rules are properly defined.
- **Current State**: 
  - The static `robots.txt` in the root directory permits all user-agents (`User-agent: *`, `Allow: /`) and directs crawlers to the sitemap.
  - Additionally, the backend provides a dynamic `/robots.txt` route via `seoRoutes.js` that mirrors these correct settings.

### 5. Sitemap
**Status: WORKING**
- **Observation**: A sophisticated dynamic sitemap generator is actively implemented.
- **Current State**: `backend/utils/sitemapGenerator.js` is highly functional. It serves an XML sitemap (`/sitemap.xml`) that includes:
  - 10 core static routes (`/`, `/pages/explore.html`, etc.).
  - Up to 1000 of the most recently updated projects.
  - Up to 1000 public developer profiles.
  - It correctly assigns `lastmod` dates and hierarchical `priority` tags.

---

## SEO SUMMARY
The platform excels at basic search engine indexing thanks to an excellent, dynamic XML sitemap implementation and correct `robots.txt` configuration. Search engines will easily find all projects and profiles.

However, the presentation of those links in search results and on social media is **severely lacking**. Because core HTML pages are missing unique meta descriptions, completely lack Open Graph (`og:`) tags, and have no Structured Data, the platform will look unappealing when shared, and it will struggle to rank highly for specific project or developer keywords without dynamic, route-specific metadata injection.


---

# DevStage — Complete User System Audit

> **Audit Date:** 2026-06-20  
> **Scope:** Full user stack — frontend (`pages/profile.html`, `pages/settings.html`, `scripts/profile.js`) → backend (`routes/userRoutes.js`, `routes/settingsRoutes.js`, `api/authcontroller.js`, `api/settingsController.js`) → database (`models/user.js`, MongoDB)

---

## EXECUTION TRACE MAP

```
settings.html (inline JS) 
  ├─ GET  /api/auth/me          → authcontroller.js (via authmiddleware.js)
  ├─ PUT  /api/users/update-profile → userRoutes.js:127 (via middleware/auth.js:protect)
  ├─ PUT  /api/settings/notifications → settingsController.js:updateNotifications
  ├─ PUT  /api/settings/appearance   → settingsController.js:updateAppearance
  ├─ PUT  /api/settings/projects     → settingsController.js:updateProjects
  ├─ PUT  /api/settings/ecosystem    → settingsController.js:updateEcosystem
  ├─ PUT  /api/settings/security     → settingsController.js:updateSecurity
  ├─ PUT  /api/settings/advanced     → settingsController.js:updateAdvanced
  └─ DEL  /api/settings/delete-account → settingsController.js:deleteAccount

profile.html (inline JS + scripts/profile.js)
  ├─ GET  /api/auth/me          → authcontroller.js (reflectSettingsData)
  ├─ GET  /api/projects/my-projects → projectController.js (scripts/profile.js:101)
  ├─ GET  /api/activity/me      → activityController.js (scripts/profile.js:271)
  ├─ POST /api/users/view-profile/:username → userRoutes.js:79
  └─ db.collection("users").doc(uid).get() → Firestore (scripts/profile.js:85)
```

---

## 1. USER PROFILE CREATION

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Route:** `POST /api/auth/register` (`routes/authroutes.js:13`)
- **Handler:** `registerUser` (`api/authcontroller.js:63`)
- Creates user document with: `username`, `email`, `hashedPassword`, `isOnline: true`, `lastSeen`
- All other profile fields (`bio`, `location`, `displayName`, `profilePhoto`, etc.) default to empty strings/false on the schema
- Response includes `toAuthUser(user)` which has the full profile shape ✓

### Frontend — BROKEN
- **File:** `scripts/auth.js:1139–1235` (main modal) — never calls `POST /api/auth/register`; calls `completeMockAuth()` locally
- **File:** `pages/register.html` (stub page) — calls the real backend but redirects to `../pages/dashboard.html` which does not exist
- No **email format validation** on the backend (`authcontroller.js:63`) — relies on frontend only ✗
- No **duplicate username check at registration time** — only email is checked; a duplicate username causes a Mongoose `E11000` uncaught duplicate key error ✗

### Schema Gaps
- `username` is `unique: true, sparse: true` — `sparse` means `null` is allowed, so multiple users can register with no username. However `registerUser` always requires a username — minor inconsistency.

### Root Causes
- Registration frontend flow is split between a dead stub page and a mock-only modal
- Backend `registerUser` does not validate email format or check if `username` is already taken before attempting `User.create()`

---

## 2. PROFILE RETRIEVAL

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING (Two separate endpoints)

#### `/api/auth/me` (authenticated own profile)
- **File:** `api/authcontroller.js` → `toAuthUser()` helper
- Returns full profile: `displayName`, `bio`, `location`, `profilePhoto`, `socialLinks`, `developerTags`, `settings`, etc.
- `password` is **not** in `toAuthUser()` return — correctly excluded ✓
- `followers`/`following` returned as counts, not arrays ✓

#### `/api/users/profile/:username` (public profile)
- **File:** `routes/userRoutes.js:40`
- `.select()` returns only: `username displayName bio profilePhoto followers following featuredProject skills developerTags currentStatus isOnline lastSeen`
- Correctly filters `isBanned: { $ne: true }` ✓
- **Bug:** Double `profileVisibility` check uses both `user.profileVisibility` (boolean) and `user.security.profileVisibility` (string "public"/"private") — inconsistent; if a user was created before `security.profileVisibility` was added, the `$and` condition may fail ✗

### Frontend — PARTIALLY WORKING

#### `profile.html` — `reflectSettingsData()` (line 5982)
- Calls `GET /api/auth/me` with `localStorage.getItem('token')` only (not `devstage_auth` fallback)
- Falls back to `localStorage.currentUser` / `localStorage.user` on failure ✓
- **No Firebase SDK conflict guard** — `profile.html` loads both `firebase-config.js` (compat SDK v8) and `auth.js` (ES module SDK v10) simultaneously. This will cause double-initialization errors in newer browsers ✗

#### `scripts/profile.js` — `updateProfileUI()` (line 67)
- Uses `firebase.auth()` and `firebase.firestore()` (compat v8) — **separate data source from MongoDB**
- Reads `bio`, `linkedin`, `location` from **Firestore** `users/{uid}`, not from the backend MongoDB API
- If a user edits their bio in `settings.html` (which saves to MongoDB), the update will NOT appear on `profile.html` which reads from Firestore — data divergence ✗

---

## 3. PROFILE EDITING

**Status: ✓ WORKING (Backend) / ⚠ PARTIAL (Frontend)**

### Backend — WORKING
- **Route:** `PUT /api/users/update-profile` (`routes/userRoutes.js:127`)
- **Middleware:** `protect` from `middleware/auth.js`
- **Fields accepted:** `displayName`, `username`, `bio`, `location`, `timezone`, `portfolioWebsite`, `socialLinks`, `currentStatus`, `developerTags`, `featuredProject`, `profileVisibility`, `showContributionGraph`, `showAchievements`, `profilePhoto`
- **Validation:**
  - `bio.length > 160` → 400 ✓
  - `developerTags.length > 8` → 400 ✓
  - `portfolioWebsite` URL pattern check ✓
  - Username uniqueness check (excludes self) ✓
- On success: strips password, returns activity log, fires `createActivity("profile_updated")` ✓

### Frontend — PARTIALLY WORKING
- **File:** `pages/settings.html:3019` — `saveBtn` click → `PUT /api/users/update-profile` ✓
- On success: updates `localStorage.user`, `localStorage.currentUser`, and `devstageUser.displayName` ✓
- **Issue 1:** `profilePhoto` is sent as a **base64 data URI** (from `FileReader.readAsDataURL`). Base64 images stored directly in MongoDB can be very large (several MB per user) — no size limit enforced ✗
- **Issue 2:** The save button syncs `devstageUser.displayName` but **not** `devstageUser.photoURL` if no photo was set — inconsistent sync ✗
- **Issue 3:** `PUT /api/users/platform-settings` exists (`userRoutes.js:268`) but is **never called** by the frontend — completely unused endpoint ✗

---

## 4. AVATAR HANDLING

**Status: ✗ BROKEN**

### Frontend
- **File:** `pages/settings.html:3162–3183`
- User selects a file → `FileReader.readAsDataURL()` → stores as `base64Img` in the DOM only
- Base64 image is read from DOM on `saveBtn` click and sent in `updatedData.profilePhoto`
- **Broken:** This sends the full base64 string (~1.3x file size in ASCII) in the request body directly to `PUT /api/users/update-profile`

### Backend
- **File:** `routes/userRoutes.js:207` — `user.profilePhoto = profilePhoto` — stores the raw base64 string in MongoDB ✓ (writes successfully)
- **No file size validation** — a user can upload a 20MB image as base64 (~27MB in the body), bypassing Express's default body limit unless explicitly configured

### Removal
- **File:** `pages/settings.html:3186–3203`
- "Remove Avatar" click deletes `photoURL` and `profilePhoto` from `localStorage` only, **never calls the backend** → MongoDB still stores the old base64 blob ✗

### Profile Display
- **File:** `pages/profile.html:6015–6033` (`applyProfileData`) — correctly reads `user.profilePhoto || user.photoURL` from backend response ✓
- **File:** `scripts/profile.js:68–70` (`updateProfileUI`) — reads `user.photoURL` from **Firebase** auth object — this is Google's CDN URL if Google login was used, not the uploaded base64

### Root Causes
1. No cloud storage (Firebase Storage, S3, Cloudinary) — avatars stored as base64 in MongoDB
2. No upload size limit on the backend
3. Remove avatar only clears localStorage, not the backend
4. Two separate avatar sources: Firebase CDN URL vs. MongoDB base64

---

## 5. BIO

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Schema:** `bio: { type: String, default: "" }` (`models/user.js:27`)
- **Validation:** `bio.length > 160` → 400 in `PUT /api/users/update-profile` ✓
- **Retrieval:** Included in `toAuthUser()` and `publicProfileResponse()` ✓

### Frontend — SPLIT SOURCE
- **Settings editing** (`pages/settings.html:2867–2870`): Reads/writes bio from `input-bio` textarea; character counter updates in real-time; bio is saved to MongoDB via `PUT /api/users/update-profile` ✓
- **Profile display** (`scripts/profile.js:84–88`): Bio is fetched from **Firestore** `users/{uid}.bio` — NOT from MongoDB
- **Profile display** (`pages/profile.html:6080`): Bio is fetched from MongoDB via `GET /api/auth/me` → `applyProfileData(user)` ✓
- Two competing bio sources: `scripts/profile.js` and the inline `reflectSettingsData()` both run on profile load — whichever finishes last wins ✗

### Root Cause
- `scripts/profile.js` uses the old Firestore-based data model; the inline script uses the new MongoDB-based model. They race and overwrite each other.

---

## 6. USERNAME

**Status: ⚠ PARTIALLY WORKING**

### Backend — WORKING
- **Schema:** `username: { type: String, unique: true, sparse: true }` (`models/user.js:5`)
- **Registration:** `authcontroller.js:registerUser` — username is **required** in request body but has **no format validation** (no regex, no length check) ✗
- **Profile update:** `PUT /api/users/update-profile:181` — lowercases username, checks for conflicts (`User.findOne({ username, _id: { $ne: user._id } })`), saves ✓
- **Public profile lookup** — searches by `username` field (case-sensitive in MongoDB by default) — lookups are force-lowercased on the client side ✗

### Frontend
- **Settings page:** `input-username` field → saved via `saveBtn` → `PUT /api/users/update-profile` ✓
- **Profile page display:** `profile-handle-sidebar` set from `user.username` ✓
- **Handle generation in `profile.html` sidebar** (`scripts/profile.js:76–82`): Generates handle from `user.displayName || user.email` — **ignores the actual `user.username` field from MongoDB** — can produce a mismatched handle display ✗

### Root Cause
- `scripts/profile.js` derives the handle from display name, not username field
- No username format enforcement at registration

---

## 7. SETTINGS

**Status: ✓ WORKING**

Settings are managed through a dedicated controller and route set — the best-structured part of the system.

### Architecture
- **Routes:** `routes/settingsRoutes.js` — 8 routes, all protected by `authmiddleware`
- **Controller:** `api/settingsController.js` — 434 lines, 7 exported handlers
- **Schema fields:** `notificationSettings`, `appearance`, `projectSettings`, `ecosystem`, `security`, `advanced` all exist in `models/user.js`

### Notification Settings — WORKING
- **Route:** `PUT /api/settings/notifications`
- Validates unexpected fields and boolean types before writing ✓
- Maps UI fields to `user.notificationSettings` with `updateSection()` ✓
- Logs activity via `createActivity("settings_updated")` ✓

### Appearance Settings — WORKING
- **Route:** `PUT /api/settings/appearance`
- Validates `theme` against `["dark", "light", "system"]` ✓
- Validates `reducedMotion`, `compactMode` as booleans ✓

### Project Settings — WORKING
- **Route:** `PUT /api/settings/projects`
- Maps `autoPublish`, `allowForks`, `showProjectStats` ✓

### Ecosystem Settings — PARTIALLY WORKING
- **Route:** `PUT /api/settings/ecosystem`
- Stores `githubConnected`, `twitterConnected`, `linkedinConnected` as booleans ✓
- **Mismatch:** Frontend `settingsFromUI().ecosystem` mixes UI toggle state (`eco-cli`) with social link presence (`activeSocialLinks.github`) — GitHub connected flag is incorrectly OR-ed ✗
- Social links (actual handles) are saved to `user.socialLinks` via `update-profile`, not via settings. Two separate data paths for social platform state ✗

### Security Settings — WORKING
- **Route:** `PUT /api/settings/security`
- Validates `profileVisibility` against `["public", "private"]` ✓
- **Cross-sync:** Also writes to `user.profileVisibility` (boolean) and `user.privacy.*` — maintains two representations in sync ✓ (but adds complexity)

### Advanced Settings — WORKING
- **Route:** `PUT /api/settings/advanced`
- Validates booleans ✓
- Logs specialized message for `developerMode` toggle ✓

### Settings Load — WORKING
- **Route:** `GET /api/settings/me` (`settingsController.js:134`)
- Uses `safeSettings()` which fills in defaults for missing subdocuments ✓
- Frontend `loadSettingsData()` (`settings.html:2608`) applies local cache first, then overwrites with server data ✓ (optimistic update pattern)

### Minor Issue
- `DEFAULT_SETTINGS` and `SECTION_FIELDS` in `settingsController.js` use `"notifications"` and `"notificationSettings"` as aliases. The schema field is `notificationSettings` but the API uses `notifications`. Requires the `sectionWithDefaults` alias mapping to keep them in sync — fragile ✗

---

## 8. PREFERENCES

**Status: ⚠ PARTIALLY WORKING**

### Backend — PARTIALLY WORKING
- `PUT /api/users/platform-settings` (`userRoutes.js:268`) handles: `notifications`, `appearance`, `projectPreferences`, `ecosystem`
- **Never called by the frontend** — dead endpoint ✗
- Schema has `projectPreferences`, `feedPreferences` fields (`models/user.js:255–379`) — never surfaced to the user in any UI ✗
- `feedPreferences.showTrending`, `feedPreferences.showFollowing`, `feedPreferences.showRecommended` exist in schema but there is no settings panel for them and no API to toggle them ✗

### Frontend — MISSING
- No UI for `feedPreferences`, `projectPreferences.autoSaveDrafts`, `projectPreferences.showProjectAnalytics`
- `platform-settings` endpoint is never called from `settings.html` — all preference changes go through `settings/notifications`, `settings/appearance`, etc.

---

## 9. PRIVACY

**Status: ⚠ PARTIALLY WORKING**

### Two competing privacy models exist simultaneously:

#### Model A — `security` subdocument (`models/user.js:297`)
- `security.twoFactorEnabled`, `security.profileVisibility` ("public"/"private"), `security.searchableProfile`
- Written by `PUT /api/settings/security` ✓
- Read by `safeSettings()` in `GET /api/settings/me` ✓

#### Model B — `privacy` subdocument (`models/user.js:328`)
- `privacy.twoFactorEnabled`, `privacy.profileIndexed`, `privacy.activityVisible`
- Written by `PUT /api/users/privacy-settings` (`userRoutes.js:332`)
- **Never called from the frontend** ✗
- `updateSecurity` in `settingsController.js:298–301` syncs to `user.privacy.*` after writing `user.security.*` — partial cross-sync only

#### Model C — `profileVisibility` root field (`models/user.js:96`)
- `profileVisibility: Boolean` — top-level field
- Written by `PUT /api/users/update-profile:224` ✓
- The public profile lookup (`GET /api/users/profile/:username`) checks **all three**: root `profileVisibility` (bool), `security.profileVisibility` (string) ✗

### Frontend Privacy Controls
- **`toggle-public-profile`** → `saveSettingsSection("security", ...)` → `PUT /api/settings/security` ✓ (writes `security.profileVisibility` and syncs `user.privacy.profileIndexed` and `user.profileVisibility`)
- **`toggle-contribution-graph`** → same endpoint, but maps to `searchableProfile` (this toggle is semantically mislabeled in `settingsFromUI()` at line 2499) ✗
- Two-factor toggle (`twofa-card`) → `PUT /api/settings/security` → writes `security.twoFactorEnabled` but **no actual 2FA implementation** exists ✗

### Root Causes
- Three overlapping privacy data models created organically as features were added
- `PUT /api/users/privacy-settings` endpoint exists but is dead (no frontend caller)
- "Two-factor enabled" is a cosmetic toggle with no underlying TOTP/SMS implementation

---

## 10. ACCOUNT DELETION

**Status: ✓ WORKING (with one issue)**

### Backend — WORKING
- **Route:** `DELETE /api/settings/delete-account` (`settingsRoutes.js:22`) and also `DELETE /api/users/delete-account` (`userRoutes.js:379`) — **both exist and call the same handler** (`settingsController.js:deleteAccount`)
- **Handler Flow:**
  1. Verifies current user from `req.user.id`
  2. For non-Google users: requires `password` in body and runs `bcrypt.compare()` ✓
  3. For Google users: skips password check (`req.user.isGoogleUser || password === "google_auth_placeholder_password"`) ✓
  4. **Cascade deletes:**
     - `Project.deleteMany({ owner: user._id })` ✓
     - `Activity.deleteMany({ user: user._id })` ✓
     - `ContactMessage.deleteMany({ receiver | senderEmail })` ✓
     - `ApiKey.deleteMany({ owner: user._id })` (try/catch) ✓
     - `Achievement.deleteMany({ userId: user._id })` (try/catch) ✓
     - `CollaborationRequest.deleteMany({ sender | receiver })` (try/catch) ✓
     - `User.findByIdAndDelete(user._id)` ✓

### Frontend — WORKING
- **File:** `pages/settings.html:3094–3131`
- `prompt()` for password confirmation ✓
- Calls `DELETE /api/settings/delete-account` with `{ password }` in body ✓
- On success: removes `token`, `user`, `currentUser`, `devstageUser`, settings cache from localStorage ✓
- Redirects to `login.html` ✓

### Issues
- **Orphan data:** Follows/followers entries in other users' documents are **NOT cleaned** — deleted user's ID remains in other users' `followers[]` and `following[]` arrays ✗
- **No Firebase account deletion** — Firebase Auth user object persists after MongoDB deletion. The Firebase account remains active, and the user could re-create a MongoDB record on next login ✗
- **Dual routes:** Both `DELETE /api/settings/delete-account` and `DELETE /api/users/delete-account` exist and hit the same handler. The frontend only calls the settings route. The user route is redundant.

---

## FIELD SCHEMA vs API RESPONSE vs FRONTEND ALIGNMENT

| Field | Schema | `/api/auth/me` | `settings.html populateUI` | `profile.html applyProfileData` |
|---|---|---|---|---|
| `bio` | ✓ | ✓ | ✓ | ✓ |
| `username` | ✓ | ✓ | ✓ | ✓ |
| `displayName` | ✓ | ✓ | ✓ | ✓ |
| `profilePhoto` | ✓ | ✓ | ✓ | ✓ |
| `location` | ✓ | ✓ | ✓ | ✓ |
| `timezone` | ✓ | ✓ | ✓ | ✗ not rendered |
| `socialLinks` | ✓ | ✓ | ✓ | ✓ |
| `developerTags` | ✓ | ✓ | ✓ | ✓ |
| `followers` (count) | array→count | count ✓ | count ✓ | — |
| `privacy` | ✓ | ✓ via `toAuthUser` | ✗ never read | ✗ never read |
| `feedPreferences` | ✓ | ✗ missing in `toAuthUser` | ✗ no UI | ✗ no UI |
| `projectPreferences` | ✓ | ✓ via `toAuthUser` | ✗ no UI | ✗ no UI |

---

## USER SYSTEM SUMMARY

| Feature | Status | Severity |
|---|---|---|
| Profile Creation (Backend) | ✓ Working | — |
| Profile Creation (Frontend) | ✗ Broken | High — modal never hits backend |
| Profile Retrieval (Backend) | ⚠ Partial | Medium — dual-condition visibility bug |
| Profile Retrieval (Frontend) | ✗ Broken | High — Firestore & MongoDB race for same DOM |
| Profile Editing (Backend) | ✓ Working | — |
| Profile Editing (Frontend) | ⚠ Partial | Medium — base64 bloat, partial localStorage sync |
| Avatar Upload | ✗ Broken | High — base64 in MongoDB, no size limit, remove doesn't persist |
| Avatar Display | ⚠ Partial | Medium — two sources: Firebase CDN vs. MongoDB base64 |
| Bio (Backend) | ✓ Working | — |
| Bio (Frontend) | ✗ Broken | High — Firestore and MongoDB race overwrite each other |
| Username (Backend) | ⚠ Partial | Medium — no format validation at registration |
| Username (Frontend) | ⚠ Partial | Medium — handle derived from displayName, not username |
| Settings — Notifications | ✓ Working | — |
| Settings — Appearance | ✓ Working | — |
| Settings — Projects | ✓ Working | — |
| Settings — Ecosystem | ⚠ Partial | Low — boolean flag mixes with social handles |
| Settings — Security | ✓ Working | — |
| Settings — Advanced | ✓ Working | — |
| Preferences | ✗ Missing | Medium — `platform-settings` dead endpoint, no UI for feed/project prefs |
| Privacy | ⚠ Partial | Medium — 3 overlapping models, 2FA is cosmetic only |
| Account Deletion | ✓ Working | — |
| Post-Deletion Cleanup | ⚠ Partial | High — follower arrays orphaned, Firebase account persists |

---

### ✓ Working (7)
Profile Creation (Backend), Profile Editing (Backend), Bio (Backend), Settings (Notifications / Appearance / Projects / Security / Advanced), Account Deletion

### ⚠ Partial (10)
Profile Retrieval (Backend), Profile Editing (Frontend), Avatar Display, Username (Backend), Username (Frontend), Settings Ecosystem, Preferences, Privacy, Post-Deletion Cleanup

### ✗ Broken / Missing (7)
- **Profile Creation Frontend** — modal is mock-only; register.html redirects to non-existent page
- **Profile Retrieval Frontend** — `scripts/profile.js` (Firestore) and `reflectSettingsData` (MongoDB) race and overwrite the same DOM
- **Avatar Upload** — base64 stored in MongoDB without size limit; removal is localStorage-only
- **Bio Display** — Firestore (`scripts/profile.js`) and MongoDB (`reflectSettingsData`) are competing sources; no write-through from MongoDB to Firestore
- **Preferences** — `feedPreferences`, `projectPreferences` exist in schema but have no UI and the `/api/users/platform-settings` endpoint is never called
- **2FA** — Toggle exists in Security settings and writes to DB, but no TOTP/SMS backend implementation
- **Firebase account not deleted** — `deleteAccount` removes MongoDB user but leaves Firebase Auth entry alive
