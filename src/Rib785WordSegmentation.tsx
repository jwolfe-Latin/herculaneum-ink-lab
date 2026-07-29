import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type { LetterIdentificationSession } from './letterIdentificationSession'
import { LetterRegionSelector } from './LetterRegionSelector'
import {
  compareWordSegmentation,
  normalizeSegmentationDisplay,
  segmentationCharacterSequence,
  wordBoundaryPositions,
} from './wordSegmentationComparison'

const LINE_NUMBERS = [1, 2, 3, 4, 5] as const
const INSTRUCTOR_SEGMENTATION =
  RIB_785_CASE.wordSegmentationReference.split('\n')

function BoundaryText({ text }: { text: string }) {
  const normalized = normalizeSegmentationDisplay(text)
  const tokens = normalized ? normalized.split(' ') : []
  return (
    <span
      className="student-segmentation-boundary-text"
      aria-label={normalized || 'Blank line'}
    >
      {tokens.map((token, index) => (
        <span key={`${token}-${index}`}>
          {index > 0 && (
            <b aria-hidden="true" title="Word boundary">
              │
            </b>
          )}
          <span>{token}</span>
        </span>
      ))}
    </span>
  )
}

export function Rib785WordSegmentation({
  session,
  setSession,
  onReturnToTranscription,
}: {
  session: LetterIdentificationSession
  setSession: Dispatch<SetStateAction<LetterIdentificationSession>>
  onReturnToTranscription: () => void
}) {
  const [editing, setEditing] = useState(true)
  const [showInstructorReference, setShowInstructorReference] =
    useState(session.segmentationReferenceRevealed)
  const [showStudentSegmentation, setShowStudentSegmentation] =
    useState(true)

  const linesCompleted = session.studentSegmentation.filter(
    (line) => line.trim().length > 0,
  ).length
  const changedLetterLines = session.studentSegmentation.filter(
    (line, index) =>
      segmentationCharacterSequence(line) !==
      segmentationCharacterSequence(
        session.segmentationSourceTranscription[index],
      ),
  ).length
  const boundaryCount = session.studentSegmentation.reduce(
    (total, line) => total + wordBoundaryPositions(line).length,
    0,
  )
  const canCheck =
    linesCompleted === LINE_NUMBERS.length && changedLetterLines === 0
  const comparison = session.segmentationComparison

  const regionsByLine = useMemo(
    () =>
      LINE_NUMBERS.map((lineNumber) => ({
        lineNumber,
        labels: session.studentRegions
          .filter((region) => region.lineNumber === lineNumber)
          .sort((left, right) => left.x - right.x)
          .map((region) => region.label || 'Unlabeled'),
      })),
    [session.studentRegions],
  )

  const updateLine = (index: number, value: string) => {
    setSession((current) => {
      const studentSegmentation = [
        ...current.studentSegmentation,
      ] as LetterIdentificationSession['studentSegmentation']
      studentSegmentation[index] = value
      return {
        ...current,
        studentSegmentation,
        segmentationComparisonCurrent: false,
        segmentationStageStatus:
          current.segmentationStageStatus === 'complete'
            ? 'in-progress'
            : current.segmentationStageStatus,
      }
    })
  }

  const checkSegmentation = () => {
    if (!canCheck) return
    const nextComparison = compareWordSegmentation(
      session.studentSegmentation,
      session.segmentationSourceTranscription,
      INSTRUCTOR_SEGMENTATION,
    )
    setSession((current) => ({
      ...current,
      segmentationCheckCount: current.segmentationCheckCount + 1,
      segmentationComparison: nextComparison,
      segmentationComparisonCurrent: true,
      segmentationReferenceRevealed: false,
      segmentationStageStatus: 'checked',
    }))
    setShowInstructorReference(false)
    setShowStudentSegmentation(true)
    setEditing(false)
  }

  const finishStage = () => {
    if (
      !comparison ||
      !session.segmentationComparisonCurrent ||
      session.segmentationCheckCount < 1 ||
      !canCheck ||
      comparison.hasChangedLetters
    ) {
      return
    }
    if (
      comparison.hasBoundaryDifferences &&
      !window.confirm(
        'Finish this stage with remaining boundary differences?',
      )
    ) {
      return
    }
    setSession((current) => ({
      ...current,
      segmentationStageStatus: 'complete',
    }))
  }

  const toggleInstructorReference = () => {
    const nextVisible = !showInstructorReference
    setShowInstructorReference(nextVisible)
    setSession((current) => ({
      ...current,
      segmentationReferenceRevealed: nextVisible,
    }))
  }

  return (
    <>
      <section
        className="student-letter-prompt"
        aria-labelledby="student-segmentation-prompt-title"
      >
        <div>
          <p className="eyebrow">Current stage</p>
          <h2 id="student-segmentation-prompt-title">Word Segmentation</h2>
          <p>
            Insert spaces to show where you think each Latin word begins and
            ends. Keep the visible letters and line divisions unchanged.
          </p>
        </div>
        {session.segmentationStageStatus === 'complete' && (
          <p className="student-letter-complete" role="status">
            Word Segmentation Complete
          </p>
        )}
      </section>

      {editing ? (
        <section className="student-segmentation-workspace">
          <div className="student-transcription-viewer">
            <LetterRegionSelector
              sourceImageUrl={publicAssetUrl(
                RIB_785_CASE.sourceImage.publicPath,
              )}
              sourceImageAlt="RIB 785 funerary inscription for word segmentation"
              sourceSize={RIB_785_CASE.sourceImage}
              regions={session.studentRegions}
              readOnly
              showLabels
              studentFacing
              selectionToggleLabels={{
                show: 'Show My Letter Selections',
                hide: 'Hide My Letter Selections',
              }}
            />
          </div>

          <div className="student-segmentation-entry">
            <header>
              <p className="eyebrow">Spacing only</p>
              <h2>Mark probable word boundaries</h2>
              <p>
                Add or remove ordinary spaces. Keep every visible character,
                inscriptional V, abbreviation, and line division unchanged.
              </p>
            </header>
            <div className="student-segmentation-fields">
              {LINE_NUMBERS.map((lineNumber, index) => {
                const changed =
                  segmentationCharacterSequence(
                    session.studentSegmentation[index],
                  ) !==
                  segmentationCharacterSequence(
                    session.segmentationSourceTranscription[index],
                  )
                return (
                  <label key={lineNumber}>
                    Line {lineNumber}
                    <textarea
                      aria-label={`Line ${lineNumber} word segmentation`}
                      aria-invalid={changed}
                      autoComplete="off"
                      rows={2}
                      value={session.studentSegmentation[index]}
                      onChange={(event) =>
                        updateLine(index, event.target.value)
                      }
                    />
                    <small>
                      Original letters:{' '}
                      {normalizeSegmentationDisplay(
                        session.segmentationSourceTranscription[index],
                      )}
                    </small>
                  </label>
                )
              })}
            </div>
            {changedLetterLines > 0 && (
              <p className="student-segmentation-warning" role="alert">
                Word Segmentation should change spacing only. Restore the
                original letters before checking.
              </p>
            )}
          </div>
        </section>
      ) : (
        comparison && (
          <section
            className="student-segmentation-comparison"
            aria-labelledby="student-segmentation-comparison-title"
            aria-live="polite"
          >
            <header>
              <div>
                <p className="eyebrow">Boundary comparison</p>
                <h2 id="student-segmentation-comparison-title">
                  Your Segmentation and Instructor Reference
                </h2>
                <p>
                  The instructor segmentation is a scholarly comparison aid,
                  not an infallible analysis.
                </p>
              </div>
              <div
                className="student-transcription-comparison__controls"
                aria-label="Word segmentation comparison controls"
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
                  aria-pressed={showStudentSegmentation}
                  onClick={() =>
                    setShowStudentSegmentation((visible) => !visible)
                  }
                >
                  {showStudentSegmentation
                    ? 'Hide My Segmentation'
                    : 'Show My Segmentation'}
                </button>
                <button type="button" onClick={() => setEditing(true)}>
                  Return to Editing
                </button>
              </div>
            </header>

            <ol className="student-segmentation-comparison__lines">
              {comparison.lines.map((line) => (
                <li
                  data-changed-letters={line.changedLetters}
                  key={line.lineNumber}
                >
                  <h3>Line {line.lineNumber}</h3>
                  <dl>
                    <div>
                      <dt>Your Segmentation</dt>
                      <dd>
                        {showStudentSegmentation ? (
                          <BoundaryText text={line.normalizedStudentText} />
                        ) : (
                          'Hidden'
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Instructor Reference</dt>
                      <dd>
                        {showInstructorReference ? (
                          <BoundaryText text={line.normalizedReferenceText} />
                        ) : (
                          'Hidden until you choose to show it'
                        )}
                      </dd>
                    </div>
                  </dl>
                  <ul aria-label={`Boundary results for line ${line.lineNumber}`}>
                    <li>
                      <strong>Matching Word Boundaries:</strong>{' '}
                      {line.matchingBoundaries.length}
                    </li>
                    <li>
                      <strong>Missing Word Boundaries:</strong>{' '}
                      {line.missingBoundaries.length}
                    </li>
                    <li>
                      <strong>Extra Word Boundaries:</strong>{' '}
                      {line.extraBoundaries.length}
                    </li>
                    <li>
                      <strong>Changed Letters:</strong>{' '}
                      {line.changedLetters ? 'Yes' : 'No'}
                    </li>
                  </ul>
                  <p className="student-segmentation-boundary-detail">
                    <span aria-hidden="true">│</span> marks a proposed boundary
                    between visible letters. Positions are counted from the
                    start of each source line.
                  </p>
                </li>
              ))}
            </ol>
          </section>
        )
      )}

      <section
        className="student-transcription-progress"
        aria-labelledby="student-segmentation-progress-title"
      >
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="student-segmentation-progress-title">
            Word segmentation summary
          </h2>
        </div>
        <dl>
          <div>
            <dt>Lines completed</dt>
            <dd>{linesCompleted}</dd>
          </div>
          <div>
            <dt>Boundaries proposed</dt>
            <dd>{boundaryCount}</dd>
          </div>
          <div>
            <dt>Lines with changed letters</dt>
            <dd>{changedLetterLines}</dd>
          </div>
        </dl>
        <div className="student-letter-progress__actions">
          <button
            type="button"
            className="begin-button"
            disabled={!canCheck}
            onClick={checkSegmentation}
          >
            Check Word Segmentation
          </button>
          <button
            type="button"
            className="control-button"
            disabled={
              !comparison ||
              !session.segmentationComparisonCurrent ||
              session.segmentationCheckCount < 1 ||
              !canCheck ||
              comparison.hasChangedLetters ||
              session.segmentationStageStatus === 'complete'
            }
            onClick={finishStage}
          >
            Mark Word Segmentation Complete
          </button>
          <button
            type="button"
            className="control-button"
            onClick={onReturnToTranscription}
          >
            Return to Transcription
          </button>
        </div>
        {!canCheck && changedLetterLines === 0 && (
          <p className="student-letter-progress__notice">
            Keep text on all five lines before checking.
          </p>
        )}
        {session.segmentationCheckCount > 0 &&
          !session.segmentationComparisonCurrent && (
            <p className="student-letter-progress__notice" role="status">
              Your spacing changed. Check Word Segmentation again to update the
              comparison.
            </p>
          )}
      </section>

      <aside
        className="student-segmentation-review"
        aria-labelledby="student-segmentation-review-title"
      >
        <div>
          <p className="eyebrow">Earlier-stage evidence</p>
          <h2 id="student-segmentation-review-title">
            Completed transcription and letter labels
          </h2>
          <p>
            Return to an earlier stage if you need to change its work. Changes
            to the completed transcription invalidate this comparison.
          </p>
        </div>
        <ol>
          {LINE_NUMBERS.map((lineNumber, index) => (
            <li key={lineNumber}>
              <strong>Line {lineNumber}</strong>
              <span>
                {normalizeSegmentationDisplay(
                  session.segmentationSourceTranscription[index],
                )}
              </span>
              <small>
                Letter labels:{' '}
                {regionsByLine[index].labels.length > 0
                  ? regionsByLine[index].labels.join(' · ')
                  : 'No student selections'}
              </small>
            </li>
          ))}
        </ol>
      </aside>
    </>
  )
}
