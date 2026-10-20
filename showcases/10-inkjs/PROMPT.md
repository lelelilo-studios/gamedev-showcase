Use inkjs@2.4.0 (the full build, with the ink compiler) to build "The Ninth-Floor Night Porter", a short, finished piece of interactive fiction written in ink, plus a script view that lets the reader rewrite it.

The story: one night shift at the fictional Halcyon Pier Hotel, a tired seaside hotel at the end of the season. You are the night porter. Between midnight and six, guests ring down with requests (a lost key, a parrot, a honeymooner who can't sleep, a man who checks in under three names), and one of them is not what they seem. What you notice, what you keep and who you help decides how the morning goes. About 10 to 15 minutes to read, with at least four endings and choices that matter later.

Write it properly in ink (one `.ink` file, at least 1,500 words of story), and use the language's features on purpose:
- Knots and stitches for the hotel's floors and rooms, diverts and tunnels for the bell board, threads for the pocket notebook you can check from anywhere.
- Variables and conditionals (tips earned, the guests' trust, the clock), visit counts (the second time you knock on a door reads differently), and a LIST for your pockets (inventory).
- Tags for the interface: the time on the clock, which bell lights up, sound cues and scene changes.
- `SEED_RANDOM` from the seed, so a seeded reading is repeatable.

The interface: the story is written into the porter's night ledger, one entry per hour, with the bell board, the clock, the notebook and the pocket contents around it. Choices are clear buttons with number keys 1 to 9. Save and continue (the story state's JSON in localStorage), and restart.

The script view (a button or key S): the ink source next to the story, editable, with line numbers and light syntax colouring. "Rebind the book" recompiles it with the inkjs compiler and restarts; compiler errors and warnings show at their lines in a designed panel. A "Back to the original" button restores the shipped story.

Look: midnight blue, pier lamps, a warm ledger paper, a brass bell board. A literary serif for the story, a handwriting-like face for the porter's notes (readable, not a novelty font), and a mono for the script view.
