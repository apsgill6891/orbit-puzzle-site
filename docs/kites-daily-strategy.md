# Kites daily puzzle strategy

## Core count for the current 5x5 format

A complete solved Kites board is defined by:

- a permutation of the 5 kite columns, which gives `5! = 120` placements
- one direction for each of the 5 kites, which gives `4^5 = 1,024` orientation patterns

That means the current 5x5 game has:

- `120 * 1,024 = 122,880` complete answer boards

Each solved board has 20 non-kite cells that can potentially be shown as cloud clues. If any subset of those 20 cells can be revealed, then each answer board can produce:

- `2^20 = 1,048,576` clue masks

So the raw authored-puzzle upper bound is:

- `122,880 * 1,048,576 = 128,849,018,880`

That is far more than enough for a once-per-day game, even after aggressive filtering.

## What matters for a LinkedIn-style daily product

The raw count is not the real production count. A real daily pipeline should filter by:

1. **Validity** — at least one solution exists.
2. **Uniqueness** — exactly one solution, if that is part of the product requirement.
3. **Difficulty** — estimated from solver behavior, not just clue count.
4. **Variety** — avoid repeating similar visual patterns on consecutive days.

## Practical difficulty plan

A simple first-pass production strategy is:

- **Easy:** 8-10 clues
- **Medium:** 6-7 clues
- **Hard:** 4-5 clues

Then run a solver and attach a difficulty score based on:

- number of candidate boards surviving after each deduction pass
- whether row/column placement resolves before direction logic
- how often cloud counts force blocking interactions between kites
- whether backtracking is needed

## Daily publishing model

If LinkedIn wants one puzzle per day with a rotating difficulty:

- pre-generate a large bank offline
- tag each puzzle with a date, difficulty, and uniqueness metadata
- publish one puzzle per day from the bank
- keep hints/reveal tied to one authored solution, but keep the live checker aligned with the puzzle policy

## Important policy decision

If the game allows multiple valid solutions, the checker must accept **any** valid arrangement that satisfies the visible rules. If the product wants a single “official” answer every day, then the generation pipeline must enforce uniqueness before shipping.
