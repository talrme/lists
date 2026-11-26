# Lists

[Open Lists](https://talrme.github.io/lists/) | [GitHub](https://github.com/talrme/lists)

Phone-first private and shared lists for Tal and Sophie, with Google sign-in, Firestore syncing, and offline support. To-do and household Groceries have dedicated workflows; Movies and Other lists have basic tracking.

## Groceries

Groceries is one household shopping list, without private items or assignments. Add by typing or choosing a categorized suggestion. The starter catalog contains 399 curated options from the supplied grocery export and 13 labeled added staples. It does not prefill the shopping list or invent purchases. Previous generic grocery tasks are untouched, but not used by this new workflow.

At quantity one, tap the small package icon to reveal quantity controls; larger quantities show steppers. Tap the item name to edit quantity, unit, category and notes. Checking Purchased means the **whole listed quantity**. Undo restores it only if it has not changed or been re-added. Adding an already-listed item offers an explicit increase, not a silent duplicate.

**Saved lists** supports creating, editing, archiving, adding/removing items and editing quantities/units. Save the current shopping list as a template, or create one from scratch. Select all/none or individual items before adding. Already-listed items remain unchanged unless you allow quantity increases. Shopping-list edits never change saved-list defaults.

**Menu -> Item catalog** manages names, aliases, default quantities/units, categories, archive status and per-store locations. New typed shopping items join the household catalog automatically. Initial catalog options are public app assets; household edits, new items, saved lists and purchases are protected by household membership.

Initial stores are **Trader Joe's · Emeryville** and **Berkeley Bowl**; no branch or aisle numbers are guessed. Under **Stores & aisles**, add locations in walking order and move them up/down. Assign each item's locations through Item catalog. Choose a store and switch category/aisle ordering. Unmapped items always remain visible.

**Recent shops** groups purchases by Pacific calendar day across all stores, with no trip-end step or minimum count. Open a day to select items to buy again. Frequently bought means present on at least three of the last ten shopping days currently loaded. The newest 300 purchases load initially; older history is fetched on demand. The recent view shows three shopping days at a time.

Groceries has its own drawer actions, settings section and Quick guide. Appearance, animations, sign-in and Save / Share remain global. Open groceries once online to enable its account/household-scoped offline cache. Durable commands upload with Lists open; atomic purchases and command receipts prevent duplicate retries. Stale conflicts remain reviewable under Pending changes. **Website pushes do not publish the new database rules**; see FIREBASE_SETUP before first live use.

## Add and Manage Tasks

Type a name, then tap **Today**, **Week**, or **Later** to add without changing the list you are viewing. Enter adds to the current list. With the field empty, the same three buttons switch lists.

The rounded **double-chevron** button opens details, preserving your text. Add/edit dialogs open without the keyboard; tap the task name to edit it. Both have top and bottom Save/Cancel actions. Closing the add dialog preserves its draft for the current session; explicit Cancel clears it.

Details include a plain-text description, Private/Shared assignment, a date, and a Waiting for a response flag with an optional follow-up date. An undated Waiting task stays in Later and remains visible in Waiting. Shared defaults assignment to you; choose another invited person or Unassigned when needed.

Completion responds immediately: press to preview a checkmark, then release to dismiss with confetti while the save finishes. Failed saves restore the latest saved state. Undo becomes available after the save. Notices stack up to four, expire independently, and can be swiped away on phones. Dismissing a notice is not Undo.

On phones, completion is a muted checkmark in a 56px-wide area at the far right, separate from editable task text. Press fills it with the theme accent; release completes. Sliding outside cancels, even if you slide back in. Scrolling/cancelled touches do not complete tasks. A completion arriving from another device during a press cannot accidentally turn that tap into Reopen. Shared-owner pictures stay before the completion area.

**Settings -> To-do settings -> Completion button** offers Auto / Left / Right. Auto chooses right below 768px and the existing left circle on larger screens. Left on phones retains the wider target for left-handed use. The position preference is saved on this device and applies across list categories; it does not change account-synced appearance.

## Scheduling

Calendar dates use America/Los_Angeles. Business days mean Monday-Friday; public holidays are not excluded.

| List or action | Behavior |
| --- | --- |
| Today | Due and overdue tasks, plus your daily From Later pick. |
| Week | Future dates through the fifth business day after today. |
| Later | Undated committed tasks and dates beyond the Week window. |
| Someday / Maybe (optional) | Uncommitted ideas; never scheduled or drawn as a daily suggestion. |
| Add with Week | Randomly selects one of five weekdays, including today when it is a weekday. If it selects today, the task appears only in Today. |
| Punt from Today | Randomly selects one of the next five business days, excluding today, so the task goes to Week. |
| Waiting for a response | Uses its follow-up date to place the task in Today, Week, or Later. It is a flag, not a separate date bucket. |

Today and Week do not overlap in the normal single-day view. Existing saved dates are never automatically rerolled. Later's optional approximate-date shortcuts choose a weekday around two weeks, one month, or two months away and show the chosen date before saving.

**One daily From Later pick:** eligible private tasks belonging to you, shared tasks assigned to you, and unassigned shared tasks form one pool. Undated and farther-out dated tasks qualify; completed, Waiting, and Someday tasks do not. The pick is saved per person, household, and Pacific date, so refreshes and devices agree. An initially empty pool can get its first pick when an eligible task is added.

The pick starts at the bottom of Today, with the same styling as other tasks and a quiet From Later label. Drag it to change its position for your own daily view; its original Later ordering is unchanged.

Completing, punting, deleting, or choosing **Not today** uses that day's pick; there is no replacement. Not today removes only today's suggestion, leaving the task unfinished in Later with its original date. Undo restores the same suggestion. These daily controls/positions sync for the same account across devices and survive reloads. Saving them requires a connection and the latest Firestore rules; cached state remains available offline. Tomorrow gets a new draw, which may choose an unfinished item again. The daily pick is a projection into Today, not a permanent date change.

Task lists open and switch without replaying entrance bounces. Completion keeps confetti and one smooth upward movement; repeated sync/status renders do not restart that movement.

## Phone Navigation

- Swipe **right in Today** to punt to Week.
- Swipe **right in Later**, or **left in Week**, to move to Today.
- Quick Action icons offer the same actions. They default off on phones and on for larger screens; override this in Settings.
- Hold a row briefly to drag it. Moving between days changes its due/follow-up date. Shared-task ordering syncs across household members as well as devices.
- **Show N days** expands Today; **Show today only** collapses it. The day-count wheel in Settings ranges from 1-10, default 5. Weekends share a group. Extended Today intentionally previews future tasks too.
- Reopening returns to Today while keeping your day-count preference, unless a draft, dialog, or active action needs protection.

The menu contains Search tasks, Today only, Next N days, Waiting, Completed, Settings, Save / Share, task-owner filters, and Quick guide. Swipe it left or tap outside to close. Filters default to your private and assigned shared tasks; the daily From Later pick can also appear. **Back to my Today tasks** restores the default audience and single-day view.

Search covers task names and descriptions, with small-typo tolerance and no extra database queries. It excludes completed tasks by default. **Include completed tasks** adds a checked, clearly separated Completed section below active results.

## Someday, Tags, and Desktop Board

Enable **Settings -> To-do settings -> Show Someday / Maybe** to add a fourth list just for your account. Hiding it never deletes or moves its items; search still finds them. Switching an active dated/waiting task to Someday asks before clearing scheduling. Moving an idea back into Today/Week/Later activates it. Existing tasks are not automatically migrated.

Task details support up to 20 tags with autocomplete and in-place creation. New tags on private tasks default to Personal; you may explicitly create a Household tag instead. Shared tasks use household tags only; sharing a private draft removes its personal tags with an explanation before Save. Task privacy is otherwise unchanged.

Tap a tag to find its tasks, or use **Search -> Filter by tags**. Multiple tags match all selected tags. Typed search also matches tag names. Completed items remain opt-in. **Settings -> To-do settings -> Manage tags** supports rename, archive/restore and merge within the same privacy scope. Stable IDs keep completed history current; merging is irreversible. Counts include only tasks you can read. Archived tags remain on historical tasks, but leave suggestions.

At widths of 1100px and above, To-do uses a board with a larger Today column, then Week, Waiting, Later and optional Someday. **Show next N days**, at the bottom of Today, merges Today and Week into a wider dated column, leaving Waiting, Later and Someday alongside it. The range always reaches through the fifth future business day, even if your extended calendar-day setting is shorter. Longer settings can also preview dated Later tasks. Each task appears once across the scheduled lists, plus its Waiting appearance when applicable; expanding changes no dates. Weekends share a group, overdue tasks stay under Today, and **Show today only** separates the columns again. The normal Back link also restores your own tasks and clears temporary search reveals.

Desktop also has a **Waiting for a response** column. Waiting tasks appear there and in their scheduled Today/Week/Later list: two views of one saved task. Hover/focus highlights both, and edits/completion apply to both. Waiting sorts by earliest follow-up date, then undated items. Dragging **into Waiting** marks waiting and clears due/follow-up dates, so the task also goes to Later. Dragging **out of Waiting** clears the flag: Today sets today, Week picks one of five future weekdays, Later stays undated, and a dated day group uses that date. Reordering within Waiting preserves dates; moving its ordinary scheduled appearance still preserves Waiting. **No longer waiting** clears the flag while preserving an existing follow-up as the task's due date, with Undo. Phone Waiting navigation is unchanged.

Subtle eye buttons in Waiting, Later and Someday headers collapse a column into a narrow labeled strip; tap the eye again to restore it. Other columns smoothly gain the space. This layout choice is remembered per account on this device, does not change tasks or the account-synced Someday switch, and does not hide lists on phones. Selecting a search result or browsing an empty timing tab reopens its column automatically.

**Settings -> To-do settings -> Desktop column order** rearranges all five columns with up/down arrows. The default is Today, Week, Waiting, Later, Someday; Reset restores it. When Today and Week merge, the combined column occupies whichever of their positions comes first. Hiding Someday keeps its saved position for later. Column order is saved per account on this device, without changing tasks or phone navigation.

The top-right desktop search box searches names, descriptions and tags locally as you type, with small-typo tolerance, scrollable results and opt-in completed tasks. Select a result to reveal its list, scroll to it and highlight it for five seconds, without opening the editor. Hidden-owner and hidden-Someday results are revealed temporarily, without changing saved filters or enabling Someday. Arrow keys and Enter select results; Escape dismisses them.

A daily From Later task appears once, under Today. Drag across columns or day groups to change scheduling; drag within one to reorder. Waiting remains a status with its own desktop column, not a fourth scheduling bucket. Disable **Desktop board** for the single-list desktop layout. Phones retain single-list navigation and expandable days.

## Settings and Installation

Appearance is first; the current list's settings are second and expanded. Choose among Clear Day, Daybook, The Edit, Metro, and Block Party, plus Original, Garden, Cherry, and Night palettes. Color scheme, style, the Someday switch, and per-category task-owner filters now sync to your account across devices, with a local cache for fast reopening. Animations, desktop-board preference, touch controls, editor mode and day-count preferences remain device-local. Device-local animation settings offer presets and individual effects, respecting reduced motion. Small help buttons explain settings.

**Menu -> Save / Share** includes a QR code, copyable household link, and installation instructions. On iPhone, use Safari -> Share -> Add to Home Screen. On Android, use Chrome -> Add to Home screen or Install app. Household links and installed start URLs preserve the selected household.

## Software Updates

New software downloads silently in the background; the app remains usable. There is no Reload question or button. As soon as the update is downloaded and there is no unfinished edit or save, **Updating to latest software version...** briefly appears and the page refreshes once. **Software updated** confirms success for 2.5 seconds.

The final refresh restarts the interface to run the new code; downloading new files alone cannot replace code that is already running. Update status does not lock the controls. Unfinished edits and saves make the updater wait quietly, then it applies as soon as they clear. There is no idle countdown, and Undo notices, empty focused fields, or read-only dialogs do not add a wait. A refresh ends any remaining Undo opportunity. Each tab checks its own safety. A stalled activation backs off rather than leaving a permanent banner. Older installed copies can show their previous update UI once while receiving this behavior.

Update checks are throttled to once per minute on startup, returning, reconnecting, or interaction. Deferred safety checks are local, not Firebase polling. Updates do not clear lists, local settings, or sign-in.

## Privacy, Sync, and Offline Use

Google sign-in and household invitations control access. Private tasks are not visible to other members, except for the disclosed Tal administrator's read-only preview. Sharing makes tasks visible to household members.

Firestore listeners sync tasks, account settings and tags across devices without polling. Settings and tags have a separate durable metadata queue; offline changes upload on reconnection, with last uploaded edits winning for the same field. Pending metadata also blocks sign-out and automatic update reloads. Rename/merge conflicts are constrained by rules; rejected edits remain available under Pending changes. After one online visit, account-scoped IndexedDB stores the last accessible workspace and durable queued edits. The service worker caches public app files, not private task/API responses.

Offline changes upload when Lists is open and connected. Different-field edits merge; the last uploaded edit wins for the same field. Remote deletion does not resurrect tasks. Online stale revisions are rejected. Settings -> Offline & sync lets you review pending operations and retry or discard them. Sign-out requires pending edits to finish, then clears that account's saved workspaces.

First login, an unvisited household, and a new daily pick require a connection. Closing the app does not guarantee background uploads; browser storage eviction or clearing can remove unsent work.

## Asana Task Review

Tal can open **Settings -> Admin -> Asana task review -> Review Asana export**, then choose an Asana CSV. This is a review-only stage: it never creates, changes or deletes Lists/Asana tasks. Completed source rows are excluded; open main tasks retain original notes, dates, IDs, assignments, tags and available subtask context. Duplicate detection is a suggestion based on normalized titles/token overlap, not permission to merge automatically. Old tasks and financial/paperwork keywords are review filters, not urgency judgments.

Review 20 main tasks per page. Keep chooses Today/Week/Later/Someday as a proposed destination; Skip excludes an item from the proposed import; the clock defers a decision. Select tasks for bulk Keep/Skip or confirmed Combine. Undo restores the previous decision set. Comments let you explain what should change. A merged source's original details remain preserved in the review file. Parent names without unique matches remain separate instead of being attached by guesswork.

Progress is private **to this browser/device, signed-in administrator, household and environment**, not synced through Firestore. **Save review file** downloads a JSON backup you can restore on another device or attach in the Codex chat for feedback/final import planning. It contains personal task data; treat it like the original CSV. Save a backup before signing out or clearing browser storage; sign-out clears the local review. Replacing/removing a review asks first. The real CSV, review files and notes must never be committed to GitHub. No additional Firebase setup is needed for this local review feature. Actual task importing remains a separate, explicitly approved step.

## Firebase and Development

### Approved Task Imports

**Settings -> Admin -> Asana task review -> Import prepared tasks** accepts a private prepared Lists JSON file. The direct link `?import=asana` opens the same dialog after the actual administrator signs in. Choosing a file only previews it; **Import N tasks** is the explicit write action. The original CSV review remains review-only.

Imports create private To-do tasks owned by the real signed-in user in the displayed household. Complete descriptions are preserved. Today gets today's Pacific date; Week spreads across the next five weekdays excluding today; Later, undated Waiting and Someday get no date. The current importer accepts 1–400 prepared tasks, not raw CSVs or saved-review JSON. Completed rows/subtasks must be excluded during preparation.

Stable `asana-SOURCE_ID` document IDs prevent duplicate retries. Existing IDs are left unchanged, including edited or completed imported tasks. The online import checks account/household/preview state, waits for pending changes to finish, creates missing records in one transaction, and verifies their saved fields against the prepared file. It never writes through an admin impersonation bypass. Latest Firestore rules are needed for undated Waiting and optional Someday fields. Personal prepared files and original CSVs stay outside Git/public assets.

Firebase project: `lists-95c4f`. Public web configuration is in `config.js`. **Keep `config.environment = 'staging'`: this legacy database namespace holds real production tasks, not a staging website.** Do not rename, migrate, seed, or clear it during UI work.

See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for setup. Website pushes do not publish database rules; use the current [firestore.rules](firestore.rules) when publishing rules separately. Do not assume a repository rule change is deployed without confirmation.

Tal's collapsed Admin section supports household invitations, read-only View as user, and an explicitly isolated Playground for testing. There are no public sandbox controls or fake login modes.

```sh
npm run build
npm run serve
npm test
node tests/organizer.cjs
node tests/rules.cjs
node tests/production.cjs
node tests/instant-completion.cjs
node tests/updates.cjs
node tests/offline-shell.cjs
```

Local preview: [http://127.0.0.1:5195/lists/](http://127.0.0.1:5195/lists/). Use `PORT=5196` for another port. Browser tests require Playwright and Chrome; emulator tests also need Java 21 and the Firestore emulator JAR.

The build produces the root page and manifest; staging folders are removed. Tests use synthetic fixtures or local `demo-*` emulators, never real household mutations. Real phone keyboards, Google OAuth, and OS installation still need device checks.

[AI handoff](AI_README.md) | [Verification history](VERIFICATION.md)
