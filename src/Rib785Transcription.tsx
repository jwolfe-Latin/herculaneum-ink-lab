import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type { LetterIdentificationSession } from './letterIdentificationSession'
import { LetterRegionSelector } from './LetterRegionSelector'
import {
  compareTranscription,
  normalizeTranscriptionDisplay,
  type TranscriptionLineStatus,
} from './transcriptionComparison'

const LINE_NUMBERS = [1, 2, 3, 4, 5] as const
const INSTRUCTOR_TRANSCRIPTION = RIB_785_CASE.diplomaticTranscription.split(
  '\n',
)

const STATUS_LABELS: Record<TranscriptionLineStatus, string> = {
  matches: 'Matches Instructor Reference',
  'missing-character': 'Missing Character',
  'extra-character': 'Extra Character',
  'different-character': 'Different Character',
  'character-order-difference': 'Character Order Difference',
}

const STATUS_MARKERS: Record<TranscriptionLineStatus, string> = {
  matches: '●',
  'missing-character': '−',
  'extra-character': '+',
  'different-character': '≠',
  'character-order-difference': '↔',
}

export function Rib785Transcription({
  session,
  setSession,
  onReturnToLetterIdentification,
}: {
  session: LetterIdentificationSession
  setSession: Dispatch<SetStateAction<LetterIdentificationSession>>
  onReturnToLetterIdentification: () => void
}) {
  const [editing, setEditing] = useState(true)
  const [showInstructorReference, setShowInstructorReference] =
    useState(session.transcriptionReferenceRevealed)
  const [showStudentTranscription, setShowStudentTranscription] =
    useState(true)

  const completedLines = session.studentTranscription.filter(
    (line) => line.trim().length > 0,
  ).length
  const blankLines = LINE_NUMBERS.length - completedLines
  const totalCharacters = session.studentTranscription.reduce(
    (total, line) => total + Array.from(line).length,
    0,
  )
  const canCheck = completedLines === LINE_NUMBERS.length
  const comparison = session.transcriptionComparison

  const regionsByLine = useMemo(
    () =>
      LINE_NUMBERS.map((lineNumber) => ({
        lineNumber,
        regions: session.studentRegions
          .filter((region) => region.lineNumber === lineNumber)
          .sort(
            (left, right) =>
              left.x - right.x ||
              (left.manualOrder ?? 0) - (right.manualOrder ?? 0),
          ),
      })),
    [session.studentRegions],
  )

  const updateLine = (index: number, value: string) => {
    setSession((current) => {
      const studentTranscription = [
        ...current.studentTranscription,
      ] as LetterIdentificationSession['studentTranscription']
      studentTranscription[index] = value.toUpperCase()
      return {
        ...current,
        studentTranscription,
        transcriptionComparisonCurrent: false,
        transcriptionVersion: current.transcriptionVersion + 1,
        segmentationComparisonCurrent: false,
        segmentationReferenceRevealed: false,
        segmentationStageStatus: 'in-progress',
        translationReviewCurrent: false,
        translationInstructorReferenceRevealed: false,
        translationNormalizedReadingRevealed: false,
        translationStageStatus: 'in-progress',
        translationEarlierWorkChanged:
          current.translationReviewCount > 0 ||
          current.studentTranslation.trim().length > 0 ||
          current.translationStageStatus === 'complete',
        transcriptionStageStatus:
          current.transcriptionStageStatus === 'complete'
            ? 'in-progress'
            : current.transcriptionStageStatus,
      }
    })
  }

  const checkTranscription = () => {
    if (!canCheck) return
    const nextComparison = compareTranscription(
      session.studentTranscription,
      INSTRUCTOR_TRANSCRIPTION,
    )
    setSession((current) => ({
      ...current,
      transcriptionCheckCount: current.transcriptionCheckCount + 1,
      transcriptionComparison: nextComparison,
      transcriptionComparisonCurrent: true,
      transcriptionReferenceRevealed: false,
      transcriptionStageStatus: 'checked',
    }))
    setShowInstructorReference(false)
    setShowStudentTranscription(true)
    setEditing(false)
  }

  const finishStage = () => {
    if (
      !comparison ||
      !session.transcriptionComparisonCurrent ||
      session.transcriptionCheckCount < 1 ||
      !canCheck
    ) {
      return
    }
    if (
      comparison.hasDifferences &&
      !window.confirm('Finish this stage with remaining differences?')
    ) {
      return
    }
    setSession((current) => {
      const dependencyChanged =
        current.segmentationSourceVersion !== current.transcriptionVersion
      if (!dependencyChanged) {
        return {
          ...current,
          transcriptionStageStatus: 'complete',
        }
      }
      const startingLines = current.studentTranscription.map(
        normalizeTranscriptionDisplay,
      ) as LetterIdentificationSession['studentSegmentation']
      return {
        ...current,
        transcriptionStageStatus: 'complete',
        studentSegmentation: startingLines,
        segmentationSourceTranscription: [...startingLines],
        segmentationSourceVersion: current.transcriptionVersion,
        segmentationCheckCount: 0,
        segmentationComparison: null,
        segmentationComparisonCurrent: false,
        segmentationReferenceRevealed: false,
        segmentationStageStatus: 'in-progress',
      }
    })
  }

  const toggleInstructorReference = () => {
    const nextVisible = !showInstructorReference
    setShowInstructorReference(nextVisible)
    setSession((current) => ({
      ...current,
      transcriptionReferenceRevealed: nextVisible,
    }))
  }

  return (
    <>
      <section
        className="student-letter-prompt"
        aria-labelledby="student-transcription-prompt-title"
      >
        <div>
          <p className="eyebrow">Current stage</p>
          <h2 id="student-transcription-prompt-title">Transcription</h2>
          <p>
            Transcribe the visible Latin letters line by line. Record what you
            see before normalizing or expanding the text.
          </p>
        </div>
        {session.transcriptionStageStatus === 'complete' && (
          <p className="student-letter-complete" role="status">
            Transcription Complete
          </p>
        )}
      </section>

      {editing ? (
        <section className="student-transcription-workspace">
          <div className="student-transcription-viewer">
            <LetterRegionSelector
              sourceImageUrl={publicAssetUrl(
                RIB_785_CASE.sourceImage.publicPath,
              )}
              sourceImageAlt="RIB 785 funerary inscription for transcription"
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

          <div className="student-transcription-entry">
            <header>
              <p className="eyebrow">Diplomatic transcription</p>
              <h2>Record five visible lines</h2>
              <p>
                Preserve visible V, abbreviations, letter order, and source line
                divisions. Spaces may be entered where you see them.
              </p>
            </header>
            <div className="student-transcription-fields">
              {LINE_NUMBERS.map((lineNumber, index) => (
                <label key={lineNumber}>
                  Line {lineNumber}
                  <textarea
                    aria-label={`Line ${lineNumber} transcription`}
                    autoComplete="off"
                    rows={2}
                    value={session.studentTranscription[index]}
                    onChange={(event) =>
                      updateLine(index, event.target.value)
                    }
                  />
                </label>
              ))}
            </div>
            <p className="student-transcription-notation">
              Introductory notation: [brackets] for missing text, ? after an
              insecure letter, an em dash for one unreadable character, and a
              hyphen only for continuation across a line.
            </p>
          </div>
        </section>
      ) : (
        comparison && (
          <section
            className="student-transcription-comparison"
            aria-labelledby="student-transcription-comparison-title"
            aria-live="polite"
          >
            <header>
              <div>
                <p className="eyebrow">Line-by-line comparison</p>
                <h2 id="student-transcription-comparison-title">
                  Your Transcription and Instructor Reference
                </h2>
                <p>
                  The instructor transcription is a scholarly comparison aid,
                  not an infallible reading.
                </p>
              </div>
              <div
                className="student-transcription-comparison__controls"
                aria-label="Transcription comparison controls"
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
                  aria-pressed={showStudentTranscription}
                  onClick={() =>
                    setShowStudentTranscription((visible) => !visible)
                  }
                >
                  {showStudentTranscription
                    ? 'Hide My Transcription'
                    : 'Show My Transcription'}
                </button>
                <button type="button" onClick={() => setEditing(true)}>
                  Return to Editing
                </button>
              </div>
            </header>

            <ol className="student-transcription-comparison__lines">
              {comparison.lines.map((line) => (
                <li data-status={line.status} key={line.lineNumber}>
                  <div className="student-transcription-comparison__status">
                    <span aria-hidden="true">{STATUS_MARKERS[line.status]}</span>
                    <strong>
                      Line {line.lineNumber}: {STATUS_LABELS[line.status]}
                    </strong>
                  </div>
                  <dl>
                    <div>
                      <dt>Your Transcription</dt>
                      <dd>
                        {showStudentTranscription
                          ? line.normalizedStudentText
                          : 'Hidden'}
                      </dd>
                    </div>
                    <div>
                      <dt>Instructor Reference</dt>
                      <dd>
                        {showInstructorReference
                          ? line.normalizedReferenceText
                          : 'Hidden until you choose to show it'}
                      </dd>
                    </div>
                  </dl>
                  {showStudentTranscription && showInstructorReference && (
                    <div
                      className="student-transcription-characters"
                      aria-label={`Character comparison for line ${line.lineNumber}`}
                    >
                      {line.characters.map((character) => (
                        <span
                          data-matches={character.matches}
                          key={character.position}
                          aria-label={`Position ${character.position}: your character ${character.studentCharacter ?? 'missing'}, instructor character ${character.referenceCharacter ?? 'missing'}`}
                        >
                          {character.studentCharacter ?? '∅'}
                          <small>{character.referenceCharacter ?? '∅'}</small>
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )
      )}

      <section
        className="student-transcription-progress"
        aria-labelledby="student-transcription-progress-title"
      >
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="student-transcription-progress-title">
            Transcription summary
          </h2>
        </div>
        <dl>
          <div>
            <dt>Lines completed</dt>
            <dd>{completedLines}</dd>
          </div>
          <div>
            <dt>Lines still blank</dt>
            <dd>{blankLines}</dd>
          </div>
          <div>
            <dt>Total characters entered</dt>
            <dd>{totalCharacters}</dd>
          </div>
        </dl>
        <div className="student-letter-progress__actions">
          <button
            type="button"
            className="begin-button"
            disabled={!canCheck}
            onClick={checkTranscription}
          >
            Check Transcription
          </button>
          <button
            type="button"
            className="control-button"
            disabled={
              !comparison ||
              !session.transcriptionComparisonCurrent ||
              session.transcriptionCheckCount < 1 ||
              !canCheck ||
              session.transcriptionStageStatus === 'complete'
            }
            onClick={finishStage}
          >
            Mark Transcription Complete
          </button>
          <button
            type="button"
            className="control-button"
            onClick={onReturnToLetterIdentification}
          >
            Return to Letter Identification
          </button>
        </div>
        {!canCheck && (
          <p className="student-letter-progress__notice">
            Enter text on all five lines before checking.
          </p>
        )}
        {session.transcriptionCheckCount > 0 &&
          !session.transcriptionComparisonCurrent && (
            <p className="student-letter-progress__notice" role="status">
              Your transcription changed. Check Transcription again to update
              the comparison.
            </p>
          )}
      </section>

      <aside
        className="student-transcription-letter-review"
        aria-labelledby="student-transcription-letter-review-title"
      >
        <div>
          <p className="eyebrow">Evidence support</p>
          <h2 id="student-transcription-letter-review-title">
            My Letter Identification review
          </h2>
          <p>
            These are your own labels and line assignments. They are not copied
            into the transcription fields.
          </p>
        </div>
        <ol>
          {regionsByLine.map(({ lineNumber, regions }) => (
            <li key={lineNumber}>
              <strong>Line {lineNumber}</strong>
              <span>
                {regions.length > 0
                  ? regions
                      .map((region) => region.label || 'Unlabeled')
                      .join(' · ')
                  : 'No student selections'}
              </span>
            </li>
          ))}
        </ol>
      </aside>
    </>
  )
}
