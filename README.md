# Lists

**Live website:** [talrme.github.io/lists](https://talrme.github.io/lists/)

**Repository:** [talrme/lists](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie. Ten fully interactive staging designs use Google sign-in and the same live household data, so you can compare layouts without re-entering tasks.

## Try the designs

Open the live website to pick from Clear Day, Ticket Office, High Tide, The Edit, Little Wins, Command Line, Daybook, Metro, Block Party and After Hours. Each lives in `staging/01/` through `staging/10/`.

**All staging designs are live.** Every design link requires Google sign-in (or reuses your existing session). Changes affect the same real household tasks across all ten designs; these are layout options, not isolated databases. There is no local sandbox, pretend-person switch, or unconfigured fallback. The approved admin-only Playground is a separate, explicitly selected test household. Old local sample data is ignored, never uploaded or automatically deleted. Legacy mode query parameters no longer select a different backend.

Each design's **Open** link connects to Firebase project `lists-95c4f`. The owner confirmed publishing the admin/household rules. The newer description/avatar/task-order/Playground schema needs one further rules publication; see FIREBASE_SETUP.md. There is no public-data fallback. Grocery, Movies and Other lists have working basic add/edit/complete/remove functionality; To-do has the full scheduling workflow.

## Firebase setup

**Setup progress:** the owner confirmed publishing the admin/user-preview rules. Publish the latest file again to enable description, Google-photo, synced task-order and Playground metadata fields. If a household has not yet been created, sign in as Tal and open **Settings → Admin → Households → Create our household**. Review the prefilled Tal/Sophie emails and save. No manually copied user IDs or database fields are needed. The Admin section exists only for Tal's verified Google account, is collapsed at the bottom of Settings, and is enforced by server rules. It is available before household membership is created. Admin also includes **View as user**, a read-only preview of registered users' personal and shared tasks, explicitly authorized by the owner. True sign-in impersonation and editing on behalf remain deferred.

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed, click-by-click instructions. No Google Sheet or Apps Script is involved.

For a fresh installation, register a Firebase web app, enable Google sign-in, authorize `talrme.github.io`, create Firestore in production mode and publish the supplied rules. Those project steps are already done here; only the new schema rules update and, if needed, browser household creation remain. The public configuration is in the repository. Nothing gets pasted into a phone.

Local auth persistence keeps sessions across normal closes. The public Firebase web configuration is saved permanently in the repository; no per-phone configuration is needed. Actual mobile sign-in, household membership and deployed privacy rules still need checking with authenticated accounts.

## Task behavior

**Latest controls:** descriptions are now plain text, without formatting buttons/preview. Date is a compact, initially empty field: clicking inside opens the native picker. Waiting for a response is above Date and replaces it with Follow-up date, 3 days / 1 week / 2 weeks / 1 month / 3 months and a small date box. A manually selected follow-up clears the presets and displays Custom (months mean 30/90 days).

**Sharing fix:** invited people now appear immediately, without needing to visit that household first. The home household shows Tal, Sophie and Unassigned. Pending assignments use the invited Google email and work on that person's first visit; registered accounts continue using real UIDs. **Publish the latest firestore.rules once in Firebase Console to enable this.** It does not make the database public or require a migration. The agent has not deployed production rules.

**View:** For me is the default in every list: own private tasks, shared tasks assigned to you, and shared unassigned tasks. Shared uses person buttons instead of a dropdown. Both views means your private tasks plus all household shared tasks; it never includes another person's private tasks. View preferences remain local per list.

- **Private by default.** Shared initially selects the signed-in person; choose another invited member or Unassigned. Shared rows display the assignee's avatar; personal rows have none. For me / Shared / Both views have explanations and person-button filters. Other household members cannot read your personal tasks; **Tal, the administrator, can view all users' tasks** through an explicitly labeled read-only preview.
- **ASAP:** due today. Unfinished due tasks stay Today on subsequent days.
- **Soon (next 5 weekdays):** randomly chooses one of the next five Monday–Friday dates, including today if it is a weekday. Selection happens once when saving, not on every render. Weekends are excluded; holidays are not.
- **Sometime later:** no due date. Each person gets one random daily suggestion from their private later tasks, shared later tasks assigned to them, and shared unassigned later tasks. Waiting/completed/dated items and other categories are excluded. The selection is stored once per person per day, consistent across devices, and does not give the task a permanent due date. Two people can draw the same unassigned shared task; completing it completes it for both.
- Suggestions are chosen on the first visit after the date changes, not by a scheduled server job. An empty pool records no suggestion for that day. Completing/deleting/rescheduling a suggestion does not draw a replacement that day. At the next day boundary, an untouched suggestion returns to Later; it can be randomly chosen again on a later day. Editing it to ASAP pins it in Today.
- **Defer (curved-arrow button or right swipe):** randomly chooses Monday through Friday of the following week, starting with the next Monday. Using it on a Monday skips to the following Monday's week; on Saturday/Sunday it uses the approaching Monday's week. Existing scheduled tasks do not change retroactively. Swipe right past the threshold and release to save, or slide back to cancel. Swipe-to-defer is on by default and can be switched off in Settings → Today view.
- **Waiting for a response:** removes the current due date, puts the item in Waiting, and sets a follow-up. Presets: 3/7/14/30/90 days or exact date. It returns to Today on that date and rolls over if still unfinished.
- Completed tasks can be reopened from the checkmark tab. Tasks can be edited or removed, with confirmation before removal. Deleting a shared task affects both people. Concurrent stale edits are rejected instead of silently overwriting a newer revision.

The household's day is **America/Los_Angeles**, including daylight saving. A local-only minute check notices midnight while open; opening/foregrounding checks immediately. It is **not** a network polling timer. Keep both phones' clocks accurate.

## Sync and privacy

Completion, reopening, Defer and Move offer **Undo** in a compact bottom notice with the task name and an X to dismiss. Up to four recent notices stack above navigation; each action lasts six seconds and pauses while hovered or keyboard-focused. General notices last 3.5 seconds. Undo changes only its action's fields, checks the saved revision, and refuses to overwrite newer edits. A new action on the same task replaces its older notice, avoiding misleading Undo choices. Dismissal does not undo anything; switching account/household clears the stack. Completed tasks can always be reopened later from the checkmark tab.

Completing a task briefly shows its checkmark and fades/slides the row away while the remaining tasks glide up. This uses the existing Smooth completion & list rearrangement setting (included in Light/Medium/All out), never delays the write or Undo, and is skipped with animations Off or reduced motion. Failed saves leave the task in place.

**Settings → Today view → Days to show** accepts 1–14 calendar days (default 1), saved on this device. Multiple days appear as a vertically scrolling agenda with dated Today/Tomorrow sections and empty drop targets. Overdue tasks and today's random nudge stay under Today; future due tasks/follow-ups appear under their actual dates and can also appear in Upcoming/Waiting. Future daily random suggestions are not pre-drawn.

Hold a task for 350ms to lift it, then drag up/down or between displayed days. There are no drag dots. Ordinary taps still edit and quick vertical gestures scroll. Completion/defer controls and open editors do not start dragging. Task details also offer a Move icon for accessible Move up / Move down / Move to date controls. Within a date, dragging changes order; between dates, it changes the due date (or follow-up for a waiting task). Order and dates sync through Firestore. Order uses optional numeric sortOrder; older tasks still work. Most drops write one task; rare equal/precision-exhausted ranks are renumbered in a revision-checked transaction. **Publish the updated firestore.rules before using synced drag ordering**; permission failures revert the visual move. No new background sync or polling.

Swipe **right** to Defer. The task follows your finger with no early travel cap, revealing the action underneath. Release after about 28% of its width (threshold bounded to 72–120px) to commit; shorter/reversed swipes cancel. The whole card can slide away, but you do not have to reach the edge. The row's curved forward-arrow icon does the same action. Settings → Today view can turn right-swipe deferral off. Both paths use the following week's Monday–Friday schedule.

Firestore uses two live listeners: the signed-in person's private tasks and household shared tasks. Each task is a separate document; individual edits do not rewrite the whole list. Stable document IDs and revision-checked transactions prevent retries from duplicating task creation or overwriting newer edits. Writes must be acknowledged before the UI reports success. Offline mutations are not queued in this first prototype: reconnect and retry; an editor keeps its draft on failure.

No 15-second polling. No persistent Firestore disk cache for private tasks. Google session persistence and device-only appearance preferences are separate from task data. Signing out clears in-memory tasks. Household members can edit shared tasks, but only their creator can make them private again. Only Tal's verified Google identity can manage household membership, enforced by rules; other clients cannot self-enroll or promote themselves. A public GitHub Pages URL does not expose protected Firestore data; configuration values in JavaScript are not secrets. Rules, not URL secrecy or UI filters, enforce access.

### Multiple households

Tal's **Settings → Admin → Households** supports creating named households, inviting Google emails, editing names/invitations and copying household links. Creation refuses to overwrite existing households; concurrent edits require the current revision. There is no household delete button. Tal can create a household for other people without joining it. **Settings → Admin → View as user** lists registered visitors and opens their personal/shared task view with an Exit preview banner. The real Google sign-in never changes. Preview disables task edits/completions and reads the existing daily suggestion without creating one. Users with multiple households can be previewed in each; local color/action preferences remain those of the viewing device. Directory entries register on an updated-app visit, with existing household member profiles included as a fallback. It does not enumerate never-registered Firebase Auth accounts. Adding Tal as a household member remains an explicit invitation choice, not automatic.

Every invited verified Google account can enter its household and is assignable before visiting. On first visit, it registers its own email/name/photo. Other users never get the Admin section. Members with several households choose under **Settings → Account & privacy → Household**. Selection is remembered per signed-in account/device; share links and installed app start URLs include the household. Tasks and daily suggestions are scoped to each household. Switching clears old task data/drafts and opens To-do/Today with that device's saved To-do visibility preference. Revoking an email stops access; reinviting restores it without deleting tasks. Existing manually created UID/name households remain supported and can be explicitly updated through Manage without moving their tasks.

The first prototype listens to all of your private tasks and all household shared tasks, including completed ones; reads/memory will grow with history. Before years of heavy use, archive completed tasks and use indexed status/date-window queries. Daily-pick receipts are tiny but also accumulate. Do not introduce a global database listener or per-second writes.

## Phone settings

Each design starts directly with the add field and ASAP / Soon / Later timing segments. No logo/date/category heading or top Mine/Shared controls. A chevron reveals description, privacy/assignment, exact date and waiting/follow-up options. Household/connection notices are at the bottom, not above the task list.

Descriptions use a plain text area (10,000 characters). Existing text and Markdown are preserved; read-only admin descriptions retain sanitized rendering. A subtle ellipsis marks tasks with details. No raw user HTML is trusted or description images loaded.

Task details default to inline expansion. The expand icon transfers the SAME unsaved draft into a modal. Settings → [current list] settings can choose Inline or Modal, independently for To-do, Groceries, Movies and Other lists. View preferences are also per list; color and animation choices apply across the app. Inline editors preserve draft nodes/focus during listener updates, warn on changed/deleted tasks, and require confirmation before discarding a dirty draft via navigation. Waiting is edited inside details, never a quick action on a task row. The separate defer icon can be toggled under To-do settings.

Only one task form can be expanded at once, including the top add form. Opening another closes the current form; unsaved work requires discard confirmation first. The expanded add form has Save and Cancel, while the plus button still saves. Cancel or its up-arrow clears the unsaved task and collapses it. Both save buttons share the same pending-save guard, so they cannot create duplicates; failed saves keep the form and draft open. Existing task editors retain their inline-to-modal expand icon.

Each design offers Original / Garden / Cherry / Night palettes. **Settings → Animation settings** has Off / Light / Medium / All out presets, eight individual effect switches, and a Try it out button. Individual changes show Custom. Medium is the default; existing Off/Gentle choices migrate to Off/Light. All out adds bigger confetti bursts and idle icon wiggles. Settings apply immediately and save only on this device. Reduced motion overrides all effects, and backgrounding stops active effects.

Effects include completion confetti, a checkmark flying toward Completed or Upcoming, new-task bounce, smooth list rearrangement, staggered tab/list entrances, springy dialogs, button pops and optional idle wiggles. Completion/add/defer effects wait for successful saves; incoming sync updates never trigger celebrations. Effects never delay writes or add database traffic, and open editors are excluded from list rearrangement. Dialogs close on X, Escape, or backdrop; closing does not save task drafts. Task editors sit near the phone's top, and can scroll so controls stay reachable with the keyboard. Settings and confirmations remain centered.

Save / Share includes a local QR code, link copying and iPhone/Android installation instructions. Sign-in, favicon, and phone icons share the green checklist artwork under `assets/`; no remote image service, analytics or runtime AI.

Open **Save / Share** at the bottom of any design. On iPhone use Safari → Share → Add to Home Screen (leave Open as Web App on if offered); on Android use Chrome's menu → Add to Home screen / Install app. The installed app opens that design and household without browser chrome. All ten designs include standalone manifests, iPhone web-app metadata and phone-sized PNG icons. Household-specific manifests use absolute URLs, including scope, so browsers can parse them from their generated blob URL. Internet and an invited Google sign-in are still required; this does not add offline task storage. Physical-phone installation needs a final device check.

## Run and verify

**Approved Playground:** after publishing the latest rules, open **Settings → Admin → Testing** as Tal. Create Playground (Tal and Sophie are prefilled), add the clearly marked example tasks, and open it. Only this explicit action seeds examples; nothing is copied from your real lists. Creation is a browser action, not something the agent ran against production.

Use the same Playground invitation link in two browser profiles or phones, each signed into its own invited Google account. Shared edits/completions sync; private tasks remain hidden from the other member, with the existing disclosed admin-preview exception. A spare Google account you control also works. Two tabs signed in as Tal test syncing but not account isolation. View as user stays read-only.

Reset Playground confirms first, then switches every connected device to a fresh empty test round. It retains invitations and older test rounds; it does not delete any tasks or real-household data. Example tasks are added only to the current Playground round, under the actual seeding user's identity; adding examples again leaves edited existing examples alone. Reset/seed cannot target an arbitrary household, and UI plus adapter/rules enforce admin-only setup/reset. No new Firebase project, auth provider or polling job is needed.

With Node installed:

```sh
node tools/build.mjs
node --test tests/core.test.js
node tools/serve.cjs
```

Open **http://localhost:5195/lists/**. Port can be changed with `PORT=5196`. The preview server serves only this project, handles `/lists/` like GitHub Pages, and disables caching. Static files are also GitHub Pages compatible without a build server.

Browser checks use Playwright and Chrome: `node tests/browser.cjs` and `node tests/review.cjs`. They use a test-only intercepted backend for synthetic UI workflows, responsive settings and fail-closed unconfigured pages. The sample store lives under tests/fixtures; no production module imports it and no URL/settings flag enables it. `node tests/rules.cjs` uses a local Firestore emulator for 76 permission checks. `node tests/admin.cjs` drives real Firestore SDK transactions/listeners against that emulator with synthetic Google identities: household creation, two-browser shared completion, private isolation, household switching, membership revocation/reinstatement and all ten small-phone admin forms. Set `LISTS_TEST_JAVA` and `LISTS_TEST_FIRESTORE_JAR` to a Java 21 executable and Google's Firestore emulator JAR. No production records are used or written. Actual Google OAuth and physical-phone behavior still require the owner's live setup checks. See VERIFICATION.md.

`tools/build.mjs` generates the chooser, ten HTML entry points and manifests. Edit shared application modules and styles for behavior; do not manually fork ten logic implementations. See [AI_README.md](AI_README.md) for invariants and handoff context.
