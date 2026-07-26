import type {
  InvestigationSession,
  SessionPoint,
} from './investigationSession'

const METHODOLOGICAL_STATEMENT =
  'The expert reference annotation is a scholarly comparison standard based on expert judgment. Transparent areas were treated as non-reference surface for this introductory activity.'

function pointsToPath(points: SessionPoint[]) {
  if (points.length === 0) return ''
  const drawable =
    points.length === 1
      ? [points[0], { x: points[0].x + 0.01, y: points[0].y }]
      : points

  return drawable
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ')
}

function ReportImage({
  session,
  includeReference,
  label,
}: {
  session: InvestigationSession
  includeReference: boolean
  label: string
}) {
  const maskId = includeReference
    ? 'report-comparison-label-mask'
    : 'report-student-label-mask'

  return (
    <figure className="report-figure">
      <div
        className="report-capture"
        data-testid={
          includeReference
            ? 'report-comparison-image'
            : 'report-student-image'
        }
      >
        <img src={session.surfaceImageUrl} alt="" aria-hidden="true" />
        {includeReference && (
          <img
            className="report-reference-layer"
            src={session.referenceImageUrl}
            alt=""
            aria-hidden="true"
          />
        )}
        <svg
          className="report-student-layer"
          viewBox={`0 0 ${session.sourceSize.width} ${session.sourceSize.height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <defs>
            <mask id={maskId}>
              <rect
                width={session.sourceSize.width}
                height={session.sourceSize.height}
                fill="black"
              />
              {session.strokes.map((stroke) => (
                <path
                  key={stroke.id}
                  d={pointsToPath(stroke.points)}
                  fill="none"
                  stroke={stroke.tool === 'ink' ? 'white' : 'black'}
                  strokeWidth={stroke.size}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
            </mask>
          </defs>
          <rect
            width={session.sourceSize.width}
            height={session.sourceSize.height}
            mask={`url(#${maskId})`}
          />
        </svg>
      </div>
      <figcaption>{label}</figcaption>
    </figure>
  )
}

const percent = (value: number) => `${Math.round(value * 100)}%`

export function StudentReport({
  session,
  onReturn,
  onStartOver,
}: {
  session: InvestigationSession
  onReturn: () => void
  onStartOver: () => void
}) {
  const printReport = () => window.print()
  const completionDate = new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(new Date(session.completedAt))

  return (
    <main className="report-shell">
      <nav className="report-controls" aria-label="Report controls">
        <button className="control-button" onClick={onReturn}>
          Return to Investigation
        </button>
        <button className="control-button" onClick={printReport}>
          Print Report
        </button>
        <button className="control-button" onClick={printReport}>
          Save as PDF through the browser print dialog
        </button>
        <button
          className="control-button report-start-over"
          onClick={onStartOver}
        >
          Start Over
        </button>
      </nav>

      <article className="student-report" aria-labelledby="report-title">
        <header className="report-header">
          <div>
            <p className="eyebrow">Student report</p>
            <h1 id="report-title">{session.investigationTitle}</h1>
          </div>
          <dl className="report-details">
            <div>
              <dt>Student name or assigned identifier</dt>
              <dd>{session.studentIdentifier}</dd>
            </div>
            <div>
              <dt>Completion date</dt>
              <dd>{completionDate}</dd>
            </div>
            <div>
              <dt>Case or sample identifier</dt>
              <dd>{session.caseIdentifier}</dd>
            </div>
          </dl>
        </header>

        <section className="report-images" aria-label="Investigation images">
          <ReportImage
            session={session}
            includeReference={false}
            label="Student labels over the papyrus surface"
          />
          <ReportImage
            session={session}
            includeReference
            label="Student labels compared with the expert reference"
          />
        </section>

        <section className="report-metrics" aria-label="Comparison metrics">
          <article>
            <h2>Ink Recovered</h2>
            <strong>{percent(session.metrics.inkRecovered)}</strong>
          </article>
          <article>
            <h2>Label Precision</h2>
            <strong>
              {session.metrics.labelPrecision === null
                ? 'Not available'
                : percent(session.metrics.labelPrecision)}
            </strong>
          </article>
          <article>
            <h2>Extra Surface Marked</h2>
            <strong>{percent(session.metrics.extraSurfaceMarked)}</strong>
          </article>
        </section>

        <p className="report-methodology">{METHODOLOGICAL_STATEMENT}</p>

        <footer className="report-source">
          <p>
            <strong>Source-image credit:</strong> {session.sourceCredit}
          </p>
          <p>
            <strong>License:</strong> {session.license}
          </p>
        </footer>
      </article>
    </main>
  )
}

export { METHODOLOGICAL_STATEMENT }
