import type { Size } from './coordinates'

export const MIN_SCALE = 1
export const MAX_SCALE = 6
export const ZOOM_STEP = 0.4

export type ViewState = {
  scale: number
  x: number
  y: number
}

export const INITIAL_VIEW: ViewState = { scale: 1, x: 0, y: 0 }

/** Keeps zoomed image content reachable without changing source coordinates. */
export function clampViewToBounds(
  view: ViewState,
  stage: Size,
  viewport: Size,
): ViewState {
  const maxX = Math.max(0, (stage.width * view.scale - viewport.width) / 2)
  const maxY = Math.max(0, (stage.height * view.scale - viewport.height) / 2)

  return {
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale)),
    x: Math.min(maxX, Math.max(-maxX, view.x)),
    y: Math.min(maxY, Math.max(-maxY, view.y)),
  }
}

export function zoomView(view: ViewState, amount: number): ViewState {
  return {
    ...view,
    scale: Math.min(MAX_SCALE, Math.max(MIN_SCALE, view.scale + amount)),
  }
}

export function panView(
  view: ViewState,
  deltaX: number,
  deltaY: number,
): ViewState {
  return { ...view, x: view.x + deltaX, y: view.y + deltaY }
}
