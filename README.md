# Herculaneum Ink Lab

Herculaneum Ink Lab is a browser-based educational application about the
ancient papyri of Herculaneum. Students can inspect a papyrus image, label
regions that may contain ink, and compare their labels with an expert reference
annotation.

Students can compare their work with the expert annotation as a translucent
overlay or in synchronized side-by-side panels. This version does not include
machine-learning predictions, student accounts, a database, or cloud storage.

## What you need

Install the **LTS version of Node.js** from [nodejs.org](https://nodejs.org/) if
it is not already installed. Node.js includes `npm`, the tool that installs and
runs this project.

## Open the application

1. Open **PowerShell**.
2. Move into the project folder:

   ```powershell
   cd "PATH-TO-YOUR-PROJECT\herculaneum-ink-lab"
   ```

3. Install the project packages. You only need to do this the first time:

   ```powershell
   npm install
   ```

4. Start the application:

   ```powershell
   npm run dev
   ```

5. PowerShell will display a local address, usually
   `http://localhost:5173/`. Hold **Ctrl** and click the address, or copy it into
   a browser.

Keep PowerShell open while using the application. Press **Ctrl+C** in
PowerShell to stop it.

## Use the investigation

1. Select **Begin Investigation**.
2. Use **Navigate mode** to zoom or pan around the papyrus.
3. Select **Label mode**, then paint with the **Likely Ink brush**.
4. Use the eraser, Undo, Redo, Clear Labels, and brush-size control as needed.
5. Select **Check My Labels** to calculate the comparison metrics.
6. After making a genuine label and checking it, select
   **Reveal Expert Reference**.
7. Show or hide either annotation layer and adjust the expert-reference
   opacity.
8. Select **Overlay Comparison** to place both annotations over the surface.
9. Select **Side-by-Side Comparison** to place **My Labels** and
   **Expert Reference** in synchronized panels.
10. Select **Return to Overlay Comparison** to return to the combined viewer.

Students may continue editing and checking their metrics after revealing the
reference. **Start Over** removes the current work, hides the reference, and
requires another label-and-check attempt before it can be revealed again.

On narrow screens, including an iPad in portrait orientation, the comparison
panels stack vertically. Zooming, panning, and resetting still affect both
panels together.

## Create and print the student report

After checking labels, enter a student name or assigned identifier in the
**Final report** section and select **Create Final Report**.

The report includes the investigation and case information, completion date,
source credit, license, both comparison images, and all three metrics.

- **Return to Investigation** keeps the current identifier, labels, and results
  in memory so the student can revise and create another report.
- **Print Report** opens the browser print dialog.
- **Save as PDF through the browser print dialog** opens the same dialog. Choose
  the browser's **Save as PDF** destination instead of a printer.
- **Start Over** asks for confirmation, then clears the identifier, labels,
  results, and expert-reference access.

The report uses a US letter print layout. Editing controls are hidden when
printing, while the two images, metrics, source credit, and license remain
visible.

### Student privacy

The student identifier and report exist only in the current page's memory.
They are not uploaded and are not written to local storage, session storage,
cookies, analytics, or an external tracking service. Refreshing or closing the
page also clears them.

## Run the tests

From the project folder, run:

```powershell
npm test
```

The tests cover the home screen, keyboard and touch input, annotation tools,
expert-reference reveal rules, overlay controls, side-by-side synchronization,
top-edge and corner alignment, reference-mask validation, exact scoring
examples, repeated comparisons, and Start Over.

## Create a production build

Run:

```powershell
npm run build
```

This checks the TypeScript code and packages the application into the `dist`
folder.

## Case files

The first case is stored in the `public` folder and uses exactly three files:

- `surface.png` — the papyrus students examine
- `reference-mask.png` — the transparent expert reference annotation
- `metadata.json` — information and settings for the case

Do not add an `evaluation-mask.png`. This version scores the entire surface
image.

### Metadata fields

Open `public/metadata.json` in a text editor to view or update these fields:

- `caseId` — a short, unique identifier for the case.
- `caseTitle` — the name shown for the case.
- `studentInstructions` — the instruction students receive.
- `surfaceImage` — the exact filename of the source image.
- `referenceMask` — the exact filename of the expert reference mask.
- `minimumInkRecovery` — the future access threshold for Ink Recovered. The
  initial value is `0.20`, meaning 20%.
- `minimumLabelPrecision` — the future access threshold for Label Precision.
  The initial value is `0.60`, meaning 60%.
- `sourceCredit` — who supplied or created the source image.
- `license` — the permission or license covering use of the source image.
- `referenceMaskDescription` — a plain-language description of who made the
  mask, what it represents, or whether it is temporary.

The two thresholds are stored for future work. They do not unlock a prediction
in this milestone.

## Preparing the Expert Reference Mask

The project currently contains the real expert reference annotation supplied
for the sample case.

### Make the real mask in GIMP

1. Open the final `public/surface.png` in GIMP.
2. Add a new layer.
3. Make sure the new layer has transparency. In GIMP, transparent areas appear
   as a gray checkerboard.
4. Paint accepted ink on the new layer using opaque white.
5. Leave every other part of that layer transparent.
6. Hide the original surface-image layer before exporting. You should see the
   white annotation over GIMP's checkerboard, not over the papyrus.
7. Export only the annotation layer as `reference-mask.png`.
8. Choose PNG format. Do not export it as JPG because JPG cannot preserve
   transparency.

After beginning the mask, do not resize, crop, rotate, or move the canvas. The
mask and `surface.png` must have exactly the same pixel dimensions. For this
case, both must be **1746 × 1164 pixels**.

The application reads mask membership from the PNG alpha channel:

- Alpha values from 128 through 255 count as accepted ink.
- Alpha values from 0 through 127 count as non-reference surface.
- Partially transparent edges are allowed and reported during validation.
- RGB color is secondary, but included pixels should normally be approximately
  white.

In this version, the full source image is scored. Transparent mask regions are
therefore treated as evaluated non-reference surface. Transparency does not
claim that ink is impossible there; it only means that the region is outside
this expert reference annotation.

### Replace or update the expert reference mask

1. Keep your real file named exactly `reference-mask.png`.
2. Copy it into:

   ```text
   PATH-TO-YOUR-PROJECT\herculaneum-ink-lab\public
   ```

3. Allow Windows to replace the existing file.
4. Do not replace or edit `surface.png`.
5. Update `referenceMaskDescription` in `metadata.json` if the annotation or
   its source changed.
6. Open teacher inspection mode and confirm that validation passes and the
   overlay aligns correctly.

### Open teacher inspection mode

Start the application normally, then open:

```text
http://localhost:5173/?teacher=1
```

Select **Begin Investigation**. The teacher panel is only enabled by this
special address and does not appear in the normal student workflow.

The panel lets you independently show or hide:

- the source image;
- the student annotation;
- the expert reference annotation.

It also includes an expert-overlay opacity slider and a validation summary.
Zoom, pan, reset, resize the browser, and rotate a tablet while watching a
recognizable reference feature. The source, student annotation, and reference
annotation should remain fixed to the same image coordinates.

### Add another case later

Create a new folder under `public/cases` and place a matching `surface.png`,
`reference-mask.png`, and `metadata.json` inside it. Give the new case a unique
`caseId`, update its credits and descriptions, and keep its surface and mask at
identical dimensions. A later case-selection feature can point the reusable
loader at that folder. The current student screen continues to use the first
case in `public`.

## How comparison metrics work

Results are calculated only when a student selects **Check My Labels**.
Students can continue editing and check again.

- **Ink Recovered** is the number of painted pixels overlapping accepted
  reference ink divided by all accepted reference-ink pixels.
- **Label Precision** is the number of painted pixels overlapping accepted
  reference ink divided by all painted pixels. If nothing is painted, the
  application asks the student to add labels instead of displaying a misleading
  percentage.
- **Extra Surface Marked** is the number of painted non-reference pixels
  divided by all non-reference pixels in the source image.

The percentages are rounded to whole numbers and are never combined into a
single overall score.

## Project map

- `src/App.tsx` — student workflow and composition of the separate modules
- `src/caseData.ts` — case metadata, image loading, and reference validation
- `src/coordinates.ts` — shared conversion between browser pointer positions
  and source-image pixels
- `src/viewerState.ts` — zoom, pan, reset state, and viewport bounds
- `src/evaluation.ts` — annotation rasterization and metric calculations only
- `src/investigationSession.ts` — documented in-memory report data structure
- `src/StudentReport.tsx` — report rendering and print controls
- `src/classifierContract.ts` — type-only contract for a possible future
  classifier; no model is implemented
- `src/index.css` — layout and responsive visual design
- `src/App.test.tsx` — interface, accessibility, and interaction tests
- `src/coordinates.test.ts` — top-edge, corner, zoom, pan, and resize tests
- `src/evaluation.test.ts` — artificial-image validation and scoring tests
- `src/investigationSession.test.ts` — session construction and validation
  tests
- `src/StudentReport.test.tsx` — report content, image, metric, and print tests
- `src/main.tsx` — starts React in the browser
- `public/surface.png` — browser-ready papyrus image
- `public/reference-mask.png` — expert reference mask
- `public/metadata.json` — reusable case information
- `package.json` — project commands and required packages
- `vite.config.ts` — Vite and test settings

## Accessibility and supported input

- Buttons and sliders use native browser controls and can be reached and
  activated with a keyboard.
- Controls have visible focus outlines and large touch targets.
- Drawing and navigation use pointer events, supporting a mouse, trackpad,
  touch input, and compatible styluses such as Apple Pencil.
- Navigate mode and Label mode are separate so painting and panning do not
  happen at the same time.
- The layout adapts to desktop, tablet landscape, and tablet portrait widths.
- Reduced-motion browser preferences disable nonessential transitions.

## Investigation-session data structure

The report receives one plain `InvestigationSession` object instead of reading
directly from React components. The object contains:

- the student identifier;
- investigation title and completion time;
- case identifier, source credit, and license;
- surface and reference image paths;
- source-image width and height;
- a copied list of annotation strokes in source-image pixels;
- a copied metrics result;
- expert-reference unlock and reveal state;
- the investigation completion state.

`createInvestigationSession` trims and validates the identifier and copies the
stroke, point, size, and metric data. The report can therefore be tested or
rendered using only this object. A future persistence feature could serialize
this documented structure without redesigning annotation rendering or scoring,
but this milestone intentionally does not save it anywhere.

## Future Expansion Architecture

The code is divided into small layers so future work can be added without
changing the current student workflow:

1. **Case data** (`src/caseData.ts`) owns the surface image, expert mask,
   credits, license, instructions, file validation, and alpha-channel mask
   membership. It does not score student work.
2. **Investigation session data** (`src/investigationSession.ts`) is a plain,
   in-memory snapshot containing the student identifier, annotation strokes,
   scoring result, reference reveal state, and completion state. Nothing is
   written to browser storage or sent elsewhere.
3. **Viewer and coordinates** (`src/viewerState.ts` and `src/coordinates.ts`)
   own zoom, pan, viewport bounds, pointer conversion, source-image
   coordinates, and the common geometry used by the brush cursor and aligned
   overlays.
4. **Scoring** (`src/evaluation.ts`) rasterizes source-coordinate strokes and
   calculates Ink Recovered, Label Precision, and Extra Surface Marked. It has
   no user-interface or report responsibility.
5. **Report generation** (`src/StudentReport.tsx`) reads the completed
   `InvestigationSession`. It displays the metrics already stored in that
   snapshot and never recalculates them.

`src/classifierContract.ts` documents a future classifier boundary only. Its
request can describe source-image dimensions, an image or image region,
positive ink labels, separate future negative non-ink labels, and case
metadata. Its result can describe a source-aligned probability map, model
status, training-round identifier, and structured error information. There is
deliberately no classifier implementation, model dependency, API, server, or
persistence at this checkpoint.

## Current limitations

- Student work is kept only in browser memory and is lost when the page is
  refreshed or closed.
- The full image is used for scoring; there is no separate evaluation mask.
- The application currently opens one sample case; there is no case-selection
  screen.
- There are no saved student accounts, class reports, or exported results.
- Reports can only be saved by printing to PDF; there is no JSON export or
  import.
- The expert reference is a prepared comparison standard, not proof that all
  transparent regions contain no ink.
- Machine-learning predictions are not included.
