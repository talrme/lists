# Lists

[Open Lists](https://talrme.github.io/lists/) | [GitHub](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie, with Google sign-in, Firestore syncing, and offline support. To-do is the main experience; Groceries, Movies, and Other lists currently have basic item tracking.

## Add and Manage Tasks

Type a name, then tap **Today**, **Week**, or **Later** to add without changing the list you are viewing. Enter adds to the current list. With the field empty, the same three buttons switch lists.

The rounded **double-chevron** button opens details, preserving your text. Add/edit dialogs open without the keyboard; tap the task name to edit it. Both have top and bottom Save/Cancel actions. Closing the add dialog preserves its draft for the current session; explicit Cancel clears it.

Details include a plain-text description, Private/Shared assignment, a date, and a Waiting for a response flag with a follow-up date. Shared defaults assignment to you; choose another invited person or Unassigned when needed.

Completion responds immediately: press to preview a checkmark, then release to dismiss with confetti while the save finishes. Failed saves restore the latest saved state. Undo becomes available after the save. Notices stack up to four, expire independently, and can be swiped away on phones. Dismissing a notice is not Undo.

## Scheduling

Calendar dates use America/Los_Angeles. Business days mean Monday-Friday; public holidays are not excluded.

| List or action | Behavior |
| --- | --- |
| Today | Due and overdue tasks, plus your daily From Later pick. |
| Week | Future dates through the fifth business day after today. |
| Later | Undated tasks and dates beyond the Week window. |
| Add with Week | Randomly selects one of five weekdays, including today when it is a weekday. If it selects today, the task appears only in Today. |
| Punt from Today | Randomly selects one of the next five business days, excluding today, so the task goes to Week. |
| Waiting for a response | Uses its follow-up date to place the task in Today, Week, or Later. It is a flag, not a separate date bucket. |

Today and Week do not overlap in the normal single-day view. Existing saved dates are never automatically rerolled. Later's optional approximate-date shortcuts choose a weekday around two weeks, one month, or two months away and show the chosen date before saving.

**One daily From Later pick:** eligible private tasks belonging to you, shared tasks assigned to you, and unassigned shared tasks form one pool. Undated and farther-out dated tasks qualify; completed and Waiting tasks do not. The pick is saved per person, household, and Pacific date, so refreshes and devices agree. An initially empty pool can get its first pick when an eligible task is added.

Completing, punting, or deleting the chosen item uses that day's pick; there is no replacement. Punting does not mark the task completed. Tomorrow gets a new draw, which may choose an unfinished item again. The daily pick is a projection into Today, not a permanent date change.

## Phone Navigation

- Swipe **right in Today** to punt to Week.
- Swipe **right in Later**, or **left in Week**, to move to Today.
- Quick Action icons offer the same actions. They default off on phones and on for larger screens; override this in Settings.
- Hold a row briefly to drag it. Moving between days changes its due/follow-up date. Shared-task ordering syncs across household members as well as devices.
- **Show N days** expands Today; **Show today only** collapses it. The day-count wheel in Settings ranges from 1-10, default 5. Weekends share a group. Extended Today intentionally previews future tasks too.
- Reopening returns to Today while keeping your day-count preference, unless a draft, dialog, or active action needs protection.

The menu contains Search tasks, Today only, Next N days, Waiting, Completed, Settings, Save / Share, task-owner filters, and Quick guide. Swipe it left or tap outside to close. Filters default to your private and assigned shared tasks; the daily From Later pick can also appear. **Back to my Today tasks** restores the default audience and single-day view.

Search covers task names and descriptions, with small-typo tolerance and no extra database queries. It excludes completed tasks by default. **Include completed tasks** adds a checked, clearly separated Completed section below active results.

## Settings and Installation

Appearance is first; the current list's settings are second and expanded. Choose among Clear Day, Daybook, The Edit, Metro, and Block Party, plus Original, Garden, Cherry, and Night palettes. Device-local animation settings offer presets and individual effects, respecting reduced motion. Small help buttons explain settings.

**Menu -> Save / Share** includes a QR code, copyable household link, and installation instructions. On iPhone, use Safari -> Share -> Add to Home Screen. On Android, use Chrome -> Add to Home screen or Install app. Household links and installed start URLs preserve the selected household.

## Software Updates

New software downloads silently in the background; the app remains usable. There is no Reload question or button. As soon as the update is downloaded and there is no unfinished edit or save, **Updating to latest software version...** briefly appears and the page refreshes once. **Software updated** confirms success for 2.5 seconds.

The final refresh restarts the interface to run the new code; downloading new files alone cannot replace code that is already running. Update status does not lock the controls. Unfinished edits and saves make the updater wait quietly, then it applies as soon as they clear. There is no idle countdown, and Undo notices, empty focused fields, or read-only dialogs do not add a wait. A refresh ends any remaining Undo opportunity. Each tab checks its own safety. A stalled activation backs off rather than leaving a permanent banner. Older installed copies can show their previous update UI once while receiving this behavior.

Update checks are throttled to once per minute on startup, returning, reconnecting, or interaction. Deferred safety checks are local, not Firebase polling. Updates do not clear lists, local settings, or sign-in.

## Privacy, Sync, and Offline Use

Google sign-in and household invitations control access. Private tasks are not visible to other members, except for the disclosed Tal administrator's read-only preview. Sharing makes tasks visible to household members.

Firestore listeners sync changes across devices without polling. After one online visit, account-scoped IndexedDB stores the last accessible workspace and durable queued edits. The service worker caches public app files, not private task/API responses.

Offline changes upload when Lists is open and connected. Different-field edits merge; the last uploaded edit wins for the same field. Remote deletion does not resurrect tasks. Online stale revisions are rejected. Settings -> Offline & sync lets you review pending operations and retry or discard them. Sign-out requires pending edits to finish, then clears that account's saved workspaces.

First login, an unvisited household, and a new daily pick require a connection. Closing the app does not guarantee background uploads; browser storage eviction or clearing can remove unsent work.

## Firebase and Development

Firebase project: `lists-95c4f`. Public web configuration is in `config.js`. **Keep `config.environment = 'staging'`: this legacy database namespace holds real production tasks, not a staging website.** Do not rename, migrate, seed, or clear it during UI work.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for setup. Website pushes do not publish database rules; use the current [firestore.rules](firestore.rules) when publishing rules separately. Do not assume a repository rule change is deployed without confirmation.

Tal's collapsed Admin section supports household invitations, read-only View as user, and an explicitly isolated Playground for testing. There are no public sandbox controls or fake login modes.

```sh
npm run build
npm run serve
npm test
node tests/production.cjs
node tests/instant-completion.cjs
node tests/updates.cjs
node tests/offline-shell.cjs
```

Local preview: [http://127.0.0.1:5195/lists/](http://127.0.0.1:5195/lists/). Use `PORT=5196` for another port. Browser tests require Playwright and Chrome; emulator tests also need Java 21 and the Firestore emulator JAR.

The build produces the root page and manifest; staging folders are removed. Tests use synthetic fixtures or local `demo-*` emulators, never real household mutations. Real phone keyboards, Google OAuth, and OS installation still need device checks.

[AI handoff](AI_README.md) | [Verification history](VERIFICATION.md)
