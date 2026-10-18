# Put the planner on your phone

Use the HTTPS Vercel URL after deployment. A phone cannot reach your computer using `localhost`; use the deployed site for routine use. No coach account is needed.

## Install the planner

On Android, open the site in Chrome, Edge or another browser supporting installation. Open the browser menu and choose **Install app** or **Add to Home screen**. On iPhone/iPad, open it in Safari, tap Share, then **Add to Home Screen**. Installation is optional. Open the organizer at least once while online and wait for your schedule to load before relying on it offline. Storage is tied to this browser/profile; private browsing or clearing site data can remove it.

## Firefox Android and the capture helper

1. Install Firefox from your phone's normal app store and open it.
2. Open Firefox's menu, choose Extensions, search **Tampermonkey**, and select **Add to Firefox**. Mozilla lists [Tampermonkey as available on Firefox Android](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/). Mozilla sign-in is not needed to install it.
3. Open your planner's **Capture / Refresh Data** section and choose the helper installation link. It points to `/ama-sportdata-helper.user.js` on your deployment.
4. Let Tampermonkey show the script installation screen, review its two SportData match patterns, then select **Install**. If the browser displays source or downloads the file instead, open the Tampermonkey dashboard, create a new script, replace the editor contents with the generated file, and save.
5. Open a SportData page normally. Reload once if the helper control is absent. Ensure the extension is enabled for that tab and for SportData. The collapsed control reads **Capture for AMA Planner**.
6. Complete any SportData verification yourself. The helper cannot capture a verification screen. Tap the control only after the normal page is visible.
7. Capture entries, each timetable day and only the relevant draws. Download a capture file or copy normalized JSON. Import it into the planner using the same browser/device where your working tournament is saved.

Userscript support depends on the browser and manager. If it is unavailable, use manual entry, CSV/TSV, or saved HTML imported locally. Other coaches opening a published link need only a modern browser; they do not need this helper, Firefox, or installation.

## Update an installed capture helper

The helper installed in Tampermonkey is a separate copy; deploying the planner does not replace it immediately. After the deployment is ready, reopen **Install SportData capture helper** from the planner. Accept **Update** or **Reinstall** in the manager, then check that its dashboard lists version **1.0.1** or later. If the link displays code, replace the contents of the existing helper in the manager's editor with the new file and save; do not create a second enabled copy. Reload the SportData tab.

The control appears in the bottom-left corner of an ordinary SportData page. Expand **Capture for AMA Planner**, check the event ID, club aliases and timezone, choose **draw** for an initial pool/draw, then select **Capture Current Page**. Review the counts before exporting. A draw capture does not replace the entries and timetable captures. If the page layout is unrecognized or no assignments are found, use manual entry/correction rather than assume the draw was understood.

Version 1.0.1 fixes hidden verification remnants incorrectly blocking ordinary pages. A real visible challenge still disables capture: finish it manually, wait for the ordinary page to load, then close and reopen the helper. There is no override for a visible verification screen.

## At the tournament

Check the event timezone, switch to **Now and Next**, and check unresolved rows before relying on a Tatami assignment. The app follows scheduled times, not live referee progress. Optional notifications work while the page is open; closed-app delivery is not promised. Test offline mode before leaving home. Keep a JSON export and, if published, a separate private organizer recovery file.
