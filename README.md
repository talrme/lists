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

## Tasks

- Start directly with the add field. With a title entered, ASAP or ~ Week adds immediately. Later only selects timing; + and Enter also add.
- The arrow opens the add-task dialog. Add and edit share the same fields, a subtle sticky Save/Cancel row at the top, and full-size Save/Cancel at the bottom. Existing items also have a confirmed Delete. Closing the add dialog preserves its draft; explicit Cancel clears it.
- ASAP shows due/overdue tasks plus today's stable From Later suggestion. ~ Week covers the next six future business days; Later holds undated and farther-out tasks. Calendar: America/Los_Angeles; weekends excluded, not public holidays.
- Adding with ~ Week chooses one of the next five weekdays, including weekday today. Punting chooses a weekday in the following Monday-Friday. In ~ Week, swipe LEFT or use the priority icon to bring the task into ASAP instead. ASAP/Later swipe RIGHT to punt; the opposite direction does nothing.
- Waiting is a response-bubble flag across date lists. Follow-up date controls where it appears; quick actions retain that flag. Description snippets appear under names, without date clutter.
- At the bottom, Show 5 more days expands ASAP (up to 14 days); Today only collapses it. View also has the day count. Waiting and Completed filters sit below the list; Active returns to normal tasks. Completed includes all due dates within the current category and selected people filter.
- Hold a row for 150ms to drag. Ordinary scrolling remains scrolling. Reorder/date-drag saves are quiet; completion and punt actions have stacked Undo notices. The flying, spinning task tile respects animation preferences/reduced motion.
- Task order is currently stored on each task, so it syncs across devices **and across household members for shared items**. Per-person ordering would require a separate account-level record. Existing behavior was retained.
- Keyboard users can focus a task and press Alt+M for the accessible Move menu; no move icon is shown in the task modal.

## Privacy and Sync

Private is the default. Sharing defaults assignment to the signed-in person; select an invited person or Unassigned to change it. Private owner choices are muted but can be clicked to select Shared and assign together. Shared items can be seen by household members; private items cannot, except for the explicitly disclosed Tal administrator preview.

View selects For me / Shared / All tasks and shared assignees. Settings contains appearance, animation presets/effects, per-category editing/gesture behavior, offline recovery, account/privacy, and admin-only household/Playground tools.

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
