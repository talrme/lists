# Lists: AI Handoff

Last updated November 16, 2026. Read this, README.md and FIREBASE_SETUP.md before changes. Keep all three current.

## Location and scope

- Canonical repo: `/Users/talg/Desktop/Websites For Fun/lists`; remote `https://github.com/talrme/lists.git`; main branch; Pages root `https://talrme.github.io/lists/`.
- User requires websites under Websites For Fun. This app is primarily for Tal and Sophie on phones. Ten distinct staging designs were requested; do not choose/promote one until asked.
- The user likes Huck's immediate local settings, organized collapsible settings, clear sync states, subtle compact controls, reduced motion, and X/Escape/backdrop modal dismissal. Do not copy Huck's public database rules or config.
- Firebase web config supplied and stored in config.js: project lists-95c4f, app f5d693806d3319d3098b12. Owner confirmed enabling Google sign-in, authorizing talrme.github.io, creating Firestore and publishing repository rules. Next step is signing in to obtain both UIDs and manually adding listSpaces/home membership. Sandbox data stays separate. Never claim authenticated sign-in, task sync or deployed rule enforcement was tested until those actual checks run. Unconfigured deployments still fail closed if config is removed.

## User decisions and scheduling invariants

Private by default. Assigning to someone shares the task; both can see shared tasks. A later clarification permits shared unassigned tasks too. **ONE random later suggestion per PERSON per day**, from their private tasks + shared tasks assigned to them + shared unassigned tasks. Do not create a separate extra shared suggestion or include tasks privately owned by the partner / assigned only to the partner. Completing a shared task completes it for everyone.

ASAP sticks in Today until done/deferred. Next 5 weekdays randomly schedules once on create/edit, includes weekday today, skips weekends only. Quick Next week instead uses the FOLLOWING Monday–Friday, including Monday presses. Exact future dates arrive in Today when due and then roll over. Later suggestions are ephemeral Today projections, not due dates: don't add them permanently to Today. Persist daily pick identity by uid/date so refresh/device switches don't redraw. Missing pool stores null, no replacement after completing/deleting a pick. A later day may randomly pick the same item again; no recent-avoidance rule was requested.

Waiting is `waiting:true,dueDate:null,followUp:date`; don't draw waiting tasks as later suggestions. At/past follow-up the task reappears Today and stays until handled. Today calculation uses shared Pacific day strings (`YYYY-MM-DD`) via Intl, never UTC midnight or milliseconds-per-day math. Month presets currently mean 30/90 days, explicitly documented. Use `schedule` and `businessDays`, not duplicate UI arithmetic.

## Files

- `shared/core.js`: pure calendar/scheduling, task validation, visibility pool and list selectors; imported by browser and Node tests.
- `shared/app.js`: shared UI, task editor, scope/category filters, settings, daily-pick orchestration, sign-in gate.
- `shared/store.js`: explicitly synthetic device-local sandbox, shared key across all ten options; storage-event updates. This is not real auth/privacy and never talks to Firebase.
- `shared/firebase.js`: dynamically loads official Firebase CDN v13.3.0 only in live mode; Google popup + browserLocalPersistence; household membership then two scoped task listeners; revision transactions and persistent daily-pick receipts.
- `config.js`: public web config, household `home`, environment `staging`, America/Los_Angeles, published URL. All ten live designs use the same staging environment. Promotion should choose a deliberate production data policy rather than silently resetting it.
- `firestore.rules`: verified Google-account allowlist AND member UID check. Two accounts supplied: talrme@gmail.com, sophiegreen2@gmail.com. No public data access. Household document is Admin/console-only.
- `firestore.indexes.json`, `firebase.json`: deployable rules/index declarations, no hosting requirement.
- `tools/build.mjs`: generates root chooser, ten entry HTML files/manifests. All staging apps share logic but have different typography, density, composition, colors, paper/line/shadow treatments, desktop layouts.
- `shared/styles.css`: base components, ten design rules, palette overrides, reduced motion. Existing tiny-card shape is <=8px except round icon/switches. Keep editor mobile-first near top, no keyboard-covered fixed Save footer.
- `tools/serve.cjs`: no-store static preview, port 5195, root and `/lists/` paths.
- `shared/vendor`: locally bundled Lucide and QRCode with upstream licenses copied from Preferences. Do not fetch icons/QR images from external services.
- `assets`: original code-native checklist SVG plus PNG32/180/192/512; Sharp used only at development time.

## Backend shape and safety

```text
listSpaces/home
  memberUids: [TalUID, SophieUID]
  names: {TalUID:"Tal", SophieUID:"Sophie"}
listSpaces/home/environments/staging/tasks/TASK_ID
  title, category(todo|grocery|movies|other), ownerUid, assigneeUid(null|memberUID),
  visibility(private|shared), dueDate(null|date), waiting, followUp(null|date),
  completed, rev, createdAt(client ms), updatedAt(server timestamp)
listSpaces/home/environments/staging/daily/YYYY-MM-DD/picks/UID
  taskId(null|id), createdAt(server timestamp)
```

Private task query: visibility==private AND ownerUid==auth.uid. Shared query: visibility==shared. No collection-wide reads that would fetch the partner's private documents. Shared snapshots can be transiently duplicated while changing visibility; merge by doc ID. Only creator can convert shared to private; owner/createdAt are immutable. Any approved member can edit shared tasks; private tasks belong solely to creator. Rules deny household membership mutation, forged creator, other assignees, malformed shape, arbitrary field injection, stale rev jumps and unauthorized daily-pick pointers. Defaults deny everything else.

Auth email allowlist is not enough alone; membership UIDs are also required. Do not allow self-enrollment/first-user-admin claims from public JS. No service-account secrets in frontend/Git. Google auth persistence normally survives browser close, not incognito/data clearing/revocation, and Home Screen contexts may sign in separately. Popup mode is deliberate for GitHub Pages to avoid third-party redirect storage issues; test real phones when configured.

No real task persistence cache in localStorage. Firebase listeners use memory cache (no enableIndexedDbPersistence). Appearance preferences are localStorage and sandbox tasks are explicitly synthetic. No automatic cross-copy/import from sandbox to real profiles. No poll-based database sync. The 60s visible-tab timer only checks for calendar rollover, with immediate foreground checking. Transaction writes wait for acknowledgment; explicit offline saves fail with draft retained, no hidden offline outbox. Don't claim offline edit support.

First-version scale: listeners load all accessible tasks including completed; archive/paginate for large histories. Daily pick receipt reads/writes are once per person/date, no per-render writes. Per-document tasks/revisions prevent whole-household rewrites. Concurrent stale editor saves fail and preserve the draft; don't switch to last-write-wins. Stable create IDs must survive network retries if an offline outbox is later added.

## Verification and remaining integration

Run pure core tests and Playwright phone/desktop workflow tests; inspect screenshots, all palettes including dark control contrast, 320px width, long titles, dialogs and backdrop dismissal. Browser tests are Chrome emulation and use sample data only. NEVER test by modifying real tasks or turning production rules public. Java/emulator runtime is not currently installed; rule enforcement and live Google sign-in are not yet tested against a deployed project. After config: verify two-browser private/shared isolation, shared edits/completions, reload persistence, sign-out clearing, incognito/third-account denial, daily receipt transaction concurrency and offline retry. Keep that gap explicit in the README/results.

No translation or notification/reminder delivery requested. Don't imply due dates send push notifications or run daily cron. Other categories intentionally only have basic items pending future design.
