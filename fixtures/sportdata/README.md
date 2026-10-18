# Synthetic fixture coverage

No file contains captured SportData session or verification data. The fictional event ID is 90001. These files describe supported semantic layouts, not verified real-event layouts.

| File                    | Cases                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| verification.html       | Verification guard                                                                                                          |
| event.html              | Tournament/event metadata                                                                                                   |
| entries.html            | All entries, club variations, abbreviation false positives, duplicates, team members, Kata/Kumite                           |
| participants.html       | Category participant list                                                                                                   |
| timetable.html          | Single/multiple days, one/two pools, different start times/Tatamis, double elimination, repechage/final, non-category break |
| grid.html               | Simultaneous pools on different Tatamis, single-day grid                                                                    |
| draw.html               | Kata, two initial pools, repeated appearances, repechage/final/poolwinner exclusion                                         |
| double-elimination.html | Kumite, one unnumbered initial pool                                                                                         |
| ambiguous-draw.html     | Ambiguous normalized athlete name across pools                                                                              |
| missing-fields.html     | Missing draw, missing category slot, unidentified team                                                                      |
| unknown.html            | Unrecognized layout                                                                                                         |
