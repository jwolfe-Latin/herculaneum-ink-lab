export type EvaluationMetrics = {
  inkRecovered: number
  labelPrecision: number | null
  extraSurfaceMarked: number
  overlapPixels: number
  referenceInkPixels: number
  studentPaintedPixels: number
  studentNonReferencePixels: number
  nonReferencePixels: number
}

export type EvaluationStroke = {
  tool: 'ink' | 'eraser'
  size: number
  points: Array<{ x: number; y: number }>
}

export function calculateMetrics(
  studentMembership: Uint8Array,
  referenceMembership: Uint8Array,
): EvaluationMetrics {
  if (studentMembership.length !== referenceMembership.length) {
    throw new Error('Student and reference pixel arrays must have equal lengths.')
  }

  let overlapPixels = 0
  let referenceInkPixels = 0
  let studentPaintedPixels = 0
  let studentNonReferencePixels = 0

  for (let pixel = 0; pixel < referenceMembership.length; pixel += 1) {
    const referenceInk = referenceMembership[pixel] === 1
    const studentPainted = studentMembership[pixel] === 1
    if (referenceInk) referenceInkPixels += 1
    if (studentPainted) studentPaintedPixels += 1
    if (referenceInk && studentPainted) overlapPixels += 1
    if (!referenceInk && studentPainted) studentNonReferencePixels += 1
  }

  const nonReferencePixels = referenceMembership.length - referenceInkPixels

  return {
    inkRecovered:
      referenceInkPixels > 0 ? overlapPixels / referenceInkPixels : 0,
    labelPrecision:
      studentPaintedPixels > 0 ? overlapPixels / studentPaintedPixels : null,
    extraSurfaceMarked:
      nonReferencePixels > 0
        ? studentNonReferencePixels / nonReferencePixels
        : 0,
    overlapPixels,
    referenceInkPixels,
    studentPaintedPixels,
    studentNonReferencePixels,
    nonReferencePixels,
  }
}

export function rasterizeStudentStrokes(
  strokes: EvaluationStroke[],
  width: number,
  height: number,
  annotationWidth = 1000,
  annotationHeight = 432,
) {
  const pixels = new Uint8Array(width * height)
  const xScale = width / annotationWidth
  const yScale = height / annotationHeight

  const paintCircle = (
    centerX: number,
    centerY: number,
    radius: number,
    value: number,
  ) => {
    const left = Math.max(0, Math.floor(centerX - radius))
    const right = Math.min(width - 1, Math.ceil(centerX + radius))
    const top = Math.max(0, Math.floor(centerY - radius))
    const bottom = Math.min(height - 1, Math.ceil(centerY + radius))
    const radiusSquared = radius * radius

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        const dx = x + 0.5 - centerX
        const dy = y + 0.5 - centerY
        if (dx * dx + dy * dy <= radiusSquared) {
          pixels[y * width + x] = value
        }
      }
    }
  }

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue
    const radius = Math.max(0.75, stroke.size / 2)
    const value = stroke.tool === 'ink' ? 1 : 0

    if (stroke.points.length === 1) {
      paintCircle(
        stroke.points[0].x * xScale,
        stroke.points[0].y * yScale,
        radius,
        value,
      )
      continue
    }

    for (let point = 1; point < stroke.points.length; point += 1) {
      const start = stroke.points[point - 1]
      const end = stroke.points[point]
      const startX = start.x * xScale
      const startY = start.y * yScale
      const endX = end.x * xScale
      const endY = end.y * yScale
      const distance = Math.hypot(endX - startX, endY - startY)
      const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius / 2)))

      for (let step = 0; step <= steps; step += 1) {
        const progress = step / steps
        paintCircle(
          startX + (endX - startX) * progress,
          startY + (endY - startY) * progress,
          radius,
          value,
        )
      }
    }
  }

  return pixels
}
