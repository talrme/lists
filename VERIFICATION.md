# Verification — November 16, 2026

## Passed locally

- Pure scheduling/admin-model suite: **12 tests**. Pacific day/DST, Monday/Friday/weekend windows, next-week Monday semantics, exact/ASAP/later scheduling, due-date rollover, the personal suggestion pool including shared unassigned tasks, waiting follow-ups, privacy defaults and explicit synthetic seed.
- Browser workflows: **all 10 designs**, add/edit/complete/reopen/defer/follow-up/assign/filter/delete confirmation, other categories, settings persistence, local QR and locked unconfigured live pages.
- Responsive/palette checks: **160 combinations** (10 designs × 4 widths × 4 palettes), including 320px phone, 390px phone, landscape phone and desktop. No horizontal page overflow or task-text overflow.
- Extended modal/settings checks: **40 combinations**, all 10 designs × 4 palettes at 320px. X/Escape/backdrop dismissal, modal width, draft cancellation, private-person switching, quick-action visibility preferences and reopening completed non-to-do items.
- Same-origin two-tab sandbox propagation and reload persistence; daily suggestion identity preserved across design switches and refresh.
- Screenshots inspected for the design chooser, representative phone/desktop designs and light/dark editors/settings. Screenshots are local test artifacts under `/private/tmp/lists-*`, not production assets or user data.

Commands: `node --test tests/core.test.js`, `node tests/browser.cjs`, `node tests/review.cjs`. Browser drivers use Playwright and local Chrome, with optional `LISTS_TEST_URL` / `CHROME_PATH`. No backend writes occur in these tests.

## Admin and household security checks

- **59 actual rule checks** passed against Google's isolated Firestore emulator (project demo-lists-admin): verified Google admin identity, nonadmin/forged-role denial, household creation, invited third-party accounts, scoped discovery queries, self-profile registration, personal tasks hidden from other nonadmin members, shared updates, revision checks, cross-household denial, daily-pick privacy, legacy migration and invitation revocation. Tal admin can explicitly read personal/shared tasks across households and existing daily receipts. Tests also deny admin edits/deletes of another user's personal tasks, directory identity forgery, nonadmin user enumeration, and admin daily-pick creation on behalf.
- Browser integration passed with the **real Firebase Firestore SDK and emulator rules**, mocking only Google identities (project demo-lists-browser). It covers Tal creating home from nested Settings, Sophie joining without UID copying, two-browser shared completion, private isolation, new household management without joining, read-only View as Alice including personal/shared tasks, preview filters and exit restoring Tal, clear privacy disclosure, adapter-level preview write/delete/manage rejection and no daily-receipt creation, duplicate prevention, selecting households without stale tasks, revoking/reinstating access, and household-specific share/install URLs. All ten admin forms were checked at 320px in Original/Night; one admin panel was additionally checked at 320/390/1280 in all palettes.
- Commands: `node --test tests/core.test.js tests/admin-core.test.js`, `node tests/rules.cjs`, `node tests/admin.cjs`. The latter needs Playwright/Chrome; both emulator drivers accept LISTS_TEST_JAVA and LISTS_TEST_FIRESTORE_JAR. Runtime was temporary Java 21 plus Firestore emulator v1.19.8 under /private/tmp/lists-rules-runtime, not a system installation or repository dependency.
- Zero production task or household writes were made by these tests. Synthetic test IDs are unrelated to either real account. Temporary Java emulators are shut down when tests finish.

## Still requires owner verification

Configuration connection check: `node tests/signin.cjs` passed all ten designs with the real official CDN SDK, a signed-out Google button, hidden workspace and no synthetic seed. This tests initialization only; no OAuth login was attempted and no task writes occurred. The unconfigured-state browser regression explicitly intercepts config with null, preserving fail-closed coverage after real configuration is added.

The owner supplied Firebase project lists-95c4f configuration, confirmed publishing the ORIGINAL rules, and provided both sign-in IDs. The NEW admin/invitation rules still require manual publication, and real household creation has not been confirmed. No automated claim of actual Google OAuth completion, session persistence on physical phones, live cross-device task sync, deployed indexes, or enforcement of the NEW rules in the production project is made. Local rules enforcement was tested as described above; it does not publish rules or change live data.

After publishing the new rules and creating home from the browser, run the private/shared/third-account/incognito/offline checks in FIREBASE_SETUP.md with the real accounts. Browser emulation does not reproduce a real mobile keyboard, popup restrictions, Safari storage policies or Home Screen authentication context.

The local-only sandbox intentionally stores both sample people and all sample tasks on the device. Its person switch/filters are not security. Authenticated mode has no demo fallback and never imports these samples.
