import { describe, expect, it } from 'vitest'
import type {
  ClassifierRequest,
  ClassifierResult,
} from './classifierContract'

describe('future classifier contract', () => {
  it('keeps source pixels, positive labels, and future negative labels explicit', () => {
    const request = {
      sourceImageSize: { width: 4, height: 3 },
      sourceImage: {
        url: '/surface.png',
        region: { x: 1, y: 0, width: 2, height: 3 },
      },
      positiveInkLabels: {
        coordinateSystem: 'source-image-pixels',
        points: [{ x: 1, y: 1 }],
      },
      negativeNonInkLabels: {
        coordinateSystem: 'source-image-pixels',
        points: [],
      },
      caseMetadata: {
        caseId: 'sample',
        caseTitle: 'Sample',
        studentInstructions: 'Inspect',
        surfaceImage: 'surface.png',
        referenceMask: 'reference-mask.png',
        minimumInkRecovery: 0,
        minimumLabelPrecision: 0,
        sourceCredit: 'Credit',
        license: 'License',
        referenceMaskDescription: 'Description',
      },
    } satisfies ClassifierRequest

    expect(request.positiveInkLabels.coordinateSystem).toBe(
      'source-image-pixels',
    )
    expect(request.negativeNonInkLabels.points).toEqual([])
  })

  it('can describe a pixel-aligned probability result without a model implementation', () => {
    const result = {
      probabilityMap: {
        width: 2,
        height: 2,
        values: new Float32Array([0.1, 0.4, 0.8, 0.9]),
      },
      modelStatus: 'ready',
      trainingRoundIdentifier: 'round-1',
      error: null,
    } satisfies ClassifierResult

    expect(result.probabilityMap.values).toHaveLength(
      result.probabilityMap.width * result.probabilityMap.height,
    )
  })
})
