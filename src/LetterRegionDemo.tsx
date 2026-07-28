import { publicAssetUrl } from './assetPaths'
import { LetterRegionSelector } from './LetterRegionSelector'

export function LetterRegionDemo() {
  return (
    <main className="letter-region-demo">
      <header className="letter-region-demo__header">
        <div>
          <p className="eyebrow">Developer demonstration</p>
          <h1>Reusable Letter-Region Selection Tool</h1>
          <p>
            This hidden workspace demonstrates reusable selection behavior. It
            is separate from the RIB 785 student investigation and contains no
            instructor-authored or saved student regions.
          </p>
        </div>
        <a className="control-button" href={publicAssetUrl('')}>
          Return to Ancient Texts Lab
        </a>
      </header>

      <LetterRegionSelector
        sourceImageUrl={publicAssetUrl('cases/RIB 785/source.png')}
        sourceImageAlt="RIB 785 source illustration for selection-tool demonstration"
        sourceSize={{ width: 832, height: 1084 }}
      />
    </main>
  )
}
