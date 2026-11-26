# Lists: Firebase Setup

## Completed Today Preparation

The Completed today feature needs optional numeric `completedAt` on tasks. The current rules accept that field without requiring it, so existing clients/tasks stay compatible. Private/shared permissions are unchanged. Completion time is the original action time, including offline actions, not the latest edit/upload time. Legacy tasks without a recorded completion time are not guessed into today's history.

Before publishing the client feature, the owner must copy the complete current `firestore.rules` into [Firestore Rules](https://console.firebase.google.com/project/lists-95c4f/firestore/databases/-default-/security/rules) and click Publish, then confirm done. A GitHub push does not publish database rules. The optional-field rules passed 151 isolated demo-emulator checks; live publication still needs confirmation. Until then, keep the existing website release unchanged so ordinary completion is not disrupted by old rules.

## Groceries Update

The dedicated grocery workflow adds membership-protected `groceries`, `groceryPurchases` and `groceryCommands` collections beneath the existing household/environment. No new Firebase project, database, account or composite index is needed. To-do data is not migrated or cleared.

**Owner action required:** open [Firestore Rules](https://console.firebase.google.com/project/lists-95c4f/firestore/databases/-default-/security/rules), replace the editor with this repository's complete `firestore.rules`, then Publish. GitHub pushes do not publish these rules. Until published, grocery reads/sync show an explanatory error; queued edits remain on-device. After publication, reopen Lists or use Settings -> Offline & sync -> Retry sync. Keep the rules private/member-only.

Website: https://talrme.github.io/lists/

Firebase project: `lists-95c4f`

Google sign-in, Pages authorization, Firestore, and the Tal/Sophie household are already configured. Do not recreate them or copy user IDs into code. The production data still lives under the historical `environments/staging` path; do not rename, migrate, seed or clear it.

## Required for Someday, Tags, and Account Settings

The November 24 update also permits Waiting tasks without a follow-up date. They remain private/shared under the same access rules and appear in Later plus Waiting. Publishing website files alone does not apply this database validation change.

Publish the current repository rules. They add optional task `someday`/`tagIds`, private account preferences, and a household/personal tag directory. Existing private/shared task permissions, invitations and read-only administrator access remain protected.

**One manual step now: publish the rules.**

1. Open [Firestore Rules](https://console.firebase.google.com/project/lists-95c4f/firestore/rules).
2. Open the repository's [firestore.rules](https://github.com/talrme/lists/blob/main/firestore.rules) in another tab.
3. Click **Raw** and copy the entire file. Do not copy a diff with plus/minus markers.
4. Replace the Firebase rules editor contents with that file, then click **Publish**.
5. Wait for confirmation and tell Codex **done**.

A Git push does not publish Firestore rules. The updated rules were tested locally; that is not proof of live publication. Until publication, new tags/preferences/Someday saves can be denied. Drafts and queued metadata stay on the device with a visible error; ordinary existing task data is not deleted. After publishing, reopen Lists or use Settings -> Offline & sync -> Retry sync.

No new project, public permissions, billing upgrade, service account, Cloud Function or Google Sheet is needed. If Firestore asks for an index, use its console-generated link for the `tags` collection, `visibility` + `ownerUid`, Collection scope. Both tasks/tags declarations are in `firestore.indexes.json`.

## What Syncs

The November 25 update adds owner-only `dismissed` and `sortOrder` fields to each existing daily-pick receipt. Publish the current complete rules to enable Not today / Undo and saved daily placement. The chosen task ID and creation time remain immutable, and no task content, dates, ownership or completion changes are needed. Website publication alone does not enable these receipt writes.

- Tasks, assignments, dates, completion and ordering: existing household task documents.
- Style, color palette, enabled Someday list and task-audience filters: `listUsers/UID/preferences/main`, editable only by that user.
- Tag directory: `listSpaces/HOUSEHOLD/environments/ENV/tags/TAG_ID`. Shared tags are readable/editable by household members; personal tags are private to their creator except the disclosed administrator read-only preview.
- Daily Later pick: existing per-person/day receipt; Someday is explicitly ineligible.
- Animations, gestures, editor mode, extended-day count and desktop-board preference remain device-local.

Optional fields preserve compatibility with old tasks. No automatic history rewrite is required. Account settings and tags have their own durable offline queue, included in Pending changes/sign-out protection. The metadata queue is not mixed into task replay.

## After Rules Publication: Check on Real Phones

Use your real signed-in browsers for these deliberate checks, not production fixture seeds:

1. Change color/style on one device; verify the same account's other device updates. Sophie keeps her own appearance.
2. Enable Someday for Tal. Verify Tal sees it on both devices, Sophie does not unless she enables it.
3. Add an idea there, hide the list, and find it in search. Re-enable to restore the tab.
4. Add Personal and Household tags to a private task; verify only Household names are offered to Sophie.
5. Share the draft: its Personal tags are removed with an explanation before Save.
6. Disconnect after an online visit, change a task or setting, reconnect with Lists open, and confirm upload.

Automated tests use synthetic identities and local demo-project emulators only. They do not prove actual Google OAuth, physical phone keyboards or OS installation behavior.

## Household Management

Only verified `talrme@gmail.com` has Admin. In Settings -> Admin -> Households, Manage edits names/invitations; New household creates another household for invited Google accounts. Household creation never overwrites an existing link. Member registration records an already-authorized identity; it does not grant access.

Sophie signs in with `sophiegreen2@gmail.com`. Invited people can be assigned shared tasks by email before first visit; Google photos appear after registration, with initials as fallback. Uninvited accounts may authenticate but cannot read household data.

Removing an invitation revokes access without deleting tasks; reinviting the same account restores access. Changing households is in Settings -> Account & privacy. Share/install links preserve the household.

Tal's View as user is explicitly read-only, including private tasks as requested. It cannot edit, create picks, impersonate authentication, or cache the previewed user's task data. Preferences and personal tag reads have the same disclosed admin-read exception, not a write bypass.

## Safe Testing

Settings -> Admin -> Testing manages the isolated Playground. Create/invite, add examples explicitly, and test across real invited Google accounts. Reset rotates only the validated Playground namespace, retaining old test rounds and all real household data. No public sandbox or fake-account sign-in exists.

## Reproducing Initial Project Setup

Only for a genuinely new project: create Firebase project -> register a Web app without Hosting -> enable Google Authentication/support email -> authorize `talrme.github.io` -> create Firestore in production mode -> configure the public Web object -> publish rules -> create households from the admin UI.

For local sign-in, authorize localhost and 127.0.0.1 too. Never put service-account JSON, OAuth secrets or Admin SDK keys in this repository. Website config is public; rules enforce actual access.

Google sign-in persists locally. Private browsing, cleared storage, revocation, or an independent installed-app browser context can require another login. First login and an unvisited household require internet. Cached offline edits upload with Lists open; closed-app background uploading and indefinite storage retention are not guaranteed.
