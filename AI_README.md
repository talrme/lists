# Lists: AI Handoff

Last updated November 16, 2026. Read this, README.md and FIREBASE_SETUP.md before changes. Keep all three current.

## Location and scope

- Canonical repo: `/Users/talg/Desktop/Websites For Fun/lists`; remote `https://github.com/talrme/lists.git`; main branch; Pages root `https://talrme.github.io/lists/`.
- User requires websites under Websites For Fun. This app is primarily for Tal and Sophie on phones. Ten distinct staging designs were requested; do not choose/promote one until asked.
- The user likes Huck's immediate local settings, organized collapsible settings, clear sync states, subtle compact controls, reduced motion, and X/Escape/backdrop modal dismissal. Do not copy Huck's public database rules or config.
- Firebase web config supplied and stored in config.js: project lists-95c4f, app f5d693806d3319d3098b12. Owner confirmed enabling Google sign-in, authorizing talrme.github.io, creating Firestore and publishing repository rules. Both people signed in far enough to supply their user IDs in the setup conversation; do not reproduce those account identifiers in public handoff documentation. Real household creation has NOT been confirmed. Browser-assisted setup and admin management are now implemented; owner must publish the updated rules, then create home from Settings → Admin → Households. No new user-ID collection or manual Console document is needed. Sandbox data stays separate. Never claim authenticated task sync or deployed rule enforcement was tested until those actual checks run. Unconfigured deployments still fail closed if config is removed.

## Next setup and future admin work

The user prefers a short outline, then ONE detailed step at a time, waiting for their "done" before the next manual step. They are confused by Firebase administration and have asked us to retain this context. Do not repeat completed project/Google/domain/database/rules setup or ask for the already-supplied config/UIDs again.

Implemented: only Tal's verified Google account sees collapsed **Settings → Admin → Households**, including before membership exists. Create our household prefills home, Tal & Sophie and the two known Google emails. Creation checks absence inside a transaction and never overwrites data. New household creates other groups by invited Google email; Manage renames/changes invitations with revision checks, preserving existing task paths. No household-delete action. The owner must publish new rules once before these operations work.

The admin identity is the exact verified Google email talrme@gmail.com, independently enforced in Firestore rules (not a local role flag). No real UIDs are hardcoded in the public application. NEW explicit owner authorization: global admin may read ALL users' personal and shared tasks, member profiles and daily receipts, including households Tal has not joined. This supersedes the earlier metadata-only privacy requirement. Nonadmins retain owner-only personal-task access. Admin writes still require normal membership/ownership rules. The old two-account global allowlist is replaced by per-household invitations so future Google users can enter only households where invited.

Members auto-register their own authorized email/name at members/UID on first entry. That child write cannot create an invitation or grant membership. Registered members appear in assignment options; pending invitees must visit first. Metadata/discovery listeners update invitations; revoking clears task UI, reinviting reconnects. Settings → Account & privacy selects among memberships. Selection is remembered per account; sharing and install manifests carry the household query parameter. Switching clears tasks/drafts and opens To-do/Today/Mine. Guard late async saves/daily picks against an old household updating the new UI.

Existing manual UID/name households still work via a legacy fallback, and explicit Manage saves migrate their access authority to email invitations while preserving UID/name fields and all task paths. Do not silently migrate, wipe or seed a real household. Production/home creation remains the USER's browser action, not something the agent tested by writing live data.

Implemented on explicit request: Settings → Admin → View as user lists registered visitors and existing household member profiles. The real authenticated account stays separate from the viewed subject; never sign in as them or mint tokens. Preview follows their household membership and task queries, including their existing daily receipt; it never registers a member, creates a suggestion, or changes a task/household. Both UI and store mutation methods enforce read-only preview. A persistent banner provides Exit preview. Exiting restores Tal's own membership/household; preview is not saved across refresh or shared in URLs. Appearance preferences belong to the viewing device, not the other person's device. Separate authenticated test profiles/reset tooling remain deferred. This is a project follow-up, not a timed reminder.

The directory upserts on sign-in and includes prior household member profiles when Tal opens the user list. A user with only an old Firebase Auth record and no member/directory profile must revisit before appearing; the public web SDK cannot enumerate the Auth account database. No service-account/Admin SDK secrets are needed.

## User decisions and scheduling invariants

Private by default. Assigning to someone shares the task; both can see shared tasks. A later clarification permits shared unassigned tasks too. **ONE random later suggestion per PERSON per day**, from their private tasks + shared tasks assigned to them + shared unassigned tasks. Do not create a separate extra shared suggestion or include tasks privately owned by the partner / assigned only to the partner. Completing a shared task completes it for everyone.

ASAP sticks in Today until done/deferred. Next 5 weekdays randomly schedules once on create/edit, includes weekday today, skips weekends only. Quick Next week instead uses the FOLLOWING Monday–Friday, including Monday presses. Exact future dates arrive in Today when due and then roll over. Later suggestions are ephemeral Today projections, not due dates: don't add them permanently to Today. Persist daily pick identity by uid/date so refresh/device switches don't redraw. Missing pool stores null, no replacement after completing/deleting a pick. A later day may randomly pick the same item again; no recent-avoidance rule was requested.

Waiting is `waiting:true,dueDate:null,followUp:date`; don't draw waiting tasks as later suggestions. At/past follow-up the task reappears Today and stays until handled. Today calculation uses shared Pacific day strings (`YYYY-MM-DD`) via Intl, never UTC midnight or milliseconds-per-day math. Month presets currently mean 30/90 days, explicitly documented. Use `schedule` and `businessDays`, not duplicate UI arithmetic.

## Files

- `shared/core.js`: pure calendar/scheduling, task validation, visibility pool and list selectors; imported by browser and Node tests.
- `shared/app.js`: shared UI, task editor, scope/category filters, settings, daily-pick orchestration, sign-in gate.
- `shared/store.js`: explicitly synthetic device-local sandbox, shared key across all ten options; storage-event updates. This is not real auth/privacy and never talks to Firebase.
- `shared/firebase.js`: dynamically loads official Firebase CDN v13.3.0 only in live mode; Google popup + browserLocalPersistence; admin metadata/member invitation discovery, selected household listener, self-registration and member names, then two scoped task listeners. Global directory registration is an identity-only upsert; task/daily/household writes are transactions. Reconnect revoked-then-reinvited membership from discovery, not polling.
- `shared/households.js`: pure admin display identity, invitation/slug validation and legacy/new membership helpers; the server still independently enforces privileges.
- `shared/admin.js`: nested Settings admin form/list, create/Manage with revisions, duplicate protection, canonical household-link copying. Never render this for sandbox identities or nonadmin accounts.
- `config.js`: public web config, household `home`, environment `staging`, America/Los_Angeles, published URL. All ten live designs use the same staging environment. Promotion should choose a deliberate production data policy rather than silently resetting it.
- `firestore.rules`: verified Google sign-in + per-household email invitations (legacy UID fallback). Only verified Tal email creates/manages metadata and has explicit task/member/daily-receipt read privileges. Never add a recursive read/write admin rule. A global listUsers directory permits self-registration with exact authenticated email/name and server timestamp, self-read and admin enumeration; registration never grants household access. Member profiles only self-register. Task queries remain scoped to the actual user or explicitly selected preview subject.
- `firestore.indexes.json`, `firebase.json`: deployable rules/index declarations, no hosting requirement.
- `tools/build.mjs`: generates root chooser, ten entry HTML files/manifests. All staging apps share logic but have different typography, density, composition, colors, paper/line/shadow treatments, desktop layouts.
- `shared/styles.css`: base components, ten design rules, palette overrides, reduced motion. Existing tiny-card shape is <=8px except round icon/switches. Keep editor mobile-first near top, no keyboard-covered fixed Save footer.
- `tools/serve.cjs`: no-store static preview, port 5195, root and `/lists/` paths.
- `shared/vendor`: locally bundled Lucide and QRCode with upstream licenses copied from Preferences. Do not fetch icons/QR images from external services.
- `assets`: original code-native checklist SVG plus PNG32/180/192/512; Sharp used only at development time.

## Backend shape and safety

```text
listUsers/UID
  email(authenticated exact Google email), name, updatedAt(server timestamp)
listSpaces/HOUSEHOLD_ID
  schemaVersion:2, title, memberEmails:[invited Google emails],
  memberUids:[], names:{}, createdBy:creatorUID, createdAt, updatedAt, rev
listSpaces/HOUSEHOLD_ID/members/UID
  email(authenticated user's exact email), name, joinedAt
# Legacy memberUids/names are retained when present, not repopulated for new households.
listSpaces/HOUSEHOLD_ID/environments/staging/tasks/TASK_ID
  title, category(todo|grocery|movies|other), ownerUid, assigneeUid(null|memberUID),
  visibility(private|shared), dueDate(null|date), waiting, followUp(null|date),
  completed, rev, createdAt(client ms), updatedAt(server timestamp)
listSpaces/HOUSEHOLD_ID/environments/staging/daily/YYYY-MM-DD/picks/UID
  taskId(null|id), createdAt(server timestamp)
```

Personal task query: visibility==private AND ownerUid==effectiveUser.uid (actual auth user normally, explicit preview subject for Tal). Shared query: visibility==shared. No collection-wide reads that would fetch the partner's private documents. Shared snapshots can be transiently duplicated while changing visibility; merge by doc ID. Only creator can convert shared to private; owner/createdAt are immutable. Any approved member can edit shared tasks; personal tasks are writable solely by their creator and readable by creator plus Tal admin. Rules deny NONADMIN household membership mutation, forged creator, foreign-household assignees, arbitrary field injection, stale rev jumps and unauthorized daily-pick pointers. Shared tasks can still be edited after their previous assignee is removed; changing the assignee requires an active registered member. Defaults deny everything else.

Verified Google authentication is not enough alone: a household invitation is required for normal task access. Tal has a specifically authorized read-only admin exception, not an exception for writes. The server checks email_verified and actual sign_in_provider, not user-editable profile fields. Do not allow self-enrollment/first-user-admin claims from public JS. No service-account secrets in frontend/Git. Google auth persistence normally survives browser close, not incognito/data clearing/revocation, and Home Screen contexts may sign in separately. Popup mode is deliberate for GitHub Pages to avoid third-party redirect storage issues; test real phones when configured.

No real task persistence cache in localStorage. Firebase listeners use memory cache (no enableIndexedDbPersistence). Appearance preferences are localStorage and sandbox tasks are explicitly synthetic. No automatic cross-copy/import from sandbox to real profiles. No poll-based database sync. The 60s visible-tab timer only checks for calendar rollover, with immediate foreground checking. Transaction writes wait for acknowledgment; explicit offline saves fail with draft retained, no hidden offline outbox. Don't claim offline edit support.

First-version scale: listeners load all accessible tasks including completed; archive/paginate for large histories. Daily pick receipt reads/writes are once per person/date, no per-render writes. Per-document tasks/revisions prevent whole-household rewrites. Concurrent stale editor saves fail and preserve the draft; don't switch to last-write-wins. Stable create IDs must survive network retries if an offline outbox is later added.

## Verification and remaining integration

Run pure core tests and Playwright phone/desktop workflow tests; inspect screenshots, all palettes including dark control contrast, 320px width, long titles, dialogs and backdrop dismissal. Browser tests are Chrome emulation and use sample data only. NEVER test by modifying real tasks or turning production rules public. A temporary Java 21 runtime and Google's Firestore emulator JAR were downloaded under /private/tmp/lists-rules-runtime, not installed globally or committed. tests/rules.cjs passed 59 actual permission checks; tests/admin.cjs passed real-SDK browser workflows against the emulator using synthetic Google identities, including all ten 320px light/dark admin forms, nonadmin personal-task isolation, admin user preview with mutation guards/no daily-pick creation, cross-browser completion, household switching, duplicate prevention and revoke/reinvite. Set LISTS_TEST_JAVA and LISTS_TEST_FIRESTORE_JAR if those temporary paths disappear. These tests NEVER point at the production project; rules use demo-lists-admin and UI uses demo-lists-browser. Owner still needs to publish new rules and test actual accounts on live phones: verify two-browser private/shared isolation, shared edits/completions, reload persistence, sign-out clearing, incognito/third-account denial, daily receipt transaction concurrency and offline retry. Keep that gap explicit in the README/results.

No translation or notification/reminder delivery requested. Don't imply due dates send push notifications or run daily cron. Other categories intentionally only have basic items pending future design.
