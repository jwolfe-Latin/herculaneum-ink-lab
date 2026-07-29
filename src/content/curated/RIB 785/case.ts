import {
  assertValidCuratedInvestigation,
  validateCuratedInvestigation,
  type CuratedInvestigation,
} from '../../curatedCase'
import {
  RIB_785_LETTER_REFERENCE_ASSET_URL,
  RIB_785_LETTER_REFERENCE_REGION_COUNT,
  RIB_785_LETTER_REFERENCE_SOURCE_PATH,
} from './letterReference'

export const RIB_785_OFFICIAL_ID = 'RIB 785'
export const RIB_785_PUBLIC_FOLDER = 'RIB 785'

export const RIB_785_CASE = {
  id: RIB_785_OFFICIAL_ID,
  publicFolderName: RIB_785_PUBLIC_FOLDER,
  title: 'RIB 785: Funerary Inscription for Crescentinus',
  shortDescription: 'A Roman funerary inscription from Brougham, England.',
  sourceType: 'inscription',
  objectType: 'tombstone',
  language: 'Latin',
  difficulty: 'introductory',
  estimatedMinutes: 5,
  stages: [
    'letter-identification',
    'transcription',
    'word-segmentation',
    'translation',
  ],
  stageAvailability: [
    {
      activity: 'letter-identification',
      label: 'Letter Identification',
      status: 'available',
    },
    {
      activity: 'transcription',
      label: 'Transcription',
      status: 'available',
    },
    {
      activity: 'word-segmentation',
      label: 'Word Segmentation',
      status: 'available',
    },
    {
      activity: 'translation',
      label: 'Translation',
      status: 'available',
    },
  ],
  developmentStatus: 'available',
  statusLabel: 'Begin Investigation',
  enabled: true,
  sourceImage: {
    publicPath: 'cases/RIB 785/source.png',
    width: 832,
    height: 1084,
    format: 'png',
  },
  letterReferenceAvailable: true,
  letterReference: {
    sourcePath: RIB_785_LETTER_REFERENCE_SOURCE_PATH,
    assetUrl: RIB_785_LETTER_REFERENCE_ASSET_URL,
    schemaVersion: 1,
    regionCount: RIB_785_LETTER_REFERENCE_REGION_COUNT,
  },
  diplomaticTranscription: `D M
CRESCENTINV
S VIXIT ANNIS
XVIII VIDARIS
PATER POSVIT`,
  normalizedInstructorReading: `D(IS) M(ANIBUS)
CRESCENTINUS VIXIT ANNIS
XVIII VIDARIS
PATER POSUIT`,
  wordSegmentationReference: `D M
CRESCENTINVS
S VIXIT ANNIS
XVIII VIDARIS
PATER POSVIT`,
  translation:
    'To the spirits of the departed; Crescentinus lived eighteen years. Vidaris, his father, set this up.',
  notation: {
    missingText: '[missing text]',
    insecureLetter: 'letter?',
    unreadableCharacter: '—',
    lineContinuation:
      'Use the hyphen only when a word continues across a line.',
    hasUncertainLetters: false,
  },
  imageSource: {
    underlyingSource:
      'J. Collingwood Bruce, Lapidarium Septentrionale: or, A Description of the Monuments of Roman Rule in the North of England (London: Bernard Quaritch, 1875).',
    digitalScan: 'Google Books',
    digitalRecordUrl:
      'https://www.google.com/books/edition/Lapidarium_Septentrionale/10w-AQAAMAAJ',
    page: 414,
    imageDescription:
      'Illustration of the funerary monument catalogued as RIB 785.',
    provenance:
      'The student-facing PNG was created directly from the Google Books scan of the 1875 publication.',
    rightsDetermination:
      'The underlying illustration was published in 1875 and is in the public domain in the United States. The student-facing PNG is a crop derived from a digital scan of that public-domain publication.',
    creditLine:
      'Image adapted from J. Collingwood Bruce, Lapidarium Septentrionale (1875), p. 414, via Google Books. Public domain.',
    requiredNotice:
      'Public-domain illustration from J. Collingwood Bruce, Lapidarium Septentrionale (1875), p. 414.',
  },
  catalogueSource: {
    sourceName: 'Roman Inscriptions of Britain Online',
    catalogueReference: 'RIB 785',
    recordTitle: 'RIB 785. Funerary inscription for Crescentinus',
    modernLocation: 'Brougham Castle',
    institutionOrAccessionNumber: 'Brougham Castle 81029081',
    recordUrl: 'https://romaninscriptionsofbritain.org/inscriptions/785',
    textualDataNotice:
      'Modern catalogue information, edition, translation, and commentary are adapted from Roman Inscriptions of Britain Online. RIB Online states that its texts and TEI XML are available under CC BY 4.0.',
    requiredAttribution:
      'Modern textual and catalogue information adapted from Roman Inscriptions of Britain Online, RIB 785, under CC BY 4.0.',
  },
  studentContext: {
    text:
      'This funerary inscription comes from a tombstone found near the Roman fort at Brocavum, modern Brougham. It was discovered in 1828 or 1829 and is now held at Brougham Castle. The inscription commemorates Crescentinus, who died at the age of eighteen, and says that his father, Vidaris, set up the monument. Vidaris may be a Germanic name.',
    authorship: 'instructor-authored',
    informedBy: 'RIB 785 catalogue record and commentary',
    approval: 'approved-for-student-use',
  },
} satisfies CuratedInvestigation

export function validateRib785Case(
  investigation: CuratedInvestigation = RIB_785_CASE,
) {
  const errors = validateCuratedInvestigation(investigation)
  const requiredStages = [
    'letter-identification',
    'transcription',
    'word-segmentation',
    'translation',
  ]

  if (investigation.id !== RIB_785_OFFICIAL_ID) {
    errors.push('The official case ID must remain exactly RIB 785.')
  }
  if (investigation.publicFolderName !== RIB_785_PUBLIC_FOLDER) {
    errors.push('The public folder name must remain exactly RIB 785.')
  }
  if (investigation.sourceType !== 'inscription') {
    errors.push('RIB 785 must use the inscription source type.')
  }
  if (investigation.objectType !== 'tombstone') {
    errors.push('RIB 785 must use the tombstone object type.')
  }
  if (investigation.language !== 'Latin') {
    errors.push('RIB 785 must use Latin as its language.')
  }
  if (
    investigation.stages.length !== requiredStages.length ||
    investigation.stages.some((stage, index) => stage !== requiredStages[index])
  ) {
    errors.push('RIB 785 activity stages are missing or out of order.')
  }
  if (
    investigation.sourceImage.width !== 832 ||
    investigation.sourceImage.height !== 1084
  ) {
    errors.push('RIB 785 source-image dimensions must be 832 × 1084.')
  }
  if (investigation.developmentStatus !== 'available') {
    errors.push('RIB 785 letter identification must be available.')
  }
  if (!investigation.enabled) {
    errors.push('RIB 785 must be openable for letter identification.')
  }
  if (
    investigation.stageAvailability[0]?.status !== 'available' ||
    investigation.stageAvailability[1]?.status !== 'available' ||
    investigation.stageAvailability[2]?.status !== 'available' ||
    investigation.stageAvailability[3]?.status !== 'available'
  ) {
    errors.push(
      'All four RIB 785 student stages must be available.',
    )
  }
  if (!investigation.letterReferenceAvailable) {
    errors.push('RIB 785 must advertise its reviewed letter reference.')
  }
  if (investigation.letterReference.regionCount !== 47) {
    errors.push('RIB 785 letter reference must contain exactly 47 regions.')
  }

  return errors
}

assertValidCuratedInvestigation(RIB_785_CASE)
const rib785Errors = validateRib785Case()
if (rib785Errors.length > 0) {
  throw new Error(`Invalid RIB 785 case: ${rib785Errors.join(' ')}`)
}
