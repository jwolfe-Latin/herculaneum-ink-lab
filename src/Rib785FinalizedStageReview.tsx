import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import type { LetterIdentificationSession } from './letterIdentificationSession'
import { LetterRegionSelector } from './LetterRegionSelector'
import { normalizeSegmentationDisplay } from './wordSegmentationComparison'

type FinalizedReviewStage =
  | 'letter-identification'
  | 'transcription'
  | 'word-segmentation'

const STAGE_LABELS: Record<FinalizedReviewStage, string> = {
  'letter-identification': 'Letter Identification',
  transcription: 'Transcription',
  'word-segmentation': 'Word Segmentation',
}

export function Rib785FinalizedStageReview({
  stage,
  session,
}: {
  stage: FinalizedReviewStage
  session: LetterIdentificationSession
}) {
  const label = STAGE_LABELS[stage]
  const lines =
    stage === 'transcription'
      ? session.studentTranscription
      : session.studentSegmentation

  return (
    <section
      className="student-finalized-review"
      aria-labelledby="student-finalized-review-title"
    >
      <header>
        <p className="eyebrow">Review-only stage</p>
        <h2 id="student-finalized-review-title">{label} Review</h2>
        <p>
          You may inspect this completed work, but it cannot be changed after
          final Translation submission.
        </p>
      </header>

      <div className="student-transcription-viewer">
        <LetterRegionSelector
          sourceImageUrl={publicAssetUrl(RIB_785_CASE.sourceImage.publicPath)}
          sourceImageAlt={`RIB 785 funerary inscription for ${label.toLowerCase()} review`}
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

      {stage === 'letter-identification' ? (
        <p className="student-finalized-review__summary">
          {session.studentRegions.length}{' '}
          {session.studentRegions.length === 1 ? 'letter' : 'letters'} selected
        </p>
      ) : (
        <ol className="student-finalized-review__lines">
          {lines.map((line, index) => (
            <li key={`${stage}-${index}`}>
              <span>Line {index + 1}</span>
              <strong>
                {stage === 'word-segmentation'
                  ? normalizeSegmentationDisplay(line)
                  : line}
              </strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
