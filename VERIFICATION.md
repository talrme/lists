# Verification — November 16, 2026

## Passed locally

- Pure scheduling suite: **9 tests**. Pacific day/DST, Monday/Friday/weekend windows, next-week Monday semantics, exact/ASAP/later scheduling, due-date rollover, the personal suggestion pool including shared unassigned tasks, waiting follow-ups, privacy defaults and explicit synthetic seed.
- Browser workflows: **all 10 designs**, add/edit/complete/reopen/defer/follow-up/assign/filter/delete confirmation, other categories, settings persistence, local QR and locked unconfigured live pages.
- Responsive/palette checks: **160 combinations** (10 designs × 4 widths × 4 palettes), including 320px phone, 390px phone, landscape phone and desktop. No horizontal page overflow or task-text overflow.
- Extended modal/settings checks: **40 combinations**, all 10 designs × 4 palettes at 320px. X/Escape/backdrop dismissal, modal width, draft cancellation, private-person switching, quick-action visibility preferences and reopening completed non-to-do items.
- Same-origin two-tab sandbox propagation and reload persistence; daily suggestion identity preserved across design switches and refresh.
- Screenshots inspected for the design chooser, representative phone/desktop designs and light/dark editors/settings. Screenshots are local test artifacts under `/private/tmp/lists-*`, not production assets or user data.

Commands: `node --test tests/core.test.js`, `node tests/browser.cjs`, `node tests/review.cjs`. Browser drivers use Playwright and local Chrome, with optional `LISTS_TEST_URL` / `CHROME_PATH`. No backend writes occur in these tests.

## Not yet verified

Configuration connection check: `node tests/signin.cjs` passed all ten designs with the real official CDN SDK, a signed-out Google button, hidden workspace and no synthetic seed. This tests initialization only; no OAuth login was attempted and no task writes occurred. The unconfigured-state browser regression explicitly intercepts config with null, preserving fail-closed coverage after real configuration is added.

The owner supplied Firebase project lists-95c4f configuration and confirmed publishing rules. Household UIDs/membership are still pending. No claim of authenticated Google sign-in, persistent auth on actual phones, live cross-device Firestore task sync, deployed indexes, or actual server-side rule enforcement is made. Security rules were reviewed against the scoped queries, transaction reads (including nonexistent task IDs on create), mutation shapes and privacy requirements, but no Firestore emulator run occurred: a Java runtime/emulator is not installed here.

After setup, run the private/shared/third-account/incognito/offline checks in FIREBASE_SETUP.md and add authenticated automated/rules-emulator coverage. Browser emulation does not reproduce a real mobile keyboard, popup restrictions, Safari storage policies or Home Screen authentication context.

The local-only sandbox intentionally stores both sample people and all sample tasks on the device. Its person switch/filters are not security. Authenticated mode has no demo fallback and never imports these samples.
