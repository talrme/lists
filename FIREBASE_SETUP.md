# Lists: Firebase setup, one step at a time

Task list / Task owner controls are a frontend-only change. Muted private owner choices can be clicked to choose Shared and an assignee together. Existing access rules and creator/assignment fields remain unchanged; no new Firebase setup is needed.

Daily-pick persistence requires no additional setup: the existing per-user/date Firestore record and transaction already preserve the choice across devices/reloads. Regression tests now cover concurrent browser draws, completion, refresh and Pacific midnight. These checks used synthetic users in the local emulator/test fixture only; no real household records were changed.

The unified ASAP / ~ Week / Later row, Waiting/Completed under View, and From Later label are frontend-only changes. No additional Firebase configuration or rules publication is needed for these controls. Daily-pick receipt logic remains unchanged: one pick per person/day, not continuous replacement after completion.

New tasks now save a `sortOrder` to appear first, using the same rules as drag ordering. No new rules change is introduced, but the latest repository rules must be published if not already done. A denied save keeps the draft and shows an error; it never silently creates an unsorted task.

**Website:** https://talrme.github.io/lists/

**Project:** lists-95c4f

## Current progress

Defer now picks a weekday in the following Monday–Friday week. This is a frontend scheduling change, needs no Firebase configuration, and does not reschedule previously saved tasks. Soon remains unchanged.

The smooth completion exit/slide-up animation is frontend-only; it requires no additional Firebase setup or rules change beyond the sharing rules already noted below.

Exclusive task expansion and the add form's Save/Cancel controls are also frontend-only; no extra setup or rules publication is needed for those controls.

Press-and-hold reordering, right-swipe deferral, the curved Defer icon and stacked Undo notices also require no additional backend setup. Synced order still uses the previously documented optional sortOrder rule.

**Latest sharing fix:** publish the current rules using the next section. They add optional `assigneeEmail`, checked against the household invitations, so Tal can assign a shared task to Sophie even before she visits that household. Her tasks then appear on her first sign-in. No database editing, UID copying, public access, new index or migration is needed. Existing UID assignments are unchanged. This rules version has been tested locally, not published by the agent.

Firebase project, web configuration, Google sign-in, authorized Pages domain and Firestore already exist. Tal and Sophie have both signed in. The owner confirmed publishing the admin/household/user-preview rules. Subsequent updates add optional task descriptions, Google avatar URLs and synced task ordering (sortOrder) and Playground metadata (kind/playgroundRun); publish the latest rules file once more to allow those fields. Do not recreate the project or delete any data. Do not repeat completed setup, copy user IDs into code, create the household manually, or make the database public.

Existing tasks without descriptions, photos or ordering fields remain supported. Completion Undo, swipe deferral and the multi-day view need no new fields. Drag/Move saves require the new optional sortOrder rule; denied moves roll back visibly and leave existing tasks untouched. If older rules reject a profile-photo write, the app falls back to registering just the name/email so basic access is not blocked. Saving a nonempty description needs the latest rules and shows an error without clearing the draft if denied. Photos appear after each person visits the updated signed-in app; initials cover missing/failed images.

The owner wants ONE detailed manual step, then a pause for “done.” The outline is: publish new rules → create household inside Lists → Sophie opens it → test private/shared syncing.

## Next: publish the updated rules

1. Open https://console.firebase.google.com/project/lists-95c4f/firestore/rules .
2. Select the **Rules** tab if necessary.
3. In another tab, open [firestore.rules](https://github.com/talrme/lists/blob/main/firestore.rules).
4. Click **Copy raw file**, or open **Raw**, select all and copy. Copy the entire file, not a diff with plus/minus markers.
5. Return to Firebase, click inside its rules editor, press **Command+A**, then **Command+V**.
6. Click **Publish**. Wait for confirmation. Pasting alone does not apply it.
7. Tell Codex **done**. We will give only the next step.

No API key, service-account key, billing upgrade, Cloud Function or Google Sheet is needed. The public Firebase config is already permanently connected in config.js.

## Then: create your household from Lists

Do this after the rules have published:

1. Open https://talrme.github.io/lists/staging/01/ .
2. Sign in with **talrme@gmail.com** if needed.
3. Open **Settings**. Before setup, a Settings button is available on the access screen; after setup it is in the footer.
4. Scroll to the bottom of the settings modal. Expand **Admin**, then **Households**.
5. Click **Create our household**.
6. Review household name **Tal & Sophie**, link name **home**, and the two Google email addresses already filled in.
7. Click **Create household** and wait for it to finish.
8. Click **Done** to close Settings. Your real To-do list should now open empty, without sample tasks.

Only Tal's verified Google account gets Admin. It is not a setting Sophie can enable. Firebase rules independently enforce the permission. If rules are still old, the form shows a permission message and saves nothing; publish the new file and use Refresh in the Households section.

If home already exists, creation refuses to overwrite it. Use **Manage** to review/update invitations instead. Existing manual memberUids/names documents can be migrated by an explicit Manage save; their fields and task paths are preserved, while current invitations become the access authority.

## Then: Sophie joins

1. Sophie opens https://talrme.github.io/lists/staging/01/?household=home .
2. She signs in with **sophiegreen2@gmail.com**.
3. Her name registers automatically with the identity that is already invited. No UID copying, Firebase Console editing or second setup form is required.
4. She already appears as an assignment option from the invitation; after joining, her Google photo becomes available. She has Settings but no Admin section.

An uninvited Google account may authenticate with Google but cannot read household metadata/tasks or grant itself membership.

## Then: verify privacy and syncing

Optional testing now available after the same rules publication: **Settings → Admin → Testing**. Create Playground with the prefilled Google invitations, click **Add example tasks**, and use **Open Playground** or copy its invitation link. Open that link with a different invited Google account in a separate browser profile/phone to test shared updates and private isolation. Only Tal can create/reset/seed; invited members use normal task controls. Reset confirms and starts a fresh test round for both screens without deleting real or previous test data. No extra Console document, account impersonation, emulator setup or Firebase project is needed.

1. Tal adds an ASAP task with the default **Private** visibility (inside the chevron's more options if needed). It must not appear for Sophie.
2. Tal adds a task assigned to Sophie, even before her first visit. Both see it via View → Shared; Sophie also sees it in For me when she joins.
3. Sophie completes the shared task. It should update on Tal's phone without refresh.
4. Add an unassigned shared task and verify either person can complete it.
5. Refresh/reopen both browsers. Tasks remain and Google normally keeps you signed in.
6. Open an incognito window: sign-in is required. A different uninvited account must not gain access.
7. Disconnect the internet and try a save. The app must not claim it saved; reconnect and retry. Failed editor saves retain drafts.

Tell Codex about any error or unexpected result. Local emulator tests already cover rules and task propagation with synthetic users, but do not replace your actual Google OAuth/mobile test.

## Future households for other people

As Tal, use **Settings → Admin → Households → New household**:

1. Enter a household name.
2. Enter a unique link name using lowercase letters, numbers and hyphens.
3. List each person's actual Google sign-in email, one per line.
4. Save, then use the link icon to copy their household link.
5. They sign in on that link and register their own names automatically.

Tal does NOT need to be a member of their household. As explicitly requested by the owner, Tal can read everyone's personal and shared tasks using **Settings → Admin → View as user → Show registered users → View as**. A visible read-only banner and Exit preview button distinguish this from Tal's own account. Other household members cannot see each other's personal tasks. The UI explains this admin exception.

Use **Manage** to rename a household or change invitations. Removing an email revokes access without deleting its tasks. Reinviting the same account restores access. Unregistered invitees are immediately assignable by invited email after the latest rules publication. Household deletion, true authentication impersonation, editing on behalf and authenticated test-user administration are intentionally not implemented yet. Read-only View as user is available. There is no public device sandbox. All ten staging layouts use Google sign-in and the same real household records. The owner approved an admin-only Playground household. After publishing the latest rules, use Settings → Admin → Testing to create it, add explicit examples, invite a second Google account, and reset only its test namespace. The agent has not created a production Playground. It is not a public sandbox or an impersonation feature.

Registered users appear after opening the updated app; older household member profiles are also included. Firebase Authentication accounts that never opened the updated app or registered with a household cannot be enumerated from this static frontend. Preview uses your local appearance preferences, not settings stored only on the other person's device. It reads an existing daily suggestion but never creates one on their behalf. Switching households in preview does not change your saved household.

People belonging to multiple households select one under **Settings → Account & privacy → Household**. Share/install links preserve the chosen household. Switching clears unsaved task drafts.

## If you need to reproduce initial project setup

The completed basics were: create a separate Firebase project → register a Web app (no Firebase Hosting) → enable Google under Authentication and select support email → add talrme.github.io under Authentication → Settings → Authorized domains → create a Standard edition Firestore database in production mode → provide the public firebaseConfig to Codex.

For local authenticated testing, also authorize localhost and 127.0.0.1. Do not paste a service-account JSON, OAuth secret or Admin SDK key into the repo. Firebase web config is public; actual privileges come from verified identity and rules.

If Firestore requests a composite index, create it using its console link: collection group tasks, Collection scope, visibility Ascending + ownerUid Ascending. The declaration is in firestore.indexes.json. Household discovery uses the automatic memberEmails array index.

Google uses local session persistence; clearing website data, private browsing, revocation, or a separate installed-app browser context can require another sign-in. Open Google login in Safari/Chrome rather than an embedded messaging browser if a popup is blocked.

## Sources

- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Authentication persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Redirect restrictions and popup alternative](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Role-based access](https://firebase.google.com/docs/firestore/solutions/role-based-access)
- [Rules conditions and identity](https://firebase.google.com/docs/firestore/security/rules-conditions)

Updated November 16, 2026.
