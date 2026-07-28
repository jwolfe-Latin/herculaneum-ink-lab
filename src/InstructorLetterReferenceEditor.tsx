import { useMemo, useRef, useState, type ChangeEvent } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import { LetterRegionSelector } from './LetterRegionSelector'
import {
  LETTER_REFERENCE_UNCERTAINTIES,
  createLetterReferenceDraft,
  createLetterReferenceExport,
  letterReferenceDraftKey,
  orderedRegionsForLine,
  parseLetterReferenceDraft,
  parseLetterReferenceJson,
  validateLetterReference,
  type LetterReferenceContext,
} from './letterReference'
import type {
  LetterRegion,
  LetterRegionUncertainty,
} from './letterRegions'

const VALID_LINE_NUMBERS = [1, 2, 3, 4, 5] as const
const PERMANENT_REFERENCE_PATH =
  'src/content/curated/RIB 785/letter-reference.json'
const EXPORT_FILENAME = 'RIB 785-letter-reference.json'

const CONTEXT: LetterReferenceContext = {
  caseId: RIB_785_CASE.id,
  sourceSize: {
    width: RIB_785_CASE.sourceImage.width,
    height: RIB_785_CASE.sourceImage.height,
  },
  transcriptionLines: RIB_785_CASE.diplomaticTranscription.split('\n'),
  validLineNumbers: VALID_LINE_NUMBERS,
}

function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

function formatCoordinate(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2)
}

export function InstructorLetterReferenceEditor() {
  const draftKey = letterReferenceDraftKey(RIB_785_CASE.id)
  const initialDraft = useRef(localStorage.getItem(draftKey))
  const [regions, setRegions] = useState<LetterRegion[]>([])
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    null,
  )
  const [acknowledgedMismatchLines, setAcknowledgedMismatchLines] =
    useState<Set<number>>(new Set())
  const [draftAvailable, setDraftAvailable] = useState(
    initialDraft.current !== null,
  )
  const [draftWriteAllowed, setDraftWriteAllowed] = useState(
    initialDraft.current === null,
  )
  const [draftStatus, setDraftStatus] = useState(
    initialDraft.current ? 'Local draft available' : '',
  )
  const [showLabels, setShowLabels] = useState(true)
  const [lineFilter, setLineFilter] = useState('all')
  const [uncertaintyFilter, setUncertaintyFilter] = useState('all')
  const [zoomRequest, setZoomRequest] = useState<{
    id: string
    requestId: number
  } | null>(null)
  const [importError, setImportError] = useState('')
  const [generated, setGenerated] = useState(false)

  const selectedRegion =
    regions.find((region) => region.id === selectedRegionId) ?? null

  const validation = useMemo(
    () =>
      validateLetterReference(
        {
          caseId: RIB_785_CASE.id,
          sourceSize: CONTEXT.sourceSize,
          regions,
          acknowledgedMismatchLines,
        },
        CONTEXT,
      ),
    [acknowledgedMismatchLines, regions],
  )

  const visibleRegionIds = useMemo(
    () =>
      new Set(
        regions
          .filter(
            (region) =>
              lineFilter === 'all' ||
              region.lineNumber === Number(lineFilter),
          )
          .filter(
            (region) =>
              uncertaintyFilter === 'all' ||
              (region.uncertainty ?? 'certain') === uncertaintyFilter,
          )
          .map((region) => region.id),
      ),
    [lineFilter, regions, uncertaintyFilter],
  )

  const ensureDraftCanBeOverwritten = () => {
    if (!draftAvailable || draftWriteAllowed) return true
    const confirmed = window.confirm(
      'A local draft already exists for RIB 785. Overwrite it with these changes?',
    )
    if (confirmed) setDraftWriteAllowed(true)
    return confirmed
  }

  const saveDraft = (
    nextRegions: readonly LetterRegion[],
    nextAcknowledgments: ReadonlySet<number>,
  ) => {
    localStorage.setItem(
      draftKey,
      JSON.stringify(
        createLetterReferenceDraft({
          caseId: RIB_785_CASE.id,
          sourceSize: CONTEXT.sourceSize,
          regions: nextRegions,
          acknowledgedMismatchLines: nextAcknowledgments,
        }),
      ),
    )
    setDraftAvailable(true)
    setDraftStatus('Draft saved locally')
  }

  const updateEditorData = (
    nextRegions: LetterRegion[],
    nextAcknowledgments = acknowledgedMismatchLines,
  ) => {
    if (!ensureDraftCanBeOverwritten()) return false
    setRegions(nextRegions)
    setAcknowledgedMismatchLines(new Set(nextAcknowledgments))
    saveDraft(nextRegions, nextAcknowledgments)
    setGenerated(false)
    return true
  }

  const handleSelectorRegionsChange = (next: LetterRegion[]) => {
    const prepared = next.map((region) => ({
      ...region,
      uncertainty: region.uncertainty ?? ('certain' as const),
    }))
    updateEditorData(prepared)
  }

  const updateSelectedRegion = (
    patch: Partial<LetterRegion>,
  ) => {
    if (!selectedRegion) return
    updateEditorData(
      regions.map((region) =>
        region.id === selectedRegion.id
          ? { ...region, ...patch }
          : region,
      ),
    )
  }

  const reorderRegion = (regionId: string, direction: -1 | 1) => {
    const region = regions.find((candidate) => candidate.id === regionId)
    if (!region?.lineNumber) return
    const ordered = orderedRegionsForLine(regions, region.lineNumber)
    const index = ordered.findIndex(
      (candidate) => candidate.id === regionId,
    )
    const target = index + direction
    if (target < 0 || target >= ordered.length) return
    const reordered = [...ordered]
    ;[reordered[index], reordered[target]] = [
      reordered[target],
      reordered[index],
    ]
    const orderById = new Map(
      reordered.map((candidate, orderIndex) => [
        candidate.id,
        orderIndex + 1,
      ]),
    )
    updateEditorData(
      regions.map((candidate) =>
        candidate.lineNumber === region.lineNumber
          ? {
              ...candidate,
              manualOrder: orderById.get(candidate.id),
            }
          : candidate,
      ),
    )
  }

  const useAutomaticOrder = (lineNumber: number) => {
    updateEditorData(
      regions.map((region) =>
        region.lineNumber === lineNumber
          ? { ...region, manualOrder: undefined }
          : region,
      ),
    )
  }

  const restoreDraft = () => {
    const stored = localStorage.getItem(draftKey)
    if (!stored) {
      setDraftAvailable(false)
      setDraftStatus('No local draft is available')
      return
    }
    if (
      regions.length > 0 &&
      !window.confirm(
        'Restore the local draft and replace the regions currently in the editor?',
      )
    ) {
      return
    }
    try {
      const draft = parseLetterReferenceDraft(stored, CONTEXT)
      setRegions(draft.regions)
      setAcknowledgedMismatchLines(
        new Set(draft.acknowledgedMismatchLines),
      )
      setSelectedRegionId(null)
      setDraftWriteAllowed(true)
      setDraftAvailable(true)
      setDraftStatus('Draft restored. Draft saved locally')
      setImportError('')
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'The local draft could not be restored.',
      )
    }
  }

  const clearLocalDraft = () => {
    if (
      draftAvailable &&
      !window.confirm(
        'Clear the locally saved RIB 785 instructor draft?',
      )
    ) {
      return
    }
    localStorage.removeItem(draftKey)
    setDraftAvailable(false)
    setDraftWriteAllowed(true)
    setDraftStatus('Local draft cleared')
  }

  const exportReference = () => {
    try {
      const reference = createLetterReferenceExport(
        {
          caseId: RIB_785_CASE.id,
          sourceSize: CONTEXT.sourceSize,
          regions,
          acknowledgedMismatchLines,
        },
        CONTEXT,
      )
      downloadJson(EXPORT_FILENAME, reference)
      setImportError('')
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Reference JSON could not be exported.',
      )
    }
  }

  const importReference = async (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const parsed = parseLetterReferenceJson(await file.text(), CONTEXT)
      const acknowledged = new Set(
        parsed.acknowledgedMismatches.map(
          (mismatch) => mismatch.lineNumber,
        ),
      )
      if (!updateEditorData(parsed.regions, acknowledged)) return
      setSelectedRegionId(null)
      setImportError('')
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'Reference JSON could not be imported.',
      )
    }
  }

  const generateCaseReference = () => {
    exportReference()
    if (validation.validForFinalExport) setGenerated(true)
  }

  const groupedLines = [
    ...VALID_LINE_NUMBERS.map((lineNumber) => ({
      lineNumber,
      regions: orderedRegionsForLine(regions, lineNumber),
    })),
    {
      lineNumber: 0,
      regions: regions.filter(
        (region) => !VALID_LINE_NUMBERS.includes(
          region.lineNumber as (typeof VALID_LINE_NUMBERS)[number],
        ),
      ),
    },
  ]

  const summary = {
    total: regions.length,
    labeled: regions.filter((region) => region.label?.trim()).length,
    uncertain: regions.filter(
      (region) => (region.uncertainty ?? 'certain') !== 'certain',
    ).length,
    mismatches: validation.comparisons.filter(
      (comparison) => !comparison.matches,
    ).length,
  }

  return (
    <main className="reference-editor">
      <header className="reference-editor__header">
        <div>
          <p className="eyebrow">Hidden instructor/developer tool</p>
          <h1>Instructor Letter-Reference Editor</h1>
          <p>
            Current case: <strong>{RIB_785_CASE.id}</strong> —{' '}
            {RIB_785_CASE.title}
          </p>
          <p>
            Source image: {CONTEXT.sourceSize.width} ×{' '}
            {CONTEXT.sourceSize.height} pixels
          </p>
        </div>
        <a className="control-button" href={publicAssetUrl('')}>
          Return to Ancient Texts Lab
        </a>
      </header>

      <section className="reference-editor__draft" aria-label="Local draft">
        <strong>{draftStatus || 'No local draft saved yet'}</strong>
        <div>
          <button
            type="button"
            disabled={!draftAvailable}
            onClick={restoreDraft}
          >
            Restore Draft
          </button>
          <button type="button" onClick={clearLocalDraft}>
            Clear Local Draft
          </button>
        </div>
        <p>
          Drafts stay in this browser on this device. They are never
          uploaded.
        </p>
      </section>

      <div className="reference-editor__workspace">
        <div className="reference-editor__viewer-column">
          <div className="reference-editor__visual-controls">
            <label>
              Line filter
              <select
                value={lineFilter}
                onChange={(event) => setLineFilter(event.target.value)}
              >
                <option value="all">All lines</option>
                {VALID_LINE_NUMBERS.map((line) => (
                  <option value={line} key={line}>
                    Line {line}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Uncertainty filter
              <select
                value={uncertaintyFilter}
                onChange={(event) =>
                  setUncertaintyFilter(event.target.value)
                }
              >
                <option value="all">All statuses</option>
                {LETTER_REFERENCE_UNCERTAINTIES.map((status) => (
                  <option value={status} key={status}>
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => setShowLabels((current) => !current)}
            >
              {showLabels ? 'Hide Labels' : 'Show Labels'}
            </button>
          </div>

          <LetterRegionSelector
            sourceImageUrl={publicAssetUrl(
              RIB_785_CASE.sourceImage.publicPath,
            )}
            sourceImageAlt="RIB 785 source illustration for instructor reference editing"
            sourceSize={CONTEXT.sourceSize}
            regions={regions}
            onRegionsChange={handleSelectorRegionsChange}
            selectedRegionId={selectedRegionId}
            onSelectedRegionChange={setSelectedRegionId}
            showLabels={showLabels}
            visibleRegionIds={visibleRegionIds}
            zoomToRegionRequest={zoomRequest}
          />
        </div>

        <aside
          className="reference-editor__metadata"
          aria-labelledby="region-metadata-title"
        >
          <h2 id="region-metadata-title">Region metadata</h2>
          {!selectedRegion && (
            <p>
              Create or select a rectangle to enter its instructor metadata.
            </p>
          )}
          {selectedRegion && (
            <div className="reference-editor__form">
              <label>
                Region ID
                <input value={selectedRegion.id} readOnly />
              </label>
              <label>
                Letter label
                <input
                  value={selectedRegion.label ?? ''}
                  maxLength={4}
                  pattern="[A-Za-z]{1,4}"
                  autoCapitalize="characters"
                  spellCheck={false}
                  onChange={(event) =>
                    updateSelectedRegion({ label: event.target.value })
                  }
                />
              </label>
              <small>
                Use one Latin letter normally; up to four characters are
                available for ligatures or combined forms. V is preserved as
                V.
              </small>
              <label>
                Line number
                <select
                  value={selectedRegion.lineNumber ?? ''}
                  onChange={(event) =>
                    updateSelectedRegion({
                      lineNumber: Number(event.target.value),
                      manualOrder: undefined,
                    })
                  }
                >
                  <option value="" disabled>
                    Select a line
                  </option>
                  {VALID_LINE_NUMBERS.map((line) => (
                    <option value={line} key={line}>
                      {line}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Uncertainty status
                <select
                  value={selectedRegion.uncertainty ?? 'certain'}
                  onChange={(event) =>
                    updateSelectedRegion({
                      uncertainty: event.target
                        .value as LetterRegionUncertainty,
                    })
                  }
                >
                  {LETTER_REFERENCE_UNCERTAINTIES.map((status) => (
                    <option value={status} key={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Instructor note
                <textarea
                  value={selectedRegion.note ?? ''}
                  rows={4}
                  onChange={(event) =>
                    updateSelectedRegion({ note: event.target.value })
                  }
                />
              </label>
              <button
                type="button"
                onClick={() =>
                  updateEditorData(
                    regions.filter(
                      (region) => region.id !== selectedRegion.id,
                    ),
                  ) && setSelectedRegionId(null)
                }
              >
                Delete this region
              </button>
            </div>
          )}
        </aside>
      </div>

      <section
        className="reference-editor__summary"
        aria-labelledby="reference-summary-title"
      >
        <h2 id="reference-summary-title">Reference summary</h2>
        <dl>
          <div>
            <dt>Total regions</dt>
            <dd>{summary.total}</dd>
          </div>
          {VALID_LINE_NUMBERS.map((line) => (
            <div key={line}>
              <dt>Line {line}</dt>
              <dd>
                {
                  regions.filter(
                    (region) => region.lineNumber === line,
                  ).length
                }
              </dd>
            </div>
          ))}
          <div>
            <dt>Labeled</dt>
            <dd>{summary.labeled}</dd>
          </div>
          <div>
            <dt>Unlabeled</dt>
            <dd>{summary.total - summary.labeled}</dd>
          </div>
          <div>
            <dt>Uncertain</dt>
            <dd>{summary.uncertain}</dd>
          </div>
          <div>
            <dt>Validation mismatches</dt>
            <dd>{summary.mismatches}</dd>
          </div>
        </dl>
      </section>

      <section
        className="reference-editor__region-list"
        aria-labelledby="region-list-title"
      >
        <h2 id="region-list-title">Ordered regions by line</h2>
        {groupedLines.map(({ lineNumber, regions: lineRegions }) => (
          <article
            key={lineNumber}
            aria-labelledby={`region-line-${lineNumber}`}
          >
            <div className="reference-editor__line-heading">
              <h3 id={`region-line-${lineNumber}`}>
                {lineNumber === 0 ? 'Unassigned' : `Line ${lineNumber}`}
              </h3>
              {lineNumber > 0 && lineRegions.length > 0 && (
                <button
                  type="button"
                  onClick={() => useAutomaticOrder(lineNumber)}
                >
                  Use automatic left-to-right order
                </button>
              )}
            </div>
            {lineRegions.length === 0 ? (
              <p>No regions.</p>
            ) : (
              <ol>
                {lineRegions.map((region, index) => (
                  <li key={region.id} data-region-id={region.id}>
                    <div>
                      <strong>
                        {region.id}: {region.label || 'Unlabeled'}
                      </strong>
                      <span>
                        Line {region.lineNumber ?? '—'} ·{' '}
                        {region.uncertainty ?? 'certain'}
                      </span>
                      <span>
                        x {formatCoordinate(region.x)}, y{' '}
                        {formatCoordinate(region.y)}, w{' '}
                        {formatCoordinate(region.width)}, h{' '}
                        {formatCoordinate(region.height)}
                      </span>
                      {region.manualOrder !== undefined && (
                        <span>
                          Manual order {region.manualOrder}
                        </span>
                      )}
                    </div>
                    <div className="reference-editor__list-actions">
                      <button
                        type="button"
                        onClick={() => setSelectedRegionId(region.id)}
                      >
                        Edit/select
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setZoomRequest({
                            id: region.id,
                            requestId:
                              (zoomRequest?.requestId ?? 0) + 1,
                          })
                        }
                      >
                        Zoom to region
                      </button>
                      <button
                        type="button"
                        disabled={index === 0}
                        aria-label={`Move ${region.id} earlier`}
                        onClick={() => reorderRegion(region.id, -1)}
                      >
                        Earlier
                      </button>
                      <button
                        type="button"
                        disabled={index === lineRegions.length - 1}
                        aria-label={`Move ${region.id} later`}
                        onClick={() => reorderRegion(region.id, 1)}
                      >
                        Later
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            updateEditorData(
                              regions.filter(
                                (candidate) =>
                                  candidate.id !== region.id,
                              ),
                            )
                          ) {
                            setSelectedRegionId((current) =>
                              current === region.id ? null : current,
                            )
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </article>
        ))}
      </section>

      <section
        className="reference-editor__validation"
        aria-labelledby="transcription-validation-title"
      >
        <h2 id="transcription-validation-title">
          Diplomatic transcription cross-check
        </h2>
        <p>
          Spaces are ignored for comparison. Visible V is preserved and is
          never normalized to U.
        </p>
        <div className="reference-editor__comparison-grid">
          {validation.comparisons.map((comparison) => (
            <article
              key={comparison.lineNumber}
              className={
                comparison.matches
                  ? 'comparison-line comparison-line--match'
                  : 'comparison-line comparison-line--mismatch'
              }
            >
              <h3>Line {comparison.lineNumber}</h3>
              <p>
                Expected: <code>{comparison.expected}</code>
              </p>
              <p>
                Assigned labels:{' '}
                <code>{comparison.actual || '—'}</code>
              </p>
              <strong>
                {comparison.matches
                  ? 'Matches'
                  : comparison.acknowledged
                    ? 'Mismatch acknowledged'
                    : 'Mismatch needs review'}
              </strong>
              {!comparison.matches && (
                <label>
                  <input
                    type="checkbox"
                    checked={comparison.acknowledged}
                    onChange={(event) => {
                      const next = new Set(acknowledgedMismatchLines)
                      if (event.target.checked) {
                        next.add(comparison.lineNumber)
                      } else {
                        next.delete(comparison.lineNumber)
                      }
                      updateEditorData(regions, next)
                    }}
                  />
                  Acknowledge this genuine discrepancy
                </label>
              )}
            </article>
          ))}
        </div>

        <h3>Final validation</h3>
        {validation.issues.length === 0 ? (
          <p className="validation-ready">Ready for final export.</p>
        ) : (
          <ul>
            {validation.issues.map((issue, index) => (
              <li
                key={`${issue.code}-${issue.regionId ?? issue.lineNumber ?? index}`}
                className={
                  issue.blocking
                    ? 'validation-issue--blocking'
                    : 'validation-issue--acknowledged'
                }
              >
                {issue.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="reference-editor__export"
        aria-labelledby="reference-export-title"
      >
        <h2 id="reference-export-title">Import and export</h2>
        <div className="reference-editor__export-controls">
          <button
            type="button"
            disabled={!validation.validForFinalExport}
            onClick={exportReference}
          >
            Export Reference JSON
          </button>
          <label className="file-input-button">
            Import Reference JSON
            <input
              type="file"
              accept="application/json,.json"
              onChange={importReference}
            />
          </label>
          <button
            type="button"
            disabled={!validation.validForFinalExport}
            onClick={generateCaseReference}
          >
            Generate Case Reference Data
          </button>
        </div>
        {importError && (
          <p role="alert" className="reference-editor__error">
            {importError}
          </p>
        )}
        {generated && (
          <div className="reference-editor__generated" role="status">
            <strong>Developer-ready reference generated.</strong>
            <p>
              Expected filename: <code>{EXPORT_FILENAME}</code>
            </p>
            <p>
              Intended permanent path:{' '}
              <code>{PERMANENT_REFERENCE_PATH}</code>
            </p>
            <p>
              The browser downloaded the file but did not overwrite project
              source code. Codex can review and import it in the next
              milestone.
            </p>
          </div>
        )}
      </section>
    </main>
  )
}

export {
  CONTEXT as RIB_785_LETTER_REFERENCE_CONTEXT,
  EXPORT_FILENAME as RIB_785_LETTER_REFERENCE_FILENAME,
  PERMANENT_REFERENCE_PATH as RIB_785_LETTER_REFERENCE_PATH,
}
