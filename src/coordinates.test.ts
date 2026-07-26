import { describe, expect, it } from 'vitest'
import {
  clientPointToSource,
  sourcePointToClient,
  type Point,
} from './coordinates'

const sourceSize = { width: 1746, height: 1164 }
const stageSize = { width: 600, height: 400 }
const viewerRect = { left: 80, top: 160, width: 768, height: 520 }

function roundTrip(
  sourcePoint: Point,
  view = { scale: 1, x: 0, y: 0 },
) {
  const transform = { sourceSize, stageSize, viewerRect, view }
  return clientPointToSource(
    sourcePointToClient(sourcePoint, transform),
    transform,
  )
}

describe('source-image coordinate conversion', () => {
  it('maps a pointer at the top edge without skipping a vertical band', () => {
    expect(roundTrip({ x: sourceSize.width / 2, y: 0 })).toEqual({
      x: sourceSize.width / 2,
      y: 0,
    })
  })

  it('maps a pointer one source pixel below the top edge', () => {
    const result = roundTrip({ x: sourceSize.width / 2, y: 1 })

    expect(result.x).toBeCloseTo(sourceSize.width / 2)
    expect(result.y).toBeCloseTo(1)
  })

  it.each([
    ['top-left', { x: 0, y: 0 }],
    ['top-right', { x: sourceSize.width, y: 0 }],
    ['bottom-left', { x: 0, y: sourceSize.height }],
    ['bottom-right', { x: sourceSize.width, y: sourceSize.height }],
  ])('reaches the exact %s corner', (_name, corner) => {
    const result = roundTrip(corner)

    expect(result.x).toBeCloseTo(corner.x)
    expect(result.y).toBeCloseTo(corner.y)
  })

  it.each([
    ['100% zoom', { scale: 1, x: 0, y: 0 }],
    ['maximum zoom', { scale: 6, x: 0, y: 0 }],
    ['zoomed and panned', { scale: 3.4, x: -137, y: 82 }],
  ])('keeps pointer and source coordinates aligned at %s', (_name, view) => {
    const sourcePoint = { x: 1432.25, y: 0.75 }
    const result = roundTrip(sourcePoint, view)

    expect(result.x).toBeCloseTo(sourcePoint.x)
    expect(result.y).toBeCloseTo(sourcePoint.y)
  })

  it.each([
    [
      'tablet portrait',
      { left: 0, top: 280, width: 768, height: 512 },
      { width: 768, height: 512 },
    ],
    [
      'tablet landscape',
      { left: 0, top: 220, width: 1024, height: 480 },
      { width: 720, height: 480 },
    ],
  ])(
    'keeps the top edge aligned after resizing to %s',
    (_name, resizedViewer, resizedStage) => {
      const transform = {
        sourceSize,
        stageSize: resizedStage,
        viewerRect: resizedViewer,
        view: { scale: 2.2, x: 43, y: -31 },
      }
      const sourcePoint = { x: 1, y: 1 }
      const result = clientPointToSource(
        sourcePointToClient(sourcePoint, transform),
        transform,
      )

      expect(result.x).toBeCloseTo(1)
      expect(result.y).toBeCloseTo(1)
    },
  )

  it('clamps pointers outside the image to its reachable edges', () => {
    const transform = {
      sourceSize,
      stageSize,
      viewerRect,
      view: { scale: 1, x: 0, y: 0 },
    }
    const topLeft = sourcePointToClient({ x: 0, y: 0 }, transform)
    const result = clientPointToSource(
      { x: topLeft.x - 50, y: topLeft.y - 50 },
      transform,
    )

    expect(result).toEqual({ x: 0, y: 0 })
  })
})
