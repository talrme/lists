# Lists Project Instructions

Read [README.md](README.md), [AI_README.md](AI_README.md), and [FIREBASE_SETUP.md](FIREBASE_SETUP.md) before changes. The AI handoff is the current implementation contract, not an append-only changelog. Update its relevant sections in place; use git and VERIFICATION.md for history.

## Protect Data and Access

- Work in this Websites For Fun repository. Production is the root app with five selectable styles, not staging pages.
- Preserve `config.environment='staging'`: it contains real production data. No unrequested migration, reset, seed, or deletion.
- Test only intercepted synthetic fixtures or local demo-* emulators. Never mutate real household tasks or make rules public.
- Google sign-in plus invitations/rules enforce membership. Keep private-by-default tasks and authorized admin read-only preview; never add an admin write bypass, fake login mode, hardcoded real UIDs, secrets, or preview disk cache.
- Offline caches/operations remain account/household/environment scoped. Preserve revision checks, deleted-task non-resurrection, pending sign-out guards and visible saved-locally vs synced states.
- Only the validated isolated Playground may receive explicit admin test seeds/resets.
- Git push does not deploy Firestore rules. Never claim publication or physical-device verification without evidence. Give manual setup instructions one step at a time.

## Preserve Current Behavior

- Visible Today/Week/Later. Week is strictly future through five future weekdays; Today and Week do not overlap. Week creation can pick today, then appears only Today. Today punt excludes today. Later-right/Week-left swipe moves to Today.
- One per-person/day Later pick, stable across devices; completing/punting/removing consumes it without replacement. Empty pools can fill later. Never redraw a nonempty receipt.
- Nonempty timing taps add without navigation; empty taps browse. Double-chevron opens the preserved composer draft. Modal is default, with stable keyed form nodes and top/bottom actions.
- Completion feedback is immediate/optimistic with acknowledgement-based Undo, rollback to authoritative state on failure, per-ID busy protection and workspace epoch guards.
- Search defaults active-only; opt-in completed results follow active with checked status. No extra search database reads.
- Compact phone layout; Appearance first, list settings second/open; 1-10 day wheel/default5. No footer utilities or duplicate View modal. Quick Action icons default hidden on phones/shown larger.
- Keep native scrolling, 150ms drag, natural day reflow, quiet reorder saves, no snap-back, no nested day clipping. Notices have no X; touch swipe dismisses without Undo.
- Updates are automatic only, silent until safe idle. Passive software-version status, one guarded refresh, brief confirmation. Never force a draft/pending-save reload or restore a competing Reload prompt.
- Respect device-local settings/reduced motion, theme contrast and X/Escape/backdrop dismissal. Search focuses input; add/edit do not automatically open keyboard.

## Verification and Publishing

Use focused tests from AI_README's matrix, with broader production/phone checks for shared UI changes and rules/admin emulator checks for security/sync. Keep the one-minute Quick guide accurate. Bump worker/generator/module versions for shell edits, run build, and verify offline/update behavior. Preserve drafts and unsynced edits while testing.

Ordinary pushes are permitted, but explicit local-only previews must remain unpushed until approved. Do not re-create old staging folders or copy Huck's public backend configuration.
