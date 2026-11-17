# Lists project instructions

Read README.md, AI_README.md and FIREBASE_SETUP.md. Keep them updated. Work in this Websites For Fun directory. Ten staging designs are intentional until the user chooses one.

Preserve private-by-default tasks and the single per-person daily suggestion pool: own private + shared assigned to self + shared unassigned. Pacific calendar, weekday random scheduling and next-Monday deferral must stay in the shared core with tests. No fake backend success, no public Firestore rules, no Firebase secrets, no copying sample tasks into real profiles. Google sign-in plus trusted household membership enforce access.

Use native dialog X/Escape/backdrop dismissal everywhere, editor near phone top, immediate locally saved appearance settings, all palettes readable, reduced motion. Test mobile and desktop after edits. Staging previews must visibly identify sample/device-only storage. Live pages fail closed until Firebase is configured. Do not claim live auth/security testing from local sandbox tests.

Admin controls belong only in collapsed Settings → Admin → Households for Tal's verified Google identity, not on the home screen or in a sandbox role switch. Server rules must independently enforce that identity. Admin manages invitations/metadata across households but does not bypass membership or private-task ownership. Do not add a recursive admin read grant. Future households invite Google emails; users self-register only after already being authorized. Never publish real account UIDs in handoff docs or hardcode them into the public frontend.

For household/security changes, run pure tests, tests/rules.cjs and tests/admin.cjs using a LOCAL emulator with a demo-* project only. Do not seed or edit real households to test. User must publish rules manually; finish one manual instruction at a time and wait for done. Future impersonation and authenticated test-profile tools are deferred, not implemented admin features.
