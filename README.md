# Lists

**Live website:** [talrme.github.io/lists](https://talrme.github.io/lists/)

**Repository:** [talrme/lists](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie. Ten fully interactive design options share the same scheduling code and device sandbox, so you can compare layouts without re-entering tasks.

## Try the designs

Open the live website to pick from Clear Day, Ticket Office, High Tide, The Edit, Little Wins, Command Line, Daybook, Metro, Block Party and After Hours. Each lives in `staging/01/` through `staging/10/`.

**The default previews are explicitly sample data, stored only in this browser. They are not authenticated, private storage or cross-phone sync.** Sandbox Tal/Sophie switching is for testing, not a security boundary. No sample data is automatically sent to Firebase. All sandbox designs share `lists-sandbox-v1`; changes carry between designs on the same origin/device. No sensitive tasks belong in this sandbox.

Each design's **Google sign-in** link (`?mode=live`) uses Firebase when configured. Right now `config.js` deliberately has `firebase: null`: those pages stay locked instead of silently falling back to public data. Grocery, Movies and Other lists have working basic add/edit/complete/remove functionality; To-do has the full scheduling workflow.

## Firebase setup

Follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for detailed, click-by-click instructions. No Google Sheet or Apps Script is involved.

Create a separate Firebase project, register a web app, enable Google sign-in, authorize `talrme.github.io`, create Firestore in production mode, publish this repository's rules, and send Codex the public `firebaseConfig` object. Then sign in once as each person, collect the two UIDs and create `listSpaces/home` with `memberUids` and `names`. The rules additionally allow only the two specified verified Google accounts. Nothing gets pasted into a phone.

Local auth persistence keeps sessions across normal closes. Actual mobile sign-in and deployed privacy rules still need checking after your Firebase setup; no live project credentials have been supplied yet.

## Task behavior

- **Private by default.** Assigning to Tal/Sophie makes a task shared. **Shared · anyone** creates a shared unassigned task. Mine includes your private tasks, tasks assigned to you, and shared unassigned tasks. Shared can filter by person or unassigned. Private tasks of the other person are never queried by the authenticated client and database rules prohibit reading them.
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

No 15-second polling. No persistent Firestore disk cache for private tasks. Google session persistence and device-only appearance preferences are separate from task data. Signing out clears in-memory tasks. Both household members can edit shared tasks, but only their creator can make them private again. Membership can only be changed through the Firebase Console/Admin privileges, not by clients. A public GitHub Pages URL does not expose protected Firestore data; configuration values in JavaScript are not secrets. Rules, not URL secrecy or UI filters, enforce access.

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

Browser checks use Playwright and Chrome: `node tests/browser.cjs`. Tests exercise all ten designs at phone and desktop widths, task creation/edit/completion/defer/waiting/removal, categories, settings, backdrop dismissal, stored preferences, privacy filtering in the sandbox, refresh persistence, and locked unconfigured sign-in pages. This is Chrome device emulation, not physical iPhone/Android or authenticated Firebase verification.

`tools/build.mjs` generates the chooser, ten HTML entry points and manifests. Edit shared application modules and styles for behavior; do not manually fork ten logic implementations. See [AI_README.md](AI_README.md) for invariants and handoff context.
