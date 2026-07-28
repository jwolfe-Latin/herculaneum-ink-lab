import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from 'react'
import { clientPointToSource, type Point, type Size } from './coordinates'
import {
  MIN_LETTER_REGION_SIZE,
  moveLetterRegion,
  normalizeLetterRegion,
  resizeLetterRegion,
  type LetterRegion,
  type LetterRegionResizeHandle,
} from './letterRegions'
import {
  INITIAL_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  ZOOM_STEP,
  clampViewToBounds,
  panView,
  zoomView,
  type ViewState,
} from './viewerState'

type LetterRegionSelectorProps = {
  sourceImageUrl: string
  sourceImageAlt: string
  sourceSize: Size
  initialRegions?: LetterRegion[]
  onRegionsChange?: (regions: LetterRegion[]) => void
}

type RegionInteraction =
  | {
      kind: 'create'
      pointerId: number
      start: Point
      current: Point
      id: string
    }
  | {
      kind: 'move'
      pointerId: number
      start: Point
      original: LetterRegion
      current: LetterRegion
    }
  | {
      kind: 'resize'
      pointerId: number
      original: LetterRegion
      current: LetterRegion
      handle: LetterRegionResizeHandle
    }

const HANDLES: LetterRegionResizeHandle[] = ['nw', 'ne', 'sw', 'se']

function sameRegion(a: LetterRegion, b: LetterRegion) {
  return (
    a.x === b.x &&
    a.y === b.y &&
    a.width === b.width &&
    a.height === b.height
  )
}

export function LetterRegionSelector({
  sourceImageUrl,
  sourceImageAlt,
  sourceSize,
  initialRegions = [],
  onRegionsChange,
}: LetterRegionSelectorProps) {
  const viewerRef = useRef<HTMLDivElement>(null)
  const activePointers = useRef(new Map<number, Point>())
  const viewRef = useRef<ViewState>(INITIAL_VIEW)
  const stageSizeRef = useRef<Size>(sourceSize)
  const nextRegionId = useRef(initialRegions.length + 1)

  const [mode, setMode] = useState<'navigate' | 'select'>('navigate')
  const [view, setView] = useState(INITIAL_VIEW)
  const [stageSize, setStageSize] = useState(sourceSize)
  const [regions, setRegions] = useState<LetterRegion[]>(initialRegions)
  const [past, setPast] = useState<LetterRegion[][]>([])
  const [future, setFuture] = useState<LetterRegion[][]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [interaction, setInteraction] = useState<RegionInteraction | null>(
    null,
  )
  const [selectionsVisible, setSelectionsVisible] = useState(true)

  const publishRegions = useCallback(
    (next: LetterRegion[]) => {
      setRegions(next)
      onRegionsChange?.(next)
    },
    [onRegionsChange],
  )

  const commit = useCallback(
    (next: LetterRegion[]) => {
      setPast((current) => [...current, regions])
      publishRegions(next)
      setFuture([])
    },
    [publishRegions, regions],
  )

  const calculateStageSize = useCallback((): Size => {
    const rect = viewerRef.current?.getBoundingClientRect()
    if (!rect?.width || !rect.height) return stageSizeRef.current
    const sourceRatio = sourceSize.width / sourceSize.height
    const viewerRatio = rect.width / rect.height
    return viewerRatio > sourceRatio
      ? { width: rect.height * sourceRatio, height: rect.height }
      : { width: rect.width, height: rect.width / sourceRatio }
  }, [sourceSize])

  const clampView = useCallback(
    (next: ViewState, size = stageSizeRef.current) => {
      const rect = viewerRef.current?.getBoundingClientRect()
      if (!rect?.width || !rect.height) return next
      return clampViewToBounds(next, size, {
        width: rect.width,
        height: rect.height,
      })
    },
    [],
  )

  const updateView = useCallback(
    (next: ViewState) => {
      const clamped = clampView(next)
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
    updateStageGeometry()
    const viewer = viewerRef.current
    window.addEventListener('resize', updateStageGeometry)
    if (!viewer || typeof ResizeObserver === 'undefined') {
      return () => window.removeEventListener('resize', updateStageGeometry)
    }
    const observer = new ResizeObserver(updateStageGeometry)
    observer.observe(viewer)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', updateStageGeometry)
    }
  }, [updateStageGeometry])

  const getSourcePoint = useCallback(
    (event: ReactPointerEvent<SVGSVGElement>): Point => {
      const size = stageSizeRef.current
      const rect = viewerRef.current?.getBoundingClientRect()
      return clientPointToSource(
        { x: event.clientX, y: event.clientY },
        {
          viewerRect: {
            left: rect?.left || 0,
            top: rect?.top || 0,
            width: rect?.width || size.width,
            height: rect?.height || size.height,
          },
          stageSize: size,
          sourceSize,
          view: viewRef.current,
        },
      )
    },
    [sourceSize],
  )

  const displayedRegions = useMemo(() => {
    if (!interaction || interaction.kind === 'create') return regions
    return regions.map((region) =>
      region.id === interaction.original.id ? interaction.current : region,
    )
  }, [interaction, regions])

  const draftRegion =
    interaction?.kind === 'create'
      ? normalizeLetterRegion(
          interaction.id,
          interaction.start,
          interaction.current,
          sourceSize,
          0,
        )
      : null

  const beginCreate = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (mode !== 'select' || interaction) return
    const point = getSourcePoint(event)
    const id = `letter-region-${nextRegionId.current}`
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setSelectedId(null)
    setInteraction({
      kind: 'create',
      pointerId: event.pointerId,
      start: point,
      current: point,
      id,
    })
  }

  const beginMove = (
    event: ReactPointerEvent<SVGRectElement>,
    region: LetterRegion,
  ) => {
    event.stopPropagation()
    setSelectedId(region.id)
    if (mode !== 'select' || interaction) return
    const point = getSourcePoint(
      event as unknown as ReactPointerEvent<SVGSVGElement>,
    )
    const layer = event.currentTarget.ownerSVGElement
    layer?.setPointerCapture?.(event.pointerId)
    setInteraction({
      kind: 'move',
      pointerId: event.pointerId,
      start: point,
      original: region,
      current: region,
    })
  }

  const beginResize = (
    event: ReactPointerEvent<SVGCircleElement>,
    region: LetterRegion,
    handle: LetterRegionResizeHandle,
  ) => {
    event.stopPropagation()
    if (mode !== 'select' || interaction) return
    const point = getSourcePoint(
      event as unknown as ReactPointerEvent<SVGSVGElement>,
    )
    const layer = event.currentTarget.ownerSVGElement
    layer?.setPointerCapture?.(event.pointerId)
    setSelectedId(region.id)
    setInteraction({
      kind: 'resize',
      pointerId: event.pointerId,
      original: region,
      current: resizeLetterRegion(region, handle, point, sourceSize),
      handle,
    })
  }

  const updateSelection = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const point = getSourcePoint(event)
    if (interaction.kind === 'create') {
      setInteraction({ ...interaction, current: point })
    } else if (interaction.kind === 'move') {
      setInteraction({
        ...interaction,
        current: moveLetterRegion(
          interaction.original,
          {
            x: point.x - interaction.start.x,
            y: point.y - interaction.start.y,
          },
          sourceSize,
        ),
      })
    } else {
      setInteraction({
        ...interaction,
        current: resizeLetterRegion(
          interaction.original,
          interaction.handle,
          point,
          sourceSize,
        ),
      })
    }
  }

  const finishSelection = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!interaction || interaction.pointerId !== event.pointerId) return
    const finalPoint = getSourcePoint(event)
    if (interaction.kind === 'create') {
      const created = normalizeLetterRegion(
        interaction.id,
        interaction.start,
        finalPoint,
        sourceSize,
      )
      if (created) {
        nextRegionId.current += 1
        commit([...regions, created])
        setSelectedId(created.id)
      }
    } else {
      const finalRegion =
        interaction.kind === 'move'
          ? moveLetterRegion(
              interaction.original,
              {
                x: finalPoint.x - interaction.start.x,
                y: finalPoint.y - interaction.start.y,
              },
              sourceSize,
            )
          : resizeLetterRegion(
              interaction.original,
              interaction.handle,
              finalPoint,
              sourceSize,
            )
      if (!sameRegion(interaction.original, finalRegion)) {
      commit(
        regions.map((region) =>
          region.id === interaction.original.id
              ? finalRegion
            : region,
        ),
      )
      }
    }
    setInteraction(null)
  }

  const undo = () => {
    const previous = past[past.length - 1]
    if (!previous) return
    setFuture((current) => [regions, ...current])
    setPast((current) => current.slice(0, -1))
    publishRegions(previous)
    setSelectedId(null)
  }

  const redo = () => {
    const next = future[0]
    if (!next) return
    setPast((current) => [...current, regions])
    setFuture((current) => current.slice(1))
    publishRegions(next)
    setSelectedId(null)
  }

  const deleteSelected = useCallback(() => {
    if (!selectedId) return
    commit(regions.filter((region) => region.id !== selectedId))
    setSelectedId(null)
  }, [commit, regions, selectedId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        selectedId
      ) {
        event.preventDefault()
        deleteSelected()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelected, selectedId])

  const clearSelections = () => {
    if (
      regions.length > 0 &&
      window.confirm('Clear all letter selections? This cannot be undone.')
    ) {
      commit([])
      setSelectedId(null)
    }
  }

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
    const previous = activePointers.current.get(event.pointerId)
    if (!previous) return
    const previousPoints = [...activePointers.current.values()]
    activePointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    const currentPoints = [...activePointers.current.values()]
    if (currentPoints.length === 1) {
      updateView(
        panView(
          viewRef.current,
          event.clientX - previous.x,
          event.clientY - previous.y,
        ),
      )
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
      const current = viewRef.current
      updateView({
        ...current,
        scale: Math.min(
          MAX_SCALE,
          Math.max(
            MIN_SCALE,
            current.scale * (currentDistance / previousDistance),
          ),
        ),
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
    if (event.ctrlKey || event.metaKey) {
      updateView(
        zoomView(
          viewRef.current,
          event.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP,
        ),
      )
    } else {
      updateView(
        panView(viewRef.current, -event.deltaX, -event.deltaY),
      )
    }
  }

  const handlePosition = (
    region: LetterRegion,
    handle: LetterRegionResizeHandle,
  ) => ({
    x: handle.includes('w') ? region.x : region.x + region.width,
    y: handle.includes('n') ? region.y : region.y + region.height,
  })

  const stageStyle = {
    width: `${stageSize.width}px`,
    height: `${stageSize.height}px`,
    transform: `translate(-50%, -50%) translate3d(${view.x}px, ${view.y}px, 0) scale(${view.scale})`,
  }
  const handleRadius =
    (16 * sourceSize.width) /
    Math.max(1, stageSize.width * view.scale)

  return (
    <section
      className="letter-region-selector"
      aria-labelledby="letter-region-selector-title"
    >
      <header className="letter-region-selector__header">
        <div>
          <p className="eyebrow">Reusable source-image tool</p>
          <h2 id="letter-region-selector-title">Letter-region selector</h2>
          <p>
            Select rectangular letter regions in source-image pixels. Regions
            exist only in current browser memory.
          </p>
        </div>
        <p className="letter-region-count" aria-live="polite">
          {regions.length} {regions.length === 1 ? 'region' : 'regions'}
        </p>
      </header>

      <div
        className="letter-region-toolbar"
        aria-label="Letter-region controls"
      >
        <button
          type="button"
          aria-pressed={mode === 'navigate'}
          onClick={() => {
            setInteraction(null)
            setMode('navigate')
          }}
        >
          Navigate mode
        </button>
        <button
          type="button"
          aria-pressed={mode === 'select'}
          onClick={() => {
            activePointers.current.clear()
            setMode('select')
          }}
        >
          Select Letter mode
        </button>
        <button
          type="button"
          disabled={!selectedId}
          onClick={deleteSelected}
        >
          Delete Selected
        </button>
        <button type="button" disabled={past.length === 0} onClick={undo}>
          Undo
        </button>
        <button type="button" disabled={future.length === 0} onClick={redo}>
          Redo
        </button>
        <button
          type="button"
          disabled={regions.length === 0}
          onClick={clearSelections}
        >
          Clear Selections
        </button>
        <button
          type="button"
          onClick={() => setSelectionsVisible((current) => !current)}
        >
          {selectionsVisible ? 'Hide Selections' : 'Show Selections'}
        </button>
      </div>

      <div
        ref={viewerRef}
        className={`letter-region-viewer letter-region-viewer--${mode}`}
        role="region"
        aria-label="Letter-region source image"
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
          className="letter-region-stage"
          data-testid="letter-region-stage"
          style={stageStyle}
        >
          <img
            src={sourceImageUrl}
            alt={sourceImageAlt}
            draggable="false"
          />
          <svg
            className="letter-region-layer"
            data-testid="letter-region-layer"
            viewBox={`0 0 ${sourceSize.width} ${sourceSize.height}`}
            preserveAspectRatio="none"
            aria-label="Letter selections"
            onPointerDown={beginCreate}
            onPointerMove={updateSelection}
            onPointerUp={finishSelection}
            onPointerCancel={() => setInteraction(null)}
          >
            {selectionsVisible &&
              displayedRegions.map((region, index) => {
                const selected = selectedId === region.id
                return (
                  <g
                    key={region.id}
                    className={
                      selected
                        ? 'letter-region letter-region--selected'
                        : 'letter-region'
                    }
                    data-testid="letter-region"
                    data-region-id={region.id}
                  >
                    <rect
                      data-testid={`letter-region-box-${region.id}`}
                      x={region.x}
                      y={region.y}
                      width={region.width}
                      height={region.height}
                      tabIndex={0}
                      role="button"
                      aria-label={`Letter region ${index + 1}${
                        selected ? ', selected' : ''
                      }`}
                      onPointerDown={(event) =>
                        beginMove(event, region)
                      }
                      onFocus={() => setSelectedId(region.id)}
                    />
                    <text x={region.x + 3} y={region.y + 12}>
                      {region.label || index + 1}
                    </text>
                    {selected &&
                      HANDLES.map((handle) => {
                        const point = handlePosition(region, handle)
                        return (
                          <circle
                            key={handle}
                            data-testid={`resize-handle-${handle}`}
                            data-handle={handle}
                            aria-label={`Resize ${handle}`}
                            cx={point.x}
                            cy={point.y}
                            r={handleRadius}
                            onPointerDown={(event) =>
                              beginResize(event, region, handle)
                            }
                          />
                        )
                      })}
                  </g>
                )
              })}
            {selectionsVisible && draftRegion && (
              <rect
                className="letter-region-draft"
                data-testid="letter-region-draft"
                x={draftRegion.x}
                y={draftRegion.y}
                width={draftRegion.width}
                height={draftRegion.height}
              />
            )}
          </svg>
        </div>
        <span className="mode-readout">
          {mode === 'navigate' ? 'Navigate' : 'Select Letter'}
        </span>
        <span className="zoom-readout" aria-live="polite">
          {Math.round(view.scale * 100)}%
        </span>
      </div>

      <div
        className="viewer-controls letter-region-view-controls"
        aria-label="Letter-region viewer controls"
      >
        <button
          type="button"
          className="control-button"
          disabled={view.scale >= MAX_SCALE}
          onClick={() => updateView(zoomView(viewRef.current, ZOOM_STEP))}
        >
          Zoom In
        </button>
        <button
          type="button"
          className="control-button"
          disabled={view.scale <= MIN_SCALE}
          onClick={() => updateView(zoomView(viewRef.current, -ZOOM_STEP))}
        >
          Zoom Out
        </button>
        <button
          type="button"
          className="control-button"
          onClick={() => updateView(INITIAL_VIEW)}
        >
          Reset View
        </button>
      </div>

      <p className="letter-region-help">
        Minimum region size: {MIN_LETTER_REGION_SIZE} ×{' '}
        {MIN_LETTER_REGION_SIZE} source-image pixels. Select a region to move,
        resize, or delete it.
      </p>
    </section>
  )
}
