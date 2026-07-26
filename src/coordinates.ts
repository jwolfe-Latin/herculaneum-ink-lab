export type Point = {
  x: number
  y: number
}

export type Size = {
  width: number
  height: number
}

export type Rect = Size & {
  left: number
  top: number
}

export type ViewTransform = {
  scale: number
  x: number
  y: number
}

type CoordinateTransform = {
  viewerRect: Rect
  stageSize: Size
  sourceSize: Size
  view: ViewTransform
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value))

/**
 * Converts a browser pointer position to the one canonical coordinate system:
 * pixels in the source papyrus image.
 */
export function clientPointToSource(
  clientPoint: Point,
  { viewerRect, stageSize, sourceSize, view }: CoordinateTransform,
): Point {
  const stageX =
    (clientPoint.x -
      (viewerRect.left + viewerRect.width / 2 + view.x)) /
      view.scale +
    stageSize.width / 2
  const stageY =
    (clientPoint.y -
      (viewerRect.top + viewerRect.height / 2 + view.y)) /
      view.scale +
    stageSize.height / 2

  return {
    x: clamp(
      (stageX / stageSize.width) * sourceSize.width,
      0,
      sourceSize.width,
    ),
    y: clamp(
      (stageY / stageSize.height) * sourceSize.height,
      0,
      sourceSize.height,
    ),
  }
}

/**
 * The inverse is useful for exact hit-testing and regression tests.
 */
export function sourcePointToClient(
  sourcePoint: Point,
  { viewerRect, stageSize, sourceSize, view }: CoordinateTransform,
): Point {
  const stageX = (sourcePoint.x / sourceSize.width) * stageSize.width
  const stageY = (sourcePoint.y / sourceSize.height) * stageSize.height

  return {
    x:
      viewerRect.left +
      viewerRect.width / 2 +
      view.x +
      (stageX - stageSize.width / 2) * view.scale,
    y:
      viewerRect.top +
      viewerRect.height / 2 +
      view.y +
      (stageY - stageSize.height / 2) * view.scale,
  }
}
