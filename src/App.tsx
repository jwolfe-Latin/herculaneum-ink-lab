import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import {
  calculateMetrics,
  loadCaseResources,
  rasterizeStudentStrokes,
  type EvaluationMetrics,
  type LoadedCaseResources,
  type ValidationSummary,
} from './evaluation'
import {
  clientPointToSource,
  type Point,
  type Size,
} from './coordinates'

const MIN_SCALE = 1
const MAX_SCALE = 6
const ZOOM_STEP = 0.4
const FALLBACK_SOURCE_WIDTH = 1000
const FALLBACK_SOURCE_HEIGHT = 432
const MIN_BRUSH_SIZE = 4
const MAX_BRUSH_SIZE = 12
const DEFAULT_BRUSH_SIZE = 8
const BRUSH_SIZE_STORAGE_KEY = 'herculaneum-ink-lab.brush-size'

type View = {
  scale: number
  x: number
  y: number
}

type Stroke = {
  id: number
  tool: 'ink' | 'eraser'
  size: number
  points: Point[]
}

type StageSize = Size

const INITIAL_VIEW: View = { scale: 1, x: 0, y: 0 }
const INITIAL_STAGE: StageSize = {
  width: FALLBACK_SOURCE_WIDTH,
  height: FALLBACK_SOURCE_HEIGHT,
}
const INITIAL_SOURCE_SIZE: Size = {
  width: FALLBACK_SOURCE_WIDTH,
  height: FALLBACK_SOURCE_HEIGHT,
}

function clampBrushSize(value: number) {
  if (!Number.isFinite(value)) return DEFAULT_BRUSH_SIZE
  return Math.min(
    MAX_BRUSH_SIZE,
    Math.max(MIN_BRUSH_SIZE, Math.round(value)),
  )
}

function getInitialBrushSize() {
  if (typeof window === 'undefined') return DEFAULT_BRUSH_SIZE
  const storedValue = window.localStorage.getItem(BRUSH_SIZE_STORAGE_KEY)
  return storedValue === null
    ? DEFAULT_BRUSH_SIZE
    : clampBrushSize(Number(storedValue))
}

function pointsToPath(points: Point[]) {
  if (points.length === 0) return ''
  const drawablePoints =
    points.length === 1
      ? [points[0], { x: points[0].x + 0.01, y: points[0].y }]
      : points

  return drawablePoints
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(' ')
}

function Investigation({
  onBack,
  teacherMode,
}: {
  onBack: () => void
  teacherMode: boolean
}) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const activePointers = useRef(new Map<number, Point>())
  const drawingPointer = useRef<number | null>(null)
  const viewRef = useRef<View>(INITIAL_VIEW)
  const stageSizeRef = useRef<StageSize>(INITIAL_STAGE)
  const nextStrokeId = useRef(1)

  const [view, setView] = useState<View>(INITIAL_VIEW)
  const [stageSize, setStageSize] = useState<StageSize>(INITIAL_STAGE)
  const [sourceImageSize, setSourceImageSize] =
    useState<Size>(INITIAL_SOURCE_SIZE)
  const [mode, setMode] = useState<'navigate' | 'label'>('navigate')
  const [tool, setTool] = useState<'ink' | 'eraser'>('ink')
  const [brushSize, setBrushSize] = useState(getInitialBrushSize)
  const [cursorPoint, setCursorPoint] = useState<Point | null>(null)
  const [strokes, setStrokes] = useState<Stroke[]>([])
  const [redoStack, setRedoStack] = useState<Stroke[]>([])
  const [draft, setDraft] = useState<Stroke | null>(null)
  const [labelsVisible, setLabelsVisible] = useState(true)
  const [caseResources, setCaseResources] =
    useState<LoadedCaseResources | null>(null)
  const [validation, setValidation] = useState<ValidationSummary | null>(null)
  const [resourceError, setResourceError] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null)
  const [referenceRevealUnlocked, setReferenceRevealUnlocked] = useState(false)
  const [studentReferenceRevealed, setStudentReferenceRevealed] =
    useState(false)
  const [studentReferenceVisible, setStudentReferenceVisible] = useState(false)
  const [studentReferenceOpacity, setStudentReferenceOpacity] = useState(55)
  const [sideBySideComparison, setSideBySideComparison] = useState(false)
  const [showSource, setShowSource] = useState(true)
  const [showStudentInspection, setShowStudentInspection] = useState(true)
  const [showReference, setShowReference] = useState(true)
  const [referenceOpacity, setReferenceOpacity] = useState(55)

  const calculateStageSize = useCallback((): StageSize => {
    const viewer = viewerRef.current
    const image = imageRef.current
    if (!viewer) return stageSizeRef.current

    const { width: viewerWidth, height: viewerHeight } =
      viewer.getBoundingClientRect()
    if (!viewerWidth || !viewerHeight) return stageSizeRef.current

    const imageRatio =
      image?.naturalWidth && image?.naturalHeight
        ? image.naturalWidth / image.naturalHeight
        : FALLBACK_SOURCE_WIDTH / FALLBACK_SOURCE_HEIGHT
    const viewerRatio = viewerWidth / viewerHeight

    return viewerRatio > imageRatio
      ? { width: viewerHeight * imageRatio, height: viewerHeight }
      : { width: viewerWidth, height: viewerWidth / imageRatio }
  }, [])

  const clampView = useCallback(
    (nextView: View, size = stageSizeRef.current): View => {
      const viewer = viewerRef.current
      if (!viewer) return nextView

      const { width: viewerWidth, height: viewerHeight } =
        viewer.getBoundingClientRect()
      if (!viewerWidth || !viewerHeight) return nextView

      const maxX = Math.max(
        0,
        (size.width * nextView.scale - viewerWidth) / 2,
      )
      const maxY = Math.max(
        0,
        (size.height * nextView.scale - viewerHeight) / 2,
      )

      return {
        scale: nextView.scale,
        x: Math.min(maxX, Math.max(-maxX, nextView.x)),
        y: Math.min(maxY, Math.max(-maxY, nextView.y)),
      }
    },
    [],
  )

  const updateView = useCallback(
    (nextView: View) => {
      const clamped = clampView(nextView)
      viewRef.current = clamped
      setView(clamped)
    },
    [clampView],
  )

  const updateStageGeometry = useCallback(() => {
    const size = calculateStageSize()
    stageSizeRef.current = size
    setStageSize(size)
    const clamped = clampView(viewRef.current, size)
    viewRef.current = clamped
    setView(clamped)
  }, [calculateStageSize, clampView])

  useEffect(() => {
    const viewer = viewerRef.current
    if (!viewer) return

    updateStageGeometry()
    window.addEventListener('resize', updateStageGeometry)
    if (typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateStageGeometry)
    }

    const observer = new ResizeObserver(updateStageGeometry)
    observer.observe(viewer)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateStageGeometry)
    }
  }, [updateStageGeometry])

  useEffect(() => {
    updateStageGeometry()
  }, [sideBySideComparison, updateStageGeometry])

  useEffect(() => {
    window.localStorage.setItem(BRUSH_SIZE_STORAGE_KEY, String(brushSize))
  }, [brushSize])

  const ensureCaseResources = useCallback(async () => {
    if (caseResources) return caseResources
    try {
      const loaded = await loadCaseResources()
      setCaseResources(loaded)
      setValidation(loaded.validation)
      setResourceError(null)
      return loaded
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Case files could not be loaded.'
      setResourceError(message)
      throw error
    }
  }, [caseResources])

  useEffect(() => {
    if (teacherMode) void ensureCaseResources().catch(() => undefined)
  }, [ensureCaseResources, teacherMode])

  const changeZoom = useCallback(
    (amount: number) => {
      const current = viewRef.current
      const scale = Math.min(
        MAX_SCALE,
        Math.max(MIN_SCALE, current.scale + amount),
      )
      updateView({ ...current, scale })
    },
    [updateView],
  )

  const resetView = useCallback(() => {
    updateView(INITIAL_VIEW)
  }, [updateView])

  const handleNavigatePointerDown = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
  }

  const handleNavigatePointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    const previousPoint = activePointers.current.get(event.pointerId)
    if (!previousPoint) return

    const previousPoints = [...activePointers.current.values()]
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    const currentPoints = [...activePointers.current.values()]
    const current = viewRef.current

    if (currentPoints.length === 1) {
      updateView({
        ...current,
        x: current.x + event.clientX - previousPoint.x,
        y: current.y + event.clientY - previousPoint.y,
      })
      return
    }

    if (currentPoints.length === 2 && previousPoints.length === 2) {
      const previousDistance = Math.hypot(
        previousPoints[0].x - previousPoints[1].x,
        previousPoints[0].y - previousPoints[1].y,
      )
      const currentDistance = Math.hypot(
        currentPoints[0].x - currentPoints[1].x,
        currentPoints[0].y - currentPoints[1].y,
      )
      if (previousDistance === 0) return

      const previousCenter = {
        x: (previousPoints[0].x + previousPoints[1].x) / 2,
        y: (previousPoints[0].y + previousPoints[1].y) / 2,
      }
      const currentCenter = {
        x: (currentPoints[0].x + currentPoints[1].x) / 2,
        y: (currentPoints[0].y + currentPoints[1].y) / 2,
      }
      const scale = Math.min(
        MAX_SCALE,
        Math.max(
          MIN_SCALE,
          current.scale * (currentDistance / previousDistance),
        ),
      )

      updateView({
        scale,
        x: current.x + currentCenter.x - previousCenter.x,
        y: current.y + currentCenter.y - previousCenter.y,
      })
    }
  }

  const releaseNavigatePointer = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    activePointers.current.delete(event.pointerId)
  }

  const handleWheel = (event: ReactWheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const current = viewRef.current

    if (event.ctrlKey || event.metaKey) {
      changeZoom(event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP)
      return
    }

    updateView({
      ...current,
      x: current.x - event.deltaX,
      y: current.y - event.deltaY,
    })
  }

  const getAnnotationPoint = (
    event: ReactPointerEvent<SVGSVGElement>,
  ): Point => {
    const viewer = viewerRef.current
    const size = stageSizeRef.current
    const rect = viewer?.getBoundingClientRect()
    const clientX = Number.isFinite(event.clientX) ? event.clientX : 0
    const clientY = Number.isFinite(event.clientY) ? event.clientY : 0

    return clientPointToSource(
      { x: clientX, y: clientY },
      {
        viewerRect: {
          left: rect?.left || 0,
          top: rect?.top || 0,
          width: rect?.width || size.width,
          height: rect?.height || size.height,
        },
        stageSize: size,
        sourceSize: sourceImageSize,
        view: viewRef.current,
      },
    )
  }

  const handleDrawPointerDown = (
    event: ReactPointerEvent<SVGSVGElement>,
  ) => {
    if (drawingPointer.current !== null) return
    const point = getAnnotationPoint(event)
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drawingPointer.current = event.pointerId
    setCursorPoint(point)
    setDraft({
      id: nextStrokeId.current,
      tool,
      size: brushSize,
      points: [point],
    })
  }

  const handleDrawPointerMove = (
    event: ReactPointerEvent<SVGSVGElement>,
  ) => {
    const point = getAnnotationPoint(event)
    setCursorPoint(point)
    if (drawingPointer.current !== event.pointerId) return
    setDraft((currentDraft) =>
      currentDraft
        ? { ...currentDraft, points: [...currentDraft.points, point] }
        : null,
    )
  }

  const finishDrawing = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (drawingPointer.current !== event.pointerId) return
    drawingPointer.current = null
    setDraft((currentDraft) => {
      if (currentDraft) {
        setStrokes((current) => [...current, currentDraft])
        setRedoStack([])
        nextStrokeId.current += 1
      }
      return null
    })
  }

  const undo = () => {
    setStrokes((current) => {
      const lastStroke = current[current.length - 1]
      if (!lastStroke) return current
      setRedoStack((redo) => [...redo, lastStroke])
      return current.slice(0, -1)
    })
  }

  const redo = () => {
    setRedoStack((current) => {
      const lastUndone = current[current.length - 1]
      if (!lastUndone) return current
      setStrokes((visible) => [...visible, lastUndone])
      return current.slice(0, -1)
    })
  }

  const clearLabels = () => {
    if (
      strokes.length > 0 &&
      window.confirm('Clear all labels? This cannot be undone.')
    ) {
      setStrokes([])
      setRedoStack([])
    }
  }

  const checkLabels = async () => {
    setChecking(true)
    setResourceError(null)
    try {
      const loaded = await ensureCaseResources()
      if (!loaded.validation.passed) {
        setMetrics(null)
        return
      }

      const studentMembership = rasterizeStudentStrokes(
        strokes,
        loaded.surface.width,
        loaded.surface.height,
        sourceImageSize.width,
        sourceImageSize.height,
      )
      setMetrics(
        calculateMetrics(studentMembership, loaded.referenceMembership),
      )
      if (studentMembership.some((pixel) => pixel === 1)) {
        setReferenceRevealUnlocked(true)
      }
    } catch {
      setMetrics(null)
    } finally {
      setChecking(false)
    }
  }

  const updateBrushSize = (value: number) => {
    setBrushSize(clampBrushSize(value))
  }

  const startOver = () => {
    setStrokes([])
    setRedoStack([])
    setDraft(null)
    setCursorPoint(null)
    setMetrics(null)
    setReferenceRevealUnlocked(false)
    setStudentReferenceRevealed(false)
    setStudentReferenceVisible(false)
    setStudentReferenceOpacity(55)
    setSideBySideComparison(false)
    setLabelsVisible(true)
    setMode('navigate')
    setTool('ink')
    resetView()
  }

  const renderedStrokes = draft ? [...strokes, draft] : strokes
  const stageStyle = {
    width: `${stageSize.width}px`,
    height: `${stageSize.height}px`,
    transform: `translate(-50%, -50%) translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
  }
  const renderSurfaceImage = (primary: boolean) => (
    <img
      ref={primary ? imageRef : undefined}
      className="surface-image"
      src="/surface.png"
      alt={
        primary
          ? 'Grayscale scan of a Herculaneum papyrus surface'
          : ''
      }
      aria-hidden={primary ? undefined : true}
      draggable="false"
      onLoad={
        primary
          ? (event) => {
              setSourceImageSize({
                width:
                  event.currentTarget.naturalWidth || FALLBACK_SOURCE_WIDTH,
                height:
                  event.currentTarget.naturalHeight || FALLBACK_SOURCE_HEIGHT,
              })
              updateStageGeometry()
            }
          : undefined
      }
      style={{ opacity: !teacherMode || showSource ? 1 : 0 }}
    />
  )
  const renderExpertReference = () => (
    <img
      className="expert-reference-overlay"
      data-testid="expert-reference-overlay"
      src={`/${caseResources?.metadata.referenceMask ?? 'reference-mask.png'}`}
      alt=""
      aria-hidden="true"
      draggable="false"
      style={{
        opacity: teacherMode
          ? showReference
            ? referenceOpacity / 100
            : 0
          : studentReferenceVisible
            ? studentReferenceOpacity / 100
            : 0,
      }}
    />
  )
  const renderStudentAnnotation = (
    maskId: string,
    forceLabelsVisible = false,
  ) => (
    <svg
      className="annotation-layer"
      data-testid="annotation-layer"
      viewBox={`0 0 ${sourceImageSize.width} ${sourceImageSize.height}`}
      preserveAspectRatio="none"
      aria-label="Student annotation layer"
      onPointerDown={mode === 'label' ? handleDrawPointerDown : undefined}
      onPointerMove={mode === 'label' ? handleDrawPointerMove : undefined}
      onPointerUp={mode === 'label' ? finishDrawing : undefined}
      onPointerCancel={mode === 'label' ? finishDrawing : undefined}
      onPointerLeave={() => {
        if (drawingPointer.current === null) setCursorPoint(null)
      }}
    >
      <defs>
        <mask id={maskId}>
          <rect
            width={sourceImageSize.width}
            height={sourceImageSize.height}
            fill="black"
          />
          {renderedStrokes.map((stroke) => (
            <path
              key={stroke.id}
              data-testid="annotation-stroke"
              data-tool={stroke.tool}
              d={pointsToPath(stroke.points)}
              fill="none"
              stroke={stroke.tool === 'ink' ? 'white' : 'black'}
              strokeWidth={stroke.size}
              data-source-size={stroke.size}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </mask>
      </defs>
      <rect
        className="label-color"
        width={sourceImageSize.width}
        height={sourceImageSize.height}
        mask={`url(#${maskId})`}
        opacity={
          (forceLabelsVisible || labelsVisible) &&
          (!teacherMode || showStudentInspection)
            ? 1
            : 0
        }
      />
      {mode === 'label' && cursorPoint && (
        <circle
          className={`brush-cursor brush-cursor--${tool}`}
          data-testid="brush-cursor"
          data-source-size={brushSize}
          cx={cursorPoint.x}
          cy={cursorPoint.y}
          r={brushSize / 2}
        />
      )}
    </svg>
  )

  return (
    <main className="investigation-shell">
      <header className="investigation-header">
        <div>
          <p className="eyebrow">Investigation 01</p>
          <h1 className="investigation-title">Inspect the papyrus</h1>
        </div>
        <button className="control-button control-button--back" onClick={onBack}>
          Back
        </button>
      </header>

      <div className="instruction-block">
        <p className="investigation-instruction">
          Examine the surface carefully. What patterns might indicate ink?
        </p>
        <p className="judgment-note">
          Unpainted areas are not yet judged—they do not mean “definitely
          non-ink.”
        </p>
      </div>

      {teacherMode && (
        <aside className="teacher-panel" aria-label="Teacher alignment inspection">
          <div className="teacher-panel__heading">
            <div>
              <p className="eyebrow">Teacher inspection</p>
              <h2>Alignment layers</h2>
            </div>
            <span className="teacher-badge">Teacher only</span>
          </div>
          <div className="teacher-controls">
            <label>
              <input
                type="checkbox"
                checked={showSource}
                onChange={(event) => setShowSource(event.target.checked)}
              />
              Source image
            </label>
            <label>
              <input
                type="checkbox"
                checked={showStudentInspection}
                onChange={(event) =>
                  setShowStudentInspection(event.target.checked)
                }
              />
              Student annotation
            </label>
            <label>
              <input
                type="checkbox"
                checked={showReference}
                onChange={(event) => setShowReference(event.target.checked)}
              />
              Expert reference annotation
            </label>
            <label className="reference-opacity">
              Expert opacity: {referenceOpacity}%
              <input
                type="range"
                min="0"
                max="100"
                value={referenceOpacity}
                onChange={(event) =>
                  setReferenceOpacity(Number(event.target.value))
                }
              />
            </label>
          </div>
          <ValidationSummaryPanel
            validation={validation}
            error={resourceError}
          />
        </aside>
      )}

      <div className="annotation-toolbar" aria-label="Annotation tools">
        <div className="mode-toggle" aria-label="Interaction mode">
          <button
            className="tool-button"
            aria-pressed={mode === 'navigate'}
            onClick={() => setMode('navigate')}
          >
            Navigate mode
          </button>
          <button
            className="tool-button"
            aria-pressed={mode === 'label'}
            onClick={() => setMode('label')}
          >
            Label mode
          </button>
        </div>

        <div className="tool-group">
          <button
            className="tool-button"
            aria-pressed={tool === 'ink'}
            disabled={mode !== 'label'}
            onClick={() => setTool('ink')}
          >
            Likely Ink brush
          </button>
          <button
            className="tool-button"
            aria-pressed={tool === 'eraser'}
            disabled={mode !== 'label'}
            onClick={() => setTool('eraser')}
          >
            Eraser
          </button>
        </div>

        <label className="brush-control">
          <span>Brush size: {brushSize} px</span>
          <input
            type="range"
            min={MIN_BRUSH_SIZE}
            max={MAX_BRUSH_SIZE}
            step="1"
            value={brushSize}
            disabled={mode !== 'label'}
            onChange={(event) => updateBrushSize(Number(event.target.value))}
          />
        </label>

        <div className="tool-group">
          <button
            className="tool-button"
            disabled={strokes.length === 0}
            onClick={undo}
          >
            Undo
          </button>
          <button
            className="tool-button"
            disabled={redoStack.length === 0}
            onClick={redo}
          >
            Redo
          </button>
          <button
            className="tool-button tool-button--danger"
            disabled={strokes.length === 0}
            onClick={clearLabels}
          >
            Clear Labels
          </button>
          <button
            className="tool-button"
            aria-pressed={labelsVisible}
            onClick={() => setLabelsVisible((visible) => !visible)}
          >
            {labelsVisible ? 'Hide My Labels' : 'Show My Labels'}
          </button>
          {studentReferenceRevealed && !teacherMode && (
            <>
              <button
                className="tool-button tool-button--reference"
                aria-pressed={studentReferenceVisible}
                onClick={() =>
                  setStudentReferenceVisible((visible) => !visible)
                }
              >
                {studentReferenceVisible
                  ? 'Hide Expert Reference'
                  : 'Show Expert Reference'}
              </button>
              <label className="reference-opacity student-reference-opacity">
                <span>
                  Expert Reference Opacity: {studentReferenceOpacity}%
                </span>
                <input
                  aria-label="Expert Reference Opacity"
                  type="range"
                  min="0"
                  max="100"
                  step="1"
                  value={studentReferenceOpacity}
                  onChange={(event) =>
                    setStudentReferenceOpacity(Number(event.target.value))
                  }
                />
              </label>
              <button
                className="tool-button tool-button--comparison"
                aria-pressed={studentReferenceVisible && labelsVisible}
                onClick={() => {
                  setStudentReferenceVisible(true)
                  setLabelsVisible(true)
                }}
              >
                Overlay Comparison
              </button>
              {!sideBySideComparison && (
                <button
                  className="tool-button tool-button--comparison"
                  onClick={() => {
                    setStudentReferenceVisible(true)
                    setLabelsVisible(true)
                    setSideBySideComparison(true)
                    resetView()
                  }}
                >
                  Side-by-Side Comparison
                </button>
              )}
              {sideBySideComparison && (
                <button
                  className="tool-button tool-button--comparison"
                  onClick={() => {
                    setSideBySideComparison(false)
                    setStudentReferenceVisible(true)
                    setLabelsVisible(true)
                  }}
                >
                  Return to Overlay Comparison
                </button>
              )}
            </>
          )}
          <button
            className="tool-button tool-button--check"
            disabled={checking}
            onClick={checkLabels}
          >
            {checking ? 'Checking…' : 'Check My Labels'}
          </button>
          {!teacherMode && (
            <button
              className="tool-button tool-button--reveal"
              disabled={
                !referenceRevealUnlocked || studentReferenceRevealed
              }
              onClick={() => {
                setStudentReferenceRevealed(true)
                setStudentReferenceVisible(true)
              }}
            >
              Reveal Expert Reference
            </button>
          )}
          {!teacherMode && (
            <button
              className="tool-button"
              disabled={
                strokes.length === 0 &&
                !metrics &&
                !studentReferenceRevealed
              }
              onClick={startOver}
            >
              Start Over
            </button>
          )}
        </div>
      </div>

      {!sideBySideComparison ? (
      <section
        ref={viewerRef}
        className={`surface-viewer surface-viewer--${mode}`}
        aria-label="Zoomable papyrus surface"
        onPointerDown={
          mode === 'navigate' ? handleNavigatePointerDown : undefined
        }
        onPointerMove={
          mode === 'navigate' ? handleNavigatePointerMove : undefined
        }
        onPointerUp={
          mode === 'navigate' ? releaseNavigatePointer : undefined
        }
        onPointerCancel={
          mode === 'navigate' ? releaseNavigatePointer : undefined
        }
        onWheel={mode === 'navigate' ? handleWheel : undefined}
      >
        <div
          className="surface-stage"
          data-testid="surface-stage"
          style={{
            width: `${stageSize.width}px`,
            height: `${stageSize.height}px`,
            transform: `translate(-50%, -50%) translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
          }}
        >
          <img
            ref={imageRef}
            className="surface-image"
            src="/surface.png"
            alt="Grayscale scan of a Herculaneum papyrus surface"
            draggable="false"
            onLoad={(event) => {
              setSourceImageSize({
                width:
                  event.currentTarget.naturalWidth || FALLBACK_SOURCE_WIDTH,
                height:
                  event.currentTarget.naturalHeight || FALLBACK_SOURCE_HEIGHT,
              })
              updateStageGeometry()
            }}
            style={{ opacity: !teacherMode || showSource ? 1 : 0 }}
          />
          {(teacherMode || studentReferenceRevealed) && (
            <img
              className="expert-reference-overlay"
              data-testid="expert-reference-overlay"
              src={`/${caseResources?.metadata.referenceMask ?? 'reference-mask.png'}`}
              alt=""
              aria-hidden="true"
              draggable="false"
              style={{
                opacity: teacherMode
                  ? showReference
                    ? referenceOpacity / 100
                  : 0
                  : studentReferenceVisible
                    ? studentReferenceOpacity / 100
                    : 0,
              }}
            />
          )}
          <svg
            className="annotation-layer"
            data-testid="annotation-layer"
            viewBox={`0 0 ${sourceImageSize.width} ${sourceImageSize.height}`}
            preserveAspectRatio="none"
            aria-label="Student annotation layer"
            onPointerDown={
              mode === 'label' ? handleDrawPointerDown : undefined
            }
            onPointerMove={
              mode === 'label' ? handleDrawPointerMove : undefined
            }
            onPointerUp={mode === 'label' ? finishDrawing : undefined}
            onPointerCancel={mode === 'label' ? finishDrawing : undefined}
            onPointerLeave={() => {
              if (drawingPointer.current === null) setCursorPoint(null)
            }}
          >
            <defs>
              <mask id="student-label-mask">
                <rect
                  width={sourceImageSize.width}
                  height={sourceImageSize.height}
                  fill="black"
                />
                {renderedStrokes.map((stroke) => (
                  <path
                    key={stroke.id}
                    data-testid="annotation-stroke"
                    data-tool={stroke.tool}
                    d={pointsToPath(stroke.points)}
                    fill="none"
                    stroke={stroke.tool === 'ink' ? 'white' : 'black'}
                    strokeWidth={stroke.size}
                    data-source-size={stroke.size}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </mask>
            </defs>
            <rect
              className="label-color"
              width={sourceImageSize.width}
              height={sourceImageSize.height}
              mask="url(#student-label-mask)"
              opacity={
                labelsVisible && (!teacherMode || showStudentInspection) ? 1 : 0
              }
            />
            {mode === 'label' && cursorPoint && (
              <circle
                className={`brush-cursor brush-cursor--${tool}`}
                data-testid="brush-cursor"
                data-source-size={brushSize}
                cx={cursorPoint.x}
                cy={cursorPoint.y}
                r={brushSize / 2}
              />
            )}
          </svg>
        </div>
        <span className="mode-readout">
          {mode === 'navigate' ? 'Navigate' : `Label • ${tool === 'ink' ? 'Likely Ink' : 'Eraser'}`}
        </span>
        <span className="zoom-readout" aria-live="polite">
          {Math.round(view.scale * 100)}%
        </span>
      </section>
      ) : (
        <div
          className="side-by-side-comparison"
          data-testid="side-by-side-comparison"
        >
          <section className="comparison-panel" aria-labelledby="my-labels-title">
            <h2 id="my-labels-title">My Labels</h2>
            <div
              ref={viewerRef}
              role="region"
              className={`surface-viewer comparison-viewer surface-viewer--${mode}`}
              aria-label="My Labels comparison panel"
              onPointerDown={
                mode === 'navigate' ? handleNavigatePointerDown : undefined
              }
              onPointerMove={
                mode === 'navigate' ? handleNavigatePointerMove : undefined
              }
              onPointerUp={
                mode === 'navigate' ? releaseNavigatePointer : undefined
              }
              onPointerCancel={
                mode === 'navigate' ? releaseNavigatePointer : undefined
              }
              onWheel={mode === 'navigate' ? handleWheel : undefined}
            >
              <div
                className="surface-stage"
                data-testid="student-comparison-stage"
                style={stageStyle}
              >
                {renderSurfaceImage(true)}
                {renderStudentAnnotation(
                  'student-label-mask-side-by-side',
                  true,
                )}
              </div>
            </div>
          </section>
          <section
            className="comparison-panel"
            aria-labelledby="expert-reference-title"
          >
            <h2 id="expert-reference-title">Expert Reference</h2>
            <div
              role="region"
              className="surface-viewer comparison-viewer surface-viewer--navigate"
              aria-label="Expert Reference comparison panel"
              onPointerDown={handleNavigatePointerDown}
              onPointerMove={handleNavigatePointerMove}
              onPointerUp={releaseNavigatePointer}
              onPointerCancel={releaseNavigatePointer}
              onWheel={handleWheel}
            >
              <div
                className="surface-stage"
                data-testid="expert-comparison-stage"
                style={stageStyle}
              >
                {renderSurfaceImage(false)}
                {renderExpertReference()}
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="viewer-controls" aria-label="Papyrus viewer controls">
        <button
          className="control-button"
          onClick={() => changeZoom(ZOOM_STEP)}
          disabled={view.scale >= MAX_SCALE}
        >
          Zoom In
        </button>
        <button
          className="control-button"
          onClick={() => changeZoom(-ZOOM_STEP)}
          disabled={view.scale <= MIN_SCALE}
        >
          Zoom Out
        </button>
        <button className="control-button" onClick={resetView}>
          Reset View
        </button>
      </div>

      {studentReferenceRevealed && !teacherMode && (
        <p className="student-reference-explanation">
          The expert reference annotation is a comparison standard based on
          expert judgment. It does not prove that every transparent region
          contains no ink.
        </p>
      )}

      {(metrics || resourceError || (validation && !validation.passed)) && (
        <section className="evaluation-panel" aria-live="polite">
          {metrics && <EvaluationResults metrics={metrics} />}
          {!metrics && (
            <ValidationSummaryPanel
              validation={validation}
              error={resourceError}
            />
          )}
        </section>
      )}
    </main>
  )
}

function ValidationSummaryPanel({
  validation,
  error,
}: {
  validation: ValidationSummary | null
  error: string | null
}) {
  if (error) {
    return (
      <div className="validation-summary validation-summary--error" role="alert">
        <strong>Case validation could not finish.</strong>
        <p>{error}</p>
      </div>
    )
  }
  if (!validation) {
    return <p className="validation-loading">Validating case files…</p>
  }

  return (
    <div
      className={`validation-summary ${
        validation.passed
          ? 'validation-summary--passed'
          : 'validation-summary--error'
      }`}
    >
      <strong>
        Validation {validation.passed ? 'passed' : 'needs attention'}
      </strong>
      <dl>
        <div>
          <dt>Surface dimensions</dt>
          <dd>
            {validation.surfaceWidth} × {validation.surfaceHeight}
          </dd>
        </div>
        <div>
          <dt>Reference dimensions</dt>
          <dd>
            {validation.referenceWidth} × {validation.referenceHeight}
          </dd>
        </div>
        <div>
          <dt>Accepted-ink pixels</dt>
          <dd>{validation.acceptedInkPixels.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Transparent pixels</dt>
          <dd>{validation.transparentPixels.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Partially transparent pixels</dt>
          <dd>{validation.partiallyTransparentPixels.toLocaleString()}</dd>
        </div>
      </dl>
      {validation.errors.map((message) => (
        <p className="validation-message" key={message}>
          {message}
        </p>
      ))}
      {validation.warnings.map((message) => (
        <p className="validation-message validation-message--warning" key={message}>
          {message}
        </p>
      ))}
    </div>
  )
}

function EvaluationResults({ metrics }: { metrics: EvaluationMetrics }) {
  const percent = (value: number) => `${Math.round(value * 100)}%`

  return (
    <>
      <div className="evaluation-heading">
        <div>
          <p className="eyebrow">Your comparison</p>
          <h2>Label evidence</h2>
        </div>
        <p>You can revise your labels and check again at any time.</p>
      </div>
      <div className="metric-grid">
        <article className="metric-card">
          <h3>Ink Recovered</h3>
          <strong>{percent(metrics.inkRecovered)}</strong>
          <p>How much of the expert-annotated ink you identified.</p>
        </article>
        <article className="metric-card">
          <h3>Label Precision</h3>
          {metrics.labelPrecision === null ? (
            <p className="metric-empty">
              Add labels before precision can be calculated.
            </p>
          ) : (
            <strong>{percent(metrics.labelPrecision)}</strong>
          )}
          <p>
            How much of your labeling overlapped the expert reference
            annotation.
          </p>
        </article>
        <article className="metric-card">
          <h3>Extra Surface Marked</h3>
          <strong>{percent(metrics.extraSurfaceMarked)}</strong>
          <p>
            How much surface outside the expert reference annotation you
            included.
          </p>
        </article>
      </div>
      <p className="comparison-note">
        The expert reference annotation is a comparison standard. It does not
        mean every transparent region is necessarily impossible ink; for this
        introductory activity, the entire crop is used for scoring.
      </p>
    </>
  )
}

function Home({ onBegin }: { onBegin: () => void }) {
  return (
    <main className="app-shell">
      <section className="hero" aria-labelledby="page-title">
        <div className="artifact" aria-hidden="true">
          <div className="artifact__fragment" />
          <span className="artifact__label">79 CE</span>
        </div>

        <div className="hero__content">
          <p className="eyebrow">Ancient text • Modern discovery</p>
          <h1 id="page-title">Herculaneum Ink Lab</h1>
          <p className="introduction">
            Investigate a papyrus buried by Mount Vesuvius. Look closely,
            gather evidence, and help uncover words hidden for centuries.
          </p>
          <button className="begin-button" type="button" onClick={onBegin}>
            Begin Investigation
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </section>
    </main>
  )
}

function App() {
  const [screen, setScreen] = useState<'home' | 'investigation'>('home')
  const teacherMode =
    new URLSearchParams(window.location.search).get('teacher') === '1'

  return screen === 'home' ? (
    <Home onBegin={() => setScreen('investigation')} />
  ) : (
    <Investigation
      onBack={() => setScreen('home')}
      teacherMode={teacherMode}
    />
  )
}

export default App
