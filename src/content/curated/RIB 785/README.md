# RIB 785 curated case data

RIB 785 is available from the student homepage for **Letter Identification**.
**Transcription** unlocks after Letter Identification is completed. Word
Segmentation unlocks after Transcription is completed. Translation unlocks
after Word Segmentation is completed.

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

## Student transcription stage

The five-line diplomatic instructor reference is read from the case data and
is not exposed before the first student check. Ordinary spaces are optional
for the main sequence comparison, but V/U, letters, notation, order, and line
boundaries remain distinct. Results use categorical line statuses rather than
a score. Student text and comparison state remain in the same in-memory case
session as student letter regions.

## Student word-segmentation stage

The student's completed five-line diplomatic transcription becomes the
spacing workspace. Comparison uses boundary positions counted between
non-space characters. Repeated or outside spaces are normalized, while changed
letters, V/U differences, punctuation, order, and line boundaries remain
significant. The instructor reference is the five-line inscriptional reading
`D M / CRESCENTINVS / S VIXIT ANNIS / XVIII VIDARIS / PATER POSVIT`; it is
hidden before the first check and is never expanded or normalized.

The session records the transcription version used by segmentation. Changing
and re-completing Transcription resets stale segmentation comparison state and
starts from the revised student text.

## Student translation stage

Translation uses the student's completed diplomatic transcription and word
segmentation as prior evidence. The permanent normalized reading and English
translation stay separate in the curated case data and remain hidden until
the student selects **Review Translation** after writing nonblank English
prose.

Review is a student- and instructor-guided comparison rather than semantic
grading. The application does not infer ideas from the prose or calculate a
score. Students control five content-review checkboxes and may keep an
optional revision note. The session tracks review attempts, reveal states,
checklist state, completion, and the transcription and segmentation versions
used for the review.

Changing either earlier text stage invalidates Translation review and
completion while preserving the student's typed prose when practical.
Completing Translation displays a four-stage case-completion summary. Student
state remains browser-memory only, and the combined final report is reserved
for a later milestone.
