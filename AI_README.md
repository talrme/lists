# Lists: AI Handoff

Current implementation and maintenance contract, reviewed 2026-11-22. This is not a changelog. Use git history and [VERIFICATION.md](VERIFICATION.md) for past iterations. Keep this file, [README.md](README.md), [AGENTS.md](AGENTS.md), and the one-minute in-app guide accurate when behavior changes.

## Project and Non-Negotiable Boundaries

- Repository: `/Users/talg/Desktop/Websites For Fun/lists`; remote `https://github.com/talrme/lists.git`; branch `main`; Pages `https://talrme.github.io/lists/`.
- All websites belong under Websites For Fun unless the user specifies otherwise.
- The root page is the real app. Staging pages and chooser are removed. Five Appearance styles share the same runtime and data: 1 Clear Day, 7 Daybook, 4 The Edit, 8 Metro, 9 Block Party. Do not regenerate staging sites.
- Firebase project is `lists-95c4f`; `config.js` contains public web config. **Preserve `config.environment='staging'` and all existing real data.** This is a historical production database path, not an invitation to migrate, clear, or seed it.
- No production data mutations for automated testing, no public Firestore fallback, no runtime sample-data mode, no hardcoded real UIDs, and no service-account/Admin SDK secrets.
- Google authentication plus trusted household membership enforce access. Private tasks remain private to their creator, except the explicitly authorized Tal admin read-only preview. Admin reads do not grant admin writes.
- The user approves ordinary pushes unless requesting a local-only preview. Respect any explicit local-only work. Never claim Pages deployment or database rules publication merely because git push succeeded.

## Runtime Map

| File | Responsibility |
| --- | --- |
| `shared/app.js` | Composer, keyed rendering, dialogs, view/audience state, daily pick orchestration, completion overlays, settings and auth gate. |
| `shared/groceries.js`, `shared/groceries.css` | Household shopping UI, compact quantities, catalog CRUD, saved lists, store routes and daily history. |
| `shared/grocery-catalog.js`, `shared/grocery-core.js`, `shared/grocery-store.js` | Curated static defaults, pure commands, scoped listeners and durable idempotent grocery outbox. |
| `shared/core.js` | Pure date keys, business days, schedule selection, list membership, daily pool, task validation and ordering. |
| `shared/organizer.js`, `shared/tag-field.js` | Account settings/tag directory, canonical merges, durable metadata queue and tag picker. |
| `shared/asana-review-core.js`, `shared/asana-review.js` | Local-only admin CSV review, recommendations, decisions/Undo/comments and private backup/restore. |
| `shared/task-fields.js` | Shared create/edit fields, assignment, exact/follow-up dates, description handling and escaped markup. |
| `shared/firebase.js` | Firebase SDK/auth, scoped listeners, revisioned transactions, households, daily receipts, offline replay and sync state. |
| `shared/device-store.js` | Account/household/environment IndexedDB records, atomic queue updates and task projections. |
| `shared/gestures.js` | Vendored Sortable integration, hold-to-drag, directional swipes and surrounding-day reflow. |
| `shared/completion-press.js` | Native-button pointer feedback, captured-touch cancellation and press-time render guard. |
| `shared/day-groups.js`, `shared/day-wheel.js` | Weekend grouping and accessible 1-10-day scroll-snap setting. |
| `shared/visibility.js`, `shared/search.js` | Owner display filters and local title/description search. |
| `shared/motion.js`, `shared/notices.js` | Effect preferences/cleanup and independent Undo notices. |
| `shared/mobile-ui.js` | Drawer swipe dismissal, visual viewport sizing and keyboard-dismiss protection. |
| `shared/updates.js`, `sw.js` | Safe automatic software refresh and allowlisted public-shell/SDK caching. |
| `shared/households.js`, `shared/admin.js` | Identity/invitation helpers and admin household/read-only-preview UI. |
| `shared/playground.js`, `shared/testing.js` | Admin-only isolated Playground validation, examples, reset and UI. |
| `shared/guide.js`, `shared/styles.css` | Brief in-app guide and shared responsive styles/palettes. |
| `tools/build.mjs`, `tools/serve.cjs` | Generate root HTML/manifest and serve a no-store local preview on port 5195. |

Icons, QR generation and sanitized read-only Markdown use vendored libraries. Use the existing Lucide icon set, not remote icon services. The details button is a rounded, thick-stroke double-chevron using theme `currentColor`; internal `leaf-options` naming is historical, not a visible leaf.

## Household Groceries

- Separate household-only workflow. No owner/private/shared, due-date, Today/Week/Later or daily-task-pick logic applies. Legacy category=grocery tasks are untouched and ignored, not migrated/deleted. Returning from background preserves an active grocery screen and draft.
- Catalog: 412 options (399 curated from 884 source PDF bullet entries, plus 13 marked Added staple). No PDF/email metadata/personal-name labels/historical counts are committed. Defaults are 1 each, eggs 1 dozen. Baseline is public app data; household overrides and additions remain membership-protected. No shopping/purchase seeds. The numbered catalog review is a local document outside this public repo; no custom review feature was requested.
- `groceries/{id}` under existing household/environment stores `{type,key,value,rev,updatedAt}`, IDs `type--key`, types item/catalog/list/store. One active item per canonical catalog ID; never silently convert units. Catalog overrides layer over static defaults. Archive rather than destroy history. Saved-list entries snapshot clean values; editing active quantities never edits templates. Duplicate active additions need explicit increase; template adds skip existing unless explicitly enabled.
- Initial stores: Trader Joe's Emeryville and Berkeley Bowl; branch/aisles blank. Route IDs survive renaming/reordering. Unmapped/deleted locations remain visible under Unmapped. Assign item/store locations through catalog. Selected store and category/aisle order remain device-local.
- `groceryPurchases/{uuid}` stores full quantity/unit/name/category/notes/store, Pacific date/time, source item ID and post-purchase revision. All stores on one date form one shop: no session, threshold or End trip. Undo marks a purchase undone and restores only its unchanged inactive item; it cannot overwrite re-added/edited items. Recent shows three days; latest300 purchases have a live query, Older loads more. Frequently bought means >=3 of last10 currently loaded shopping days, not guaranteed full-history analytics.
- `groceryCommands/{uuid}` is an immutable receipt written atomically with results. Retries read it before applying quantity/purchase changes again. No receipt listener. Pure reducers power projection and transaction writes; explicit forms check revisions. Stale conflicts remain reviewable. Do not replace this with blind increments or a single full-household document. Future receipt TTL needs a deliberate maximum offline-retry policy first.
- Cache key `[uid,household,environment,'groceries']`; separate durable outbox contributes to global Syncing, Pending changes, sign-out and update protection. No disk cache in admin preview. Grocery reads start lazily on use or pending recovery; no polling. Network resume retries all queues after enableNetwork. All three outboxes wait for their Web Lock instead of dropping an ifAvailable=false wake-up; keep scope/epoch checks when a queued lock starts. A forced-contention emulator test covers this. Concurrent non-increasing adds/already-purchased checks reconcile as no-ops; stale quantity deltas never resurrect bought items. Explicit stale form edits still require review.
- Preserve native completion cancellation/thumb-side preferences. Live updates must not replace an open form or input. Passive Saved lists refreshes incoming changes. Quantity1 hides steppers until tapped. Purchased means the full quantity.
- Publish rules separately; git push is not deployment. Household members share groceries, admin can read but not write as a nonmember. Rules constrain types/quantities, revisions, receipts and purchase edits. Never make rules public to work around publication.
- Focused tests: grocery.test.js, groceries.cjs, rules.cjs and admin.cjs (actual SDK/demo emulator: two-account quantities, offline cold reload, purchase/Undo and shared-list arrival). No real household test mutations.

## Dates, Lists, and Scheduling

Use Pacific date-only keys via `dayKey` and `addDays`, never UTC-midnight comparisons or milliseconds-per-day arithmetic. Weekdays exclude Saturday/Sunday, not public holidays.

- Visible labels are **Today**, **Week**, **Later**, plus account-opt-in **Someday / Maybe**. Internal `asap`, `today`, `upcoming` and existing element IDs remain for compatibility; do not rename stored modes just to change visible text.
- Today: due/overdue effective dates plus the current daily Later projection.
- Week: effective date strictly after today through `weekHorizon(today)`, the fifth future weekday. Today dates never belong to Week.
- Later: absent effective date or dates beyond that horizon. Explicit weekend dates inside the window still belong to Week.
- Optional task `someday:true` is a separate scheduling state: todo only, dueDate/followUp null, waiting false. Exclude it from Today/Week/Later, taskDay and daily pools, even if an old receipt points at it. Completed view/search can still find it. Hiding the personal tab keeps all data and sharing intact; search finds hidden Someday. Explicit moves to Someday confirm clearing dates/waiting. Moving out restores active scheduling, not an old hidden date.
- Effective date is `followUp` when Waiting, otherwise `dueDate`. Waiting is an overlapping filter, not a fourth scheduling bucket.
- Creating with Week chooses once from `businessDays(today)`: five weekdays including today when eligible. If today is selected, the task appears only in Today.
- Punting from Today uses `businessDays(addDays(today,1))`: five weekdays strictly after today. Every generated punt date fits Week. Do not revert to following-calendar-Monday-Friday logic.
- Later right-swipe and Week left-swipe move to Today. Today right-swipe punts. Opposite directions do nothing.
- Legacy explicit `nextWeek` remains in core for compatibility but is not called by actual punt controls.
- Dates do not reroll on unrelated edits. Manual exact dates retain internal `when=date`; clicking the already-matching timing segment preserves date and Waiting.
- Later approximate shortcuts choose a weekday around two weeks, one calendar month, or two calendar months ahead. Month-end clamps; weekend targets roll forward; choose among two preceding weekdays, target, two following weekdays. Store the resulting exact date.
- Waiting first enables with a one-week follow-up; 3/7/14/30/90-day presets use day offsets. Manual changes deselect presets and show Custom. A resumed saved date also shows Custom.

Do not migrate existing due dates: provenance cannot distinguish an old punt from a deliberate manual date.

### Daily From Later Pick

Exactly one saved pick per person, household/environment, and Pacific day. Eligible tasks are incomplete, nonwaiting To-do items in Later, privately owned by self, shared assigned to self/own email, or shared unassigned. Farther-out dated tasks qualify without modifying their dates. Other people's private/assigned tasks do not qualify.

The receipt stores chosen task ID and server creation time. New empty pools do not write null receipts. Candidate-ID changes retry an empty draw without polling; a legacy null receipt may be filled once under current rules. Nonempty receipt taskId/createdAt remain immutable; owner-only dismissed and sortOrder are editable. Completing, punting, choosing Not today, deleting or otherwise rescheduling the selected item consumes that day's pick; do not draw a replacement. Punting is not completion. The next day may select the same unfinished eligible task.

Only today's receipt projects a task into Today. `isToday` applies that projection only while the task still belongs to Later: punting it into Week must remove the projection. This deliberate Today/Later projection is not Today/Week overlap. Owner DISPLAY filters may be bypassed for the eligible daily pick, never privacy checks. Offline reuses a cached receipt; a new draw waits for a connection. Guard async pick results and cache writes against account/household/environment changes.

## Composer, Details, and Search

- Compact composer first: hamburger left, name field, double-chevron details button right. No large title/date/banner or Plus button.
- Empty timing taps browse. Nonempty home timing taps Today/Week/Later submit immediately without changing view. Enter adds using current-list timing. Modal timing only changes the draft.
- Reuse stable `pendingCreation` ID, date and `creationOrder` rank on retries. New tasks are placed first within their category. Edits do not reset order.
- Default editor is modal; optional inline remains. One editor/composer expansion at a time. Preserve keyed form/input nodes through snapshots so phones do not lose focus, text, or keyboards.
- Add modal moves the SAME composer node into the dialog. Restore the input/actions to their original home before removing temporary header or dialog content.
- Task name is the editable top heading, with muted Task name label, sticky top Save/Cancel and bottom Save/Cancel. Edit has confirmed Delete. Generic duplicate heading/X is hidden only for task forms.
- Add/edit focus Save, not the input; tapping the name opens the keyboard. Search deliberately focuses its input and has no duplicate visible title.
- X/Escape/backdrop on add preserve current-session draft. Explicit Cancel clears it. Do not promise drafts survive browser reload. Dirty inline switches ask before discarding.
- Native dialogs support X/Escape/backdrop. Backdrop dismissal requires both pointerdown and click outside, preventing keyboard resize from closing a draft. Drawer has its own animated close path.
- Phone dialogs scroll within `visualViewport`, with sticky actions. Keyboard dismissal must not cancel the modal; recent-keyboard protection is 650ms. Keyboard-visible lower corners are square at the viewport edge. Physical Android IME/back behavior needs device checks.
- Description is bounded plain text, max 10,000 characters. No rich-edit toolbar. Preserve older text; read-only preview uses restricted Marked + DOMPurify output, no raw trusted HTML, scripts or images.
- Clicking any native date input invokes `showPicker` when available; unsupported browsers retain normal input behavior.

Search uses already authorized task data across categories, ignoring audience DISPLAY filters but not private ownership. Default excludes completed every opening. Opt-in checkbox includes completed after active results, with a Completed heading, checked circles and muted strikethrough. Markers are informational, not completion buttons. Search is case/accent insensitive with substring matching and single-character typo tolerance for terms of at least four characters. All terms must match; query is bounded to 200 characters/12 terms, with at most 100 results. No database query per keystroke. Results open normal edit or read-only admin preview.

## Tags and Desktop Board

Up to 20 validated opaque tag IDs per task. The authorized tag directory has shared and own-private listeners, never a broad partner-private read. Tag labels are NFC/whitespace normalized and case-insensitive for creation suggestions. Private tasks default new tags to Personal, with an explicit Household creation option. Shared drafts strip personal references with a visible explanation. Scope/creator of a tag is immutable. Household members may rename shared tags; no admin write bypass. Personal names never enter partner suggestions.

Canonical IDs follow mergedInto with cycle/missing guards; all labels, counts and filters resolve aliases. Merge archives source, requires a nonarchived/unmerged destination of identical scope, cannot unmerge, never rewrites task history. Rename affects active/completed tasks via ID lookup. Archived tags stay in history and tag search, not new suggestions. Manage Tags lists only readable-task counts; no deletions or automatic sweeping of unused labels. Multi-tag search is AND; typed search includes tag names, completed remains opt-in, no extra reads per keystroke. Bulk editing/formal projects are deferred.

Desktop board is default from 1100px, device-local opt-out. Columns Today (wider), Week, Later, optional Someday; Waiting only is an overlapping board filter. Existing single-list views remain for phones, opt-out, extended Today and Waiting/Completed views. Today is one day on board; requesting extended Today temporarily returns to the day-group layout. Deduplicate daily Later projections into Today and use the visual lane for swipe/quick actions. Sortable passes lane + sourceLane; same-lane reorder must not reschedule a projected pick. Cross-column Week uses five future weekdays excluding today; Later clears due date (waiting uses a later follow-up); Someday clears scheduling after confirmation. Shared task ordering remains shared; the daily suggestion’s Today-only position belongs to its per-person receipt.

## Local Asana Review

Admin-only Settings route; actual adapter checks verified administrator + not in preview for both load/save. No review/task data sent to Firestore. Device record key is `[uid,household,environment,'asana-review']`, property `asanaReview`, no task operations. Account/space epoch guards reject stale-context access; sign-out's existing clearUser purges it. Never embed a user's CSV, notes or backup JSON in source/fixtures/Git. The UI asks the user to select the local file and warns to download a backup before sign-out/storage clearing. No new rules are needed for this feature.

Pinned official PapaParse handles quoted/multiline/BOM CSV as strings (IDs must never become numbers). Reject malformed/duplicate headers, repeated/missing IDs, >10MB, >20k source rows or >3k open rows. Exclude completed rows with a count; preserve all open source detail. Main tasks have no Parent task. Uniquely named active parents receive child context; ambiguous/missing parent names remain visible separately, never guessed. Inputs/notes/comments are escaped as text, never interpreted as instructions, HTML or formulas.

Normalized-title and conservative token-overlap candidates are suggestions, not auto-merges. Money/paperwork, ideas, older-created and past-source-date filters do not assert urgency, relevance or completion. No automatic date mapping or assignment. Review decisions are keep + proposed destination, skip, defer, or merge into another kept main task. 20 items/page, explicit selections/bulk actions, confirmed Combine, 50 decision Undo snapshots, optional per-row comments. Originals stay intact. Re-deciding a merge primary releases its sources for re-review. Durable local saves serialize actions; failures retain the previous saved review and show errors. Restored JSON is validated and its untrusted Undo history discarded.

Save review file downloads full private JSON including source/decisions/comments but no Undo history. Restore and replacing/removing a review confirm first. Downloading/marking Keep is NOT importing. Review UI is a visible form so software updates protect ongoing review interactions. Test only synthetic fixture/emulator writes.

### Explicit Prepared Import

Separate Admin -> Asana -> Import prepared tasks accepts `{kind:'lists-asana-import',version:1,tasks:[{sourceId,title,description,destination,waiting}]}`, with 1–400 unique numeric-string source IDs. Raw CSV/review files are not accepted here. Only selecting the file previews counts and escaped full details; explicit Import is required to write. `?import=asana` only opens that dialog for the actual verified administrator after the household is ready. It never uploads anything automatically.

The actual adapter enforces administrator + nonpreview + online/server-ready + no pending changes, captures UID/household/environment/epoch, and creates only private tasks for the authenticated account. It reads every stable `asana-SOURCE_ID` before writes, skips existing own records without overwriting edits/completion, rejects other-owner collisions, and commits missing records atomically. Full descriptions and field types/lengths are validated; file-supplied identities, dates and arbitrary keys are not trusted. Today is Pacific today; Week cycles the next five weekdays excluding today; Later/Waiting/Someday remain undated. Source dates are discarded. The caller preparing a file must explicitly exclude completed tasks/subtasks according to user instructions.

Server readback verifies all newly created fields. The importer reports created/skipped totals; retries never modify existing records. Source files are not persisted by this screen or placed in public assets/Git. Importing blocks automatic updates even if its modal closes, and active saves block sign-out. The matching optional-Waiting rules still require separate publication. Synthetic browser tests cover menu/deep link/file confirmation/XSS/phone sizing; the actual-SDK demo-emulator suite tests a 261-task batch, retained descriptions, repeat IDs after edits, nonadmin and preview denial. Do not claim a real import occurred until the real server acknowledges it.

## Completion, Motion, and Undo

Completion is optimistic UI, not fake backend success:

Auto completion layout puts a muted check in a 56px-wide right-hand target below 768px, and preserves the left circle on larger screens. `prefs.completionSide` is device-local auto/left/right, configurable in list settings. Phone Left is also wide; desktop Right is wide. DOM button order matches the chosen side; text remains edit-only. Style 7 dividers, style 8 rails and tag indentation follow the actual control position.

The press controller retains native click/keyboard activation. Pointer-down fills the target immediately; leaving it permanently cancels that press, including re-entry. Pointercancel, scroll, blur, Escape, context menus, extra touches and workspace changes cancel too. Suppress any resulting captured-pointer click until a new press; do not suppress keyboard/assistive clicks. Pause keyed rerenders/software updates while held, release on click or a 250ms fallback if no click arrives. This is not a completion delay. The normal click handler compares the displayed checked state to the latest task before toggling, so remote completion while held cannot accidentally reopen it. Swipes/Sortable already exclude task-check controls.

1. While pressed, an enabled incomplete task button previews a checkmark.
2. Release adds a per-ID `pendingCompletions` overlay and busy guard, removes/reopens the row immediately, and starts completion confetti/travel before awaiting `store.write`.
3. Keep the source task array authoritative; overlay only completed state for rendering. Independent IDs can save concurrently.
4. On acknowledgement merge completed/rev only when not superseded, never insert an absent task, then offer revision-checked Undo.
5. On rejection remove the overlay, render latest saved state and show an error. Remote deletion must not resurrect a task.
6. Workspace reset clears overlays/notices; epoch checks suppress stale results. Keep busy until settled so auto-update cannot interrupt a save. Pending rows cannot be re-edited or quick-acted.

Confetti does not prove server persistence; offline local acknowledgement is distinct from server sync. Add travel also starts after validation but before server acknowledgement; failed creation retains its draft. Ordinary single online saves do not flash the sync bar; reconnecting, queued changes and errors remain visible.

Completion exit uses an inert, fixed-position departing node (~220ms), not a duplicate interactive row. FLIP closes gaps; retarget existing `lists-reorder` animations from current visual positions for rapid clicks. Skip layout animation around active editors. Respect Off/reduced-motion and cancel effects when hidden.

Eight device-local effects: confetti, travel, arrival, reorder, navigation, dialogs, taps, ambient. Off/Light/Medium/All out presets; individual choices select Custom. Medium is default. Migrate old off/gentle/playful preferences; do not override explicit Off. Particle limits are 28 Medium/64 All out; entrance stagger is capped at 16 rows. Animations never drive backend synchronization.

Notices: at most four, newest at bottom; six seconds with Undo, 3.5 seconds otherwise. No X. Horizontal touch swipe dismisses only that notice; vertical scrolling and Undo buttons remain independent. Short swipes restore it. Hover/focus pause only its timer. Same-task actions invalidate that task's older Undo, not unrelated notices. Undo captures ID, expected revision, patch and workspace epoch; never overwrite newer edits or cross account/household boundaries.

## Navigation, Settings, and Ordering

Drawer: Search; Today only/Next N days/Waiting/Completed; Settings/Save-Share; compact View tasks in filters; Quick guide; account/sign-out at bottom. Left swipe, backdrop, X and Escape close it smoothly; vertical scrolling stays native. Filter row sits above Quick guide, uses checklist for Private and bracketed member/Unassigned circles under Shared. Tapping filters leaves the drawer open.

Audience choices are account-synced per category in `listUsers/UID/preferences/main.audiences`, mirrored into `prefs.lists[category].audiences[uid]` for rendering. Defaults are own private + own assigned shared. Other owners and unassigned shared are opt-in, except eligible daily projection. Pending email keys normalize to registered UIDs without undoing explicit choices. Independent privacy checks always apply.

Back to my Today tasks appears for Waiting/Completed, active extended Today, or nondefault audience; not solely Week/Later. It restores single-day Today plus own private/shared. Cold launch and safe foreground resume return to Today while retaining saved days/audience; never discard an open dialog, draft, drag or save. Foreground reset requests can be deferred until safe.

Appearance first/open; current-list settings second/open; then animation, audience, offline, account, scheduling and admin groups. Style, palette, showSomeday and audience settings apply immediately and queue to the account settings document; cache by UID, never copy another account's settings. Animation, gestures, editor, days and desktopBoard remain device-local; help buttons expand descriptions and must not intercept normal section-toggle clicks.

- Styles: 1 Clear Day, 7 Daybook, 4 The Edit, 8 Metro, 9 Block Party. Palettes: Original, Garden, Cherry, Night.
- `quickWeek=null` means responsive auto: hide Quick Action below 768px, show above. Explicit boolean overrides. One-time migration preserves old false and resets implicit old true to auto.
- `extendedDays` is the menu/expander count (1-10, default 5); `daysShown` is the active view. The snap wheel supports tap, scroll, arrows, Home/End; ignore disconnected callbacks and commit visible choice on close.
- Changing the count updates an already-expanded view; collapsed stays one day. Bottom toggles between Show N days and Show today only, not incremental growth. No footer Settings/View/Waiting/Completed utilities.
- Expanded Today intentionally previews future tasks. Group Saturday/Sunday as Weekend; extend Saturday endpoints through Sunday. Sunday-start views never include yesterday. Use identical group endpoint logic for filtering and rendering.

SortableJS is vendored. Whole-row hold is 150ms, movement tolerance 6px; no visible drag dots. Keep ordinary vertical scrolling, taps and directional swipes separate. Freeze keyed rerenders during actual drag/save, not day container height. Source/target rows use Sortable animation; RAF-batched FLIP moves surrounding headings/other days as destinations grow. Never restore clipped nested day scrolling or the old drop-then-snap-back animation.

Move only sortOrder and effective due/follow-up fields as needed. Within-Weekend reorder preserves the exact existing date; entering Weekend uses its first visible day. Alt+M opens accessible Move options. Task sortOrder is shared across devices AND household members; per-user ordering is not implemented. Fractional insertion writes one task; exhausted ranks renumber destination rows atomically (max 400). Successful reorder/date drag is quiet, not an Undo notice; errors restore saved state.

## Backend, Identity, and Privacy

Firebase SDK is dynamically loaded from the official CDN (version lives in `shared/firebase.js`). Google popup sign-in uses browserLocalPersistence. Normal listeners query own private tasks separately from shared tasks and merge by ID; no broad task reads that fetch a partner's private data. Directory registration records identity only, never grants membership.

```text
listUsers/UID
  email, name, photoURL?, updatedAt

listSpaces/HOUSEHOLD
  schemaVersion: 2, title, memberEmails, createdBy, createdAt, updatedAt, rev
  legacy memberUids/names may remain

listSpaces/HOUSEHOLD/members/UID
  email, name, photoURL?, joinedAt

listSpaces/HOUSEHOLD/environments/staging/tasks/TASK
  title, description?, category, ownerUid, visibility,
  assigneeUid, assigneeEmail?, dueDate, waiting, followUp,
  completed, sortOrder?, someday?, tagIds?, rev, createdAt, updatedAt

listUsers/UID/preferences/main
  style?, palette?, showSomeday?, audiences?, updatedAt

listSpaces/HOUSEHOLD/environments/staging/tags/TAG_ID
  name, visibility, ownerUid, archived, mergedInto, updatedAt

listSpaces/HOUSEHOLD/environments/staging/daily/YYYY-MM-DD/picks/UID
  taskId, createdAt, dismissed?, sortOrder?
```

Creator `ownerUid` and `createdAt` are immutable. UI Task owner means assignee, not creator. Personal tasks are writable only by creator; approved household members can edit shared tasks. Only creator may make a shared task private. Rules enforce verified Google identity, invitation/membership, allowed fields/assignees and rev+1. Waiting permits a null followUp (undated Later); dueDate must still be null, and a nonwaiting task cannot carry followUp. Saving/editing an undated Waiting task must not invent a date. This needs the matching published Firestore rules.

Invited-but-unregistered assignment uses optional `assigneeEmail` with null UID, not an unassigned task. Shared invitation validation applies independently in rules. After registration, old email-assigned tasks remain visible; editing can convert to UID and explicitly clear email. Unrelated edits preserve historical assignments after invitation revocation, but new assignments to revoked users are denied. No bulk migration or polling.

Profile photos use validated HTTPS Google user-content URLs only, with initials fallback. Photo fields are never authorization. Older rules can fall back to name/email registration; description/order/assignment features still need matching current rules and must fail visibly without losing drafts.

Tal's verified Google identity is checked by `isAdministrator` and independently by rules. Admin can create/manage household invitations and explicitly READ all users' personal/shared tasks, profiles and daily receipts via read-only View as user, even outside Tal's memberships. Do not broaden this into recursive access or write impersonation. Real authenticated account and preview subject remain separate. Preview never registers members, creates daily picks, mutates data or persists preview tasks; a persistent banner allows Exit preview. Returning restores the real account. Directory lists registered visitors/profiles, not all Firebase Auth users.

Legacy UID-based households remain supported; explicit Manage may migrate authority to invitations without changing task paths. Discovery handles revocation/reinvitation; switching households clears workspace state and guards late async results.

The owner has published earlier rules, but latest deployed revision is not proven by git push or emulator success. Compare against repository `firestore.rules` for permission issues, including null-receipt fill. Give manual Firebase instructions ONE step at a time, waiting for done. Do not repeat completed project/domain/config/UID setup or claim production test coverage from mocks.

### Isolated Playground

Admin -> Testing is the only supported test workspace. Require reserved ID `playground`, kind marker and valid UUID `playgroundRun`; environment is `playground-UUID`, never production staging. Setup/seed/reset re-read and validate metadata transactionally. Admin invitations retain Tal. A legacy ordinary household with that ID must not be overwritten.

Explicit seed writes missing stable per-user [Test] examples for the real authenticated user only; never overwrites edited examples. Reset revision-checks metadata and rotates the run UUID, retaining old rounds, never deleting home tasks. Listeners switch namespaces; stale queued operations cannot upload to a different run. Profiles remain shared across rounds. Preview cannot mutate Playground. Never infer a real Playground was created/seeded from emulator success; production admin actions are deliberate user choices, not an automated test fallback.

## Offline and Sync Contract

Firebase cache stays memory-only; the app owns project-specific IndexedDB snapshots/outbox. Keys are JSON `[uid, household, environment]`, plus account/household pointers. Validate exact scope and cached membership before restore. Cache stores authoritative snapshots, metadata, receipts and FIFO operations. Preview data is never persisted. Known revocation blocks restoration and clears cached tasks while retaining pending operations for recovery; offline cannot learn revocation until reconnect.

Online writes retain expected-revision transactions. Offline/unsynced changes enqueue stable creates or changed-field patches, acknowledged only after the IndexedDB transaction commits. Schedule fields and assignment fields move as coherent groups. Replay waits for server readiness, transactionally merges latest state with rev+1, preserves unrelated fields and uses last-uploaded-field wins for conflicts. Missing edited/deleted tasks stay deleted; create collisions fail; multi-row ordering stays atomic.

Use navigator.locks where available to serialize cross-tab flushes and BroadcastChannel for same-scope cache changes. Only a nonempty transient-failure queue retries after 20 seconds. No periodic task polling. The visible-tab 60-second timer checks Pacific day rollover only.

Foreground/online resume SDK networking and queued uploads. Sign-out blocks until current-account pending operations finish, then purges that account's cache. Review/discard pending operations does not delete server tasks. Admin setup requires online access. Background/closed-app uploads, first-time offline login, unvisited households, and browser storage retention are not guaranteed.

Metadata uses the same IndexedDB database but separate keys `[uid,'preferences']` and `[uid,household,environment,'tags']`, each with values and its own FIFO operations. Never pass metadata operations to task projection/replay. Organizer's per-account navigator lock serializes uploads across tabs, captures scope/generation, and uses merged partial setDoc writes. Own account preference document and authorized tags have listeners. Metadata queues participate in pending inspection/discard, sign-out protection, software-update guards and sync display. Preview reads are not cached and never write. Transient pending failures alone retry after 20 seconds; there is no periodic metadata polling. Rule errors retain queued changes with publication instructions. Task schedule replay treats someday/dueDate/waiting/followUp coherently.

The worker caches only allowlisted public shell files and exact app/auth/Firestore SDK modules; query strings are normalized only for those URLs. Never cache auth/Firestore API responses or private task data. Legacy staging bookmarks redirect to root, preserving household. Share links/manifests preserve household and existing install identity; do not accidentally change manifest IDs and create duplicate installed apps.

## Automatic Software Updates

Downloads run silently in the service worker; UI stays usable, not frozen or inert. Only the final page reload restarts the interface to execute new JavaScript. Do not claim that background caching silently replaces already-running code, or introduce production hot swapping for a copy change.

One automatic path, no Reload prompt/button. Immediately when downloaded and there is no unfinished edit, active gesture or pending save, show passive **Updating to latest software version...**, activate, recheck pending work/edit version on controllerchange, then reload once. Status is noninteractive (`pointer-events:none`), not a modal. Each tab protects its own drafts even if another tab activates the worker.

A namespaced sessionStorage timestamp confirms **Software updated** for 2.5 seconds after reload; consumed once, 30-second TTL, no auth/task data. Storage failure only omits confirmation. First install must not loop/reload unnecessarily. Returning checks immediately; there is no idle grace period.

Actual edit events trigger a fresh check, and a local-only 250ms fallback notices when background saves clear. Checks run only while a downloaded update waits and the page is visible/online. Mouse movement/scrolling, Undo, empty focused fields, read-only dialogs, preview and a sync error with no pending work are not blockers. Visible unfinished forms, composer text/date/assignment drafts, active gestures/transitions and genuine pending saves remain protected; durable pending operations are checked asynchronously and revalidated. A refresh can end an otherwise available Undo opportunity. Network checks on startup/foreground/reconnect/interaction are throttled to 60 seconds. Activation timeout after eight seconds hides status and backs off 30 seconds. Exceptions keep the working app available. A late controllerchange still cannot discard a draft. Older installed JS can show its old update UI once until the new updater itself is installed.

For shell edits, bump CACHE in `sw.js`, HTML/app/module query versions where relevant, generator sources and matching offline test expectations; run the build. Read actual files for current version numbers rather than appending version histories to documentation.

## Verification and Development

```sh
npm run build
npm run serve
npm test
node --test tests/device-store.test.js tests/motion.test.js
```

Preview: `http://127.0.0.1:5195/lists/`; `PORT` overrides the port. Browser suites need Playwright and Chrome. Security/SDK suites need Java 21 and Firestore emulator JAR via `LISTS_TEST_JAVA` / `LISTS_TEST_FIRESTORE_JAR`. Use only local `demo-*` projects and synthetic identities/data.

| Change | Relevant browser suites |
| --- | --- |
| Someday/tags/preferences/board | `organizer.test.js`, `organizer.cjs`, `rules.cjs`; `admin.cjs` includes two independent same-user browsers and offline preference replay. |
| Asana review/import | `asana-review.test.js`, `asana-review.cjs`, `asana-import.test.js`, `asana-import.cjs`; `admin.cjs` verifies actual adapter storage, 261-task import/readback/idempotence and nonadmin/preview denial. No production CSV in fixtures. |
| General UI/styles | `production.cjs`, `phone-ux.cjs`, `task-header.cjs`, `guide.cjs` |
| Scheduling/daily/search | `week-punt.cjs`, `menu-later.cjs`, `creation-search.cjs`, `instant-completion.cjs` |
| Completion/animation/notices | `instant-completion.cjs`, `motion.cjs`, `feedback.cjs` |
| Completion side/press safety | `completion-target.cjs`: actual CDP touch, drag-away/re-entry/Escape, remote-state race, keyboard, side persistence, theme/layout checks. `touch.cjs` uses a fixed weekday for its empty-Tomorrow drag scenario. |
| Gestures/grouping | `touch.cjs`, `day-layout.cjs`, `drop.cjs` |
| Caching/updates | `updates.cjs`, `offline-shell.cjs` |
| Privacy/households/offline replay | `rules.cjs`, `admin.cjs` against local emulator |

Run files as `node tests/NAME.cjs`. Test helpers use real menu routes; do not restore removed controls to satisfy obsolete selectors. `tests/fixtures/store.js` is loaded only by intercepted test responses, not public application code or URL flags. Historical ten-iteration test logs are not evidence of ten staging pages.

Inspect phone/desktop screenshots, all palettes, narrow 320px overflow, motion-off behavior, modal dismissal and draft stability. Actual Google OAuth, physical Android/iPhone keyboard/install/storage behavior and the currently deployed production rules remain separate manual checks. Do not imply mock or emulator results prove those.

Listeners currently load all authorized tasks, including completed; larger histories may later need archiving/pagination. No cron, push reminders, translations, public sandbox, admin write-as-user, or separate authenticated fake-account system is implemented. Use the approved Playground with real invited Google accounts.

## Stable Rendering and Daily Suggestion Controls

Rendering never temporarily reveals the board toolbar/day controls while measuring rows. Skip FLIP on hidden/initial data, workspace/layout/view changes and initial daily projection. List selection does not call staggered entrances. Motion snapshots distinguish painted from untransformed geometry; if a layout target is unchanged, keep the active move rather than canceling/restarting it. Unchanged appearance settings do not clear live motion. Completion/confetti and task flights remain supported; preserve reduced motion and immediate optimistic completion.

Daily suggestions use an effective Today-only rank: after ordinary Today tasks unless the receipt has a custom sortOrder. Never write that rank into the underlying Later task. A daily reorder writes the receipt; moving an ordinary item below the suggestion fixes its current receipt rank before changing the ordinary task. Not today writes dismissed:true on the same pick; Undo writes false. Neither replaces the original taskId nor edits the source task. A single scoped receipt listener propagates dismissal/position; cache pickStates per account/household/environment/day, clear subscriptions on switch/sign-out, and never cache preview reads. Legacy id-only receipts/caches still work. Receipt writes require online access and owner UID, validate the expected pick and workspace epoch, and need separately published rules. Never claim an offline action was queued if this online-only write fails.

Run tests/steady-lists.cjs for 15 style/phone/desktop-list/desktop-board cases: quiet hydration/switches, monotonic completion under repeated sync, one FLIP per target, bottom-first daily pick, personal reorder/reload, Not today/Undo/no replacement and unchanged Later data. Actual-SDK tests/admin.cjs covers two-browser receipt dismissal/reload/Undo/offline cache; tests/rules.cjs verifies owner-only receipt updates and immutable pick IDs.
