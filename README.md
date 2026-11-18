# Lists

**[Open Lists](https://talrme.github.io/lists/)** · [GitHub](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie, with Google sign-in and Firestore syncing.

## Appearance

Clear Day (former staging 1) is the default. Under **Settings -> Appearance**, choose Style first, then Color schemes:

1. Clear Day (1)
2. Daybook (7)
3. The Edit (4)
4. Metro (8)
5. Block Party (9)

Styles, palettes and animation preferences are saved on the device. The old design chooser and staging folders are removed. Sharing and installation use the main URL with the selected household. Old bookmarks redirect to the main site; an old offline installation may need one connected visit and all old tabs closed to update its worker.

## Navigation

Phone controls are compact: the hamburger sits beside the add field, and **Back to ASAP view** appears between the composer and list when needed. Swipe the drawer left, tap outside, or use X/Escape to close it. The menu offers Today only, Next 5 days, Waiting, Completed, Settings, Save / Share and Quick guide, with account details and Sign out at the bottom.

In **Settings -> Tasks to show**, select your private tasks and individual shared-task owners with checkboxes. Your private and assigned shared tasks are on by default; other owners and unassigned shared tasks are optional. This never grants access to another member's private tasks. Choices are remembered on this device separately per account and list category.

**Settings -> To-do settings -> Extended view: number of days** changes the menu's Next N days option (default 5, range 2-14), not the view currently open. More opens task details without summoning the keyboard; phone modals scroll within the visible area while Save/Cancel remain at the top. Dismissing the keyboard should leave the draft open. **Punt to ~ Week** still schedules a random weekday in the following Monday-Friday.

Installed apps check for updates on opening, returning to the app, or reconnecting (at most once per minute, without polling). A small **Update available -> Reload** bar applies a downloaded update when requested. Drafts, open dialogs and pending edits block reload; other tabs are never forcibly reloaded. Existing older installations may need a one-time close of the installed app and all Lists browser tabs to receive this update handling. Do not clear storage with unsynced edits.

**Menu -> Quick guide** offers a one-minute introduction with illustrated timing and swipe examples, sharing, follow-ups, the daily Later pick and offline behavior. Close with Got it, X, Escape or a click outside.

Routine household/All synced footer text is hidden; the sync progress line and actionable offline/pending/error status remain.

## Tasks

- Start directly with the add field. With a title entered, ASAP or ~ Week adds immediately. Later only selects timing; + and Enter also add.
- The arrow opens add-task details with the keyboard hidden. Add and edit show the editable task name under a muted Task name label. Checkmark Save and X Cancel sit at the top-right; there is no extra Add/Edit banner or redundant close X. Full-size Save/Cancel remain at the bottom. Existing items also have a confirmed Delete. Closing the add dialog preserves its draft; explicit Cancel clears it.
- ASAP shows due/overdue tasks plus today's stable From Later suggestion. ~ Week covers the next six future business days; Later holds undated and farther-out tasks. Manual dates and follow-up dates automatically highlight the matching timing segment (ASAP if due, ~ Week within six future business days, otherwise Later). Clicking that already-matching segment keeps the exact date; choosing ~ Week without a date still auto-schedules. Calendar: America/Los_Angeles; weekends excluded, not public holidays.
- Adding with ~ Week chooses one of the next five weekdays, including weekday today. Punting chooses a weekday in the following Monday-Friday. In ~ Week, swipe LEFT or use the priority icon to bring the task into ASAP instead. ASAP/Later swipe RIGHT to punt; the opposite direction does nothing.
- Waiting is a response-bubble flag across date lists. Follow-up date controls where it appears; quick actions retain that flag. Description snippets appear under names, without date clutter.
- At the bottom, Show N more days expands ASAP (up to 14 days); Today only collapses it. N comes from the extended-view setting. Waiting and Completed filters sit below the list; Active returns to normal tasks. Completed includes all due dates within the current category and selected task-owner filters.
- Hold a row for 150ms to drag. Day-section heights are held during the drag so headers do not shift when you cross between days; they resize after dropping. Overflowing destination rows can scroll temporarily inside their day. Ordinary scrolling remains scrolling. Reorder/date-drag saves are quiet; completion and punt actions have stacked Undo notices. The flying, spinning task tile respects animation preferences/reduced motion.
- Task order is currently stored on each task, so it syncs across devices **and across household members for shared items**. Per-person ordering would require a separate account-level record. Existing behavior was retained.
- Keyboard users can focus a task and press Alt+M for the accessible Move menu; no move icon is shown in the task modal.

## Privacy and Sync

Private is the default. Sharing defaults assignment to the signed-in person; select an invited person or Unassigned to change it. Private owner choices are muted but can be clicked to select Shared and assign together. Shared items can be seen by household members; private items cannot, except for the explicitly disclosed Tal administrator preview.

Settings contains appearance, animation presets/effects, task visibility checkboxes, per-category editing/gesture behavior, offline recovery, account/privacy, and admin-only household/Playground tools. The former View modal and For me / Shared / All controls are removed.

Google sessions persist on trusted devices, subject to browser/OS restrictions. Firestore listeners update other devices without polling. One Later suggestion is stored transactionally per person, household and Pacific date. Completion counts for the day: no replacement draw. The pool is undated, nonwaiting private tasks belonging to you, shared tasks assigned to you, and unassigned shared tasks.

**Data preservation:** the production frontend deliberately keeps `config.environment = 'staging'`, the existing Firestore namespace containing your real tasks. The name is a legacy internal path, not a remaining staging website. Do not rename, migrate or clear it during UI cleanup.

## Offline Use

Load the site and household online once. Afterwards, the service worker caches the public app shell and account-scoped IndexedDB stores the last accessible workspace plus durable queued edits. The top sync line/footer distinguish saved locally, pending, offline and server-synced states.

Queued changes upload when the app is open with a connection. Different-field edits merge; the last uploaded edit wins for the same field. Remote deletion does not resurrect tasks. Online stale revisions are rejected. Review/discard unsent operations under Settings -> Offline & sync; sign-out is blocked while pending changes exist, then clears that user's cached data. First login, initial setup and a new day's suggestion require service. Browser eviction/cleared storage can remove unsent edits; uploads while the app is completely closed are not guaranteed.

## Firebase and Admin

The project is `lists-95c4f`; public web config is checked in. Google sign-in plus verified household invitations and Firestore rules enforce access. No public fallback, fake user switch, runtime sample data or service-account secrets.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for one-step-at-a-time setup. Production promotion, styles, dialogs and contextual swipe changes require **no new rules or migration**. Do not claim the latest optional schema rules are published without owner confirmation.

Tal's collapsed Settings -> Admin supports household invitations, read-only View as user, and the explicitly approved isolated Playground. Only explicit admin actions seed/reset Playground examples. No real household data is used for automated tests.

## Develop and Test

```sh
node tools/build.mjs
node tools/serve.cjs
node --test tests/core.test.js tests/device-store.test.js tests/admin-core.test.js tests/motion.test.js
node tests/production.cjs
node tests/phone-ux.cjs
node --test tests/visibility.test.js
node tests/drawer.cjs
node tests/day-drag.cjs
node tests/touch.cjs
node tests/drop.cjs
node tests/share.cjs
node tests/offline-shell.cjs
node tests/rules.cjs
node tests/admin.cjs
```

Local preview: **http://127.0.0.1:5195/lists/**. Change the port with `PORT=5196`.

The build generates only the root page and manifest. Shared modules hold all behavior. Playwright/Chrome tests use intercepted fixtures or a local demo Firestore emulator; they never edit real tasks. The emulator requires Java 21 and Google's Firestore emulator JAR, configurable with `LISTS_TEST_JAVA` and `LISTS_TEST_FIRESTORE_JAR`. Real Google OAuth, physical phone keyboards and OS installation still need manual testing.

See [AI_README.md](AI_README.md) for handoff context and [VERIFICATION.md](VERIFICATION.md) for test results.
