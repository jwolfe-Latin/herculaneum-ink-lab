export type CaseMetadata = {
  caseId: string
  caseTitle: string
  studentInstructions: string
  surfaceImage: string
  referenceMask: string
  minimumInkRecovery: number
  minimumLabelPrecision: number
  sourceCredit: string
  license: string
  referenceMaskDescription: string
}

export type ImageInfo = {
  width: number
  height: number
  decoded: boolean
}

export type PixelImage = ImageInfo & {
  data: Uint8ClampedArray
  hasAlphaChannel: boolean
}

export type ValidationSummary = {
  passed: boolean
  surfaceWidth: number
  surfaceHeight: number
  referenceWidth: number
  referenceHeight: number
  acceptedInkPixels: number
  transparentPixels: number
  partiallyTransparentPixels: number
  unusualIncludedRgbPixels: number
  errors: string[]
  warnings: string[]
}

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

export type LoadedCaseResources = {
  metadata: CaseMetadata
  surface: ImageInfo
  reference: PixelImage
  referenceMembership: Uint8Array
  validation: ValidationSummary
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
let resourcePromise: Promise<LoadedCaseResources> | null = null

export function parsePngHeader(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes)
  const validSignature = PNG_SIGNATURE.every((value, index) => data[index] === value)
  const validHeader =
    data.length >= 26 &&
    String.fromCharCode(data[12], data[13], data[14], data[15]) === 'IHDR'

  if (!validSignature || !validHeader) {
    throw new Error('The file is not a valid PNG image.')
  }

  const view = new DataView(bytes)
  const colorType = data[25]

  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    colorType,
    hasAlphaChannel: colorType === 4 || colorType === 6,
  }
}

export function validateCaseImages(
  surface: ImageInfo,
  reference: PixelImage,
): ValidationSummary {
  const errors: string[] = []
  const warnings: string[] = []
  let acceptedInkPixels = 0
  let transparentPixels = 0
  let partiallyTransparentPixels = 0
  let unusualIncludedRgbPixels = 0

  if (!surface.decoded) errors.push('The surface image could not be decoded.')
  if (!reference.decoded) errors.push('The reference mask could not be decoded.')
  if (
    surface.width !== reference.width ||
    surface.height !== reference.height
  ) {
    errors.push(
      `Dimension mismatch: the surface is ${surface.width} × ${surface.height}, but the reference mask is ${reference.width} × ${reference.height}.`,
    )
  }
  if (!reference.hasAlphaChannel) {
    errors.push('The reference mask has no alpha channel.')
  }

  for (let index = 0; index < reference.data.length; index += 4) {
    const alpha = reference.data[index + 3]
    if (alpha === 0) transparentPixels += 1
    if (alpha > 0 && alpha < 255) partiallyTransparentPixels += 1
    if (alpha >= 128) {
      acceptedInkPixels += 1
      if (
        reference.data[index] < 240 ||
        reference.data[index + 1] < 240 ||
        reference.data[index + 2] < 240
      ) {
        unusualIncludedRgbPixels += 1
      }
    }
  }

  if (transparentPixels === 0) {
    errors.push('The reference mask has no fully transparent pixels.')
    warnings.push(
      'The reference mask appears to have been flattened onto an opaque background.',
    )
  }
  if (acceptedInkPixels === 0) {
    errors.push('The reference mask has no accepted-ink pixels.')
  }
  if (partiallyTransparentPixels > 0) {
    warnings.push(
      `${partiallyTransparentPixels.toLocaleString()} partially transparent pixels were found; alpha values of 128 or above count as accepted ink.`,
    )
  }
  if (unusualIncludedRgbPixels > 0) {
    warnings.push(
      `${unusualIncludedRgbPixels.toLocaleString()} included pixels have RGB values that are not approximately white.`,
    )
  }

  return {
    passed: errors.length === 0,
    surfaceWidth: surface.width,
    surfaceHeight: surface.height,
    referenceWidth: reference.width,
    referenceHeight: reference.height,
    acceptedInkPixels,
    transparentPixels,
    partiallyTransparentPixels,
    unusualIncludedRgbPixels,
    errors,
    warnings,
  }
}

export function createReferenceMembership(reference: PixelImage) {
  const membership = new Uint8Array(reference.width * reference.height)
  for (let pixel = 0; pixel < membership.length; pixel += 1) {
    membership[pixel] = reference.data[pixel * 4 + 3] >= 128 ? 1 : 0
  }
  return membership
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

async function decodePng(url: string, includePixels: boolean) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Missing file: ${url}`)
  }

  const bytes = await response.arrayBuffer()
  const header = parsePngHeader(bytes)
  const blobUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/png' }))
  const image = new Image()

  try {
    image.src = blobUrl
    await image.decode()
    if (!includePixels) {
      return {
        width: image.naturalWidth,
        height: image.naturalHeight,
        decoded: true,
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = image.naturalWidth
    canvas.height = image.naturalHeight
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error(`Could not read pixels from ${url}`)
    context.drawImage(image, 0, 0)
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data

    return {
      width: canvas.width,
      height: canvas.height,
      decoded: true,
      data,
      hasAlphaChannel: header.hasAlphaChannel,
    }
  } finally {
    URL.revokeObjectURL(blobUrl)
  }
}

async function loadCaseResourcesUncached(): Promise<LoadedCaseResources> {
  const metadataResponse = await fetch('/metadata.json')
  if (!metadataResponse.ok) {
    throw new Error('Missing file: /metadata.json')
  }
  const metadata = (await metadataResponse.json()) as CaseMetadata
  const surfaceUrl = `/${metadata.surfaceImage}`
  const referenceUrl = `/${metadata.referenceMask}`

  const [surface, reference] = await Promise.all([
    decodePng(surfaceUrl, false) as Promise<ImageInfo>,
    decodePng(referenceUrl, true) as Promise<PixelImage>,
  ])
  const validation = validateCaseImages(surface, reference)

  return {
    metadata,
    surface,
    reference,
    referenceMembership: createReferenceMembership(reference),
    validation,
  }
}

export function loadCaseResources() {
  if (!resourcePromise) resourcePromise = loadCaseResourcesUncached()
  return resourcePromise
}

export function clearCaseResourceCache() {
  resourcePromise = null
}
