# Lists Project Instructions

Read [README.md](README.md), [AI_README.md](AI_README.md), and [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before changes. The AI handoff is the current implementation contract, not an append-only changelog. Update its relevant sections in place; use git and VERIFICATION.md for history.

## Protect Data and Access

- Work in this Websites For Fun repository. Production is the root app with five selectable styles, not staging pages.
- Preserve `config.environment='staging'`: it contains real production data. No unrequested migration, reset, seed, or deletion.
- Test only intercepted synthetic fixtures or local demo-* emulators. Never mutate real household tasks or make rules public.
- Google sign-in plus invitations/rules enforce membership. Keep private-by-default tasks and authorized admin read-only preview; never add an admin write bypass, fake login mode, hardcoded real UIDs, secrets, or preview disk cache.
- Offline caches/operations remain account/household/environment scoped. Preserve revision checks, deleted-task non-resurrection, pending sign-out guards and visible saved-locally vs synced states.
- Only the validated isolated Playground may receive explicit admin test seeds/resets.
- Asana review is admin-only and browser-local, not an importer. Never commit CSVs, source notes, backup JSON or real-data test fixtures. Retain all originals, confirm review replacement/merge, and require separate explicit approval before adding tasks.
- Approved imports use the separate prepared-file action, never implicit review decisions or a public embedded CSV. The actual signed-in administrator owns every private imported task; no write-as-user bypass. Stable source IDs skip existing tasks, all missing records commit atomically, and saved details are read back for verification. Keep real prepared files outside the repository. User-authorized real imports are distinct from synthetic tests.
- Git push does not deploy Firestore rules. Never claim publication or physical-device verification without evidence. Give manual setup instructions one step at a time.

## Preserve Current Behavior

- Groceries is a separate household-only domain with curated catalog, saved-list CRUD, stores/aisles and Pacific-day purchase history. No task scheduling/ownership filters. Preserve durable command receipts, atomic whole-quantity purchase/guarded Undo, preview isolation and pending-change guards. Never seed old PDF counts as shopping/history, publish the PDF, or clear legacy real data. Publish grocery rules separately from website pushes.

- Optional account-synced Someday is separate, never dated/daily-picked, safe to hide; tags use stable IDs with private/shared scope and history-safe rename/merge/archive. Keep metadata queues separate from tasks. Style/palette and audiences now sync per account; touch/animation/layout controls remain local. Desktop board starts at 1100px, deduplicates the daily pick and preserves Waiting as a status.
- Visible Today/Week/Later. Week is strictly future through five future weekdays; Today and Week do not overlap. Week creation can pick today, then appears only Today. Today punt excludes today. Later-right/Week-left swipe moves to Today.
- Today always puts unfinished past-date/follow-up carryovers above today's scheduled tasks and daily pick, preserving saved order within each group. Rank Today reorders using the moved task's destination schedule and its own priority group. Never rewrite dates/ranks at midnight or change other lists' sorting to enforce this.
- Desktop Waiting is a paired projection, not a separate task or scheduling bucket. Entering Waiting by drag clears dates and sets the flag; dragging its Waiting appearance out clears the flag and uses the destination schedule. Reordering within Waiting preserves scheduling. Keep unique visual-instance motion keys, logical-ID mutation/busy guards, and one editable form. Phones keep the standalone Waiting view.
- Default desktop order is Today, Week, Waiting, Later, optional Someday. Custom order is device-local and UID-scoped; merged Today/Week uses their earlier saved slot. Never let column layout changes write task scheduling/order or change phone navigation.
- One per-person/day Later pick, stable across devices; completing/punting/removing consumes it without replacement. Empty pools can fill later. Never redraw a nonempty receipt.
- Daily suggestions start at the bottom of Today without special color. Not today sets only the owner's daily receipt dismissed flag, never completion/date/task order; Undo restores that same receipt. Custom daily position belongs to the receipt too. Receipt changes need online access and matching published rules, and cached state survives reload/offline. Keep startup/view switching quiet; repeated sync renders must not replay or restart row movement.
- Nonempty timing taps add without navigation; empty taps browse. Double-chevron opens the preserved composer draft. Modal is default, with stable keyed form nodes and top/bottom actions.
- Completion feedback is immediate/optimistic with acknowledgement-based Undo, rollback to authoritative state on failure, per-ID busy protection and workspace epoch guards.
- Completed today is a separate, non-sortable keyed projection below today's active tasks, not below all expanded future days. Respect private authorization and audience filters. Default-on visibility is UID/device scoped. Stamp completedAt only on completion transitions, preserve original offline/Undo time (including legacy null), and group completed/completedAt during replay. Never infer completion time from updatedAt. Clear projection on workspace switch. Publish compatible Firestore rules before releasing timestamp-writing clients.
- Completion position is device-local Auto/Left/Right: wide right target on phones, old left circle on desktop Auto. Preserve native keyboard clicks, cancel captured pointer releases after leaving/scrolling, keep targets stable while pressed, and never toggle a changed remote checked state from an old press.
- Search defaults active-only; opt-in completed results follow active with checked status. No extra search database reads.
- Compact phone layout; Appearance first, list settings second/open; 1-10 day wheel/default5. No footer utilities or duplicate View modal. Quick Action icons default hidden on phones/shown larger.
- Keep native scrolling, 150ms drag, natural day reflow, quiet reorder saves, no snap-back, no nested day clipping. Notices have no X; touch swipe dismisses without Undo.
- Updates are automatic and immediate when downloaded, unless an actual unfinished edit/gesture or save needs protection. No idle countdown or Undo/empty-focus wait. Passive software-version status, one guarded refresh, brief confirmation. Never force a draft/pending-save reload or restore a competing Reload prompt.
- Respect account-synced appearance, device-local interactions/reduced motion, theme contrast and X/Escape/backdrop dismissal. Search focuses input; add/edit do not automatically open keyboard.

## Verification and Publishing

Use focused tests from AI_README's matrix, with broader production/phone checks for shared UI changes and rules/admin emulator checks for security/sync. Keep the one-minute Quick guide accurate. Bump worker/generator/module versions for shell edits, run build, and verify offline/update behavior. Preserve drafts and unsynced edits while testing.

Ordinary pushes are permitted, but explicit local-only previews must remain unpushed until approved. Do not re-create old staging folders or copy Huck's public backend configuration.
