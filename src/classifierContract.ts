import type { CaseMetadata } from './caseData'
import type { Point, Size } from './coordinates'

export type ClassifierImageRegion = {
  x: number
  y: number
  width: number
  height: number
}

export type ClassifierImageReference = {
  url: string
  region?: ClassifierImageRegion
}

export type ClassifierLabelSet = {
  coordinateSystem: 'source-image-pixels'
  points: Point[]
}

/**
 * Data a future classifier may consume. Positive and negative labels remain
 * separate because an unpainted pixel is not automatically a negative label.
 */
export type ClassifierRequest = {
  sourceImageSize: Size
  sourceImage: ClassifierImageReference
  positiveInkLabels: ClassifierLabelSet
  negativeNonInkLabels: ClassifierLabelSet
  caseMetadata: CaseMetadata
}

export type PixelAlignedProbabilityMap = {
  width: number
  height: number
  values: Float32Array
}

export type ClassifierModelStatus =
  | 'idle'
  | 'preparing'
  | 'training'
  | 'ready'
  | 'error'

export type ClassifierError = {
  code: string
  message: string
  recoverable: boolean
}

export type ClassifierResult = {
  probabilityMap: PixelAlignedProbabilityMap | null
  modelStatus: ClassifierModelStatus
  trainingRoundIdentifier: string | null
  error: ClassifierError | null
}

/**
 * Contract only: the application intentionally provides no model, API,
 * persistence, or implementation at this checkpoint.
 */
export interface FutureClassifier {
  evaluate(request: ClassifierRequest): Promise<ClassifierResult>
}
