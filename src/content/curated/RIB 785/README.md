# RIB 785 curated case data

RIB 785 is available from the student homepage for **Letter Identification**
only. Transcription, Word Segmentation, and Translation remain locked and
labeled **Coming Later**.

## Permanent letter reference

- Authoritative project file:
  `src/content/curated/RIB 785/letter-reference.json`
- Schema version: `1`
- Case ID: `RIB 785`
- Source-image dimensions: `832 × 1084`
- Region count: `47`
- Counts by line: line 1 = 2, line 2 = 11, line 3 = 11, line 4 = 12,
  line 5 = 11
- Intentionally skipped IDs: `letter-region-25`, `letter-region-26`, and
  `letter-region-27`
- Acknowledged transcription mismatches: none

Skipped numeric IDs are valid stable identifiers. They are not renumbered and
the runtime validator does not require consecutive IDs.

The application loads this permanent file as a Vite-managed asset and validates
its schema, case ID, dimensions, region geometry, required metadata, permitted
uncertainty values, five ordered line readings, count, and mismatch state at
module load. The production-build verifier also compares the emitted file with
the approved instructor export by SHA-256.

## Read-only review

The deployed internal review URL is:

`https://jwolfe-latin.github.io/herculaneum-ink-lab/?dev=letter-reference-review&case=RIB%20785`

It overlays all permanent labels on the approved source image, reports
dimensions and counts by line, and filters by line. It is read-only and is not
linked from the student homepage.

The editable instructor workspace remains:

`https://jwolfe-latin.github.io/herculaneum-ink-lab/?dev=letter-reference-editor&case=RIB%20785`

The editor's case-keyed `localStorage` draft is separate from the permanent
JSON. Importing the permanent file into the repository does not replace,
clear, or alter an existing browser draft. The permanent JSON is authoritative
for future case development; the local draft remains an instructor work area.

## Student letter-identification stage

Student boxes use the reusable source-coordinate selector and require only an
uppercase Latin letter plus line number 1–5. Before the first check, the
permanent instructor reference is hidden and no expected letter or line totals
are shown.

Checking uses a `0.35` intersection-over-union threshold. Spatial candidates
are paired from highest overlap downward, and each student or instructor
region can be paired only once. Matching also requires the same label and line.
Feedback remains categorical: Matched Letters, Missed Reference Letters,
Student-Only Selections, and Label or Line Mismatches. No numerical score,
percentage, grade, or pass/fail result is calculated.

Student work is stored only in the current React session and is never written
to `localStorage` or `sessionStorage`. The instructor editor's separate local
draft remains unaffected.

## Later stages

Transcription is the next planned student stage, but it has not been built or
unlocked. Word Segmentation and Translation also remain **Coming Later**.
