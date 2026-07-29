import { useEffect, useMemo, useState } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import { RIB_785_LETTER_REFERENCE } from './content/curated/RIB 785/letterReference'
import {
  LETTER_REGION_IOU_THRESHOLD,
  compareLetterIdentification,
  type LetterIdentificationComparison,
} from './letterIdentificationComparison'
import {
  createLetterIdentificationSession,
  type LetterIdentificationSession,
} from './letterIdentificationSession'
import type { LetterRegion } from './letterRegions'
import { LetterRegionSelector } from './LetterRegionSelector'
import { Rib785Transcription } from './Rib785Transcription'
import { Rib785Translation } from './Rib785Translation'
import { Rib785WordSegmentation } from './Rib785WordSegmentation'

type ComparisonMode = 'editing' | 'overlay' | 'side-by-side'
type StudentStage =
  | 'letter-identification'
  | 'transcription'
  | 'word-segmentation'
  | 'translation'

const VALID_LINES = [1, 2, 3, 4, 5] as const

const createSession = () =>
  createLetterIdentificationSession({
    caseId: RIB_785_CASE.id,
    title: RIB_785_CASE.title,
    sourceCredit: RIB_785_CASE.imageSource.creditLine,
  })

function completeStudentMetadata(region: LetterRegion) {
  return (
    /^[A-Z]$/.test(region.label ?? '') &&
    VALID_LINES.includes(
      region.lineNumber as (typeof VALID_LINES)[number],
    )
  )
}

function studentCategory(
  region: LetterRegion,
  comparison: LetterIdentificationComparison,
) {
  if (
    comparison.matchedLetters.some(
      (match) => match.studentRegion.id === region.id,
    )
  ) {
    return 'matched'
  }
  if (
    comparison.mismatches.some(
      (match) => match.studentRegion.id === region.id,
    )
  ) {
    return 'mismatch'
  }
  return 'student-only'
}

function referenceCategory(
  region: LetterRegion,
  comparison: LetterIdentificationComparison,
) {
  if (
    comparison.matchedLetters.some(
      (match) => match.referenceRegion.id === region.id,
    )
  ) {
    return 'matched'
  }
  if (
    comparison.mismatches.some(
      (match) => match.referenceRegion.id === region.id,
    )
  ) {
    return 'mismatch'
  }
  return 'missed'
}

function ComparisonPanel({
  title,
  description,
  panelId,
  studentRegions,
  comparison,
  showStudent,
  showReference,
}: {
  title: string
  description: string
  panelId: string
  studentRegions: readonly LetterRegion[]
  comparison: LetterIdentificationComparison
  showStudent: boolean
  showReference: boolean
}) {
  return (
    <figure className="student-letter-comparison__panel">
      <figcaption>
        <strong>{title}</strong>
        <span>{description}</span>
      </figcaption>
      <div
        className="student-letter-comparison__stage"
        style={{
          aspectRatio: `${RIB_785_CASE.sourceImage.width} / ${RIB_785_CASE.sourceImage.height}`,
        }}
      >
        <img
          src={publicAssetUrl(RIB_785_CASE.sourceImage.publicPath)}
          alt=""
          draggable="false"
        />
        <svg
          viewBox={`0 0 ${RIB_785_CASE.sourceImage.width} ${RIB_785_CASE.sourceImage.height}`}
          role="img"
          aria-label={`${title}: ${description}`}
          data-testid={`student-letter-comparison-${panelId}`}
        >
          <defs>
            <pattern
              id={`${panelId}-reference-pattern`}
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="currentColor"
                strokeWidth="4"
              />
            </pattern>
          </defs>
          {showReference &&
            RIB_785_LETTER_REFERENCE.regions.map((region) => (
              <g
                className={`student-letter-reference student-letter-region--${referenceCategory(region, comparison)}`}
                data-reference-region-id={region.id}
                data-category={referenceCategory(region, comparison)}
                key={`reference-${region.id}`}
              >
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                  fill={`url(#${panelId}-reference-pattern)`}
                />
                <text
                  x={region.x + region.width / 2}
                  y={region.y + region.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {region.label}
                </text>
              </g>
            ))}
          {showStudent &&
            studentRegions.map((region) => (
              <g
                className={`student-letter-selection student-letter-region--${studentCategory(region, comparison)}`}
                data-student-region-id={region.id}
                data-category={studentCategory(region, comparison)}
                key={`student-${region.id}`}
              >
                <rect
                  x={region.x}
                  y={region.y}
                  width={region.width}
                  height={region.height}
                />
                <text
                  x={region.x + region.width / 2}
                  y={region.y + region.height / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {region.label}
                </text>
              </g>
            ))}
        </svg>
      </div>
    </figure>
  )
}

export function Rib785LetterIdentification({
  onReturnHome,
}: {
  onReturnHome: () => void
}) {
  const [session, setSession] =
    useState<LetterIdentificationSession>(createSession)
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(
    null,
  )
  const [comparison, setComparison] =
    useState<LetterIdentificationComparison | null>(null)
  const [comparisonMode, setComparisonMode] =
    useState<ComparisonMode>('editing')
  const [showInstructorReference, setShowInstructorReference] =
    useState(false)
  const [showStudentSelections, setShowStudentSelections] = useState(true)
  const [activeStage, setActiveStage] =
    useState<StudentStage>('letter-identification')

  const hasWork =
    session.studentRegions.length > 0 ||
    session.checkedAtLeastOnce ||
    session.studentTranscription.some((line) => line.length > 0) ||
    session.transcriptionCheckCount > 0 ||
    session.studentSegmentation.some((line) => line.length > 0) ||
    session.segmentationCheckCount > 0 ||
    session.studentTranslation.trim().length > 0 ||
    session.translationReviewCount > 0 ||
    session.translationRevisionNote.trim().length > 0
  useEffect(() => {
    if (!hasWork) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    return () => window.removeEventListener('beforeunload', warnBeforeUnload)
  }, [hasWork])

  const selectedRegion =
    session.studentRegions.find(
      (region) => region.id === selectedRegionId,
    ) ?? null
  const lineCounts = useMemo(
    () =>
      VALID_LINES.map((lineNumber) => ({
        lineNumber,
        count: session.studentRegions.filter(
          (region) => region.lineNumber === lineNumber,
        ).length,
      })),
    [session.studentRegions],
  )
  const unlabeledCount = session.studentRegions.filter(
    (region) => !/^[A-Z]$/.test(region.label ?? ''),
  ).length
  const unassignedLineCount = session.studentRegions.filter(
    (region) =>
      !VALID_LINES.includes(
        region.lineNumber as (typeof VALID_LINES)[number],
      ),
  ).length
  const canCheck =
    session.studentRegions.length > 0 &&
    session.studentRegions.every(completeStudentMetadata)

  const updateRegions = (regions: LetterRegion[]) => {
    setSession((current) => ({
      ...current,
      studentRegions: regions.map((region) => ({ ...region })),
      comparisonCurrent: false,
      stageStatus:
        current.stageStatus === 'complete'
          ? 'in-progress'
          : current.stageStatus,
    }))
  }

  const updateSelectedRegion = (patch: Partial<LetterRegion>) => {
    if (!selectedRegion) return
    updateRegions(
      session.studentRegions.map((region) =>
        region.id === selectedRegion.id
          ? { ...region, ...patch }
          : region,
      ),
    )
  }

  const checkWork = () => {
    if (!canCheck) return
    const nextComparison = compareLetterIdentification(
      session.studentRegions,
      RIB_785_LETTER_REFERENCE.regions,
    )
    setComparison(nextComparison)
    setSession((current) => ({
      ...current,
      comparisonCounts: { ...nextComparison.counts },
      checkedAtLeastOnce: true,
      comparisonCurrent: true,
      instructorReferenceRevealed: false,
      stageStatus: 'checked',
    }))
    setComparisonMode('overlay')
    setShowInstructorReference(false)
    setShowStudentSelections(true)
  }

  const finishStage = () => {
    if (
      !comparison ||
      !session.checkedAtLeastOnce ||
      !session.comparisonCurrent ||
      !canCheck ||
      comparison.mismatches.length > 0
    ) {
      return
    }
    const remainingDifferences =
      comparison.missedReferenceLetters.length +
      comparison.studentOnlySelections.length
    if (
      remainingDifferences > 0 &&
      !window.confirm('Finish this stage with remaining differences?')
    ) {
      return
    }
    setSession((current) => ({
      ...current,
      stageStatus: 'complete',
    }))
  }

  const returnHome = () => {
    if (
      hasWork &&
      !window.confirm(
        'Return to the homepage? Your RIB 785 investigation work will be lost.',
      )
    ) {
      return
    }
    onReturnHome()
  }

  const startOver = () => {
    if (
      hasWork &&
      !window.confirm(
        'Start over? This clears all of your RIB 785 investigation work.',
      )
    ) {
      return
    }
    setSession(createSession())
    setSelectedRegionId(null)
    setComparison(null)
    setComparisonMode('editing')
    setShowInstructorReference(false)
    setShowStudentSelections(true)
    setActiveStage('letter-identification')
  }

  const toggleInstructorReference = () => {
    const nextVisible = !showInstructorReference
    setShowInstructorReference(nextVisible)
    setSession((current) => ({
      ...current,
      instructorReferenceRevealed: nextVisible,
    }))
  }

  return (
    <main className="student-letter-investigation">
      <header className="student-letter-investigation__header">
        <div>
          <p className="eyebrow">
            RIB 785 ·{' '}
            {activeStage === 'letter-identification'
              ? 'Letter Identification'
              : activeStage === 'transcription'
                ? 'Transcription'
                : activeStage === 'word-segmentation'
                  ? 'Word Segmentation'
                  : 'Translation'}
          </p>
          <h1>{RIB_785_CASE.title}</h1>
          <p>{RIB_785_CASE.studentContext.text}</p>
          <p className="student-letter-investigation__credit">
            <strong>Source:</strong> {RIB_785_CASE.imageSource.creditLine}
          </p>
        </div>
        <div className="student-letter-investigation__header-actions">
          <button type="button" className="control-button" onClick={returnHome}>
            Return to Homepage
          </button>
          <button
            type="button"
            className="control-button student-letter-investigation__start-over"
            onClick={startOver}
            disabled={!hasWork}
          >
            Start Over
          </button>
        </div>
      </header>

      <nav
        className="student-letter-stages"
        aria-label="RIB 785 investigation stages"
      >
        <ol>
          {RIB_785_CASE.stageAvailability.map((stage, index) => {
            const isLetterStage = index === 0
            const isTranscriptionStage = index === 1
            const isSegmentationStage = index === 2
            const isTranslationStage = index === 3
            const isAvailable =
              isLetterStage ||
              (isTranscriptionStage &&
                session.stageStatus === 'complete') ||
              (isSegmentationStage &&
                session.transcriptionStageStatus === 'complete') ||
              (isTranslationStage &&
                session.segmentationStageStatus === 'complete')
            const isCurrent =
              (isLetterStage &&
                activeStage === 'letter-identification') ||
              (isTranscriptionStage &&
                activeStage === 'transcription') ||
              (isSegmentationStage &&
                activeStage === 'word-segmentation') ||
              (isTranslationStage && activeStage === 'translation')

            return (
              <li
                className={
                  isAvailable
                    ? 'student-letter-stage student-letter-stage--active'
                    : 'student-letter-stage student-letter-stage--locked'
                }
                aria-current={isCurrent ? 'step' : undefined}
                key={stage.activity}
              >
                <span>{index + 1}</span>
                {isAvailable ? (
                  <button
                    type="button"
                    disabled={isCurrent}
                    onClick={() =>
                      setActiveStage(
                        isLetterStage
                          ? 'letter-identification'
                          : isTranscriptionStage
                            ? 'transcription'
                            : isSegmentationStage
                              ? 'word-segmentation'
                              : 'translation',
                      )
                    }
                  >
                    {stage.label}
                  </button>
                ) : (
                  <strong>{stage.label}</strong>
                )}
                <small>
                  {isLetterStage
                    ? session.stageStatus === 'complete'
                      ? 'Letter Identification Complete'
                      : isCurrent
                        ? 'Current Stage'
                        : 'Available'
                    : isTranscriptionStage
                      ? session.stageStatus !== 'complete'
                        ? 'Locked'
                        : session.transcriptionStageStatus === 'complete'
                          ? 'Transcription Complete'
                          : isCurrent
                            ? 'Current Stage'
                            : 'Available'
                      : isSegmentationStage
                        ? session.transcriptionStageStatus !== 'complete'
                          ? 'Locked'
                          : session.segmentationStageStatus === 'complete'
                            ? 'Word Segmentation Complete'
                            : isCurrent
                              ? 'Current Stage'
                              : 'Available'
                        : session.segmentationStageStatus !== 'complete'
                          ? 'Locked'
                          : session.translationStageStatus === 'complete'
                            ? 'Translation Complete'
                            : isCurrent
                              ? 'Current Stage'
                              : 'Available'}
                </small>
              </li>
            )
          })}
        </ol>
      </nav>

      {activeStage === 'letter-identification' ? (
        <>
      <section
        className="student-letter-prompt"
        aria-labelledby="student-letter-prompt-title"
      >
        <div>
          <p className="eyebrow">Current stage</p>
          <h2 id="student-letter-prompt-title">Letter Identification</h2>
          <p>
            Select each visible letter in the inscription and label it with
            the Latin character you see.
          </p>
        </div>
        {session.stageStatus === 'complete' && (
          <p className="student-letter-complete" role="status">
            Letter Identification Complete
          </p>
        )}
      </section>

      {comparisonMode === 'editing' ? (
        <section className="student-letter-workspace">
          <div className="student-letter-workspace__viewer">
            <LetterRegionSelector
              sourceImageUrl={publicAssetUrl(
                RIB_785_CASE.sourceImage.publicPath,
              )}
              sourceImageAlt="RIB 785 funerary inscription for letter identification"
              sourceSize={RIB_785_CASE.sourceImage}
              regions={session.studentRegions}
              onRegionsChange={updateRegions}
              selectedRegionId={selectedRegionId}
              onSelectedRegionChange={setSelectedRegionId}
              studentFacing
            />
          </div>

          <aside
            className="student-letter-metadata"
            aria-labelledby="student-letter-metadata-title"
          >
            <h2 id="student-letter-metadata-title">Selected Letter</h2>
            {selectedRegion ? (
              <div className="student-letter-metadata__form">
                <label>
                  Letter label
                  <input
                    aria-label="Letter label"
                    autoComplete="off"
                    inputMode="text"
                    maxLength={1}
                    value={selectedRegion.label ?? ''}
                    onChange={(event) =>
                      updateSelectedRegion({
                        label: event.target.value
                          .replace(/[^A-Za-z]/g, '')
                          .slice(0, 1)
                          .toUpperCase(),
                      })
                    }
                  />
                </label>
                <label>
                  Line number
                  <select
                    aria-label="Line number"
                    value={selectedRegion.lineNumber ?? ''}
                    onChange={(event) =>
                      updateSelectedRegion({
                        lineNumber: event.target.value
                          ? Number(event.target.value)
                          : undefined,
                      })
                    }
                  >
                    <option value="">Choose a line</option>
                    {VALID_LINES.map((lineNumber) => (
                      <option key={lineNumber} value={lineNumber}>
                        Line {lineNumber}
                      </option>
                    ))}
                  </select>
                </label>
                <p>
                  The visible inscriptional V remains V; it is not changed to U.
                </p>
              </div>
            ) : (
              <p>Select or create a letter box to add its label and line.</p>
            )}
          </aside>
        </section>
      ) : (
        comparison && (
          <section
            className="student-letter-comparison"
            aria-labelledby="student-letter-comparison-title"
          >
            <header>
              <div>
                <p className="eyebrow">Comparison view</p>
                <h2 id="student-letter-comparison-title">
                  Your work and the Instructor Reference
                </h2>
              </div>
              <div
                className="student-letter-comparison__controls"
                aria-label="Letter comparison controls"
              >
                <button
                  type="button"
                  aria-pressed={showInstructorReference}
                  onClick={toggleInstructorReference}
                >
                  {showInstructorReference
                    ? 'Hide Instructor Reference'
                    : 'Show Instructor Reference'}
                </button>
                <button
                  type="button"
                  aria-pressed={showStudentSelections}
                  onClick={() =>
                    setShowStudentSelections((visible) => !visible)
                  }
                >
                  {showStudentSelections
                    ? 'Hide My Selections'
                    : 'Show My Selections'}
                </button>
                <button
                  type="button"
                  aria-pressed={comparisonMode === 'overlay'}
                  onClick={() => setComparisonMode('overlay')}
                >
                  Overlay Comparison
                </button>
                <button
                  type="button"
                  aria-pressed={comparisonMode === 'side-by-side'}
                  onClick={() => setComparisonMode('side-by-side')}
                >
                  Side-by-Side Comparison
                </button>
                <button
                  type="button"
                  onClick={() => setComparisonMode('editing')}
                >
                  Return to Editing
                </button>
              </div>
            </header>

            <div
              className={
                comparisonMode === 'side-by-side'
                  ? 'student-letter-comparison__panels student-letter-comparison__panels--side-by-side'
                  : 'student-letter-comparison__panels'
              }
            >
              {comparisonMode === 'overlay' ? (
                <ComparisonPanel
                  title="Overlay Comparison"
                  description="Your Selection and Instructor Reference share the same source-image coordinates."
                  panelId="overlay"
                  studentRegions={session.studentRegions}
                  comparison={comparison}
                  showStudent={showStudentSelections}
                  showReference={showInstructorReference}
                />
              ) : (
                <>
                  <ComparisonPanel
                    title="My Selections"
                    description="Your Selection"
                    panelId="student"
                    studentRegions={session.studentRegions}
                    comparison={comparison}
                    showStudent={showStudentSelections}
                    showReference={false}
                  />
                  <ComparisonPanel
                    title="Instructor Reference"
                    description="Instructor Reference"
                    panelId="reference"
                    studentRegions={session.studentRegions}
                    comparison={comparison}
                    showStudent={false}
                    showReference={showInstructorReference}
                  />
                </>
              )}
            </div>

            <ul
              className="student-letter-comparison__legend"
              aria-label="Comparison pattern key"
            >
              <li data-category="matched">Matched Letters · solid outline</li>
              <li data-category="missed">
                Missed Reference Letters · diagonal reference pattern
              </li>
              <li data-category="student-only">
                Student-Only Selections · double-dashed outline
              </li>
              <li data-category="mismatch">
                Label or Line Mismatches · dotted outline
              </li>
            </ul>
          </section>
        )
      )}

      <section
        className="student-letter-progress"
        aria-labelledby="student-letter-progress-title"
      >
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="student-letter-progress-title">Letter selection summary</h2>
        </div>
        <dl>
          <div>
            <dt>Total letters selected</dt>
            <dd>{session.studentRegions.length}</dd>
          </div>
          {lineCounts.map(({ lineNumber, count }) => (
            <div key={lineNumber}>
              <dt>Your selections on line {lineNumber}</dt>
              <dd>{count}</dd>
            </div>
          ))}
          <div>
            <dt>Unlabeled regions</dt>
            <dd>{unlabeledCount}</dd>
          </div>
          <div>
            <dt>Regions without a line number</dt>
            <dd>{unassignedLineCount}</dd>
          </div>
        </dl>
        <div className="student-letter-progress__actions">
          <button
            type="button"
            className="begin-button"
            disabled={!canCheck}
            onClick={checkWork}
          >
            Check Letter Identification
          </button>
          <button
            type="button"
            className="control-button"
            disabled={
              !comparison ||
              !session.checkedAtLeastOnce ||
              !session.comparisonCurrent ||
              !canCheck ||
              comparison.mismatches.length > 0 ||
              session.stageStatus === 'complete'
            }
            onClick={finishStage}
          >
            Mark Letter Identification Complete
          </button>
        </div>
        {!canCheck && (
          <p className="student-letter-progress__notice">
            Create at least one region, then label every region and assign each
            one to a line before checking.
          </p>
        )}
        {session.checkedAtLeastOnce && !session.comparisonCurrent && (
          <p className="student-letter-progress__notice" role="status">
            Your selections changed. Check Letter Identification again to
            update the comparison.
          </p>
        )}
      </section>

      {comparison && (
        <section
          className="student-letter-feedback"
          aria-labelledby="student-letter-feedback-title"
        >
          <div>
            <p className="eyebrow">Neutral comparison summary</p>
            <h2 id="student-letter-feedback-title">
              Instructor Reference comparison
            </h2>
            <p>
              The instructor reference is a scholarly comparison aid, not an
              infallible answer.
            </p>
          </div>
          <dl>
            <div data-category="matched">
              <dt>Matched Letters</dt>
              <dd>{comparison.counts.matchedLetters}</dd>
            </div>
            <div data-category="missed">
              <dt>Missed Reference Letters</dt>
              <dd>{comparison.counts.missedReferenceLetters}</dd>
            </div>
            <div data-category="student-only">
              <dt>Student-Only Selections</dt>
              <dd>{comparison.counts.studentOnlySelections}</dd>
            </div>
            <div data-category="mismatch">
              <dt>Label or Line Mismatches</dt>
              <dd>{comparison.counts.labelOrLineMismatches}</dd>
            </div>
          </dl>
          {comparison.mismatches.length > 0 && (
            <ul className="student-letter-feedback__mismatches">
              {comparison.mismatches.map((mismatch) => (
                <li key={mismatch.studentRegion.id}>
                  Your Selection {mismatch.studentRegion.label}, line{' '}
                  {mismatch.studentRegion.lineNumber}: {mismatch.reason.replace(
                    /-/g,
                    ' ',
                  )}{' '}
                  mismatch with the overlapping Instructor Reference.
                </li>
              ))}
            </ul>
          )}
          <p className="student-letter-feedback__method">
            Regions are paired one-to-one from strongest geometric overlap
            downward using an intersection-over-union threshold of{' '}
            {LETTER_REGION_IOU_THRESHOLD}. A paired region is matched only when
            its uppercase letter and line also agree.
          </p>
        </section>
      )}
        </>
      ) : activeStage === 'transcription' ? (
        <Rib785Transcription
          session={session}
          setSession={setSession}
          onReturnToLetterIdentification={() =>
            setActiveStage('letter-identification')
          }
        />
      ) : activeStage === 'word-segmentation' ? (
        <Rib785WordSegmentation
          session={session}
          setSession={setSession}
          onReturnToTranscription={() =>
            setActiveStage('transcription')
          }
        />
      ) : (
        <Rib785Translation
          session={session}
          setSession={setSession}
          onReturnToWordSegmentation={() =>
            setActiveStage('word-segmentation')
          }
        />
      )}
    </main>
  )
}
