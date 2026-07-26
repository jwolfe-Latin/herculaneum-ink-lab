import { describe, expect, it } from 'vitest'
import {
  INITIAL_VIEW,
  MAX_SCALE,
  MIN_SCALE,
  clampViewToBounds,
  panView,
  zoomView,
} from './viewerState'

describe('viewer state architecture', () => {
  it('keeps zoom within the documented viewer limits', () => {
    expect(zoomView(INITIAL_VIEW, -20).scale).toBe(MIN_SCALE)
    expect(zoomView(INITIAL_VIEW, 20).scale).toBe(MAX_SCALE)
  })

  it('represents pan independently from source-image coordinates', () => {
    expect(panView({ scale: 2, x: 10, y: -5 }, 4, 7)).toEqual({
      scale: 2,
      x: 14,
      y: 2,
    })
  })

  it('clamps pan against the rendered stage and viewport bounds', () => {
    expect(
      clampViewToBounds(
        { scale: 2, x: 999, y: -999 },
        { width: 500, height: 300 },
        { width: 400, height: 200 },
      ),
    ).toEqual({ scale: 2, x: 300, y: -200 })
  })
})
