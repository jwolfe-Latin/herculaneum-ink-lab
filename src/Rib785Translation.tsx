import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { publicAssetUrl } from './assetPaths'
import { ConfirmationDialog } from './ConfirmationDialog'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type { LetterIdentificationSession } from './letterIdentificationSession'
import { LetterRegionSelector } from './LetterRegionSelector'
import { normalizeSegmentationDisplay } from './wordSegmentationComparison'

export function Rib785Translation({
  session,
  setSession,
  onReturnToWordSegmentation,
}: {
  session: LetterIdentificationSession
  setSession: Dispatch<SetStateAction<LetterIdentificationSession>>
  onReturnToWordSegmentation: () => void
}) {
  const [showTranscription, setShowTranscription] = useState(true)
  const [showSegmentation, setShowSegmentation] = useState(true)
  const [confirmationOpen, setConfirmationOpen] = useState(false)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const submittedHeadingRef = useRef<HTMLHeadingElement>(null)
  const canSubmit =
    !session.translationFinallySubmitted &&
    session.studentTranslation.trim().length > 0

  useEffect(() => {
    if (session.translationFinallySubmitted) {
      submittedHeadingRef.current?.focus()
    }
  }, [session.translationFinallySubmitted])

  const updateTranslation = (value: string) => {
    if (session.translationFinallySubmitted) return
    setSession((current) =>
      current.translationFinallySubmitted
        ? current
        : {
            ...current,
            studentTranslation: value,
          },
    )
  }

  const submitTranslation = () => {
    if (!canSubmit) return
    setConfirmationOpen(true)
  }

  const confirmSubmission = () => {
    setSession((current) => {
      if (
        current.translationFinallySubmitted ||
        current.studentTranslation.trim().length === 0 ||
        current.segmentationStageStatus !== 'complete'
      ) {
        return current
      }
      return {
        ...current,
        translationFinallySubmitted: true,
        translationStageStatus: 'complete',
        translationSubmittedAt: new Date().toISOString(),
      }
    })
    setConfirmationOpen(false)
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
        {session.translationFinallySubmitted && (
          <div className="student-translation-status" role="status">
            <strong>Translation Submitted</strong>
            <span>Translation Complete</span>
          </div>
        )}
      </section>

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

      {session.translationFinallySubmitted ? (
        <section
          className="student-translation-submitted"
          aria-labelledby="student-translation-submitted-title"
        >
          <p className="eyebrow">Final response</p>
          <h2
            id="student-translation-submitted-title"
            ref={submittedHeadingRef}
            tabIndex={-1}
          >
            Your Submitted Translation
          </h2>
          <p className="student-translation-submitted__response">
            {session.studentTranslation}
          </p>
        </section>
      ) : (
        <section
          className="student-translation-entry"
          aria-labelledby="student-translation-entry-title"
        >
          <div>
            <p className="eyebrow">Your work</p>
            <h2 id="student-translation-entry-title">Your Translation</h2>
            <p>
              Write ordinary English prose. You may revise freely before
              submitting your final response. The software does not evaluate
              your translation.
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
            <dt>Final submission</dt>
            <dd>
              {session.translationFinallySubmitted
                ? 'Translation Submitted'
                : 'Not submitted'}
            </dd>
          </div>
          <div>
            <dt>Stage status</dt>
            <dd>
              {session.translationStageStatus === 'complete'
                ? 'Translation Complete'
                : 'In progress'}
            </dd>
          </div>
        </dl>
        {!session.translationFinallySubmitted && (
          <div className="student-letter-progress__actions">
            <button
              ref={submitButtonRef}
              type="button"
              className="begin-button"
              disabled={!canSubmit}
              onClick={submitTranslation}
            >
              Submit Final Translation
            </button>
            <button
              type="button"
              className="control-button"
              onClick={onReturnToWordSegmentation}
            >
              Return to Word Segmentation
            </button>
          </div>
        )}
        {!session.translationFinallySubmitted && !canSubmit && (
          <p className="student-letter-progress__notice">
            Enter a translation before final submission.
          </p>
        )}
      </section>

      {session.translationFinallySubmitted && (
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
            Your exact submitted response remains in this browser tab for the
            current session. Your instructor will review it later. A combined
            report will be added in a later milestone.
          </p>
        </section>
      )}

      {confirmationOpen && (
        <ConfirmationDialog
          title="Submit Final Translation?"
          description="Submit this translation as your final response? You will not be able to revise it afterward during this investigation."
          confirmLabel="Submit Final Translation"
          onCancel={() => setConfirmationOpen(false)}
          onConfirm={confirmSubmission}
          returnFocusRef={submitButtonRef}
        />
      )}
    </>
  )
}
