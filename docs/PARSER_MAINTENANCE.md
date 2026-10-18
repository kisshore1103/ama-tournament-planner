# Maintain the SportData parser

Automated tests use synthetic, sanitized static pages. They do not contact SportData. Real tournament layouts must be checked manually; the fixture set is not a claim that every SportData variant is supported.

## Detection and selectors

The parser first checks visible verification indicators and challenge-container presence without reading answers. It then classifies semantic tables/headings into event, entries, participants, timetable or draw pages. The helper lets the user choose a type when detection is uncertain. Selectors and header aliases live in `lib/parser`; UI code does not contain tournament selectors.

Entries require identifiable athlete and club fields, with category fields or a contextual heading. Team members are extracted only from explicitly labelled member lists. Timetables recognize labelled columns and conservative time/Tatami grids; unrecognized cells produce warnings. Draws use labelled main-pool headings and participant rows, excluding repechage, finals and poolwinner rounds.

## Add or fix a layout

1. Save a small ordinary-page example, sanitize names/identifiers and remove scripts, cookies, hidden verification/session fields and unrelated content. Keep the relevant visible structure. Add it under `fixtures/sportdata`.
2. Add a unit test asserting extracted values and warnings. Include a nearby ambiguous/missing-field case that must remain unresolved.
3. Prefer table headers, headings, actual anchors and stable semantic structure. Add a small fallback rather than hard-coding a tournament ID, athlete, row number or Tatami.
4. Preserve original displayed date/time labels alongside normalized event-timezone values. Do not assume the viewer's timezone.
5. Keep exact category-ID matching first. Never weaken club matching to substring matching or athlete matching to broad fuzzy matching. A false confident mapping can send a coach to the wrong Tatami.
6. Ensure later phases remain only Possible Later Rounds and duplicate draw appearances do not duplicate the Student + Category primary row.
7. Run `npm.cmd test`, `npm.cmd run userscript:build`, `npm.cmd run userscript:check`, `npm.cmd run typecheck`, and `npm.cmd run lint`. Run the browser suite and production build before release.
8. Update the documented limitation and fixture coverage. Re-capture a normal visible page manually to validate the improvement; never add automated SportData navigation or requests.

## Known conservative boundaries

Image-only/PDF brackets, canvas-rendered athletes, unlabelled positional layouts, missing timezone/date context, abbreviated ambiguous names and unidentified team members need manual correction. Date labels with an ambiguous numeric order are not guessed. The user can import manual CSV/TSV or add/correct each row even when parsing returns no data.
