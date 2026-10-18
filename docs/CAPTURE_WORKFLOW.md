# Capture your first tournament

1. Open the organizer and paste the tournament's HTTPS SportData Karate URL. For example, event `10695` uses `https://www.sportdata.org/karate/set-online/veranstaltung_info_main.php?active_menu=calendar&vernr=10695`. The app extracts the event ID; it contains no hard-coded event participants.
2. Save the name, event timezone, club and aliases. Aliases are exact after harmless normalization. Add the actual displayed club spelling if needed; do not use a broad fragment to match unrelated clubs.
3. Open **Capture / Refresh Data**. Install the helper as described in [Phone setup](PHONE_SETUP.md).
4. Select **Open SportData Entries**. Open the page visibly and complete any human-verification step normally. The planner never requests that page in the background.
5. Tap **Capture for AMA Planner**, confirm the page type, club aliases and timezone, then **Capture Current Page**. Review the local summary. If it says verification is still displayed, close the helper and finish verification normally.
6. Return to the planner and open the timetable link. In SportData, manually select each tournament day and capture each visible timetable. Repeat for every day. The planner displays captured dates; enter any expected missing day for a coverage check.
7. Inspect the planner's pools/draw queue. A single initial timetable record can map directly. Multiple pools require the athlete's actual initial draw pool. Open only the relevant category draws yourself and capture each. Finals and repechage do not establish an initial pool.
8. In the helper, choose **View Capture Summary**, then **Download Capture File** or **Copy Capture JSON**. It exports normalized data only. No cookies, session identifiers, challenge answers or raw HTML are included. Clear the helper session when replacing tournaments.
9. In the planner, choose **Import / Export**, select the `.ama-capture.json` file or paste it, then **Import data**. The event ID must match your current tournament. Invalid data leaves the last valid schedule intact.
10. Open **Review** in the capture workflow. Check club-match warnings, missing timetable days, missing draws, unknown athletes and ambiguous pools. Choose **Edit** for each affected row. Correct any student/category, pool, Tatami, date/time and actual draw link, or delete an erroneous row. A manual correction takes precedence over subsequent captures.
11. Select **Generate schedule** after importing captures; it also regenerates on successful capture import. Confirm that each Student + Category appears once. Students with unresolved dates, pools or Tatamis stay in review; their Tatami is not guessed.
12. Use **Now and Next** for the active/upcoming entries, or filter/sort All Schedule and Students. Open the student or category link to inspect its draw; use **Open Timetable** separately.

## Manual fallbacks

- Add a student directly with **Add Student Entry**. You can leave unknown values blank and correct them later.
- Add an initial timetable slot with **Add Timetable Record**. Add each pool separately; later phases stay separate context.
- Import saved `.html` locally, normalized JSON, CSV/TSV or tab-separated plain text with a header. The parser never runs the saved page's scripts or inserts its HTML into the app.
- Use the CSV template in README. Times are 24-hour local event times; dates are ISO dates.
- Capture parsers are conservative and depend on page layout. Image-only/PDF draws, unlabelled layouts and unidentified team members require manual entry. Capturing a file does not certify that every field was recognized.

Changing tournaments first removes the old publication (if any), then removes the old local captures, entries and corrections. No history is kept. A newly published tournament receives a new URL.
