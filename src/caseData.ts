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

export type LoadedCaseResources = {
  metadata: CaseMetadata
  surface: ImageInfo
  reference: PixelImage
  referenceMembership: Uint8Array
  validation: ValidationSummary
}

export type CaseAssetUrls = {
  surface: string
  referenceMask: string
}

export function resolveCaseAssetUrls(metadata: CaseMetadata): CaseAssetUrls {
  return {
    surface: publicAssetUrl(metadata.surfaceImage),
    referenceMask: publicAssetUrl(metadata.referenceMask),
  }
}

const PNG_SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10]
let resourcePromise: Promise<LoadedCaseResources> | null = null

export function parsePngHeader(bytes: ArrayBuffer) {
  const data = new Uint8Array(bytes)
  const validSignature = PNG_SIGNATURE.every(
    (value, index) => data[index] === value,
  )
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

async function decodePng(url: string, includePixels: boolean) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Missing file: ${url}`)

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
  const metadataUrl = publicAssetUrl('metadata.json')
  const metadataResponse = await fetch(metadataUrl)
  if (!metadataResponse.ok) throw new Error(`Missing file: ${metadataUrl}`)
  const metadata = (await metadataResponse.json()) as CaseMetadata
  const urls = resolveCaseAssetUrls(metadata)

  const [surface, reference] = await Promise.all([
    decodePng(urls.surface, false) as Promise<ImageInfo>,
    decodePng(urls.referenceMask, true) as Promise<PixelImage>,
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
import { publicAssetUrl } from './assetPaths'
