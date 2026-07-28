import { useMemo, useState } from 'react'
import { publicAssetUrl } from './assetPaths'
import { RIB_785_CASE } from './content/curated/RIB 785/case'
import {
  RIB_785_LETTER_REFERENCE,
  RIB_785_LETTER_REFERENCE_CONTEXT,
  RIB_785_LETTER_REFERENCE_REGION_COUNT,
} from './content/curated/RIB 785/letterReference'
import { orderedRegionsForLine } from './letterReference'

const editorUrl = `${import.meta.env.BASE_URL}?dev=letter-reference-editor&case=RIB%20785`

export function InstructorLetterReferenceReview() {
  const [lineFilter, setLineFilter] = useState('all')
  const visibleRegions = useMemo(
    () =>
      RIB_785_LETTER_REFERENCE.regions.filter(
        (region) =>
          lineFilter === 'all' ||
          region.lineNumber === Number(lineFilter),
      ),
    [lineFilter],
  )
  const counts = RIB_785_LETTER_REFERENCE_CONTEXT.validLineNumbers.map(
    (lineNumber) => ({
      lineNumber,
      count: orderedRegionsForLine(
        RIB_785_LETTER_REFERENCE.regions,
        lineNumber,
      ).length,
    }),
  )

  return (
    <main className="reference-review">
      <header className="reference-review__header">
        <div>
          <p className="eyebrow">Developer review</p>
          <h1>RIB 785 Permanent Letter Reference</h1>
          <p>
            Read-only inspection of the reviewed instructor reference. This
            view never reads from or writes to the editable local draft.
          </p>
        </div>
        <a className="control-button" href={editorUrl}>
          Return to Editable Editor
        </a>
      </header>

      <section
        className="reference-review__summary"
        aria-label="Permanent reference summary"
      >
        <dl>
          <div>
            <dt>Validation</dt>
            <dd>Passed</dd>
          </div>
          <div>
            <dt>Source dimensions</dt>
            <dd>
              {RIB_785_CASE.sourceImage.width} ×{' '}
              {RIB_785_CASE.sourceImage.height}
            </dd>
          </div>
          <div>
            <dt>Total regions</dt>
            <dd>{RIB_785_LETTER_REFERENCE_REGION_COUNT}</dd>
          </div>
          {counts.map(({ lineNumber, count }) => (
            <div key={lineNumber}>
              <dt>Line {lineNumber}</dt>
              <dd>{count}</dd>
            </div>
          ))}
        </dl>
        <label>
          Show regions
          <select
            aria-label="Filter reference by line"
            value={lineFilter}
            onChange={(event) => setLineFilter(event.target.value)}
          >
            <option value="all">All lines</option>
            {RIB_785_LETTER_REFERENCE_CONTEXT.validLineNumbers.map(
              (lineNumber) => (
                <option key={lineNumber} value={lineNumber}>
                  Line {lineNumber}
                </option>
              ),
            )}
          </select>
        </label>
      </section>

      <section
        className="reference-review__viewer"
        aria-label="RIB 785 source image with permanent letter reference"
      >
        <div
          className="reference-review__stage"
          style={{
            aspectRatio: `${RIB_785_CASE.sourceImage.width} / ${RIB_785_CASE.sourceImage.height}`,
          }}
        >
          <img
            src={publicAssetUrl(RIB_785_CASE.sourceImage.publicPath)}
            alt="RIB 785 source illustration with reviewed letter regions"
            draggable="false"
          />
          <svg
            viewBox={`0 0 ${RIB_785_CASE.sourceImage.width} ${RIB_785_CASE.sourceImage.height}`}
            aria-label={`${visibleRegions.length} visible permanent letter regions`}
            data-testid="permanent-reference-overlay"
          >
            {visibleRegions.map((region) => (
              <g
                className={`reference-review__region reference-review__region--line-${region.lineNumber}`}
                data-region-id={region.id}
                data-line-number={region.lineNumber}
                key={region.id}
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
                  dominantBaseline="middle"
                  textAnchor="middle"
                >
                  {region.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      </section>
    </main>
  )
}
