import type { Point, Size } from './coordinates'

export type LetterRegionUncertainty =
  | 'certain'
  | 'insecure'
  | 'damaged'
  | 'unreadable'

export type LetterRegion = {
  id: string
  x: number
  y: number
  width: number
  height: number
  label?: string
  lineNumber?: number
  uncertainty?: LetterRegionUncertainty
  note?: string
  manualOrder?: number
}

export type LetterRegionResizeHandle = 'nw' | 'ne' | 'sw' | 'se'

export const MIN_LETTER_REGION_SIZE = 4

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

export function normalizeLetterRegion(
  id: string,
  start: Point,
  end: Point,
  sourceSize: Size,
  minimumSize = MIN_LETTER_REGION_SIZE,
): LetterRegion | null {
  const startX = clamp(start.x, 0, sourceSize.width)
  const startY = clamp(start.y, 0, sourceSize.height)
  const endX = clamp(end.x, 0, sourceSize.width)
  const endY = clamp(end.y, 0, sourceSize.height)
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  if (width < minimumSize || height < minimumSize) return null

  return { id, x, y, width, height }
}

export function moveLetterRegion(
  region: LetterRegion,
  delta: Point,
  sourceSize: Size,
): LetterRegion {
  return {
    ...region,
    x: clamp(region.x + delta.x, 0, sourceSize.width - region.width),
    y: clamp(region.y + delta.y, 0, sourceSize.height - region.height),
  }
}

export function resizeLetterRegion(
  region: LetterRegion,
  handle: LetterRegionResizeHandle,
  pointer: Point,
  sourceSize: Size,
  minimumSize = MIN_LETTER_REGION_SIZE,
): LetterRegion {
  const left = region.x
  const top = region.y
  const right = region.x + region.width
  const bottom = region.y + region.height
  const pointerX = clamp(pointer.x, 0, sourceSize.width)
  const pointerY = clamp(pointer.y, 0, sourceSize.height)

  const nextLeft = handle.includes('w')
    ? Math.min(pointerX, right - minimumSize)
    : left
  const nextRight = handle.includes('e')
    ? Math.max(pointerX, left + minimumSize)
    : right
  const nextTop = handle.includes('n')
    ? Math.min(pointerY, bottom - minimumSize)
    : top
  const nextBottom = handle.includes('s')
    ? Math.max(pointerY, top + minimumSize)
    : bottom

  return {
    ...region,
    x: clamp(nextLeft, 0, sourceSize.width - minimumSize),
    y: clamp(nextTop, 0, sourceSize.height - minimumSize),
    width: clamp(
      nextRight - nextLeft,
      minimumSize,
      sourceSize.width - clamp(nextLeft, 0, sourceSize.width),
    ),
    height: clamp(
      nextBottom - nextTop,
      minimumSize,
      sourceSize.height - clamp(nextTop, 0, sourceSize.height),
    ),
  }
}
