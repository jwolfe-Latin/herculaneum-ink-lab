import { useState, type Dispatch, type SetStateAction } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type { LetterIdentificationSession } from './letterIdentificationSession'
import { LetterRegionSelector } from './LetterRegionSelector'
import { normalizeSegmentationDisplay } from './wordSegmentationComparison'

const NORMALIZED_READING_LINES =
  RIB_785_CASE.normalizedInstructorReading.split('\n')

export function Rib785Translation({
  session,
  setSession,
  onReturnToWordSegmentation,
}: {
  session: LetterIdentificationSession
  setSession: Dispatch<SetStateAction<LetterIdentificationSession>>
  onReturnToWordSegmentation: () => void
}) {
  const [editing, setEditing] = useState(!session.translationReviewCurrent)
  const [showTranscription, setShowTranscription] = useState(true)
  const [showSegmentation, setShowSegmentation] = useState(true)
  const canReview = session.studentTranslation.trim().length > 0

  const updateTranslation = (value: string) => {
    setSession((current) => ({
      ...current,
      studentTranslation: value,
      translationReviewCurrent: false,
      translationStageStatus:
        current.translationStageStatus === 'complete'
          ? 'in-progress'
          : current.translationStageStatus,
    }))
  }

  const reviewTranslation = () => {
    if (!canReview) return
    setSession((current) => ({
      ...current,
      translationReviewCount: current.translationReviewCount + 1,
      translationReviewCurrent: true,
      translationInstructorReferenceRevealed: true,
      translationNormalizedReadingRevealed: true,
      translationStageStatus: 'checked',
      translationEarlierWorkChanged: false,
      translationSourceTranscriptionVersion:
        current.transcriptionVersion,
      translationSourceSegmentationVersion:
        current.segmentationVersion,
    }))
    setEditing(false)
  }

  const finishStage = () => {
    if (
      !canReview ||
      session.translationReviewCount < 1 ||
      !session.translationReviewCurrent
    ) {
      return
    }
    setSession((current) => ({
      ...current,
      translationStageStatus: 'complete',
    }))
  }

  const toggleInstructorReference = () => {
    setSession((current) => ({
      ...current,
      translationInstructorReferenceRevealed:
        !current.translationInstructorReferenceRevealed,
    }))
  }

  const toggleNormalizedReading = () => {
    setSession((current) => ({
      ...current,
      translationNormalizedReadingRevealed:
        !current.translationNormalizedReadingRevealed,
    }))
  }

  return (
    <>
      <section
        className="student-letter-prompt"
        aria-labelledby="student-translation-prompt-title"
      >
        <div>
          <p className="eyebrow">Current stage</p>
          <h2 id="student-translation-prompt-title">Translation</h2>
          <p>
            Translate the inscription into clear English using your
            transcription, word segmentation, and the guidance provided by
            your instructor.
          </p>
        </div>
        {session.translationStageStatus === 'complete' && (
          <p className="student-letter-complete" role="status">
            Translation Complete
          </p>
        )}
      </section>

      {session.translationEarlierWorkChanged && (
        <p className="student-translation-dependency-warning" role="status">
          Earlier text work has changed. Review your translation again.
        </p>
      )}

      <section className="student-translation-evidence">
        <div className="student-transcription-viewer">
          <LetterRegionSelector
            sourceImageUrl={publicAssetUrl(
              RIB_785_CASE.sourceImage.publicPath,
            )}
            sourceImageAlt="RIB 785 funerary inscription for translation"
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

        <aside
          className="student-translation-prior-work"
          aria-labelledby="student-translation-prior-work-title"
        >
          <div>
            <p className="eyebrow">My earlier work</p>
            <h2 id="student-translation-prior-work-title">
              Latin text for review
            </h2>
          </div>
          <div className="student-translation-prior-work__controls">
            <button
              type="button"
              aria-pressed={showTranscription}
              onClick={() => setShowTranscription((shown) => !shown)}
            >
              {showTranscription
                ? 'Hide My Transcription'
                : 'Show My Transcription'}
            </button>
            <button
              type="button"
              aria-pressed={showSegmentation}
              onClick={() => setShowSegmentation((shown) => !shown)}
            >
              {showSegmentation
                ? 'Hide My Word Segmentation'
                : 'Show My Word Segmentation'}
            </button>
          </div>
          {showTranscription && (
            <div>
              <h3>My Diplomatic Transcription</h3>
              <ol>
                {session.studentTranscription.map((line, index) => (
                  <li key={`transcription-${index}`}>
                    <span>Line {index + 1}</span>
                    <strong>{line}</strong>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {showSegmentation && (
            <div>
              <h3>My Word Segmentation</h3>
              <ol>
                {session.studentSegmentation.map((line, index) => (
                  <li key={`segmentation-${index}`}>
                    <span>Line {index + 1}</span>
                    <strong>{normalizeSegmentationDisplay(line)}</strong>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </section>

      {editing ? (
        <section
          className="student-translation-entry"
          aria-labelledby="student-translation-entry-title"
        >
          <div>
            <p className="eyebrow">Your work</p>
            <h2 id="student-translation-entry-title">Your Translation</h2>
            <p>
              Write ordinary English prose. Your wording does not need to
              match an instructor reference word for word.
            </p>
          </div>
          <label>
            Your Translation
            <textarea
              aria-label="Your Translation"
              autoComplete="off"
              rows={8}
              value={session.studentTranslation}
              onChange={(event) => updateTranslation(event.target.value)}
            />
          </label>
          <p className="student-translation-character-count">
            {session.studentTranslation.length} characters
          </p>
        </section>
      ) : (
        <section
          className="student-translation-comparison"
          aria-labelledby="student-translation-comparison-title"
          aria-live="polite"
        >
          <header>
            <div>
              <p className="eyebrow">Self-review comparison</p>
              <h2 id="student-translation-comparison-title">
                Review Your Translation
              </h2>
              <p>
                Compare the different readings with your instructor. The
                reference translation is one scholarly wording, not the only
                acceptable English style.
              </p>
            </div>
            <div
              className="student-translation-comparison__controls"
              aria-label="Translation comparison controls"
            >
              <button
                type="button"
                aria-pressed={
                  session.translationInstructorReferenceRevealed
                }
                onClick={toggleInstructorReference}
              >
                {session.translationInstructorReferenceRevealed
                  ? 'Hide Instructor Reference Translation'
                  : 'Show Instructor Reference Translation'}
              </button>
              <button
                type="button"
                aria-pressed={
                  session.translationNormalizedReadingRevealed
                }
                onClick={toggleNormalizedReading}
              >
                {session.translationNormalizedReadingRevealed
                  ? 'Hide Normalized Instructor Reading'
                  : 'Show Normalized Instructor Reading'}
              </button>
              <button type="button" onClick={() => setEditing(true)}>
                Return to Editing
              </button>
            </div>
          </header>

          <div className="student-translation-comparison__grid">
            <article>
              <h3>Your Translation</h3>
              <p>{session.studentTranslation}</p>
            </article>
            <article>
              <h3>Instructor Reference Translation</h3>
              {session.translationInstructorReferenceRevealed ? (
                <p>{RIB_785_CASE.translation}</p>
              ) : (
                <p>Hidden</p>
              )}
            </article>
            <article>
              <h3>Normalized Instructor Reading</h3>
              {session.translationNormalizedReadingRevealed ? (
                <ol>
                  {NORMALIZED_READING_LINES.map((line, index) => (
                    <li key={`normalized-${index}`}>{line}</li>
                  ))}
                </ol>
              ) : (
                <p>Hidden</p>
              )}
            </article>
            <article>
              <h3>My Segmented Latin Text</h3>
              <ol>
                {session.studentSegmentation.map((line, index) => (
                  <li key={`comparison-segmentation-${index}`}>
                    {normalizeSegmentationDisplay(line)}
                  </li>
                ))}
              </ol>
            </article>
          </div>
        </section>
      )}

      {session.translationReviewCount > 0 && (
        <section
          className="student-translation-revision-note"
          aria-labelledby="student-translation-revision-note-title"
        >
          <div>
            <p className="eyebrow">Optional reflection</p>
            <h2 id="student-translation-revision-note-title">
              Revision Note
            </h2>
            <p>
              What did you revise or confirm after comparing the translations?
            </p>
          </div>
          <label>
            Revision Note
            <textarea
              aria-label="Revision Note"
              rows={4}
              value={session.translationRevisionNote}
              onChange={(event) =>
                setSession((current) => ({
                  ...current,
                  translationRevisionNote: event.target.value,
                }))
              }
            />
          </label>
        </section>
      )}

      <section
        className="student-transcription-progress"
        aria-labelledby="student-translation-progress-title"
      >
        <div>
          <p className="eyebrow">Your progress</p>
          <h2 id="student-translation-progress-title">
            Translation summary
          </h2>
        </div>
        <dl>
          <div>
            <dt>Review attempts</dt>
            <dd>{session.translationReviewCount}</dd>
          </div>
          <div>
            <dt>Current review</dt>
            <dd>
              {session.translationReviewCurrent
                ? 'Reviewed'
                : 'Review needed'}
            </dd>
          </div>
        </dl>
        <div className="student-letter-progress__actions">
          <button
            type="button"
            className="begin-button"
            disabled={!canReview}
            onClick={reviewTranslation}
          >
            Review Translation
          </button>
          <button
            type="button"
            className="control-button"
            disabled={
              !canReview ||
              session.translationReviewCount < 1 ||
              !session.translationReviewCurrent ||
              session.translationStageStatus === 'complete'
            }
            onClick={finishStage}
          >
            Complete Translation Stage
          </button>
          <button
            type="button"
            className="control-button"
            onClick={onReturnToWordSegmentation}
          >
            Return to Word Segmentation
          </button>
        </div>
        {!canReview && (
          <p className="student-letter-progress__notice">
            Enter a translation before reviewing.
          </p>
        )}
        {session.translationReviewCount > 0 &&
          !session.translationReviewCurrent && (
            <p className="student-letter-progress__notice" role="status">
              Review your current translation again before completing this
              stage.
            </p>
          )}
      </section>

      {session.translationStageStatus === 'complete' && (
        <section
          className="student-translation-complete"
          aria-labelledby="student-translation-complete-title"
        >
          <p className="eyebrow">Case complete</p>
          <h2 id="student-translation-complete-title">
            RIB 785 Investigation Complete
          </h2>
          <ul>
            <li>Letter Identification — Complete</li>
            <li>Transcription — Complete</li>
            <li>Word Segmentation — Complete</li>
            <li>Translation — Complete</li>
          </ul>
          <p>
            Your work remains in this browser tab for the current session. A
            combined report will be added in a later milestone.
          </p>
        </section>
      )}
    </>
  )
}
