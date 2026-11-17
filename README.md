# Lists

**Live website:** [talrme.github.io/lists](https://talrme.github.io/lists/)

**Repository:** [talrme/lists](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie. Ten fully interactive design options share the same scheduling code and device sandbox, so you can compare layouts without re-entering tasks.

## Try the designs

Open the live website to pick from Clear Day, Ticket Office, High Tide, The Edit, Little Wins, Command Line, Daybook, Metro, Block Party and After Hours. Each lives in `staging/01/` through `staging/10/`.

**The default previews are explicitly sample data, stored only in this browser. They are not authenticated, private storage or cross-phone sync.** Sandbox Tal/Sophie switching is for testing, not a security boundary. No sample data is automatically sent to Firebase. All sandbox designs share `lists-sandbox-v1`; changes carry between designs on the same origin/device. No sensitive tasks belong in this sandbox.

Each design's **Google sign-in** link (`?mode=live`) connects to Firebase project `lists-95c4f`. Browser household management is implemented; the owner must publish the updated rules before using it. There is no public-data fallback. Grocery, Movies and Other lists have working basic add/edit/complete/remove functionality; To-do has the full scheduling workflow.

## Firebase setup

**Setup progress:** publish this repository's updated Firestore rules, then sign in as Tal and open **Settings → Admin → Households → Create our household**. Review the prefilled Tal/Sophie emails and save. No manually copied user IDs or database fields are needed. The Admin section exists only for Tal's verified Google account, is collapsed at the bottom of Settings, and is enforced by server rules. It is available before household membership is created. Admin also includes **View as user**, a read-only preview of registered users' personal and shared tasks, explicitly authorized by the owner. True sign-in impersonation and editing on behalf remain deferred.

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed, click-by-click instructions. No Google Sheet or Apps Script is involved.

For a fresh installation, register a Firebase web app, enable Google sign-in, authorize `talrme.github.io`, create Firestore in production mode and publish the supplied rules. Those project steps are already done here; only the new rules update and browser household creation remain. The public configuration is in the repository. Nothing gets pasted into a phone.

Local auth persistence keeps sessions across normal closes. The public Firebase web configuration is saved permanently in the repository; no per-phone configuration is needed. Actual mobile sign-in, household membership and deployed privacy rules still need checking with authenticated accounts.

## Task behavior

- **Private by default.** Assigning to Tal/Sophie makes a task shared. **Shared · anyone** creates a shared unassigned task. Mine includes your private tasks, tasks assigned to you, and shared unassigned tasks. Shared can filter by person or unassigned. Other household members cannot read your personal tasks; **Tal, the administrator, can view all users' tasks** through an explicitly labeled read-only preview.
- **ASAP:** due today. Unfinished due tasks stay Today on subsequent days.
- **Next 5 weekdays:** randomly chooses one of the next five Monday–Friday dates, including today if it is a weekday. Selection happens once when saving, not on every render. Weekends are excluded; holidays are not.
- **Sometime later:** no due date. Each person gets one random daily suggestion from their private later tasks, shared later tasks assigned to them, and shared unassigned later tasks. Waiting/completed/dated items and other categories are excluded. The selection is stored once per person per day, consistent across devices, and does not give the task a permanent due date. Two people can draw the same unassigned shared task; completing it completes it for both.
- Suggestions are chosen on the first visit after the date changes, not by a scheduled server job. An empty pool records no suggestion for that day. Completing/deleting/rescheduling a suggestion does not draw a replacement that day. At the next day boundary, an untouched suggestion returns to Later; it can be randomly chosen again on a later day. Editing it to ASAP pins it in Today.
- **Next week quick action:** a random date in the following Monday–Friday, including when pressed on a Monday. Not the next five weekdays from now.
- **Waiting for a response:** removes the current due date, puts the item in Waiting, and sets a follow-up. Presets: 3/7/14/30/90 days or exact date. It returns to Today on that date and rolls over if still unfinished.
- Completed tasks can be reopened from the checkmark tab. Tasks can be edited or removed, with confirmation before removal. Deleting a shared task affects both people. Concurrent stale edits are rejected instead of silently overwriting a newer revision.

The household's day is **America/Los_Angeles**, including daylight saving. A local-only minute check notices midnight while open; opening/foregrounding checks immediately. It is **not** a network polling timer. Keep both phones' clocks accurate.

## Sync and privacy

Firestore uses two live listeners: the signed-in person's private tasks and household shared tasks. Each task is a separate document; individual edits do not rewrite the whole list. Stable document IDs and revision-checked transactions prevent retries from duplicating task creation or overwriting newer edits. Writes must be acknowledged before the UI reports success. Offline mutations are not queued in this first prototype: reconnect and retry; an editor keeps its draft on failure.

No 15-second polling. No persistent Firestore disk cache for private tasks. Google session persistence and device-only appearance preferences are separate from task data. Signing out clears in-memory tasks. Household members can edit shared tasks, but only their creator can make them private again. Only Tal's verified Google identity can manage household membership, enforced by rules; other clients cannot self-enroll or promote themselves. A public GitHub Pages URL does not expose protected Firestore data; configuration values in JavaScript are not secrets. Rules, not URL secrecy or UI filters, enforce access.

### Multiple households

Tal's **Settings → Admin → Households** supports creating named households, inviting Google emails, editing names/invitations and copying household links. Creation refuses to overwrite existing households; concurrent edits require the current revision. There is no household delete button. Tal can create a household for other people without joining it. **Settings → Admin → View as user** lists registered visitors and opens their personal/shared task view with an Exit preview banner. The real Google sign-in never changes. Preview disables task edits/completions and reads the existing daily suggestion without creating one. Users with multiple households can be previewed in each; local color/action preferences remain those of the viewing device. Directory entries register on an updated-app visit, with existing household member profiles included as a fallback. It does not enumerate never-registered Firebase Auth accounts. Adding Tal as a household member remains an explicit invitation choice, not automatic.

Every invited verified Google account can enter its household. On first visit, it registers its own email/name under that household; names become assignable as people join. Other users never get the Admin section. Members with several households choose under **Settings → Account & privacy → Household**. Selection is remembered per signed-in account/device; share links and installed app start URLs include the household. Tasks and daily suggestions are scoped to each household. Switching clears old task data/drafts and opens To-do/Today/Mine. Revoking an email stops access; reinviting restores it without deleting tasks. Existing manually created UID/name households remain supported and can be explicitly updated through Manage without moving their tasks.

The first prototype listens to all of your private tasks and all household shared tasks, including completed ones; reads/memory will grow with history. Before years of heavy use, archive completed tasks and use indexed status/date-window queries. Daily-pick receipts are tiny but also accumulate. Do not introduce a global database listener or per-second writes.

## Phone settings

Each design offers Original / Garden / Cherry / Night palettes, Off / Gentle / Playful motion, and switches for visible quick actions. Settings apply immediately and save locally. Reduced motion overrides animations. Dialogs close on X, Escape, or backdrop; closing does not save task drafts. Task editors sit near the phone's top, and can scroll so controls stay reachable with the keyboard. Settings and confirmations remain centered.

Save / Share includes a local QR code, link copying and iPhone/Android installation instructions. Header, favicon, and phone icons share the green checklist artwork under `assets/`; no remote image service, analytics or runtime AI.

## Run and verify

With Node installed:

```sh
node tools/build.mjs
node --test tests/core.test.js
node tools/serve.cjs
```

Open **http://localhost:5195/lists/**. Port can be changed with `PORT=5196`. The preview server serves only this project, handles `/lists/` like GitHub Pages, and disables caching. Static files are also GitHub Pages compatible without a build server.

Browser checks use Playwright and Chrome: `node tests/browser.cjs` and `node tests/review.cjs`. They cover the sandboxes, responsive settings and fail-closed unconfigured pages. `node tests/rules.cjs` uses a local Firestore emulator for 59 permission checks. `node tests/admin.cjs` drives real Firestore SDK transactions/listeners against that emulator with synthetic Google identities: household creation, two-browser shared completion, private isolation, household switching, membership revocation/reinstatement and all ten small-phone admin forms. Set `LISTS_TEST_JAVA` and `LISTS_TEST_FIRESTORE_JAR` to a Java 21 executable and Google's Firestore emulator JAR. No production records are used or written. Actual Google OAuth and physical-phone behavior still require the owner's live setup checks. See VERIFICATION.md.

`tools/build.mjs` generates the chooser, ten HTML entry points and manifests. Edit shared application modules and styles for behavior; do not manually fork ten logic implementations. See [AI_README.md](AI_README.md) for invariants and handoff context.
