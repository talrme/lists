# Lists: Firebase setup, click by click

**Website:** https://talrme.github.io/lists/

**Repository:** https://github.com/talrme/lists

The ten sandboxes already work without Firebase. They are **sample data on one device**, not a private shared backend. Real sign-in pages use `?mode=live`; those stay locked until configuration is supplied. Do not enter sensitive information in the sandbox.

**Current progress:** configuration supplied for `lists-95c4f`; owner confirmed Google sign-in, authorized Pages domain, Firestore creation and published rules. Configuration is now in `config.js`. Continue at **Step 6: Get your two user IDs** below; household membership remains to be added.

## 1. Create a separate Firebase project

1. On a computer, open https://console.firebase.google.com/ and sign into your Google account.
2. Click **Create a project** (sometimes **Add project**).
3. Name it **Lists**. The generated project ID can have extra letters or numbers; that is fine.
4. Skip Google Analytics and Gemini features if offered. Neither is needed.
5. Click **Create project**, wait, then **Continue**.

Do not reuse Huck's public database. This one needs different, private security rules. Start with the no-cost Spark plan; no payment or hosted server is required for this prototype. Google can change plan limits; check the console before enabling a paid product.

## 2. Register the website

1. From Project Overview, click the **web icon `</>`**. If necessary, use the gear → Project settings → General → Your apps → Add app → Web.
2. App nickname: **Lists website**.
3. Leave **Also set up Firebase Hosting** unchecked. GitHub Pages already hosts the site.
4. Click **Register app**.
5. Choose **Use a script tag** if the page offers npm versus script. We only need the `firebaseConfig` object; ignore the installation commands.
6. Copy the entire `const firebaseConfig = { ... };` object and send it to Codex in this chat.
7. Click **Continue to console**. You can retrieve the object later under gear → Project settings → General → Your apps → SDK setup and configuration → Config.

This web configuration is designed to be public. It is **not** a service-account/private key. Never send or commit a service-account JSON, OAuth client secret, or Admin SDK key.

## 3. Enable Google sign-in

1. Open **Build → Authentication**. Click **Get started**.
2. Open **Sign-in method** (or **Sign-in providers**).
3. Click **Google**, enable it, select your email as the support email, and click **Save**.
4. Do not enable Anonymous authentication or Email/Password. We do not need them.
5. Open **Authentication → Settings → Authorized domains**.
6. Click **Add domain**, enter **`talrme.github.io`**, and save. Enter the domain only: no `https://`, no `/lists`.
7. For local testing only, also add **`localhost`** and **`127.0.0.1`**. New Firebase projects do not automatically include localhost. They can be removed after testing.

The app uses Google's sign-in window, opened by an explicit tap, rather than redirect-based sign-in. GitHub Pages cannot host Firebase's `/__/auth` helper endpoints, and cross-site redirect flows are unreliable in browsers that block third-party storage. If your phone blocks the sign-in window, open the site in Safari/Chrome (not an embedded messaging-app browser), allow the window, and retry. We should test sign-in on your actual phones before promotion.

## 4. Create Cloud Firestore, locked down

1. Open **Build → Firestore Database**.
2. Click **Create database**.
3. If offered an edition, choose **Standard edition**, then database ID **`(default)`**.
4. Select a nearby US location (for example `us-west1` if available). The exact region does not affect the app's calendar timezone. Database location is not easily changed later.
5. Choose **Start in production mode**, **not test mode**. Click **Create** / **Enable** and wait.
6. Open the **Rules** tab.
7. In the GitHub repository, open [`firestore.rules`](https://github.com/talrme/lists/blob/main/firestore.rules), click **Raw**, select all, and copy the **whole file**, not a diff with `+` and `-` markers.
8. Select everything in Firebase's rules editor and paste the file over it.
9. Click **Publish**. Merely pasting is not enough. Wait for the published confirmation.

These rules allow only verified Google sign-ins for `talrme@gmail.com` and `sophiegreen2@gmail.com`, AND require membership in your household. Private tasks can only be read by their owner. Both members can read/complete/edit shared tasks. Only a task's creator can make it private again. No client can change the household membership document. The Firebase Console can edit it because you own the project.

## 5. Send the configuration to Codex

Send the object from step 2. I will put it in `config.js`, commit/push it, and confirm the live sign-in links. There is **nothing to paste into either phone**.

Keep the database closed while waiting. The website's normal sample previews remain separate and never upload sample tasks to Firebase.

## 6. Get your two user IDs

Once Codex confirms the configuration is published:

1. Open https://talrme.github.io/lists/staging/01/?mode=live in your browser.
2. Tap **Continue with Google**, and choose **talrme@gmail.com**.
3. You will see an access message and a **user ID**. This is expected before membership is added. Copy it; double-click/select the displayed ID if needed.
4. Have Sophie open the same link and sign in as **sophiegreen2@gmail.com**. Copy her user ID too.
5. Send those two IDs to Codex, labeled Tal and Sophie, or use them in the next step yourself. They are identifiers, not passwords.

Neither account can read any tasks yet. The app does not automatically grant the first visitor membership.

## 7. Add the household once

In Firebase → Firestore Database → **Data**:

1. Click **Start collection**. Collection ID: **`listSpaces`**. Click Next.
2. Document ID: **`home`**. Do not use Auto-ID.
3. Add a field **`memberUids`**, choose type **array**. Add two **string** elements: Tal's ID and Sophie's ID. The IDs are case-sensitive.
4. Add a second field **`names`**, choose type **map**.
5. Inside that map, add a field whose **name is Tal's actual UID**, type **string**, value **`Tal`**.
6. Add another map field whose **name is Sophie's actual UID**, type **string**, value **`Sophie`**.
7. Click **Save**.

The resulting document looks like this (replace the placeholders, do not type the angle brackets):

```text
listSpaces / home
  memberUids: ["<Tal UID>", "<Sophie UID>"]
  names:
    <Tal UID>: "Tal"
    <Sophie UID>: "Sophie"
```

No task collections need to be created by hand. Click **Check access again** on both phones or refresh. The authenticated app should open with an empty real list, not sample tasks.

## 8. Check indexes if Firebase requests one

Private tasks use two equality filters. Firestore can generally merge their automatic single-field indexes. If an error requests a composite index, follow its console link, confirm the collection group **tasks**, scope **Collection**, fields **visibility Ascending** and **ownerUid Ascending**, click **Create**, and wait for **Enabled**. The same index is declared in `firestore.indexes.json` for future CLI deployment.

## 9. Prove privacy and sync before using real lists

1. Tal adds an ASAP task with **Only me · private**. Sophie should not see it, including in Shared.
2. Tal adds a task assigned to Sophie. It should appear in **Shared** on both phones, and in Sophie's **Mine** view.
3. Sophie completes that task. Both phones should update without refreshing.
4. Add a shared unassigned task. Both can see and complete it.
5. Refresh/reopen both browsers. Entries should remain; Google should normally keep you signed in.
6. Open an incognito window. It should require sign-in and show no household tasks.
7. Try a different Google account. It must not gain access.
8. Turn off the internet, attempt a task edit, and confirm the app does not claim it was saved. Reconnect and retry. Existing draft text stays in the editor if a save fails.

Tell me when steps 1–4 are ready; I can run authenticated checks once a browser session or test setup is available. I cannot publish console rules or create your project from only the public web config. Until then, automated checks cover the actual sandbox workflows and scheduling logic, not live Google sign-in or deployed rule enforcement.

## Staying signed in and saving to your phone

Firebase uses **local authentication persistence**, so closing a browser normally does not sign you out. Private browsing, clearing website data, explicit sign-out, revoked sessions, or OS storage cleanup can require signing in again. Safari and an installed Home Screen app may have separate sessions; you may sign in once in each. This is not a promise of never signing in again.

Use **Save / Share** in an authenticated design to get installation instructions and its link. Installed staging shortcuts open that design's **live sign-in** version. After you choose one design, we will promote it to the root, update the install link, and remove the other nine without deleting backend data.

## Sources

- [Firebase project and web setup](https://firebase.google.com/docs/web/setup)
- [Google sign-in](https://firebase.google.com/docs/auth/web/google-signin)
- [Authentication persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [Redirect restrictions and popup alternative](https://firebase.google.com/docs/auth/web/redirect-best-practices)
- [Authorized-domain changes](https://firebase.google.com/docs/auth/faq-and-troubleshooting)
- [Firestore access rules](https://firebase.google.com/docs/firestore/security/rules-conditions)

Reviewed November 16, 2026. Console labels may vary slightly.
