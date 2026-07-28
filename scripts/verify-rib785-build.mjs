import { readFileSync, readdirSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'

const projectRoot = process.cwd()
const builtImage = join(
  projectRoot,
  'dist',
  'cases',
  'RIB 785',
  'source.png',
)
const bytes = readFileSync(builtImage)

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
if (!bytes.subarray(0, 8).equals(pngSignature)) {
  throw new Error('Built RIB 785 source image is not a PNG.')
}

const width = bytes.readUInt32BE(16)
const height = bytes.readUInt32BE(20)
if (width !== 832 || height !== 1084) {
  throw new Error(
    `Built RIB 785 image is ${width} × ${height}; expected 832 × 1084.`,
  )
}

function walk(directory) {
  return readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    return statSync(path).isDirectory() ? walk(path) : [path]
  })
}

const builtFiles = walk(join(projectRoot, 'dist')).map((path) =>
  relative(join(projectRoot, 'dist'), path).replaceAll('\\', '/'),
)
const referenceAssets = builtFiles.filter(
  (path) =>
    path.toLowerCase().endsWith('.json') &&
    path.toLowerCase().includes('letter-reference'),
)

if (referenceAssets.length !== 1) {
  throw new Error(
    `Expected one built RIB 785 letter-reference JSON asset; found ${referenceAssets.length}.`,
  )
}

const builtReferenceBytes = readFileSync(
  join(projectRoot, 'dist', referenceAssets[0]),
)
const expectedReferenceHash =
  'e3e48ab2466f141c7ee416c919b6627cb850615b907a830e61eb90fa268b6033'
const builtReferenceHash = createHash('sha256')
  .update(builtReferenceBytes)
  .digest('hex')

if (builtReferenceHash !== expectedReferenceHash) {
  throw new Error(
    'Built RIB 785 letter-reference JSON does not match the validated instructor export.',
  )
}

const reference = JSON.parse(builtReferenceBytes.toString('utf8'))
if (
  reference.schemaVersion !== 1 ||
  reference.caseId !== 'RIB 785' ||
  reference.sourceImage?.width !== 832 ||
  reference.sourceImage?.height !== 1084 ||
  reference.regions?.length !== 47 ||
  reference.acknowledgedMismatches?.length !== 0
) {
  throw new Error('Built RIB 785 letter-reference metadata is invalid.')
}

const expectedLines = [
  'DM',
  'CRESCENTINV',
  'SVIXITANNIS',
  'XVIIIVIDARIS',
  'PATERPOSVIT',
]
const actualLines = expectedLines.map((_, lineIndex) =>
  reference.regions
    .filter((region) => region.lineNumber === lineIndex + 1)
    .sort(
      (a, b) =>
        (a.manualOrder ?? Number.POSITIVE_INFINITY) -
          (b.manualOrder ?? Number.POSITIVE_INFINITY) ||
        a.x - b.x ||
        a.y - b.y ||
        a.id.localeCompare(b.id),
    )
    .map((region) => region.label)
    .join(''),
)
if (actualLines.some((line, index) => line !== expectedLines[index])) {
  throw new Error(
    `Built RIB 785 letter-reference transcription mismatch: ${actualLines.join(' / ')}`,
  )
}

const forbidden = builtFiles.filter(
  (path) =>
    path.toLowerCase().endsWith('.docx') ||
    path.toLowerCase().includes('intake-report'),
)

if (forbidden.length > 0) {
  throw new Error(
    `Private intake documents were included in dist: ${forbidden.join(', ')}`,
  )
}

console.log(
  `Verified RIB 785 build assets: PNG 832 × 1084; permanent 47-region reference ${referenceAssets[0]}; no intake DOCX or report in dist.`,
)
