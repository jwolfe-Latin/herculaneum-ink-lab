import {
  createReferenceMembership,
  parsePngHeader,
  validateCaseImages,
  type PixelImage,
} from './caseData'
import {
  calculateMetrics,
  rasterizeStudentStrokes,
} from './evaluation'

function pngHeader(width: number, height: number, colorType: number) {
  const bytes = new Uint8Array(33)
  bytes.set([137, 80, 78, 71, 13, 10, 26, 10])
  new DataView(bytes.buffer).setUint32(8, 13)
  bytes.set([73, 72, 68, 82], 12)
  const view = new DataView(bytes.buffer)
  view.setUint32(16, width)
  view.setUint32(20, height)
  bytes[24] = 8
  bytes[25] = colorType
  return bytes.buffer
}

function referenceImage(
  width: number,
  height: number,
  pixels: Array<[number, number, number, number]>,
  hasAlphaChannel = true,
): PixelImage {
  return {
    width,
    height,
    decoded: true,
    hasAlphaChannel,
    data: new Uint8ClampedArray(pixels.flat()),
  }
}

const surface4x4 = { width: 4, height: 4, decoded: true }
const reference4x4 = new Uint8Array([
  1, 1, 1, 1,
  0, 0, 0, 0,
  0, 0, 0, 0,
  0, 0, 0, 0,
])

describe('reference-mask loading and validation', () => {
  it('recognizes a transparent RGBA PNG header', () => {
    expect(parsePngHeader(pngHeader(4, 4, 6))).toEqual({
      width: 4,
      height: 4,
      colorType: 6,
      hasAlphaChannel: true,
    })
  })

  it('uses alpha >= 128 for accepted-ink membership', () => {
    const reference = referenceImage(4, 1, [
      [255, 255, 255, 0],
      [255, 255, 255, 127],
      [255, 255, 255, 128],
      [255, 255, 255, 255],
    ])

    expect([...createReferenceMembership(reference)]).toEqual([0, 0, 1, 1])
  })

  it('rejects source and mask dimension mismatches', () => {
    const reference = referenceImage(2, 1, [
      [255, 255, 255, 255],
      [0, 0, 0, 0],
    ])

    const result = validateCaseImages(surface4x4, reference)

    expect(result.passed).toBe(false)
    expect(result.errors.join(' ')).toContain('Dimension mismatch')
  })

  it('rejects a mask with no alpha channel', () => {
    const reference = referenceImage(
      2,
      1,
      [
        [255, 255, 255, 255],
        [0, 0, 0, 0],
      ],
      false,
    )

    expect(validateCaseImages(
      { width: 2, height: 1, decoded: true },
      reference,
    ).errors).toContain('The reference mask has no alpha channel.')
  })

  it('warns about flattening and rejects a mask with no transparent pixels', () => {
    const reference = referenceImage(2, 1, [
      [255, 255, 255, 255],
      [255, 255, 255, 255],
    ])
    const result = validateCaseImages(
      { width: 2, height: 1, decoded: true },
      reference,
    )

    expect(result.errors).toContain(
      'The reference mask has no fully transparent pixels.',
    )
    expect(result.warnings.join(' ')).toContain('flattened')
  })

  it('rejects a mask with no accepted-ink pixels', () => {
    const reference = referenceImage(2, 1, [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])

    expect(validateCaseImages(
      { width: 2, height: 1, decoded: true },
      reference,
    ).errors).toContain('The reference mask has no accepted-ink pixels.')
  })

  it('counts partially transparent pixels without rejecting valid edges', () => {
    const reference = referenceImage(4, 1, [
      [255, 255, 255, 0],
      [255, 255, 255, 64],
      [255, 255, 255, 128],
      [255, 255, 255, 255],
    ])
    const result = validateCaseImages(
      { width: 4, height: 1, decoded: true },
      reference,
    )

    expect(result.passed).toBe(true)
    expect(result.partiallyTransparentPixels).toBe(2)
    expect(result.acceptedInkPixels).toBe(2)
  })

  it('warns about unusual RGB values in included pixels', () => {
    const reference = referenceImage(2, 1, [
      [30, 40, 50, 255],
      [0, 0, 0, 0],
    ])
    const result = validateCaseImages(
      { width: 2, height: 1, decoded: true },
      reference,
    )

    expect(result.unusualIncludedRgbPixels).toBe(1)
    expect(result.warnings.join(' ')).toContain('not approximately white')
  })
})

describe('student-label evaluation', () => {
  it('handles no student labels without a misleading precision value', () => {
    const result = calculateMetrics(new Uint8Array(16), reference4x4)

    expect(result.inkRecovered).toBe(0)
    expect(result.labelPrecision).toBeNull()
    expect(result.extraSurfaceMarked).toBe(0)
  })

  it('scores labels covering only accepted ink', () => {
    const student = new Uint8Array(16)
    student[0] = 1
    student[1] = 1
    const result = calculateMetrics(student, reference4x4)

    expect(result.inkRecovered).toBe(0.5)
    expect(result.labelPrecision).toBe(1)
    expect(result.extraSurfaceMarked).toBe(0)
  })

  it('scores labels covering the entire image', () => {
    const result = calculateMetrics(new Uint8Array(16).fill(1), reference4x4)

    expect(result.inkRecovered).toBe(1)
    expect(result.labelPrecision).toBe(0.25)
    expect(result.extraSurfaceMarked).toBe(1)
  })

  it('scores labels covering only non-reference surface', () => {
    const student = new Uint8Array(16)
    student[4] = 1
    const result = calculateMetrics(student, reference4x4)

    expect(result.inkRecovered).toBe(0)
    expect(result.labelPrecision).toBe(0)
    expect(result.extraSurfaceMarked).toBeCloseTo(1 / 12)
  })

  it('calculates Ink Recovered from overlap/reference pixels', () => {
    const student = new Uint8Array(16)
    student.set([1, 1, 1])

    expect(calculateMetrics(student, reference4x4).inkRecovered).toBe(0.75)
  })

  it('calculates Label Precision from overlap/student pixels', () => {
    const student = new Uint8Array(16)
    student[0] = 1
    student[1] = 1
    student[4] = 1
    student[5] = 1

    expect(calculateMetrics(student, reference4x4).labelPrecision).toBe(0.5)
  })

  it('calculates Extra Surface Marked from marked/non-reference pixels', () => {
    const student = new Uint8Array(16)
    student[4] = 1
    student[5] = 1
    student[6] = 1

    expect(calculateMetrics(student, reference4x4).extraSurfaceMarked).toBe(0.25)
  })

  it('produces updated metrics when student labels are revised', () => {
    const firstCheck = calculateMetrics(new Uint8Array(16), reference4x4)
    const revised = new Uint8Array(16)
    revised[0] = 1
    revised[1] = 1
    const secondCheck = calculateMetrics(revised, reference4x4)

    expect(firstCheck.labelPrecision).toBeNull()
    expect(secondCheck.inkRecovered).toBe(0.5)
    expect(secondCheck.labelPrecision).toBe(1)
  })

  it('keeps rasterized labels at the same normalized image point', () => {
    const strokes = [
      { tool: 'ink' as const, size: 4, points: [{ x: 500, y: 216 }] },
    ]
    const small = rasterizeStudentStrokes(strokes, 100, 44)
    const large = rasterizeStudentStrokes(strokes, 200, 88)

    const centerOf = (pixels: Uint8Array, width: number) => {
      const indexes = [...pixels.keys()].filter((index) => pixels[index] === 1)
      return {
        x:
          indexes.reduce((sum, index) => sum + (index % width), 0) /
          indexes.length /
          width,
        y:
          indexes.reduce((sum, index) => sum + Math.floor(index / width), 0) /
          indexes.length /
          (pixels.length / width),
      }
    }

    expect(centerOf(small, 100).x).toBeCloseTo(centerOf(large, 200).x, 1)
    expect(centerOf(small, 100).y).toBeCloseTo(centerOf(large, 200).y, 1)
  })
})
